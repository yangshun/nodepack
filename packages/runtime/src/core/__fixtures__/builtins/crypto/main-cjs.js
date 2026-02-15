/**
 * CommonJS crypto module tests
 */
const crypto = require('crypto');
const { createHash, createHmac, randomBytes, randomUUID } = require('crypto');

// Also test node: protocol
const cryptoNode = require('node:crypto');

// Test 1: createHash with single update
const hash1 = createHash('sha256');
hash1.update('hello world');
const digest1 = hash1.digest('hex');

// Test 2: createHash with multiple updates (streaming)
const hash2 = createHash('sha256');
hash2.update('hello');
hash2.update(' ');
hash2.update('world');
const digest2 = hash2.digest('hex');

// Test 3: SHA-256 known hash
const hash3 = createHash('sha256');
hash3.update('test');
const sha256TestHash = hash3.digest('hex');

// Test 4: MD5 hash
const md5Hash = createHash('md5');
md5Hash.update('test');
const md5TestHash = md5Hash.digest('hex');

// Test 5: createHmac
const hmac = createHmac('sha256', 'secret-key');
hmac.update('message');
const hmacDigest = hmac.digest('hex');

// Test 6: randomBytes
const bytes = randomBytes(16);
const isBuffer = bytes.length === 16;

// Test 7: randomUUID
const uuid = randomUUID();
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidUUID = uuidRegex.test(uuid);

// Test 8: node: protocol works
const nodeProtocolHash = cryptoNode.createHash('sha256');
nodeProtocolHash.update('test');
const nodeProtocolDigest = nodeProtocolHash.digest('hex');

module.exports = {
  // Function availability
  hasCreateHash: typeof createHash === 'function',
  hasCreateHmac: typeof createHmac === 'function',
  hasRandomBytes: typeof randomBytes === 'function',
  hasRandomUUID: typeof randomUUID === 'function',
  hasCryptoDefault: typeof crypto === 'object',

  // Streaming works
  streamingWorks: digest1 === digest2,

  // Known hash values
  sha256Correct: digest1 === 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
  sha256TestCorrect: sha256TestHash === '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
  md5TestCorrect: md5TestHash === '098f6bcd4621d373cade4e832627b4f6',

  // HMAC tests
  hmacWorks: hmacDigest.length === 64,

  // Random tests
  randomBytesWorks: isBuffer,
  uuidValid: isValidUUID,

  // node: protocol test
  nodeProtocolWorks: nodeProtocolDigest === sha256TestHash,
};
