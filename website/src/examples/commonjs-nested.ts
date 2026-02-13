import type { ExampleDefinition } from '../types';

export const commonjsNested: ExampleDefinition = {
  id: 'commonjs-nested',
  label: 'Nested require() Calls',
  code: `// Demonstrating nested requires and __filename/__dirname

// Require module A (which itself requires module B)
const moduleA = require('./module-a.js');

const info = moduleA.getInfo();

console.log('Module A:');
console.log('  Name:', info.self.name);
console.log('  __dirname:', info.self.location);
console.log('  __filename:', info.self.file);

console.log('');
console.log('Module B (required by A):');
console.log('  Name:', info.dependency.name);
console.log('  __dirname:', info.dependency.location);
console.log('  __filename:', info.dependency.file);

console.log('');
console.log('✓ Nested requires work correctly!');
console.log('✓ __filename and __dirname are properly set!');

module.exports = info;
`,
  files: {
    'module-b.js': `// Module B - Has its own __filename and __dirname
exports.name = 'Module B';
exports.location = __dirname;
exports.file = __filename;

exports.getData = function() {
  return {
    name: exports.name,
    location: exports.location,
    file: exports.file
  };
};
`,
    'module-a.js': `// Module A - Requires Module B
const moduleB = require('./module-b.js');

exports.name = 'Module A';
exports.location = __dirname;
exports.file = __filename;

exports.getInfo = function() {
  return {
    self: {
      name: exports.name,
      location: exports.location,
      file: exports.file
    },
    dependency: moduleB.getData()
  };
};
`,
  },
};
