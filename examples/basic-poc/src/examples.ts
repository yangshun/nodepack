import { ExampleDefinition } from './types';

export const examples: ExampleDefinition[] = [
  {
    id: 'hello',
    label: 'Hello World',
    code: `console.log('Hello from Node.js in the browser!');
console.log('This is a proof of concept');
console.log('Date:', new Date().toISOString());

export default { status: 'success', message: 'Hello World!' };`,
  },
  {
    id: 'modules',
    label: 'Built-in Modules',
    code: `// Using ES module imports
import { join, dirname, basename, extname } from 'path';
import process from 'process';

const fullPath = join('/home', 'user', 'documents', 'file.txt');
const dir = dirname(fullPath);
const file = basename(fullPath);
const ext = extname(fullPath);

console.log('Full path:', fullPath);
console.log('Directory:', dir);
console.log('Filename:', file);
console.log('Extension:', ext);

// Using process module
console.log('Platform:', process.platform);
console.log('Version:', process.version);
console.log('Working dir:', process.cwd());

export default { fullPath, dir, file, ext };`,
  },
  {
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
  },
  {
    id: 'packages',
    label: 'NPM Packages',
    code: `// NPM packages from jsDelivr CDN! 🎉
import _ from 'lodash';

const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

console.log('Numbers:', numbers);
console.log('Sum:', _.sum(numbers));
console.log('Average:', _.mean(numbers));
console.log('Max:', _.max(numbers));
console.log('Min:', _.min(numbers));

console.log('');
console.log('Doubled:', _.map(numbers, n => n * 2));
console.log('Evens:', _.filter(numbers, n => n % 2 === 0));
console.log('First 3:', _.take(numbers, 3));
console.log('Last 3:', _.takeRight(numbers, 3));

console.log('');
console.log('Unique:', _.uniq([1, 2, 2, 3, 3, 4, 4, 5]));
console.log('Shuffle:', _.shuffle([1, 2, 3, 4, 5]));

export default {
  sum: _.sum(numbers),
  average: _.mean(numbers),
  doubled: _.map(numbers, n => n * 2)
};`,
  },
];
