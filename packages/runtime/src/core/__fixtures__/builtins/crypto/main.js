/**
 * ESM crypto module tests
 */
import crypto from 'crypto';
import { createHash, createHmac, randomBytes, randomUUID } from 'crypto';

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

// Test 5: SHA-1 hash
const sha1Hash = createHash('sha1');
sha1Hash.update('test');
const sha1TestHash = sha1Hash.digest('hex');

// Test 6: SHA-512 hash
const sha512Hash = createHash('sha512');
sha512Hash.update('test');
const sha512TestHash = sha512Hash.digest('hex');

// Test 7: SHA-384 hash
const sha384Hash = createHash('sha384');
sha384Hash.update('test');
const sha384TestHash = sha384Hash.digest('hex');

// Test 8: Base64 encoding
const hash4 = createHash('sha256');
hash4.update('test');
const base64Digest = hash4.digest('base64');

// Test 9: createHmac
const hmac = createHmac('sha256', 'secret-key');
hmac.update('message');
const hmacDigest = hmac.digest('hex');

// Test 10: HMAC with multiple updates
const hmac2 = createHmac('sha256', 'secret-key');
hmac2.update('mes');
hmac2.update('sage');
const hmacDigest2 = hmac2.digest('hex');

// Test 11: randomBytes
const bytes = randomBytes(16);
const isBuffer = bytes.length === 16;

// Test 12: randomUUID
const uuid = randomUUID();
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidUUID = uuidRegex.test(uuid);

// Test 13: Error handling - double digest
let doubleDigestError = false;
try {
  const h = createHash('sha256');
  h.update('test');
  h.digest('hex');
  h.digest('hex');
} catch (e) {
  doubleDigestError = true;
}

// Test 14: Error handling - invalid algorithm
let invalidAlgoError = false;
try {
  const h = createHash('invalid-algorithm');
  h.update('test');
  h.digest('hex');
} catch (e) {
  invalidAlgoError = true;
}

// Test 15: HMAC double digest error
let hmacDoubleDigestError = false;
try {
  const h = createHmac('sha256', 'key');
  h.update('test');
  h.digest('hex');
  h.digest('hex');
} catch (e) {
  hmacDoubleDigestError = true;
}

// Test 16: randomBytes with invalid size
let invalidSizeError = false;
try {
  randomBytes(100000);
} catch (e) {
  invalidSizeError = true;
}

// Test 17: Multiple randomUUIDs are unique
const uuid1 = randomUUID();
const uuid2 = randomUUID();
const uuidsUnique = uuid1 !== uuid2;

export default {
  // Function availability
  hasCreateHash: typeof createHash === 'function',
  hasCreateHmac: typeof createHmac === 'function',
  hasRandomBytes: typeof randomBytes === 'function',
  hasRandomUUID: typeof randomUUID === 'function',
  hasCryptoDefault: typeof crypto === 'object',

  // Streaming works (multiple updates produce same result as single update)
  streamingWorks: digest1 === digest2,

  // Known hash values (verified against Node.js crypto module)
  sha256HelloWorld: digest1,
  sha256Correct: digest1 === 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',

  // Algorithm-specific tests
  sha256TestHash,
  sha256TestCorrect:
    sha256TestHash === '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',

  md5TestHash,
  md5TestCorrect: md5TestHash === '098f6bcd4621d373cade4e832627b4f6',

  sha1TestHash,
  sha1Length: sha1TestHash.length,

  sha512TestHash,
  sha512Length: sha512TestHash.length,

  sha384TestHash,
  sha384Length: sha384TestHash.length,

  // Encoding tests
  base64Works: base64Digest.length > 0 && base64Digest !== sha256TestHash,

  // HMAC tests
  hmacWorks: hmacDigest.length === 64,
  hmacStreamingWorks: hmacDigest === hmacDigest2,

  // Random tests
  randomBytesWorks: isBuffer,
  randomBytesLength: bytes.length,
  uuidValid: isValidUUID,
  uuidsUnique,

  // Error handling
  doubleDigestThrows: doubleDigestError,
  invalidAlgoThrows: invalidAlgoError,
  hmacDoubleDigestThrows: hmacDoubleDigestError,
  invalidSizeThrows: invalidSizeError,
};
