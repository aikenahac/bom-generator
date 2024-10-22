#!/usr/bin/env node

const inquirer = require("inquirer").default;
const fs = require("node:fs/promises");
const path = require('path');

const formatDependency = (name, version, indent = false, url = `https://npmjs.com/package/${name}`) =>
    `${indent ? "|__ " : ""}[${name} (${version})](${url})\n`;

const iterateDeps = async (deps, file, indent = false) => {
    if (deps) {
        await fs.appendFile(file, Object.entries(deps).map(([dep, ver]) =>
            formatDependency(dep, ver, indent)).join(''));
    }
};

const generateBom = async (name, extended = false) => {
    const fileName = extended ? "BOM-ext.md" : "BOM.md";
    const sourceFile = path.join(process.cwd(), extended ? "package-lock.json" : "package.json");
    const source = require(sourceFile);
    
    await fs.writeFile(fileName, `# ${extended ? 'Extended ' : ''}Bill of Materials ${name}\n\n`);

    if (!source) {
        console.log(`[ERR]:::No ${sourceFile} file found`);
        return;
    }

    if (extended) {
        for (const [pack, curr] of Object.entries(source.packages)) {
            if (pack === "") {
                await iterateDeps(curr.dependencies, fileName);
                await iterateDeps(curr.devDependencies, fileName);
            } else {
                await fs.appendFile(fileName, formatDependency(pack, curr.version, false, curr.resolved?.split("/-/")[0]));
                await iterateDeps(curr.dependencies, fileName, true);
            }
        }
    } else {
        await iterateDeps(source.dependencies, fileName);
        await iterateDeps(source.devDependencies, fileName);
    }

    console.log(`[INFO]:::Generated ${extended ? 'extended ' : ''}BOM - ${fileName}`);
};

(async () => {
    const { type, title } = await inquirer.prompt([
        {
            type: 'input',
            name: "title",
            message: "What would you like the title to be:"
        },
        {
            type: "list",
            name: "type",
            message: "Would you like an extended or normal bom?\n    normal - from package.json\n    extended - from package-lock.json",
            choices: ["normal", "extended"],
        },
]);

    generateBom(title, type === "extended");
})();
