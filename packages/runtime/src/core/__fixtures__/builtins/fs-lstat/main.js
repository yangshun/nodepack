import fs from 'fs';
import path from 'path';

// Write a test file
const testFile = '/test-file.txt';
fs.writeFileSync(testFile, 'Hello World');

// Get stats using lstatSync
const stats = fs.lstatSync(testFile);

export default {
  hasLstatSync: typeof fs.lstatSync === 'function',
  isFile: stats.isFile(),
  isDirectory: stats.isDirectory(),
  size: stats.size,
  hasMode: typeof stats.mode === 'number',
  hasMtime: typeof stats.mtime === 'string',
};
