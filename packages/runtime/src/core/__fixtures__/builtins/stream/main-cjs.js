/**
 * CommonJS stream module tests
 */
const stream = require('stream');
const { Readable, Writable, Transform } = require('stream');

// Also test node: protocol
const streamNode = require('node:stream');

// Test writable stream (synchronous callback)
let writableData = [];
const writable = new Writable({
  write(chunk, encoding, callback) {
    writableData.push(chunk);
    callback();
  },
});

writable.write('hello');

module.exports = {
  // Function availability
  hasStream: typeof stream === 'object',
  hasReadable: typeof Readable === 'function',
  hasWritable: typeof Writable === 'function',
  hasTransform: typeof Transform === 'function',

  // Return values are correct
  writableDataLength: writableData.length,
  writableCorrect: writableData[0] === 'hello',

  // Test that classes can be instantiated
  canCreateReadable: typeof new Readable({ read() {} }) === 'object',
  canCreateWritable: typeof writable === 'object',
  canCreateTransform:
    typeof new Transform({
      transform(chunk, enc, cb) {
        cb();
      },
    }) === 'object',

  // node: protocol test
  nodeProtocolWorks: typeof streamNode.Readable === 'function',
};
