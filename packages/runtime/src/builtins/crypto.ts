/**
 * Crypto module implementation
 * Provides Node.js-compatible crypto APIs using pure JavaScript implementations
 * Note: Uses JS implementations instead of Web Crypto API for synchronous compatibility
 */

import type { QuickJSContext, QuickJSHandle } from 'quickjs-emscripten';
import { addModuleFunction } from './helpers.js';

/**
 * Pure JavaScript hash implementations
 * These are synchronous and work within QuickJS execution context
 */

// MD5 implementation
function md5(data: Uint8Array): Uint8Array {
  function rotateLeft(value: number, shift: number): number {
    return (value << shift) | (value >>> (32 - shift));
  }

  function addUnsigned(x: number, y: number): number {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }

  const x: number[] = [];
  for (let i = 0; i < data.length; i++) {
    x[i >> 2] |= data[i] << ((i % 4) * 8);
  }

  x[data.length >> 2] |= 0x80 << ((data.length % 4) * 8);
  x[(((data.length + 8) >>> 6) << 4) + 14] = data.length * 8;

  const S11 = 7,
    S12 = 12,
    S13 = 17,
    S14 = 22;
  const S21 = 5,
    S22 = 9,
    S23 = 14,
    S24 = 20;
  const S31 = 4,
    S32 = 11,
    S33 = 16,
    S34 = 23;
  const S41 = 6,
    S42 = 10,
    S43 = 15,
    S44 = 21;

  let a = 0x67452301,
    b = 0xefcdab89,
    c = 0x98badcfe,
    d = 0x10325476;

  for (let k = 0; k < x.length; k += 16) {
    const AA = a,
      BB = b,
      CC = c,
      DD = d;

    a = addUnsigned(a, addUnsigned(addUnsigned((b & c) | (~b & d), x[k + 0]), 0xd76aa478));
    a = addUnsigned(rotateLeft(a, S11), b);
    d = addUnsigned(d, addUnsigned(addUnsigned((a & b) | (~a & c), x[k + 1]), 0xe8c7b756));
    d = addUnsigned(rotateLeft(d, S12), a);
    c = addUnsigned(c, addUnsigned(addUnsigned((d & a) | (~d & b), x[k + 2]), 0x242070db));
    c = addUnsigned(rotateLeft(c, S13), d);
    b = addUnsigned(b, addUnsigned(addUnsigned((c & d) | (~c & a), x[k + 3]), 0xc1bdceee));
    b = addUnsigned(rotateLeft(b, S14), c);
    a = addUnsigned(a, addUnsigned(addUnsigned((b & c) | (~b & d), x[k + 4]), 0xf57c0faf));
    a = addUnsigned(rotateLeft(a, S11), b);
    d = addUnsigned(d, addUnsigned(addUnsigned((a & b) | (~a & c), x[k + 5]), 0x4787c62a));
    d = addUnsigned(rotateLeft(d, S12), a);
    c = addUnsigned(c, addUnsigned(addUnsigned((d & a) | (~d & b), x[k + 6]), 0xa8304613));
    c = addUnsigned(rotateLeft(c, S13), d);
    b = addUnsigned(b, addUnsigned(addUnsigned((c & d) | (~c & a), x[k + 7]), 0xfd469501));
    b = addUnsigned(rotateLeft(b, S14), c);
    a = addUnsigned(a, addUnsigned(addUnsigned((b & c) | (~b & d), x[k + 8]), 0x698098d8));
    a = addUnsigned(rotateLeft(a, S11), b);
    d = addUnsigned(d, addUnsigned(addUnsigned((a & b) | (~a & c), x[k + 9]), 0x8b44f7af));
    d = addUnsigned(rotateLeft(d, S12), a);
    c = addUnsigned(c, addUnsigned(addUnsigned((d & a) | (~d & b), x[k + 10]), 0xffff5bb1));
    c = addUnsigned(rotateLeft(c, S13), d);
    b = addUnsigned(b, addUnsigned(addUnsigned((c & d) | (~c & a), x[k + 11]), 0x895cd7be));
    b = addUnsigned(rotateLeft(b, S14), c);
    a = addUnsigned(a, addUnsigned(addUnsigned((b & c) | (~b & d), x[k + 12]), 0x6b901122));
    a = addUnsigned(rotateLeft(a, S11), b);
    d = addUnsigned(d, addUnsigned(addUnsigned((a & b) | (~a & c), x[k + 13]), 0xfd987193));
    d = addUnsigned(rotateLeft(d, S12), a);
    c = addUnsigned(c, addUnsigned(addUnsigned((d & a) | (~d & b), x[k + 14]), 0xa679438e));
    c = addUnsigned(rotateLeft(c, S13), d);
    b = addUnsigned(b, addUnsigned(addUnsigned((c & d) | (~c & a), x[k + 15]), 0x49b40821));
    b = addUnsigned(rotateLeft(b, S14), c);

    a = addUnsigned(a, addUnsigned(addUnsigned((b & d) | (c & ~d), x[k + 1]), 0xf61e2562));
    a = addUnsigned(rotateLeft(a, S21), b);
    d = addUnsigned(d, addUnsigned(addUnsigned((a & c) | (b & ~c), x[k + 6]), 0xc040b340));
    d = addUnsigned(rotateLeft(d, S22), a);
    c = addUnsigned(c, addUnsigned(addUnsigned((d & b) | (a & ~b), x[k + 11]), 0x265e5a51));
    c = addUnsigned(rotateLeft(c, S23), d);
    b = addUnsigned(b, addUnsigned(addUnsigned((c & a) | (d & ~a), x[k + 0]), 0xe9b6c7aa));
    b = addUnsigned(rotateLeft(b, S24), c);
    a = addUnsigned(a, addUnsigned(addUnsigned((b & d) | (c & ~d), x[k + 5]), 0xd62f105d));
    a = addUnsigned(rotateLeft(a, S21), b);
    d = addUnsigned(d, addUnsigned(addUnsigned((a & c) | (b & ~c), x[k + 10]), 0x2441453));
    d = addUnsigned(rotateLeft(d, S22), a);
    c = addUnsigned(c, addUnsigned(addUnsigned((d & b) | (a & ~b), x[k + 15]), 0xd8a1e681));
    c = addUnsigned(rotateLeft(c, S23), d);
    b = addUnsigned(b, addUnsigned(addUnsigned((c & a) | (d & ~a), x[k + 4]), 0xe7d3fbc8));
    b = addUnsigned(rotateLeft(b, S24), c);
    a = addUnsigned(a, addUnsigned(addUnsigned((b & d) | (c & ~d), x[k + 9]), 0x21e1cde6));
    a = addUnsigned(rotateLeft(a, S21), b);
    d = addUnsigned(d, addUnsigned(addUnsigned((a & c) | (b & ~c), x[k + 14]), 0xc33707d6));
    d = addUnsigned(rotateLeft(d, S22), a);
    c = addUnsigned(c, addUnsigned(addUnsigned((d & b) | (a & ~b), x[k + 3]), 0xf4d50d87));
    c = addUnsigned(rotateLeft(c, S23), d);
    b = addUnsigned(b, addUnsigned(addUnsigned((c & a) | (d & ~a), x[k + 8]), 0x455a14ed));
    b = addUnsigned(rotateLeft(b, S24), c);
    a = addUnsigned(a, addUnsigned(addUnsigned((b & d) | (c & ~d), x[k + 13]), 0xa9e3e905));
    a = addUnsigned(rotateLeft(a, S21), b);
    d = addUnsigned(d, addUnsigned(addUnsigned((a & c) | (b & ~c), x[k + 2]), 0xfcefa3f8));
    d = addUnsigned(rotateLeft(d, S22), a);
    c = addUnsigned(c, addUnsigned(addUnsigned((d & b) | (a & ~b), x[k + 7]), 0x676f02d9));
    c = addUnsigned(rotateLeft(c, S23), d);
    b = addUnsigned(b, addUnsigned(addUnsigned((c & a) | (d & ~a), x[k + 12]), 0x8d2a4c8a));
    b = addUnsigned(rotateLeft(b, S24), c);

    a = addUnsigned(a, addUnsigned(addUnsigned(b ^ c ^ d, x[k + 5]), 0xfffa3942));
    a = addUnsigned(rotateLeft(a, S31), b);
    d = addUnsigned(d, addUnsigned(addUnsigned(a ^ b ^ c, x[k + 8]), 0x8771f681));
    d = addUnsigned(rotateLeft(d, S32), a);
    c = addUnsigned(c, addUnsigned(addUnsigned(d ^ a ^ b, x[k + 11]), 0x6d9d6122));
    c = addUnsigned(rotateLeft(c, S33), d);
    b = addUnsigned(b, addUnsigned(addUnsigned(c ^ d ^ a, x[k + 14]), 0xfde5380c));
    b = addUnsigned(rotateLeft(b, S34), c);
    a = addUnsigned(a, addUnsigned(addUnsigned(b ^ c ^ d, x[k + 1]), 0xa4beea44));
    a = addUnsigned(rotateLeft(a, S31), b);
    d = addUnsigned(d, addUnsigned(addUnsigned(a ^ b ^ c, x[k + 4]), 0x4bdecfa9));
    d = addUnsigned(rotateLeft(d, S32), a);
    c = addUnsigned(c, addUnsigned(addUnsigned(d ^ a ^ b, x[k + 7]), 0xf6bb4b60));
    c = addUnsigned(rotateLeft(c, S33), d);
    b = addUnsigned(b, addUnsigned(addUnsigned(c ^ d ^ a, x[k + 10]), 0xbebfbc70));
    b = addUnsigned(rotateLeft(b, S34), c);
    a = addUnsigned(a, addUnsigned(addUnsigned(b ^ c ^ d, x[k + 13]), 0x289b7ec6));
    a = addUnsigned(rotateLeft(a, S31), b);
    d = addUnsigned(d, addUnsigned(addUnsigned(a ^ b ^ c, x[k + 0]), 0xeaa127fa));
    d = addUnsigned(rotateLeft(d, S32), a);
    c = addUnsigned(c, addUnsigned(addUnsigned(d ^ a ^ b, x[k + 3]), 0xd4ef3085));
    c = addUnsigned(rotateLeft(c, S33), d);
    b = addUnsigned(b, addUnsigned(addUnsigned(c ^ d ^ a, x[k + 6]), 0x4881d05));
    b = addUnsigned(rotateLeft(b, S34), c);
    a = addUnsigned(a, addUnsigned(addUnsigned(b ^ c ^ d, x[k + 9]), 0xd9d4d039));
    a = addUnsigned(rotateLeft(a, S31), b);
    d = addUnsigned(d, addUnsigned(addUnsigned(a ^ b ^ c, x[k + 12]), 0xe6db99e5));
    d = addUnsigned(rotateLeft(d, S32), a);
    c = addUnsigned(c, addUnsigned(addUnsigned(d ^ a ^ b, x[k + 15]), 0x1fa27cf8));
    c = addUnsigned(rotateLeft(c, S33), d);
    b = addUnsigned(b, addUnsigned(addUnsigned(c ^ d ^ a, x[k + 2]), 0xc4ac5665));
    b = addUnsigned(rotateLeft(b, S34), c);

    a = addUnsigned(a, addUnsigned(addUnsigned(c ^ (b | ~d), x[k + 0]), 0xf4292244));
    a = addUnsigned(rotateLeft(a, S41), b);
    d = addUnsigned(d, addUnsigned(addUnsigned(b ^ (a | ~c), x[k + 7]), 0x432aff97));
    d = addUnsigned(rotateLeft(d, S42), a);
    c = addUnsigned(c, addUnsigned(addUnsigned(a ^ (d | ~b), x[k + 14]), 0xab9423a7));
    c = addUnsigned(rotateLeft(c, S43), d);
    b = addUnsigned(b, addUnsigned(addUnsigned(d ^ (c | ~a), x[k + 5]), 0xfc93a039));
    b = addUnsigned(rotateLeft(b, S44), c);
    a = addUnsigned(a, addUnsigned(addUnsigned(c ^ (b | ~d), x[k + 12]), 0x655b59c3));
    a = addUnsigned(rotateLeft(a, S41), b);
    d = addUnsigned(d, addUnsigned(addUnsigned(b ^ (a | ~c), x[k + 3]), 0x8f0ccc92));
    d = addUnsigned(rotateLeft(d, S42), a);
    c = addUnsigned(c, addUnsigned(addUnsigned(a ^ (d | ~b), x[k + 10]), 0xffeff47d));
    c = addUnsigned(rotateLeft(c, S43), d);
    b = addUnsigned(b, addUnsigned(addUnsigned(d ^ (c | ~a), x[k + 1]), 0x85845dd1));
    b = addUnsigned(rotateLeft(b, S44), c);
    a = addUnsigned(a, addUnsigned(addUnsigned(c ^ (b | ~d), x[k + 8]), 0x6fa87e4f));
    a = addUnsigned(rotateLeft(a, S41), b);
    d = addUnsigned(d, addUnsigned(addUnsigned(b ^ (a | ~c), x[k + 15]), 0xfe2ce6e0));
    d = addUnsigned(rotateLeft(d, S42), a);
    c = addUnsigned(c, addUnsigned(addUnsigned(a ^ (d | ~b), x[k + 6]), 0xa3014314));
    c = addUnsigned(rotateLeft(c, S43), d);
    b = addUnsigned(b, addUnsigned(addUnsigned(d ^ (c | ~a), x[k + 13]), 0x4e0811a1));
    b = addUnsigned(rotateLeft(b, S44), c);
    a = addUnsigned(a, addUnsigned(addUnsigned(c ^ (b | ~d), x[k + 4]), 0xf7537e82));
    a = addUnsigned(rotateLeft(a, S41), b);
    d = addUnsigned(d, addUnsigned(addUnsigned(b ^ (a | ~c), x[k + 11]), 0xbd3af235));
    d = addUnsigned(rotateLeft(d, S42), a);
    c = addUnsigned(c, addUnsigned(addUnsigned(a ^ (d | ~b), x[k + 2]), 0x2ad7d2bb));
    c = addUnsigned(rotateLeft(c, S43), d);
    b = addUnsigned(b, addUnsigned(addUnsigned(d ^ (c | ~a), x[k + 9]), 0xeb86d391));
    b = addUnsigned(rotateLeft(b, S44), c);

    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }

  const result = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    result[i] = ([a, b, c, d][i >> 2] >>> ((i % 4) * 8)) & 0xff;
  }
  return result;
}

// SHA-1 implementation
function sha1(data: Uint8Array): Uint8Array {
  function rotateLeft(n: number, s: number): number {
    return (n << s) | (n >>> (32 - s));
  }

  const msgLength = data.length * 8;
  const paddedLength = Math.ceil((data.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(data);
  padded[data.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 4, msgLength, false);

  let h0 = 0x67452301,
    h1 = 0xefcdab89,
    h2 = 0x98badcfe,
    h3 = 0x10325476,
    h4 = 0xc3d2e1f0;

  for (let chunk = 0; chunk < paddedLength; chunk += 64) {
    const w: number[] = new Array(80);

    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(chunk + i * 4, false);
    }

    for (let i = 16; i < 80; i++) {
      w[i] = rotateLeft(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    }

    let a = h0,
      b = h1,
      c = h2,
      d = h3,
      e = h4;

    for (let i = 0; i < 80; i++) {
      let f, k;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (rotateLeft(a, 5) + f + e + k + w[i]) | 0;
      e = d;
      d = c;
      c = rotateLeft(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  const result = new Uint8Array(20);
  const resultView = new DataView(result.buffer);
  resultView.setUint32(0, h0, false);
  resultView.setUint32(4, h1, false);
  resultView.setUint32(8, h2, false);
  resultView.setUint32(12, h3, false);
  resultView.setUint32(16, h4, false);

  return result;
}

// SHA-256 implementation
function sha256(data: Uint8Array): Uint8Array {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const msgLength = data.length * 8;
  const paddedLength = Math.ceil((data.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(data);
  padded[data.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 4, msgLength, false);

  let h0 = 0x6a09e667,
    h1 = 0xbb67ae85,
    h2 = 0x3c6ef372,
    h3 = 0xa54ff53a;
  let h4 = 0x510e527f,
    h5 = 0x9b05688c,
    h6 = 0x1f83d9ab,
    h7 = 0x5be0cd19;

  for (let chunk = 0; chunk < paddedLength; chunk += 64) {
    const w: number[] = new Array(64);

    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(chunk + i * 4, false);
    }

    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    let a = h0,
      b = h1,
      c = h2,
      d = h3,
      e = h4,
      f = h5,
      g = h6,
      h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const result = new Uint8Array(32);
  const resultView = new DataView(result.buffer);
  resultView.setUint32(0, h0, false);
  resultView.setUint32(4, h1, false);
  resultView.setUint32(8, h2, false);
  resultView.setUint32(12, h3, false);
  resultView.setUint32(16, h4, false);
  resultView.setUint32(20, h5, false);
  resultView.setUint32(24, h6, false);
  resultView.setUint32(28, h7, false);

  return result;
}

// SHA-512 and SHA-384 implementation (shared 64-bit logic)
function sha512base(data: Uint8Array, outputBits: 384 | 512): Uint8Array {
  const K = [
    0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd, 0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
    0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019, 0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
    0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe, 0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
    0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1, 0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
    0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3, 0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
    0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483, 0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
    0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210, 0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
    0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725, 0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
    0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926, 0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
    0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8, 0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
    0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001, 0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
    0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910, 0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
    0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53, 0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
    0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb, 0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
    0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60, 0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
    0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9, 0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
    0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207, 0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
    0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6, 0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
    0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493, 0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
    0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a, 0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817,
  ];

  // Simple 64-bit arithmetic using two 32-bit integers [high, low]
  function add64(a: [number, number], b: [number, number]): [number, number] {
    const low = (a[1] + b[1]) >>> 0;
    const high = (a[0] + b[0] + (low < a[1] ? 1 : 0)) >>> 0;
    return [high, low];
  }

  function rotr64(n: number, x: [number, number]): [number, number] {
    if (n < 32) {
      return [(x[0] >>> n) | (x[1] << (32 - n)), (x[1] >>> n) | (x[0] << (32 - n))];
    } else {
      const m = n - 32;
      return [(x[1] >>> m) | (x[0] << (32 - m)), (x[0] >>> m) | (x[1] << (32 - m))];
    }
  }

  function shr64(n: number, x: [number, number]): [number, number] {
    if (n < 32) {
      return [x[0] >>> n, (x[1] >>> n) | (x[0] << (32 - n))];
    } else {
      return [0, x[0] >>> (n - 32)];
    }
  }

  // Prepare message blocks
  const blocks: number[] = [];
  for (let i = 0; i < data.length; i++) {
    blocks[i >> 2] |= data[i] << (24 - (i % 4) * 8);
  }
  blocks[data.length >> 2] |= 0x80 << (24 - (data.length % 4) * 8);

  const bitLength = data.length * 8;
  const blockIndex = (((data.length + 8) >> 7) << 5) + 31;
  blocks[blockIndex - 1] = bitLength >>> 0;
  blocks[blockIndex] = 0;

  // Initial hash values
  let h: [number, number][];
  if (outputBits === 384) {
    h = [
      [0xcbbb9d5d, 0xc1059ed8],
      [0x629a292a, 0x367cd507],
      [0x9159015a, 0x3070dd17],
      [0x152fecd8, 0xf70e5939],
      [0x67332667, 0xffc00b31],
      [0x8eb44a87, 0x68581511],
      [0xdb0c2e0d, 0x64f98fa7],
      [0x47b5481d, 0xbefa4fa4],
    ];
  } else {
    h = [
      [0x6a09e667, 0xf3bcc908],
      [0xbb67ae85, 0x84caa73b],
      [0x3c6ef372, 0xfe94f82b],
      [0xa54ff53a, 0x5f1d36f1],
      [0x510e527f, 0xade682d1],
      [0x9b05688c, 0x2b3e6c1f],
      [0x1f83d9ab, 0xfb41bd6b],
      [0x5be0cd19, 0x137e2179],
    ];
  }

  // Process blocks
  for (let i = 0; i < blocks.length; i += 32) {
    const w: [number, number][] = [];
    for (let j = 0; j < 16; j++) {
      w[j] = [blocks[i + j * 2] >>> 0, blocks[i + j * 2 + 1] >>> 0];
    }

    for (let j = 16; j < 80; j++) {
      const s0a = rotr64(1, w[j - 15]);
      const s0b = rotr64(8, w[j - 15]);
      const s0c = shr64(7, w[j - 15]);
      const s0: [number, number] = [s0a[0] ^ s0b[0] ^ s0c[0], s0a[1] ^ s0b[1] ^ s0c[1]];

      const s1a = rotr64(19, w[j - 2]);
      const s1b = rotr64(61, w[j - 2]);
      const s1c = shr64(6, w[j - 2]);
      const s1: [number, number] = [s1a[0] ^ s1b[0] ^ s1c[0], s1a[1] ^ s1b[1] ^ s1c[1]];

      w[j] = add64(add64(add64(w[j - 16], s0), w[j - 7]), s1);
    }

    let [a, b, c, d, e, f, g, hh] = h;

    for (let j = 0; j < 80; j++) {
      const S1a = rotr64(14, e);
      const S1b = rotr64(18, e);
      const S1c = rotr64(41, e);
      const S1: [number, number] = [S1a[0] ^ S1b[0] ^ S1c[0], S1a[1] ^ S1b[1] ^ S1c[1]];

      const ch: [number, number] = [(e[0] & f[0]) ^ (~e[0] & g[0]), (e[1] & f[1]) ^ (~e[1] & g[1])];
      const temp1 = add64(add64(add64(add64(hh, S1), ch), [K[j * 2], K[j * 2 + 1]]), w[j]);

      const S0a = rotr64(28, a);
      const S0b = rotr64(34, a);
      const S0c = rotr64(39, a);
      const S0: [number, number] = [S0a[0] ^ S0b[0] ^ S0c[0], S0a[1] ^ S0b[1] ^ S0c[1]];

      const maj: [number, number] = [
        (a[0] & b[0]) ^ (a[0] & c[0]) ^ (b[0] & c[0]),
        (a[1] & b[1]) ^ (a[1] & c[1]) ^ (b[1] & c[1]),
      ];
      const temp2 = add64(S0, maj);

      hh = g;
      g = f;
      f = e;
      e = add64(d, temp1);
      d = c;
      c = b;
      b = a;
      a = add64(temp1, temp2);
    }

    h = [
      add64(h[0], a),
      add64(h[1], b),
      add64(h[2], c),
      add64(h[3], d),
      add64(h[4], e),
      add64(h[5], f),
      add64(h[6], g),
      add64(h[7], hh),
    ];
  }

  // Convert to byte array
  const resultSize = outputBits / 8;
  const result = new Uint8Array(resultSize);
  for (let i = 0; i < resultSize; i++) {
    const wordIdx = i >> 3;
    const byteInWord = i % 8;
    result[i] =
      byteInWord < 4
        ? (h[wordIdx][0] >>> (24 - (byteInWord % 4) * 8)) & 0xff
        : (h[wordIdx][1] >>> (24 - (byteInWord % 4) * 8)) & 0xff;
  }
  return result;
}

function sha512(data: Uint8Array): Uint8Array {
  return sha512base(data, 512);
}

function sha384(data: Uint8Array): Uint8Array {
  return sha512base(data, 384);
}

/**
 * Compute hash synchronously
 */
function computeHashSync(algorithm: string, data: Uint8Array): Uint8Array {
  const normalizedAlgo = algorithm.toLowerCase().replace(/-/g, '');

  switch (normalizedAlgo) {
    case 'md5':
      return md5(data);
    case 'sha1':
      return sha1(data);
    case 'sha256':
      return sha256(data);
    case 'sha384':
      return sha384(data);
    case 'sha512':
      return sha512(data);
    default:
      throw new Error(`Unsupported hash algorithm: ${algorithm}`);
  }
}

/**
 * Compute HMAC synchronously using pure JS
 */
function computeHmacSync(algorithm: string, key: Uint8Array, data: Uint8Array): Uint8Array {
  const blockSize =
    algorithm.toLowerCase().includes('sha512') || algorithm.toLowerCase().includes('sha384')
      ? 128
      : 64;

  // Pad or hash the key if necessary
  let keyPadded = new Uint8Array(blockSize);
  if (key.length > blockSize) {
    const hashedKey = computeHashSync(algorithm, key);
    keyPadded.set(hashedKey);
  } else {
    keyPadded.set(key);
  }

  // Create inner and outer padding
  const iPad = new Uint8Array(blockSize);
  const oPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    iPad[i] = keyPadded[i] ^ 0x36;
    oPad[i] = keyPadded[i] ^ 0x5c;
  }

  // Compute HMAC: H(oPad || H(iPad || message))
  const innerData = new Uint8Array(blockSize + data.length);
  innerData.set(iPad);
  innerData.set(data, blockSize);
  const innerHash = computeHashSync(algorithm, innerData);

  const outerData = new Uint8Array(blockSize + innerHash.length);
  outerData.set(oPad);
  outerData.set(innerHash, blockSize);
  return computeHashSync(algorithm, outerData);
}

export function createCryptoModule(vm: QuickJSContext): QuickJSHandle {
  const cryptoObj = vm.newObject();

  // Host function: __computeHashSync(algorithm, data) -> Uint8Array
  addModuleFunction(vm, cryptoObj, '__computeHashSync', (algoHandle, dataHandle) => {
    const algorithm = vm.dump(algoHandle);
    const data = vm.dump(dataHandle);

    if (typeof algorithm !== 'string') {
      throw new Error('Algorithm must be a string');
    }

    // Convert data to Uint8Array
    const encoder = new TextEncoder();
    let dataBytes: Uint8Array;

    if (typeof data === 'string') {
      dataBytes = encoder.encode(data);
    } else if (Array.isArray(data)) {
      dataBytes = new Uint8Array(data);
    } else if (data instanceof Uint8Array) {
      dataBytes = data;
    } else {
      throw new Error('Data must be string or array');
    }

    // Compute hash
    const resultBytes = computeHashSync(algorithm, dataBytes);

    // Convert to QuickJS array
    const arrayHandle = vm.newArray();
    for (let i = 0; i < resultBytes.length; i++) {
      const numHandle = vm.newNumber(resultBytes[i]);
      vm.setProp(arrayHandle, i, numHandle);
      numHandle.dispose();
    }

    return arrayHandle;
  });

  // Host function: __computeHmacSync(algorithm, key, data) -> Uint8Array
  addModuleFunction(vm, cryptoObj, '__computeHmacSync', (algoHandle, keyHandle, dataHandle) => {
    const algorithm = vm.dump(algoHandle);
    const key = vm.dump(keyHandle);
    const data = vm.dump(dataHandle);

    if (typeof algorithm !== 'string') {
      throw new Error('Algorithm must be a string');
    }

    const encoder = new TextEncoder();

    // Convert key to Uint8Array
    let keyBytes: Uint8Array;
    if (typeof key === 'string') {
      keyBytes = encoder.encode(key);
    } else if (Array.isArray(key)) {
      keyBytes = new Uint8Array(key);
    } else if (key instanceof Uint8Array) {
      keyBytes = key;
    } else {
      throw new Error('Key must be string or array');
    }

    // Convert data to Uint8Array
    let dataBytes: Uint8Array;
    if (typeof data === 'string') {
      dataBytes = encoder.encode(data);
    } else if (Array.isArray(data)) {
      dataBytes = new Uint8Array(data);
    } else if (data instanceof Uint8Array) {
      dataBytes = data;
    } else {
      throw new Error('Data must be string or array');
    }

    // Compute HMAC
    const resultBytes = computeHmacSync(algorithm, keyBytes, dataBytes);

    // Convert to QuickJS array
    const arrayHandle = vm.newArray();
    for (let i = 0; i < resultBytes.length; i++) {
      const numHandle = vm.newNumber(resultBytes[i]);
      vm.setProp(arrayHandle, i, numHandle);
      numHandle.dispose();
    }

    return arrayHandle;
  });

  // Host function: __randomBytes(size) -> Uint8Array
  addModuleFunction(vm, cryptoObj, '__randomBytes', (sizeHandle) => {
    const size = vm.dump(sizeHandle);

    if (typeof size !== 'number' || size < 0 || size > 65536) {
      throw new Error('Size must be a number between 0 and 65536');
    }

    // Use browser's crypto.getRandomValues()
    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);

    // Convert to QuickJS array
    const arrayHandle = vm.newArray();
    for (let i = 0; i < bytes.length; i++) {
      const numHandle = vm.newNumber(bytes[i]);
      vm.setProp(arrayHandle, i, numHandle);
      numHandle.dispose();
    }

    return arrayHandle;
  });

  // Host function: __randomUUID() -> string
  addModuleFunction(vm, cryptoObj, '__randomUUID', () => {
    return vm.newString(crypto.randomUUID());
  });

  // QuickJS code for Hash and Hmac classes
  const cryptoCode = `
    // Encoding helpers
    function arrayToHex(arr) {
      return Array.from(arr)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    function arrayToBase64(arr) {
      const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let result = '';
      let i = 0;

      while (i < arr.length) {
        const byte1 = arr[i++];
        const byte2 = i < arr.length ? arr[i++] : 0;
        const byte3 = i < arr.length ? arr[i++] : 0;

        const encoded1 = byte1 >> 2;
        const encoded2 = ((byte1 & 3) << 4) | (byte2 >> 4);
        const encoded3 = ((byte2 & 15) << 2) | (byte3 >> 6);
        const encoded4 = byte3 & 63;

        result += base64Chars[encoded1];
        result += base64Chars[encoded2];
        result += i - 1 < arr.length ? base64Chars[encoded3] : '=';
        result += i < arr.length ? base64Chars[encoded4] : '=';
      }

      return result;
    }

    function stringToByteArray(str) {
      const bytes = [];
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code < 128) {
          bytes.push(code);
        } else if (code < 2048) {
          bytes.push(192 | (code >> 6), 128 | (code & 63));
        } else if (code < 65536) {
          bytes.push(224 | (code >> 12), 128 | ((code >> 6) & 63), 128 | (code & 63));
        } else {
          bytes.push(240 | (code >> 18), 128 | ((code >> 12) & 63), 128 | ((code >> 6) & 63), 128 | (code & 63));
        }
      }
      return bytes;
    }

    // Hash class
    class Hash {
      constructor(algorithm) {
        this.algorithm = algorithm;
        this.chunks = [];
        this.finalized = false;
      }

      update(data, encoding = 'utf8') {
        if (this.finalized) {
          throw new Error('Digest already called');
        }

        let chunk;
        if (typeof data === 'string') {
          chunk = data;
        } else if (globalThis.__nodepack_buffer?.Buffer?.isBuffer(data)) {
          chunk = data.toString(encoding);
        } else if (Array.isArray(data) || data instanceof Uint8Array) {
          let str = '';
          for (let i = 0; i < data.length; i++) {
            str += String.fromCharCode(data[i]);
          }
          chunk = str;
        } else {
          throw new Error('Data must be string, Buffer, or Uint8Array');
        }

        this.chunks.push(chunk);
        return this;
      }

      digest(encoding) {
        if (this.finalized) {
          throw new Error('Digest already called');
        }
        this.finalized = true;

        const combined = this.chunks.join('');
        const resultArray = globalThis.__nodepack_crypto.__computeHashSync(
          this.algorithm,
          combined
        );

        if (!encoding || encoding === 'hex') {
          return arrayToHex(resultArray);
        } else if (encoding === 'base64') {
          return arrayToBase64(resultArray);
        } else if (encoding === 'buffer') {
          if (globalThis.__nodepack_buffer?.Buffer) {
            return globalThis.__nodepack_buffer.Buffer.from(resultArray);
          }
          return resultArray;
        } else {
          return resultArray;
        }
      }
    }

    // Hmac class
    class Hmac {
      constructor(algorithm, key) {
        this.algorithm = algorithm;

        if (typeof key === 'string') {
          this.key = stringToByteArray(key);
        } else if (globalThis.__nodepack_buffer?.Buffer?.isBuffer(key)) {
          this.key = Array.from(key);
        } else if (Array.isArray(key) || key instanceof Uint8Array) {
          this.key = Array.from(key);
        } else {
          throw new Error('Key must be string, Buffer, or Uint8Array');
        }

        this.chunks = [];
        this.finalized = false;
      }

      update(data, encoding = 'utf8') {
        if (this.finalized) {
          throw new Error('Digest already called');
        }

        let chunk;
        if (typeof data === 'string') {
          chunk = data;
        } else if (globalThis.__nodepack_buffer?.Buffer?.isBuffer(data)) {
          chunk = data.toString(encoding);
        } else if (Array.isArray(data) || data instanceof Uint8Array) {
          let str = '';
          for (let i = 0; i < data.length; i++) {
            str += String.fromCharCode(data[i]);
          }
          chunk = str;
        } else {
          throw new Error('Data must be string, Buffer, or Uint8Array');
        }

        this.chunks.push(chunk);
        return this;
      }

      digest(encoding) {
        if (this.finalized) {
          throw new Error('Digest already called');
        }
        this.finalized = true;

        const combined = this.chunks.join('');
        const resultArray = globalThis.__nodepack_crypto.__computeHmacSync(
          this.algorithm,
          this.key,
          combined
        );

        if (!encoding || encoding === 'hex') {
          return arrayToHex(resultArray);
        } else if (encoding === 'base64') {
          return arrayToBase64(resultArray);
        } else if (encoding === 'buffer') {
          if (globalThis.__nodepack_buffer?.Buffer) {
            return globalThis.__nodepack_buffer.Buffer.from(resultArray);
          }
          return resultArray;
        } else {
          return resultArray;
        }
      }
    }

    // Public API
    const crypto = {
      createHash: function createHash(algorithm) {
        return new Hash(algorithm);
      },

      createHmac: function createHmac(algorithm, key) {
        return new Hmac(algorithm, key);
      },

      randomBytes: function randomBytes(size) {
        const arr = globalThis.__nodepack_crypto.__randomBytes(size);
        if (globalThis.__nodepack_buffer?.Buffer) {
          return globalThis.__nodepack_buffer.Buffer.from(arr);
        }
        return arr;
      },

      randomUUID: function randomUUID() {
        return globalThis.__nodepack_crypto.__randomUUID();
      }
    };

    crypto;
  `;

  const result = vm.evalCode(cryptoCode);
  if (result.error) {
    const error = vm.dump(result.error);
    result.error.dispose();
    throw new Error(`Failed to create crypto module: ${error}`);
  }

  // Merge host functions into the crypto object
  const cryptoHandle = result.value;

  const hostFunctions = ['__computeHashSync', '__computeHmacSync', '__randomBytes', '__randomUUID'];

  for (const funcName of hostFunctions) {
    const funcHandle = vm.getProp(cryptoObj, funcName);
    vm.setProp(cryptoHandle, funcName, funcHandle);
    funcHandle.dispose();
  }

  cryptoObj.dispose();
  return cryptoHandle;
}
