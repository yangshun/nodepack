import process from 'process';

// Test process.stdout
const stdoutWriteResult = process.stdout.write('Hello stdout');
const stdoutIsTTY = process.stdout.isTTY;
const stdoutColumns = process.stdout.columns;
const stdoutRows = process.stdout.rows;
const stdoutHasColors = typeof process.stdout.hasColors === 'function';
const stdoutHasColorsResult = process.stdout.hasColors();

// Test process.stderr
const stderrWriteResult = process.stderr.write('Hello stderr');
const stderrIsTTY = process.stderr.isTTY;
const stderrColumns = process.stderr.columns;
const stderrRows = process.stderr.rows;
const stderrHasColors = typeof process.stderr.hasColors === 'function';
const stderrHasColorsResult = process.stderr.hasColors();

// Test process.stdin
const stdinIsTTY = process.stdin.isTTY;
const stdinHasRead = typeof process.stdin.read === 'function';
const stdinHasPause = typeof process.stdin.pause === 'function';
const stdinHasResume = typeof process.stdin.resume === 'function';

export default {
  // stdout tests
  stdoutWriteWorks: stdoutWriteResult === true,
  stdoutIsTTY: stdoutIsTTY === false,
  stdoutColumns: stdoutColumns === 80,
  stdoutRows: stdoutRows === 24,
  stdoutHasColorsFunction: stdoutHasColors === true,
  stdoutHasColorsReturnsFalse: stdoutHasColorsResult === false,

  // stderr tests
  stderrWriteWorks: stderrWriteResult === true,
  stderrIsTTY: stderrIsTTY === false,
  stderrColumns: stderrColumns === 80,
  stderrRows: stderrRows === 24,
  stderrHasColorsFunction: stderrHasColors === true,
  stderrHasColorsReturnsFalse: stderrHasColorsResult === false,

  // stdin tests
  stdinIsTTY: stdinIsTTY === false,
  stdinHasRead: stdinHasRead === true,
  stdinHasPause: stdinHasPause === true,
  stdinHasResume: stdinHasResume === true,
};
