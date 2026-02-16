/**
 * ESM querystring module tests
 */
import querystring from 'querystring';
import { parse, stringify, escape, unescape, encode, decode } from 'querystring';

// Test 1: Basic parse
const parseResult = parse('foo=bar&baz=qux');

// Test 2: Parse with duplicate keys (should create array)
const duplicateKeys = parse('foo=bar&foo=baz&foo=qux');

// Test 3: Parse with custom separators
const customSep = parse('foo:bar;baz:qux', ';', ':');

// Test 4: Parse with maxKeys option
const maxKeysResult = parse('a=1&b=2&c=3&d=4&e=5', '&', '=', { maxKeys: 3 });

// Test 5: Parse empty string
const emptyParse = parse('');

// Test 6: Parse with missing value
const missingValue = parse('foo=&bar=baz');

// Test 7: Parse with no equals
const noEquals = parse('foo&bar=baz');

// Test 8: Parse with URL encoding
const encodedParse = parse('name=John+Doe&message=Hello%20World');

// Test 9: Basic stringify
const stringifyResult = stringify({ foo: 'bar', baz: 'qux' });

// Test 10: Stringify with array value
const arrayStringify = stringify({ foo: ['bar', 'baz', 'qux'] });

// Test 11: Stringify with custom separators
const customStringify = stringify({ foo: 'bar', baz: 'qux' }, ';', ':');

// Test 12: Stringify with null/undefined (should output with equals but empty values)
const nullUndefinedStringify = stringify({ foo: 'bar', baz: null, qux: undefined });

// Test 13: Stringify empty object
const emptyStringify = stringify({});

// Test 14: escape() function
const escapeResult = escape('hello world');
const escapeSpecial = escape('a=b&c=d');

// Test 15: unescape() function
const unescapeResult = unescape('hello+world');
const unescapePercent = unescape('Hello%20World');

// Test 16: encode/decode aliases
const encodeResult = encode({ foo: 'bar' });
const decodeResult = decode('foo=bar');

export default {
  // Function availability
  hasParse: typeof parse === 'function',
  hasStringify: typeof stringify === 'function',
  hasEscape: typeof escape === 'function',
  hasUnescape: typeof unescape === 'function',
  hasEncode: typeof encode === 'function',
  hasDecode: typeof decode === 'function',
  hasDefault: typeof querystring === 'object',

  // Parse tests
  parseBasicCorrect: parseResult.foo === 'bar' && parseResult.baz === 'qux',
  duplicateKeysIsArray: Array.isArray(duplicateKeys.foo),
  duplicateKeysLength: duplicateKeys.foo?.length,
  duplicateKeysValues:
    duplicateKeys.foo?.[0] === 'bar' &&
    duplicateKeys.foo?.[1] === 'baz' &&
    duplicateKeys.foo?.[2] === 'qux',
  customSepCorrect: customSep.foo === 'bar' && customSep.baz === 'qux',
  maxKeysRespected: Object.keys(maxKeysResult).length,
  emptyParseIsObject: typeof emptyParse === 'object' && Object.keys(emptyParse).length === 0,
  missingValueCorrect: missingValue.foo === '' && missingValue.bar === 'baz',
  noEqualsCorrect: noEquals.foo === '' && noEquals.bar === 'baz',
  encodedParseCorrect: encodedParse.name === 'John Doe' && encodedParse.message === 'Hello World',

  // Stringify tests
  stringifyBasicCorrect: stringifyResult.includes('foo=bar') && stringifyResult.includes('baz=qux'),
  arrayStringifyCorrect:
    arrayStringify.includes('foo=bar') &&
    arrayStringify.includes('foo=baz') &&
    arrayStringify.includes('foo=qux'),
  customStringifyCorrect:
    customStringify.includes('foo:bar') &&
    customStringify.includes('baz:qux') &&
    customStringify.includes(';'),
  nullUndefinedCorrect:
    nullUndefinedStringify.includes('foo=bar') &&
    nullUndefinedStringify.includes('baz=') &&
    nullUndefinedStringify.includes('qux='),
  emptyStringifyCorrect: emptyStringify === '',

  // Escape/Unescape tests
  escapeSpace: escapeResult === 'hello+world',
  escapeSpecialChars: escapeSpecial.includes('%3D') && escapeSpecial.includes('%26'),
  unescapePlus: unescapeResult === 'hello world',
  unescapePercent: unescapePercent === 'Hello World',

  // Aliases work
  encodeIsAlias: encodeResult === 'foo=bar',
  decodeIsAlias: decodeResult.foo === 'bar',
};
