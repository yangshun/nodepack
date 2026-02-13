import fs from 'fs';

// Test appendFileSync
fs.writeFileSync('/test-append.txt', 'Hello');
fs.appendFileSync('/test-append.txt', ' World');
const appendResult = fs.readFileSync('/test-append.txt', 'utf8');

// Test copyFileSync
fs.writeFileSync('/test-source.txt', 'Source content');
fs.copyFileSync('/test-source.txt', '/test-copy.txt');
const copyResult = fs.readFileSync('/test-copy.txt', 'utf8');

// Test renameSync
fs.writeFileSync('/test-old.txt', 'Content');
fs.renameSync('/test-old.txt', '/test-new.txt');
const renameExists = fs.existsSync('/test-new.txt');
const oldExists = fs.existsSync('/test-old.txt');

// Test rmdirSync
fs.mkdirSync('/test-rmdir');
fs.rmdirSync('/test-rmdir');
const rmdirExists = fs.existsSync('/test-rmdir');

// Test rmSync with file
fs.writeFileSync('/test-rm.txt', 'To remove');
fs.rmSync('/test-rm.txt');
const rmFileExists = fs.existsSync('/test-rm.txt');

// Test rmSync with directory (recursive)
fs.mkdirSync('/test-rm-dir/subdir', { recursive: true });
fs.writeFileSync('/test-rm-dir/file.txt', 'Content');
fs.rmSync('/test-rm-dir', { recursive: true });
const rmDirExists = fs.existsSync('/test-rm-dir');

// Test accessSync
fs.writeFileSync('/test-access.txt', 'Content');
let accessPassed = false;
try {
  fs.accessSync('/test-access.txt', fs.constants.F_OK);
  accessPassed = true;
} catch (e) {
  accessPassed = false;
}

// Test realpathSync
fs.mkdirSync('/real/path', { recursive: true });
fs.writeFileSync('/real/path/file.txt', 'Content');
const realpath = fs.realpathSync('/real/path/file.txt');

// Test constants
const hasConstants = typeof fs.constants === 'object';
const hasFOK = typeof fs.constants.F_OK === 'number';

export default {
  appendResult,
  copyResult,
  renameExists,
  oldExists: oldExists,
  rmdirExists: rmdirExists,
  rmFileExists: rmFileExists,
  rmDirExists: rmDirExists,
  accessPassed,
  realpath,
  hasConstants,
  hasFOK,
};
