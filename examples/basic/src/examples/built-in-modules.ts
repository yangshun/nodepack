import type { ExampleDefinition } from '../types';

export const builtInModules: ExampleDefinition = {
  id: 'modules',
  label: 'Built-in Modules',
  code: `// Using ES module imports
import { join, dirname, basename, extname } from 'path';
import process from 'process';

const fullPath = join('/home', 'user', 'documents', 'file.txt');
const dir = dirname(fullPath);
const file = basename(fullPath);
const ext = extname(fullPath);

console.log('Full path:', fullPath);
console.log('Directory:', dir);
console.log('Filename:', file);
console.log('Extension:', ext);

// Using process module
console.log('Platform:', process.platform);
console.log('Version:', process.version);
console.log('Working dir:', process.cwd());

export default { fullPath, dir, file, ext };`,
};
