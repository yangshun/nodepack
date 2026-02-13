/**
 * Buffer module stub
 * Provides minimal Buffer implementation for compatibility
 */

import type { QuickJSContext, QuickJSHandle } from 'quickjs-emscripten';

export function createBufferModule(vm: QuickJSContext): QuickJSHandle {
  const bufferObj = vm.newObject();

  // Evaluate Buffer class directly in QuickJS
  const bufferCode = `
    class Buffer extends Uint8Array {
      static from(value, encoding = 'utf8') {
        if (typeof value === 'string') {
          // Simple UTF-8 string to byte array conversion
          const bytes = [];
          for (let i = 0; i < value.length; i++) {
            const code = value.charCodeAt(i);
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
          return new Buffer(bytes);
        }
        if (Array.isArray(value)) {
          return new Buffer(value);
        }
        if (value instanceof Uint8Array) {
          return new Buffer(value);
        }
        throw new TypeError('First argument must be a string, Buffer, or Array');
      }

      static alloc(size, fill = 0) {
        const buf = new Buffer(size);
        buf.fill(fill);
        return buf;
      }

      static isBuffer(obj) {
        return obj instanceof Buffer;
      }

      toString(encoding = 'utf8') {
        if (encoding === 'utf8' || encoding === 'utf-8') {
          // Simple byte array to UTF-8 string conversion
          let result = '';
          for (let i = 0; i < this.length; i++) {
            const byte = this[i];
            if (byte < 128) {
              result += String.fromCharCode(byte);
            } else if ((byte & 224) === 192) {
              result += String.fromCharCode(((byte & 31) << 6) | (this[++i] & 63));
            } else if ((byte & 240) === 224) {
              result += String.fromCharCode(((byte & 15) << 12) | ((this[++i] & 63) << 6) | (this[++i] & 63));
            } else if ((byte & 248) === 240) {
              i += 3; // Skip multi-byte sequences for simplicity
            }
          }
          return result;
        }
        throw new Error('Unsupported encoding: ' + encoding);
      }
    }

    Buffer;
  `;

  const result = vm.evalCode(bufferCode);
  if (result.error) {
    const error = vm.dump(result.error);
    result.error.dispose();
    throw new Error(`Failed to create Buffer: ${error}`);
  }

  // Get the Buffer class
  vm.setProp(bufferObj, 'Buffer', result.value);
  result.value.dispose();

  return bufferObj;
}
