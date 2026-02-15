import type { ExampleDefinition } from '../types';

export const npmBin: ExampleDefinition = {
  id: 'npm-bin',
  label: 'npm bin executables',
  files: {
    'main.js': `// NPM Bin Field Support Demo
// This example demonstrates how installed packages can expose CLI executables

// When you install a package with a "bin" field in its package.json,
// those executables become available as commands.

// For example, after running "npm install", you can:
// 1. Run bin commands directly in bash: "prettier --version"
// 2. Use them in npm scripts: "npm run format"

// The bin executables are symlinked to /node_modules/.bin/
// and added to PATH automatically.

console.log('Bin executables demo');
console.log('After npm install, try these commands in the terminal:');
console.log('');
console.log('1. Check installed bins:');
console.log('   ls -la /node_modules/.bin/');
console.log('');
console.log('2. Run prettier (if available):');
console.log('   prettier --version');
console.log('');
console.log('3. Run via npm script:');
console.log('   npm run check');
console.log('');

// Note: Some CLI tools may not work fully in the browser environment
// This example demonstrates the bin field support mechanism`,
    'package.json': JSON.stringify(
      {
        name: 'npm-bin-demo',
        version: '1.0.0',
        scripts: {
          check: 'echo "Bin executables are available in npm scripts"',
          format: 'prettier --write .',
          list: 'ls -la /node_modules/.bin/',
        },
        dependencies: {
          // Using a small package that has a bin field
          // Note: Not all CLI functionality works in browser environment
          prettier: '^3.0.0',
        },
      },
      null,
      2,
    ),
  },
};
