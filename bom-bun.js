// Bill Of Materials generator
// Creates a file containing a readable Bill of Materials (BOM) for the project.
import { format } from 'date-fns';
import inquirer from 'inquirer';
import * as fs from 'node:fs';

const util = require('util');
const exec = util.promisify(require('child_process').exec);

const appVersion = require('./version.json');
const appName = 'Messenger for Untis';

const PACKAGE_RE = /(\S+)@(\S+)/g;

async function runCommand(command) {
  try {
    const { stdout, stderr } = await exec(command);
    if (stderr) {
      console.error(`Error: ${stderr}`);
    }
    return stdout;
  } catch (error) {
    console.error(`Execution error: ${error}`);
  }
}

function formatDependency(dep) {
  const match = PACKAGE_RE.exec(dep);
  if (!match) {
    return dep;
  }

  let source = `https://npmjs.com/package/${match[1]}/v/${match[2]}`;
  if (match[2].includes('github')) {
    source = `https://github.com/${match[2].replace('github:', '')}`;
  }

  const url = `${match[1]}@${match[2]} - ${source}`;

  return dep.replace(PACKAGE_RE, url);
}

function getFileName(extended = false) {
  const dateFormatted = format(new Date(), 'yyyyMMdd');
  const version = `${appVersion.buildNumber}`;

  return `BOM${extended ? '_ext_' : '_'}${dateFormatted}_${version}.md`;
}

function getHeader(extended = false) {
  const dateFormatted = format(new Date(), 'yyyy-MM-dd');
  return `# ${appName} BOM${
    extended ? ' - extended' : ''
  } (${dateFormatted})\nVersion: ${appVersion.version} (${
    appVersion.buildNumber
  })\n\n`;
}

async function generateBom(
  extended = false,
  dir = `./bom/v${appVersion.version}`,
) {
  const fileName = getFileName(extended);
  const path = `${dir}/${fileName}`;
  const command = `bun pm ls ${extended ? '--all' : ''}`;

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const output = await runCommand(command);
    const [, ...deps] = output.split('\n');
    // eslint-disable-next-line no-undef
    const file = Bun.file(path);
    const writer = file.writer();

    const depsFormatted = deps.map(formatDependency).join('  \n');

    writer.write(getHeader(extended));
    writer.write(`## Dependencies\n\n`);
    writer.write('```\n');
    writer.write(depsFormatted);
    writer.write('\n```');
    writer.flush();
    return {
      path,
      fileName,
    };
  } catch (error) {
    console.error(`[ERROR]:::Failed to write to file - ${path}`, error);
  }

  console.log(`[INFO]:::Generated ${extended ? 'extended ' : ''}BOM - ${path}`);
}

async function getBom(type) {
  switch (type) {
    case 'standard':
      return Promise.all([generateBom(false)]);
    case 'extended':
      return Promise.all([generateBom(true)]);
    case 'both':
      return Promise.all([generateBom(false), generateBom(true)]);
  }
}

async function main() {
  const standard =
    'standard - installed dependencies in the current project and their resolved versions, excluding their dependencies.';
  const extended =
    'extended - all installed dependencies, including nth-order dependencies.';
  const { type } = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: `Select type of Build of Materials (BOM):\n${standard}\n${extended}`,
      choices: ['standard', 'extended', 'both'],
      default: 'standard',
    },
  ]);

  getBom(type);
}

main();
