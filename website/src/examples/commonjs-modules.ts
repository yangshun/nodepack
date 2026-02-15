import type { ExampleDefinition } from '../types';

export const commonjsModules: ExampleDefinition = {
  id: 'commonjs-modules',
  label: 'CommonJS Local Modules',
  files: {
    'main.js': `// Using require() with local modules

// Require the modules (files are pre-created below)
const math = require('./math.js');
const utils = require('./utils.js');

console.log('Using math module (exports.x pattern):');
console.log('  2 + 3 =', math.add(2, 3));
console.log('  4 × 5 =', math.multiply(4, 5));
console.log('  PI =', math.PI);

console.log('');
console.log('Using utils module (module.exports pattern):');
console.log(' ', utils.greet('World'));
console.log('  Current time:', utils.formatDate());

// Demonstrate module caching
const math2 = require('./math.js');
console.log('');
console.log('Module caching works:', math === math2); // true

module.exports = {
  sum: math.add(10, 20),
  greeting: utils.greet('CommonJS User')
};
`,
    'math.js': `// CommonJS module using exports.x pattern
exports.add = function(a, b) {
  return a + b;
};

exports.multiply = function(a, b) {
  return a * b;
};

exports.PI = 3.14159;
`,
    'utils.js': `// CommonJS module using module.exports pattern
module.exports = {
  greet: function(name) {
    return 'Hello, ' + name + '!';
  },

  formatDate: function() {
    return new Date().toISOString();
  }
};
`,
  },
};
