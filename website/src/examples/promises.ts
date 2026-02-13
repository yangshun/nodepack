import type { ExampleDefinition } from '../types';

export const promises: ExampleDefinition = {
  id: 'promises',
  label: 'Promises',
  code: `// Promises example
console.log('Creating a promise...');

const basicPromise = new Promise((resolve) => {
  setTimeout(() => {
    resolve(42);
  }, 500);
});

basicPromise.then((result) => {
  console.log('Promise resolved with:', result);
});

console.log('Initialized promises...');
`,
};
