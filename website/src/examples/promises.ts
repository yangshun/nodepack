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
  files: {
    'package.json': JSON.stringify(
      {
        name: 'promises-example',
        version: '1.0.0',
        scripts: {
          start: 'node main.js',
        },
      },
      null,
      2,
    ),
  },
};
