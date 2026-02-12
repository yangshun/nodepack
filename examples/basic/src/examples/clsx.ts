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

export default {};
`,
};
