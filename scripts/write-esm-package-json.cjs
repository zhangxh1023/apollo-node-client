const { mkdirSync, writeFileSync } = require('fs');
const { join } = require('path');

const esmDistDir = join(__dirname, '..', 'dist', 'esm');
const packageJsonPath = join(esmDistDir, 'package.json');

mkdirSync(esmDistDir, { recursive: true });
writeFileSync(packageJsonPath, JSON.stringify({ type: 'module' }, null, 2) + '\n');
