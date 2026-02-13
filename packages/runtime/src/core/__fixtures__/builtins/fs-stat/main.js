import fs from 'fs';

// Create a test directory and file
fs.mkdirSync('/test-dir', { recursive: true });
fs.writeFileSync('/test-dir/file.txt', 'Test content');

// Test statSync on file
const fileStats = fs.statSync('/test-dir/file.txt');

// Test statSync on directory
const dirStats = fs.statSync('/test-dir');

// Test readdirSync
const files = fs.readdirSync('/test-dir');

export default {
  hasStatSync: typeof fs.statSync === 'function',
  hasReaddirSync: typeof fs.readdirSync === 'function',
  fileIsFile: fileStats.isFile(),
  fileIsDirectory: fileStats.isDirectory(),
  fileSize: fileStats.size,
  dirIsFile: dirStats.isFile(),
  dirIsDirectory: dirStats.isDirectory(),
  filesInDir: files,
};
