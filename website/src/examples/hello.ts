import type { ExampleDefinition } from '../types';

export const hello: ExampleDefinition = {
  id: 'hello',
  label: 'Hello World',
  code: `console.log('Hello from Node.js in the browser!');
console.log('This is a proof of concept');
console.log('Date:', new Date().toISOString());

export default { status: 'success', message: 'Hello World!' };`,
};
