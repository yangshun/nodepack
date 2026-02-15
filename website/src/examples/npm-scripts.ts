import type { ExampleDefinition } from '../types';

export const npmScripts: ExampleDefinition = {
  id: 'npm-scripts',
  label: 'npm scripts',
  files: {
    'main.js': `// NPM Script Support Demo
// This example demonstrates running scripts from package.json

const greet = (name) => {
  console.log(\`Hello, \${name}!\`);
  console.log(\`Current time: \${new Date().toLocaleTimeString()}\`);
  return \`Greeted \${name}\`;
};

const result = greet('Nodepack User');
console.log(\`Result: \${result}\`);
`,
    'package.json': JSON.stringify(
      {
        name: 'npm-scripts-example',
        version: '1.0.0',
        scripts: {
          start: 'node main.js',
          test: 'echo "Tests passed!"',
          dev: 'echo "Development mode" && node main.js',
          build: 'echo "Building..." && ls -la',
        },
      },
      null,
      2,
    ),
  },
};
