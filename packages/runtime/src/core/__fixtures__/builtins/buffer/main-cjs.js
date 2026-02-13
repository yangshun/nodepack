const { Buffer } = require('buffer');

const buf1 = Buffer.from('hello');
const buf2 = Buffer.alloc(10);
const buf3 = Buffer.from([1, 2, 3, 4, 5]);

const str = buf1.toString('utf8');
const length = buf2.length;
const firstByte = buf3[0];

const isBuffer = Buffer.isBuffer(buf1);

module.exports = {
  str,
  length,
  firstByte,
  isBuffer,
  hasBuffer: Buffer !== undefined,
};
