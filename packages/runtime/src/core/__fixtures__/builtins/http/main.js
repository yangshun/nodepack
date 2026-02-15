/**
 * ESM http module tests
 */
import http from 'http';
import { request, get, createServer, STATUS_CODES, METHODS, ClientRequest, IncomingMessage } from 'http';

// Test 1: http.get() - create a GET request (don't send it)
const getReq = get('http://example.com/test', (res) => {
  // Response handler
});

// Don't send the request, just test that it was created
const getRequestCreated = typeof getReq === 'object';

// Test 2: http.request() - create a POST request (don't send it)
const postReq = request({
  protocol: 'http:',
  hostname: 'example.com',
  port: 80,
  path: '/post',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
}, (res) => {
  // Response handler
});

const requestCreated = typeof postReq === 'object';
const requestHasWrite = typeof postReq.write === 'function';
const requestHasEnd = typeof postReq.end === 'function';

// Test 3: STATUS_CODES constant
const hasStatusCodes = typeof STATUS_CODES === 'object';
const status200 = STATUS_CODES[200];
const status404 = STATUS_CODES[404];
const status500 = STATUS_CODES[500];

// Test 4: METHODS array
const hasMethods = Array.isArray(METHODS);
const hasGetMethod = METHODS.includes('GET');
const hasPostMethod = METHODS.includes('POST');
const hasDeleteMethod = METHODS.includes('DELETE');
const methodsLength = METHODS.length;

// Test 5: createServer (should throw error in browser)
let serverError = null;
let serverErrorMessage = '';
try {
  const server = createServer((req, res) => {
    res.writeHead(200);
    res.end('Hello');
  });
  server.on('error', (err) => {
    serverError = err;
    serverErrorMessage = err.message;
  });
  server.listen(3000);
} catch (err) {
  serverError = err;
  serverErrorMessage = err.message;
}

// Wait a bit for server error to be emitted
await new Promise(resolve => setTimeout(resolve, 100));

// Test 6: Classes are available
const canCreateClientRequest = typeof ClientRequest === 'function';
const canCreateIncomingMessage = typeof IncomingMessage === 'function';

// Test 7: Request methods
const canWriteToRequest = typeof postReq.write === 'function';
const canEndRequest = typeof postReq.end === 'function';
const canAbortRequest = typeof postReq.abort === 'function';
const canSetTimeout = typeof postReq.setTimeout === 'function';

export default {
  // Module availability
  hasHttp: typeof http === 'object',
  hasRequest: typeof request === 'function',
  hasGet: typeof get === 'function',
  hasCreateServer: typeof createServer === 'function',
  hasStatusCodes: hasStatusCodes,
  hasMethods: hasMethods,

  // STATUS_CODES tests
  status200Correct: status200 === 'OK',
  status404Correct: status404 === 'Not Found',
  status500Correct: status500 === 'Internal Server Error',

  // METHODS tests
  hasGetMethod: hasGetMethod,
  hasPostMethod: hasPostMethod,
  hasDeleteMethod: hasDeleteMethod,
  methodsLengthCorrect: methodsLength > 10,

  // GET request tests
  getRequestCreated: getRequestCreated,

  // POST request tests
  requestCreated: requestCreated,
  requestHasWrite: requestHasWrite,
  requestHasEnd: requestHasEnd,

  // Server test (should fail in browser)
  serverErrorOccurred: serverError !== null,
  serverErrorIsCorrect: serverErrorMessage.includes('not supported') || serverErrorMessage.includes('browser'),

  // Classes
  canCreateClientRequest: canCreateClientRequest,
  canCreateIncomingMessage: canCreateIncomingMessage,

  // Request methods
  canWriteToRequest: canWriteToRequest,
  canEndRequest: canEndRequest,
  canAbortRequest: canAbortRequest,
  canSetTimeout: canSetTimeout,
};
