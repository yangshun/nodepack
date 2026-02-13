import type { ExampleDefinition } from '../types';

export const lodash: ExampleDefinition = {
  id: 'packages',
  label: 'Lodash',
  code: `import _ from 'lodash-es';

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
`,
  files: {
    'package.json': JSON.stringify(
      {
        name: 'lodash-example',
        version: '1.0.0',
        dependencies: {
          'lodash-es': '^4.17.21',
        },
      },
      null,
      2,
    ),
  },
};
