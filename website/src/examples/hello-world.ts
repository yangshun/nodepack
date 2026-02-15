import type { ExampleDefinition } from '../types';

export const helloWorld: ExampleDefinition = {
  id: 'hello-world',
  label: 'Hello World',
  code: `console.log('Hello from Node.js in the browser!');
console.log('This is a proof of concept');
console.log('Date:', new Date().toISOString());
`,
};
