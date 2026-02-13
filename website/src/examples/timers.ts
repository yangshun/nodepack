import type { ExampleDefinition } from '../types';

export const timers: ExampleDefinition = {
  id: 'timers',
  label: 'Timers',
  code: `// Using setTimeout and setInterval
let count = 0;

console.log('Setting up timers...');

setTimeout(() => {
  console.log('Timeout 1: This runs after 500ms');
}, 500);

setTimeout(() => {
  console.log('Timeout 2: This runs after 1 second');
}, 1000);

setTimeout(() => {
  console.log('Timeout 3: This runs after 2 seconds');
}, 2000);

const intervalId = setInterval(() => {
  count++;
  console.log('Interval tick:', count);

  if (count >= 3) {
    clearInterval(intervalId);
    console.log('Interval cleared after 3 ticks');
  }
}, 600);

// You can also import from the timers module
import { setTimeout as setTimeoutAlt } from 'timers';

setTimeoutAlt(() => {
  console.log('Using imported setTimeout from timers module');
}, 1500);

// Demonstrating closures work with timers
const message = 'Closures work!';
setTimeout(() => {
  console.log('Closure test:', message);
}, 800);

console.log('All timers scheduled!');
`,
};
