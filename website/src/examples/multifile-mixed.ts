import type { ExampleDefinition } from '../types';

export const multifileMixed: ExampleDefinition = {
  id: 'multifile-mixed',
  label: 'Multi-file Mixed ESM/CJS',
  files: {
    'main.js': `// Demonstrates mixing ES modules and CommonJS across multiple files
// Files: string-utils.js (ES), math-lib.js (CJS), calculator.js (Mixed), formatter.js (ES)

// Import from mixed module (uses both ES import and require internally)
import { compute } from './calculator.js';

// Import from ES module
import formatter from './formatter.js';

// Require from pure CommonJS module
const math = require('./math-lib.js');

console.log('=== Multi-file Mixed Module System Demo ===\\n');

console.log('File types:');
console.log('  string-utils.js → Pure ES module');
console.log('  math-lib.js → Pure CommonJS');
console.log('  calculator.js → Mixed (ES export + require)');
console.log('  formatter.js → Pure ES module');

console.log('\\nUsing calculator.js (Mixed ES module):');
const result1 = compute('square', 5);
console.log('  Operation:', result1.operation);
console.log('  5² =', result1.result);

const result2 = compute('power', 2, 10);
console.log('  2^10 =', result2.result);

console.log('');
console.log('Using math-lib.js (Pure CommonJS):');
console.log('  7³ =', math.cube(7));

console.log('');
console.log('Using formatter.js (Pure ES module):');
console.log(' ', formatter.formatResult(42));
console.log(' ', formatter.formatReversed('Hello'));

console.log('');
console.log('✓ ES modules and CommonJS work seamlessly together!');
`,
    'string-utils.js': `// Pure ES module with named exports
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function reverse(str) {
  return str.split('').reverse().join('');
}

export const version = '1.0.0';
`,
    'math-lib.js': `// Pure CommonJS module
exports.square = function(x) {
  return x * x;
};

exports.cube = function(x) {
  return x * x * x;
};

exports.power = function(base, exp) {
  return Math.pow(base, exp);
};
`,
    'calculator.js': `// Mixed module - Uses ES import AND require!

// ES import from ES module
import { capitalize } from './string-utils.js';

// CommonJS require from CJS module
const math = require('./math-lib.js');

export function compute(operation, a, b) {
  const result = {
    operation: capitalize(operation),
    input: [a, b],
    result: null
  };

  if (operation === 'square') {
    result.result = math.square(a);
  } else if (operation === 'cube') {
    result.result = math.cube(a);
  } else if (operation === 'power') {
    result.result = math.power(a, b);
  }

  return result;
}`,
    'formatter.js': `// Mixed module - ES module that exports an object
import { reverse } from './string-utils.js';

export default {
  formatResult: function(value) {
    return 'Result: ' + value;
  },

  formatReversed: function(str) {
    return 'Reversed: ' + reverse(str);
  }
};
`,
  },
};
