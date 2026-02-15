/**
 * CommonJS querystring module tests
 */
const querystring = require('querystring');
const { parse, stringify, escape, unescape } = require('querystring');

// Also test node: protocol
const qsNode = require('node:querystring');

// Test basic functions
const parseResult = parse('foo=bar&baz=qux');
const stringifyResult = stringify({ foo: 'bar', baz: 'qux' });
const escapeResult = escape('hello world');
const unescapeResult = unescape('hello+world');

// Test node: protocol works
const nodeProtocolParse = qsNode.parse('test=value');

module.exports = {
  // Function availability
  hasParse: typeof parse === 'function',
  hasStringify: typeof stringify === 'function',
  hasEscape: typeof escape === 'function',
  hasUnescape: typeof unescape === 'function',
  hasDefault: typeof querystring === 'object',

  // Return values are correct types
  parseIsObject: typeof parseResult === 'object',
  stringifyIsString: typeof stringifyResult === 'string',
  escapeIsString: typeof escapeResult === 'string',
  unescapeIsString: typeof unescapeResult === 'string',

  // Specific checks
  parseCorrect: parseResult.foo === 'bar' && parseResult.baz === 'qux',
  stringifyCorrect: stringifyResult.includes('foo=bar') && stringifyResult.includes('baz=qux'),
  escapeCorrect: escapeResult === 'hello+world',
  unescapeCorrect: unescapeResult === 'hello world',

  // node: protocol test
  nodeProtocolWorks: nodeProtocolParse.test === 'value',
};
