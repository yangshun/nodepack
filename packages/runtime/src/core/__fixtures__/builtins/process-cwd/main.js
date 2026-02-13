// Test process.cwd() and process.chdir()
const initialCwd = process.cwd();

// Change directory
process.chdir('/home/user');
const afterChdir = process.cwd();

// Change back
process.chdir('/');
const backToRoot = process.cwd();

export default {
  initialCwd,
  afterChdir,
  backToRoot,
  hasCwd: typeof process.cwd === 'function',
  hasChdir: typeof process.chdir === 'function',
};
