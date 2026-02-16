import type { ExampleDefinition } from '../types';

export const npmBin: ExampleDefinition = {
  id: 'npm-bin',
  label: 'npm bin executables',
  files: {
    'main.js': `// NPM Bin Field Support Demo
// This example demonstrates three ways to execute bin commands from installed packages

console.log('NPM Bin Executables Demo');
console.log('========================');
console.log('');
console.log('After running "npm install", try these commands in the terminal:');
console.log('');
console.log('1. List available bin commands:');
console.log('   npm bin --list');
console.log('   npm bin           (shows bin directory path)');
console.log('');
console.log('2. Run with npx (recommended):');
console.log('   npx prettier --version');
console.log('   npx prettier --help');
console.log('');
console.log('3. Run directly by name:');
console.log('   prettier --version');
console.log('   prettier --help');
console.log('');
console.log('4. Use in npm scripts:');
console.log('   npm run format');
console.log('   npm run check');
console.log('');
console.log('Notes:');
console.log('- Bin commands are installed to /node_modules/.bin/');
console.log('- Use npx to run newly installed bins (always works)');
console.log('- Direct execution available on terminal startup');
console.log('- Some CLI tools may have limited functionality in browser');`,
    'package.json': JSON.stringify(
      {
        name: 'npm-bin-demo',
        version: '1.0.0',
        scripts: {
          check: 'echo "Bin executables work in npm scripts!"',
          format: 'prettier --version',
          'list-bins': 'npm bin --list',
          'show-bin-dir': 'ls -la /node_modules/.bin/',
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
