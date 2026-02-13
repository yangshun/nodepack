import type { ExampleDefinition } from '../types';

export const packageJson: ExampleDefinition = {
  id: 'package-json',
  label: 'Install package.json',
  code: `// Install packages from package.json
// Run: npm install
// This will install both clsx and nanoid from the package.json

import clsx from 'clsx';

const classes = clsx({
  'active': true,
  'disabled': false,
  'highlighted': true
});

console.log('Class names:', classes);

export default {
  classes,
};`,
  files: {
    'package.json': JSON.stringify(
      {
        name: 'example-project',
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
