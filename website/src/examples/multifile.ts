import type { ExampleDefinition } from '../types';

export const multifile: ExampleDefinition = {
  id: 'multifile',
  label: 'Multi-file Import',
  code: `// Import from our custom utility module
import { greet, add, multiply, PI, version } from './utils.js';

console.log(greet('World'));
console.log('2 + 3 =', add(2, 3));
console.log('4 × 5 =', multiply(4, 5));
console.log('PI =', PI);
console.log('Utils version:', version);

// Import from another custom module
import { quadruple, square, cube, factorial } from './math-helpers.js';

console.log('');
console.log('5² =', square(5));
console.log('3³ =', cube(3));
console.log('5! =', factorial(5));

// You can also mix builtin and custom imports
import { existsSync } from 'fs';

console.log('');
console.log('Does /utils.js exist?', existsSync('/utils.js'));
console.log('Does /math-helpers.js exist?', existsSync('/math-helpers.js'));

export default {
  greeting: greet('User'),
  sum: add(10, 20),
  quad: quadruple(10),
  square: square(7),
  version
};`,
  files: {
    'utils.js': `export function greet(name) {
  return 'Hello, ' + name + '!';
}

export function add(a, b) {
  return a + b;
}

export function double(a) {
  return a * 2;
}

export function multiply(a, b) {
  return a * b;
}

export const PI = 3.14159;
export const version = '1.0.0';`,
    'math-helpers.js': `import { double } from './utils.js';

export function quadruple(x) {
  return double(double(x));
}

export function square(x) {
  return x * x;
}

export function cube(x) {
  return x * x * x;
}

export function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}`,
  },
};
