# Software Bill of Material Generator

## Usage

```
npx bom-generator
```

## About

A simple script that generates a software bill of materials (list of all dependencies used by the project) for NodeJS projects from either:
- `package.json` - for only direct dependencies
- `package-lock.json` - for subdependencies as well

## Todo
- [ ] pnpm lock support
- [ ] yarn lock support
- [ ] bun lock support 