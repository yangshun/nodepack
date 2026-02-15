/**
 * Querystring module implementation
 * Provides Node.js-compatible query string parsing and stringification
 */

import type { QuickJSContext, QuickJSHandle } from 'quickjs-emscripten';

export function createQuerystringModule(vm: QuickJSContext): QuickJSHandle {
  // Evaluate querystring implementation in QuickJS
  const qsCode = `
    const querystring = {
      /**
       * Parse a query string into an object
       * @param {string} str - Query string to parse
       * @param {string} sep - Separator between key-value pairs (default '&')
       * @param {string} eq - Separator between keys and values (default '=')
       * @param {object} options - Parsing options
       * @returns {object} Parsed query object
       */
      parse: function parse(str, sep, eq, options) {
        if (typeof str !== 'string') {
          return {};
        }

        sep = sep || '&';
        eq = eq || '=';
        const maxKeys = options && typeof options.maxKeys === 'number' ? options.maxKeys : 1000;
        const decodeURIComponent = options && options.decodeURIComponent || querystring.unescape;

        const obj = {};

        if (str.length === 0) {
          return obj;
        }

        const pairs = str.split(sep);
        let keyCount = 0;

        for (let i = 0; i < pairs.length; i++) {
          if (maxKeys > 0 && keyCount >= maxKeys) {
            break;
          }

          const pair = pairs[i];
          const eqIdx = pair.indexOf(eq);

          let key, value;
          if (eqIdx >= 0) {
            key = pair.substring(0, eqIdx);
            value = pair.substring(eqIdx + 1);
          } else {
            key = pair;
            value = '';
          }

          key = decodeURIComponent(key);
          value = decodeURIComponent(value);

          if (!obj.hasOwnProperty(key)) {
            obj[key] = value;
            keyCount++;
          } else if (Array.isArray(obj[key])) {
            obj[key].push(value);
          } else {
            obj[key] = [obj[key], value];
          }
        }

        return obj;
      },

      /**
       * Stringify an object into a query string
       * @param {object} obj - Object to stringify
       * @param {string} sep - Separator between key-value pairs (default '&')
       * @param {string} eq - Separator between keys and values (default '=')
       * @param {object} options - Stringification options
       * @returns {string} Query string
       */
      stringify: function stringify(obj, sep, eq, options) {
        if (typeof obj !== 'object' || obj === null) {
          return '';
        }

        sep = sep || '&';
        eq = eq || '=';
        const encodeURIComponent = options && options.encodeURIComponent || querystring.escape;

        const pairs = [];

        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            const encodedKey = encodeURIComponent(key);

            if (Array.isArray(value)) {
              for (let i = 0; i < value.length; i++) {
                pairs.push(encodedKey + eq + encodeURIComponent(String(value[i])));
              }
            } else if (value === undefined || value === null) {
              pairs.push(encodedKey + eq);
            } else {
              pairs.push(encodedKey + eq + encodeURIComponent(String(value)));
            }
          }
        }

        return pairs.join(sep);
      },

      /**
       * URL encode a string
       * @param {string} str - String to encode
       * @returns {string} Encoded string
       */
      escape: function escape(str) {
        if (typeof str !== 'string') {
          str = String(str);
        }

        // Encode using encodeURIComponent-like behavior
        let result = '';
        for (let i = 0; i < str.length; i++) {
          const char = str[i];
          const code = str.charCodeAt(i);

          // Unreserved characters: A-Z a-z 0-9 - _ . ~
          if ((code >= 65 && code <= 90) ||  // A-Z
              (code >= 97 && code <= 122) || // a-z
              (code >= 48 && code <= 57) ||  // 0-9
              char === '-' || char === '_' || char === '.' || char === '~') {
            result += char;
          } else if (char === ' ') {
            // Space is encoded as +
            result += '+';
          } else {
            // Encode as percent-encoded
            if (code < 16) {
              result += '%0' + code.toString(16).toUpperCase();
            } else if (code < 128) {
              result += '%' + code.toString(16).toUpperCase();
            } else if (code < 2048) {
              result += '%' + ((code >> 6) | 192).toString(16).toUpperCase();
              result += '%' + ((code & 63) | 128).toString(16).toUpperCase();
            } else if (code < 65536) {
              result += '%' + ((code >> 12) | 224).toString(16).toUpperCase();
              result += '%' + (((code >> 6) & 63) | 128).toString(16).toUpperCase();
              result += '%' + ((code & 63) | 128).toString(16).toUpperCase();
            } else {
              result += '%' + ((code >> 18) | 240).toString(16).toUpperCase();
              result += '%' + (((code >> 12) & 63) | 128).toString(16).toUpperCase();
              result += '%' + (((code >> 6) & 63) | 128).toString(16).toUpperCase();
              result += '%' + ((code & 63) | 128).toString(16).toUpperCase();
            }
          }
        }

        return result;
      },

      /**
       * URL decode a string
       * @param {string} str - String to decode
       * @returns {string} Decoded string
       */
      unescape: function unescape(str) {
        if (typeof str !== 'string') {
          str = String(str);
        }

        let result = '';
        let i = 0;

        while (i < str.length) {
          const char = str[i];

          if (char === '+') {
            result += ' ';
            i++;
          } else if (char === '%' && i + 2 < str.length) {
            const hex1 = str[i + 1];
            const hex2 = str[i + 2];
            const code = parseInt(hex1 + hex2, 16);

            if (!isNaN(code)) {
              // Check if this is a multi-byte UTF-8 sequence
              if (code < 128) {
                result += String.fromCharCode(code);
                i += 3;
              } else if ((code & 0xE0) === 0xC0 && i + 5 < str.length) {
                // 2-byte sequence
                const code2 = parseInt(str[i + 4] + str[i + 5], 16);
                const charCode = ((code & 0x1F) << 6) | (code2 & 0x3F);
                result += String.fromCharCode(charCode);
                i += 6;
              } else if ((code & 0xF0) === 0xE0 && i + 8 < str.length) {
                // 3-byte sequence
                const code2 = parseInt(str[i + 4] + str[i + 5], 16);
                const code3 = parseInt(str[i + 7] + str[i + 8], 16);
                const charCode = ((code & 0x0F) << 12) | ((code2 & 0x3F) << 6) | (code3 & 0x3F);
                result += String.fromCharCode(charCode);
                i += 9;
              } else if ((code & 0xF8) === 0xF0 && i + 11 < str.length) {
                // 4-byte sequence
                const code2 = parseInt(str[i + 4] + str[i + 5], 16);
                const code3 = parseInt(str[i + 7] + str[i + 8], 16);
                const code4 = parseInt(str[i + 10] + str[i + 11], 16);
                const charCode = ((code & 0x07) << 18) | ((code2 & 0x3F) << 12) | ((code3 & 0x3F) << 6) | (code4 & 0x3F);
                result += String.fromCharCode(charCode);
                i += 12;
              } else {
                result += String.fromCharCode(code);
                i += 3;
              }
            } else {
              result += char;
              i++;
            }
          } else {
            result += char;
            i++;
          }
        }

        return result;
      }
    };

    // Aliases
    querystring.encode = querystring.stringify;
    querystring.decode = querystring.parse;

    querystring;
  `;

  const result = vm.evalCode(qsCode);
  if (result.error) {
    const error = vm.dump(result.error);
    result.error.dispose();
    throw new Error(`Failed to create querystring module: ${error}`);
  }

  return result.value;
}
