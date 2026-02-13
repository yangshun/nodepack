import type { ExampleDefinition } from '../types';

export const clsx: ExampleDefinition = {
  id: 'clsx',
  label: 'clsx',
  code: `import { clsx } from 'clsx';

console.log(clsx('foo', true && 'bar', 'baz'));
//=> 'foo bar baz'

// Objects
console.log(clsx({ foo: true, bar: false }));
//=> 'foo'

// Objects (variadic)
console.log(clsx(
  { foo: true }, { bar:false }, null, { '--foobar':'hello' },
));
//=> 'foo --foobar'

// Arrays
console.log(clsx(['foo', 0, false, 'bar']));
`,
  files: {
    'package.json': JSON.stringify(
      {
        name: 'clsx-example',
        version: '1.0.0',
        dependencies: {
          clsx: '^2.1.0',
        },
      },
      null,
      2,
    ),
  },
};
