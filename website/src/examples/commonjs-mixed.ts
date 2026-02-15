import type { ExampleDefinition } from '../types';

export const commonjsMixed: ExampleDefinition = {
  id: 'commonjs-mixed',
  label: 'Mixed ES + CommonJS',
  files: {
    'main.js': `// You can mix ES imports and CommonJS requires!

// ES module import (from builtin)
import { writeFileSync } from 'fs';

// CommonJS require (from builtin)
const path = require('path');

// CommonJS require (from local file)
const helpers = require('./helpers.js');

console.log('Mixed module systems demo:');
console.log('  ✓ ES import for writeFileSync');
console.log('  ✓ CommonJS require for path');
console.log('  ✓ CommonJS require for helpers.js');

console.log('');
console.log('Using path module:', path.join('/data', 'file.txt'));
console.log('double(5) =', helpers.double(5));
console.log('triple(5) =', helpers.triple(5));

// You can also require() process
const process = require('process');
console.log('');
console.log('Process platform:', process.platform);

// And use writeFileSync from ES import
writeFileSync('/test.txt', 'Mixed modules work!');
`,
    'helpers.js': `// CommonJS module
exports.double = function(x) {
  return x * 2;
};

exports.triple = function(x) {
  return x * 3;
};
`,
  },
};
