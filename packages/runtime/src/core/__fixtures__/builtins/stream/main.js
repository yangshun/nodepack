/**
 * ESM stream module tests
 */
import stream from 'stream';
import { Readable, Writable, Duplex, Transform, PassThrough, pipeline, finished } from 'stream';

// Test 1: Readable stream - manually trigger read
const readable = new Readable({
  read() {},
});

let readableChunks = [];
let readableEnded = false;

readable.on('data', (chunk) => {
  readableChunks.push(chunk);
});

readable.on('end', () => {
  readableEnded = true;
});

// Start flowing mode
readable.resume();

// Push data
readable.push('chunk0');
readable.push('chunk1');
readable.push('chunk2');
readable.push(null); // End the stream

// Test 2: Writable stream (synchronous _write)
let writableData = [];
let writableFinished = false;

const writable = new Writable({
  write(chunk, encoding, callback) {
    writableData.push(chunk);
    callback();
  },
  final(callback) {
    callback();
  },
});

writable.on('finish', () => {
  writableFinished = true;
});

writable.write('test1');
writable.write('test2');
writable.end();

// Test 3: Transform stream
let transformData = [];
let transformOutput = [];

const transform = new Transform({
  transform(chunk, encoding, callback) {
    const upperChunk = chunk.toString().toUpperCase();
    transformData.push(upperChunk);
    callback(null, upperChunk);
  },
});

transform.on('data', (chunk) => {
  transformOutput.push(chunk);
});

transform.resume();
transform.write('hello');
transform.write('world');
transform.end();

// Test 4: PassThrough stream
const passthrough = new PassThrough();
let passthroughData = [];

passthrough.on('data', (chunk) => {
  passthroughData.push(chunk);
});

passthrough.resume();
passthrough.write('pass1');
passthrough.write('pass2');
passthrough.end();

// Test 5: Pipe
const source = new Readable({
  read() {},
});

let pipeData = [];
const dest = new Writable({
  write(chunk, encoding, callback) {
    pipeData.push(chunk);
    callback();
  },
});

source.pipe(dest);
source.push('piped');
source.push(null);

// Test 6: Duplex stream
let duplexReadData = [];
let duplexWriteData = [];

const duplex = new Duplex({
  read() {},
  write(chunk, encoding, callback) {
    duplexWriteData.push(chunk);
    callback();
  },
});

duplex.on('data', (chunk) => {
  duplexReadData.push(chunk);
});

duplex.resume();
duplex.push('duplex-read');
duplex.write('duplex-write');
duplex.push(null);
duplex.end();

// Test 7: Pause and resume
const pausable = new Readable({
  read() {},
});

let pausedChunks = [];
let pauseCalled = false;
let resumeCalled = false;

pausable.on('data', (chunk) => {
  pausedChunks.push(chunk);
});

pausable.on('pause', () => {
  pauseCalled = true;
});

pausable.on('resume', () => {
  resumeCalled = true;
});

pausable.pause();
pausable.resume();
pausable.push('a');
pausable.push('b');
pausable.push('c');
pausable.push(null);

// Give streams time to process
await new Promise((resolve) => setTimeout(resolve, 100));

export default {
  // Module availability
  hasStream: typeof stream === 'object',
  hasReadable: typeof Readable === 'function',
  hasWritable: typeof Writable === 'function',
  hasDuplex: typeof Duplex === 'function',
  hasTransform: typeof Transform === 'function',
  hasPassThrough: typeof PassThrough === 'function',
  hasPipeline: typeof pipeline === 'function',
  hasFinished: typeof finished === 'function',

  // Readable tests
  readableChunksLength: readableChunks.length,
  readableEnded: readableEnded,
  readableHasData: readableChunks.length > 0,

  // Writable tests
  writableDataLength: writableData.length,
  writableFinished: writableFinished,
  writableData0: writableData[0],
  writableData1: writableData[1],

  // Transform tests
  transformDataLength: transformData.length,
  transformOutputLength: transformOutput.length,
  transformUppercase: transformData[0] === 'HELLO' && transformData[1] === 'WORLD',

  // PassThrough tests
  passthroughDataLength: passthroughData.length,
  passthroughCorrect: passthroughData[0] === 'pass1' && passthroughData[1] === 'pass2',

  // Pipe tests
  pipeDataLength: pipeData.length,
  pipeCorrect: pipeData[0] === 'piped',

  // Duplex tests
  duplexReadDataLength: duplexReadData.length,
  duplexWriteDataLength: duplexWriteData.length,
  duplexReadCorrect: duplexReadData[0] === 'duplex-read',
  duplexWriteCorrect: duplexWriteData[0] === 'duplex-write',

  // Pause/resume tests
  pauseWorks: pauseCalled,
  resumeWorks: resumeCalled,
  pausedChunksLength: pausedChunks.length,
};
