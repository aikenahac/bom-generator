#!/usr/bin/env node

const inquirer = require("inquirer").default;
const fs = require("node:fs/promises");
const path = require("path");
const readYamlFile = require("read-yaml-file");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const { program } = require("commander");

const PACKAGE_MANAGERS = {
  npm: {
    lockFile: "package-lock.json",
    parser: (file) => require(file),
    extractor: (source) => source.packages,
  },
  pnpm: {
    lockFile: "pnpm-lock.yaml",
    parser: readYamlFile.sync,
    extractor: (source) => source.packages,
  },
  bun: {
    lockFile: "bun.lockb",
    parser: null, // Bun uses a different approach
    extractor: null,
  },
};

const PACKAGE_RE = /(\S+)@(\S+)/g;

async function runBunCommand(command) {
  try {
    const { stdout, stderr } = await exec(command);
    if (stderr) {
      console.error(`Error: ${stderr}`);
    }
    return stdout;
  } catch (error) {
    console.error(`Execution error: ${error}`);
    return null;
  }
}

const formatDependency = (
  name,
  version,
  indent = false,
  packageManager,
  url = `https://npmjs.com/package/${name}`,
) => {
  if (packageManager === "bun") {
    return `${indent ? "|__ " : ""}${name}\n`;
  }

  let nameVer = `${name} (${version})`;
  if (packageManager === "pnpm") nameVer = `${name}`;
  return `${indent ? "  |__ " : ""}[${nameVer}](${url})\n`; // Added extra space for PNPM indentation
};

const formatBunDependency = (dep) => {
  const match = PACKAGE_RE.exec(dep);
  if (!match) {
    return dep;
  }

  let source = `https://npmjs.com/package/${match[1]}/v/${match[2]}`;
  if (match[2].includes("github")) {
    source = `https://github.com/${match[2].replace("github:", "")}`;
  }

  return `[${match[1]}@${match[2]}](${source})`;
};

const iterateDeps = async (deps, file, indent, packageManager) => {
  if (deps) {
    await fs.appendFile(
      file,
      Object.entries(deps)
        .map(([dep, ver]) => formatDependency(dep, ver, indent, packageManager))
        .join(""),
    );
  }
};

const generateBunBom = async (file, extended = false) => {
  const command = `bun pm ls ${extended ? "--all" : ""}`;
  const output = await runBunCommand(command);

  if (!output) return false;

  const [, ...deps] = output.split("\n");
  const depsFormatted = deps
    .filter(Boolean)
    .map(formatBunDependency)
    .join("\n");

  await fs.appendFile(file, depsFormatted + "\n");
  return true;
};

const generateBom = async (
  name,
  extended = false,
  packageManager,
  fileName,
) => {
  const file = `${fileName}.md`;

  // Create initial file with title
  await fs.writeFile(file, `# Bill of Materials - ${name}\n\n`);

  if (packageManager === "bun") {
    const success = await generateBunBom(file, extended);
    if (!success) {
      console.log("[ERR]:::Failed to generate Bun BOM. Is Bun installed?");
      return;
    }
  } else {
    const sourceFile = path.join(
      process.cwd(),
      extended ? PACKAGE_MANAGERS[packageManager].lockFile : "package.json",
    );

    let source;
    try {
      source = extended
        ? await PACKAGE_MANAGERS[packageManager].parser(sourceFile)
        : require(path.join(process.cwd(), "package.json"));
    } catch (error) {
      console.log(`[ERR]:::No ${sourceFile} file found or invalid format`);
      return;
    }

    if (extended) {
      const packages = PACKAGE_MANAGERS[packageManager].extractor(source);
      for (const [pack, curr] of Object.entries(packages)) {
        if (pack === "") {
          await iterateDeps(curr.dependencies, file, false, packageManager);
          await iterateDeps(curr.devDependencies, file, false, packageManager);
        } else {
          await fs.appendFile(
            file,
            formatDependency(
              pack,
              curr.version,
              false,
              packageManager,
              curr.resolved?.split("/-/")[0],
            ),
          );
          await iterateDeps(curr.dependencies, file, true, packageManager);
        }
      }
    } else {
      await iterateDeps(source.dependencies, file, false, packageManager);
      await iterateDeps(source.devDependencies, file, false, packageManager);
    }
  }

  console.log(
    `[INFO]:::Generated ${extended ? "extended " : ""}BOM - ${file} using ${packageManager}`,
  );
};

(async () => {
  program
    .option("-n, --name <name>", "Name of the project")
    .option("-t, --type <type>", "Type of BOM [normal, extended]")
    .option("-p, --package-manager <packageManager>", "Choose your package manager [pnpm, npm, bun]")
    .option("-f, --file <file>", "Name of the generated file");

  program.parse(process.argv);

  const { name: argName, type: argType, packageManager: argPackageManager, file: argFile } = program.opts();

  const prompts = [];

  if (!argName) {
    prompts.push({
      type: "input",
      name: "name",
      message: "What is the name of your project:",
    })
  }

  let checkArgType = false;
  if (argType) {
    if (argType !== "normal" && argType !== "extended") {
      checkArgType = true;
    }
  }

  if (!argType || checkArgType) {
    prompts.push({
      type: "list",
      name: "type",
      message:
        `${checkArgType ? 'Invalid type provided. Please select from the options below:\n' : ''}Would you like an extended or normal bom?\n    normal - from package.json\n    extended - from lockfile`,
      choices: ["normal", "extended"],
    })
  }

  let checkArgPackageManager = false;
  if (argPackageManager) {
    if (argPackageManager !== "npm" && argPackageManager !== "pnpm" && argPackageManager !== "bun") {
      checkArgPackageManager = true;
    }
  }

  if (!argPackageManager || checkArgPackageManager) {
    prompts.push({
      type: "list",
      name: "packageManager",
      message: `${checkArgPackageManager ? 'Invalid package manager provided. Please select from the options below:\n' : ''}What package manager do you use?`,
      choices: ["npm", "pnpm", "bun"],
    });
  }

  if (!argFile) {
    prompts.push({
      type: "input",
      name: "fileName",
      message:
        "What would you like the name of the file to be? (default is bill_of_materials)",
    })
  }


  const { type, title, packageManager, fileName } = await inquirer.prompt(prompts);

  generateBom(
    argName || title,
    argType && !checkArgType ? argType === "extended" : type === "extended",
    argPackageManager && !checkArgPackageManager ? argPackageManager : packageManager,
    argFile?.trim() || fileName?.trim() || "bill_of_materials",
  );
})();
