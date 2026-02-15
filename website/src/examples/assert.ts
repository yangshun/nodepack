import type { ExampleDefinition } from '../types';

export const assert: ExampleDefinition = {
  id: 'assert',
  label: 'Assert (unit tests)',
  files: {
    'main.js': `// Basic unit testing with Node.js assert module
import assert from 'assert';

function add(a, b) {
  return a + b;
}

function isEven(n) {
  throw new Error('Not implemented');
}

// Test add
assert.strictEqual(add(2, 3), 5);
assert.strictEqual(add(-1, 1), 0);
assert.strictEqual(add(0, 0), 0);
console.log('add: all tests passed');

// Test isEven
assert.strictEqual(isEven(2), true);
assert.strictEqual(isEven(3), false);
assert.strictEqual(isEven(0), true);
console.log('isEven: all tests passed');

// Deep equality for objects and arrays
assert.deepStrictEqual([1, 2, 3].map((n) => n * 2), [2, 4, 6]);
assert.deepStrictEqual({ name: 'Alice', age: 30 }, { name: 'Alice', age: 30 });
console.log('deep equality: all tests passed');
`,
    'package.json': JSON.stringify(
      {
        name: 'assert-example',
        version: '1.0.0',
        scripts: {
          test: 'node main.js',
        },
      },
      null,
      2,
    ),
  },
};
