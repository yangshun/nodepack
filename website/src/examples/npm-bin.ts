import type { ExampleDefinition } from '../types';

export const npmBin: ExampleDefinition = {
  id: 'npm-bin',
  label: 'npm bin executables',
  files: {
    'main.js': `// Cowsay usage example, installed as a dependency in package.json

import { say } from 'cowsay';

console.log(say({
  text : "I'm a moooodule",
  e : "oO",
  T : "U "
}));
`,
    'package.json': JSON.stringify(
      {
        name: 'npm-bin-demo',
        version: '1.0.0',
        type: 'module',
        scripts: {
          tree: 'npx tree --dirs-first -L 2',
          start: 'node main.js',
          'list-bins': 'npm bin --list',
          'bin-dir': 'ls -la /node_modules/.bin/',
        },
        dependencies: {
          cowsay: '^1.5.0',
          'tree-node-cli': '^1.6.0',
        },
      },
      null,
      2,
    ),
  },
};
