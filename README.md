# Software Bill of Materials Generator

## Usage

```
npx bom-generator
```

## About

A simple script that generates a software bill of materials (list of all dependencies used by the project) for NodeJS projects from either:
- `package.json` - for only direct dependencies
- `[package-lock.json/pnpm-lock.yaml]` - for subdependencies as well

### Supported package managers
- npm
- pnpm
- bun

## Example

```
# Extended Bill of Materials Example

[inquirer (^12.0.0)](https://npmjs.com/package/inquirer)
[node_modules/@inquirer/checkbox (4.0.0)](https://registry.npmjs.org/@inquirer/checkbox)
|__ [@inquirer/core (^10.0.0)](https://npmjs.com/package/@inquirer/core)
|__ [@inquirer/figures (^1.0.7)](https://npmjs.com/package/@inquirer/figures)
|__ [@inquirer/type (^3.0.0)](https://npmjs.com/package/@inquirer/type)
|__ [ansi-escapes (^4.3.2)](https://npmjs.com/package/ansi-escapes)
|__ [yoctocolors-cjs (^2.1.2)](https://npmjs.com/package/yoctocolors-cjs)
[node_modules/@inquirer/confirm (5.0.0)](https://registry.npmjs.org/@inquirer/confirm)
|__ [@inquirer/core (^10.0.0)](https://npmjs.com/package/@inquirer/core)
|__ [@inquirer/type (^3.0.0)](https://npmjs.com/package/@inquirer/type)
[node_modules/@inquirer/core (10.0.0)](https://registry.npmjs.org/@inquirer/core)
|__ [@inquirer/figures (^1.0.7)](https://npmjs.com/package/@inquirer/figures)
|__ [@inquirer/type (^3.0.0)](https://npmjs.com/package/@inquirer/type)
|__ [ansi-escapes (^4.3.2)](https://npmjs.com/package/ansi-escapes)
|__ [cli-width (^4.1.0)](https://npmjs.com/package/cli-width)
...
```

## Todo
- yarn lock support
