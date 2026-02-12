import type { ExampleDefinition } from '../types';

export const commonjsBasic: ExampleDefinition = {
  id: 'commonjs-basic',
  label: 'CommonJS require()',
  code: `// CommonJS require() is now supported!
const fs = require('fs');
const path = require('path');
const process = require('process');

// File operations
fs.writeFileSync('/data.txt', 'Hello from CommonJS!');
const content = fs.readFileSync('/data.txt', 'utf8');
console.log('File content:', content);

// Path operations
const fullPath = path.join('/home', 'user', 'file.txt');
console.log('Full path:', fullPath);
console.log('Directory:', path.dirname(fullPath));
console.log('Filename:', path.basename(fullPath));

// Process info
console.log('Platform:', process.platform);
console.log('Working dir:', process.cwd());

module.exports = {
  success: true,
  content,
  fullPath
};`,
};
