/**
 * CommonJS http module tests
 */
const http = require('http');
const { request, get, STATUS_CODES } = require('http');

// Also test node: protocol
const httpNode = require('node:http');

// Test STATUS_CODES
const hasStatusCodes = typeof STATUS_CODES === 'object';
const status200 = STATUS_CODES[200];

// Test that functions exist
const hasRequest = typeof request === 'function';
const hasGet = typeof get === 'function';

// Test that we can create a request object (without sending it)
const req = request({
  protocol: 'http:',
  hostname: 'example.com',
  port: 80,
  path: '/',
  method: 'GET',
});

module.exports = {
  // Module availability
  hasHttp: typeof http === 'object',
  hasRequest: hasRequest,
  hasGet: hasGet,
  hasStatusCodes: hasStatusCodes,

  // STATUS_CODES
  status200Correct: status200 === 'OK',

  // Request object
  requestCreated: typeof req === 'object',
  requestHasWrite: typeof req.write === 'function',
  requestHasEnd: typeof req.end === 'function',

  // node: protocol test
  nodeProtocolWorks: typeof httpNode.get === 'function',
};
