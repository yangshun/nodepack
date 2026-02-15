/**
 * HTTP module implementation
 * Provides Node.js-compatible HTTP client using Fetch API
 * Note: Server functionality is limited in browser environment
 */

import type { QuickJSContext, QuickJSHandle } from 'quickjs-emscripten';

export function createHttpModule(vm: QuickJSContext): QuickJSHandle {
  // Host function for making HTTP requests using Fetch API
  const fetchRequest = vm.newFunction('__http_fetch', (optionsHandle) => {
    const options = vm.dump(optionsHandle);

    const url = options.protocol + '//' + options.hostname + (options.port ? ':' + options.port : '') + (options.path || '/');
    const method = options.method || 'GET';
    const headers = options.headers || {};

    // Return a promise handle
    const fetchPromise = fetch(url, {
      method,
      headers,
      body: options.body || undefined,
    })
      .then(async (response) => {
        const text = await response.text();
        return {
          statusCode: response.status,
          statusMessage: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: text,
        };
      })
      .catch((error) => {
        return {
          error: error.message || String(error),
        };
      });

    // Convert to QuickJS promise
    const promiseHandle = vm.newPromise();
    promiseHandle.resolve(fetchPromise);

    return promiseHandle.handle;
  });

  const httpObj = vm.newObject();
  vm.setProp(httpObj, '__fetch', fetchRequest);
  fetchRequest.dispose();

  // Evaluate http implementation in QuickJS
  const httpCode = `
    // Get required modules
    const HttpEventEmitter = globalThis.__nodepack_events.EventEmitter;
    const HttpReadable = globalThis.__nodepack_stream.Readable;

    /**
     * IncomingMessage - represents HTTP response
     */
    class IncomingMessage extends HttpReadable {
      constructor(statusCode, statusMessage, headers, body) {
        super();
        this.statusCode = statusCode;
        this.statusMessage = statusMessage;
        this.headers = headers;
        this.httpVersion = '1.1';
        this.complete = false;
        this._body = body;

        // Push body data
        if (body) {
          this.push(body);
        }
        this.push(null);
        this.complete = true;
      }

      setTimeout(msecs, callback) {
        // Not implemented in browser
        return this;
      }
    }

    /**
     * ClientRequest - represents HTTP request
     */
    class ClientRequest extends HttpEventEmitter {
      constructor(options, callback) {
        super();
        this.method = options.method || 'GET';
        this.path = options.path || '/';
        this.headers = options.headers || {};
        this._chunks = [];
        this._callback = callback;
        this._options = options;
        this.finished = false;
        this.destroyed = false;

        if (callback) {
          this.on('response', callback);
        }
      }

      write(chunk, encoding, callback) {
        if (typeof encoding === 'function') {
          callback = encoding;
          encoding = 'utf8';
        }

        if (this.finished) {
          const err = new Error('write after end');
          if (callback) {
            callback(err);
          } else {
            this.emit('error', err);
          }
          return false;
        }

        this._chunks.push(chunk);

        if (callback) {
          callback();
        }

        return true;
      }

      end(chunk, encoding, callback) {
        if (typeof chunk === 'function') {
          callback = chunk;
          chunk = null;
          encoding = null;
        } else if (typeof encoding === 'function') {
          callback = encoding;
          encoding = null;
        }

        if (chunk) {
          this.write(chunk, encoding);
        }

        this.finished = true;

        // Make the actual request
        this._makeRequest(callback);

        return this;
      }

      async _makeRequest(callback) {
        try {
          const options = {
            ...this._options,
            body: this._chunks.join(''),
          };

          const response = await globalThis.__nodepack_http.__fetch(options);

          if (response.error) {
            const error = new Error(response.error);
            this.emit('error', error);
            if (callback) callback(error);
            return;
          }

          const incomingMessage = new IncomingMessage(
            response.statusCode,
            response.statusMessage,
            response.headers,
            response.body
          );

          this.emit('response', incomingMessage);
          if (callback) callback(incomingMessage);
        } catch (err) {
          this.emit('error', err);
          if (callback) callback(err);
        }
      }

      abort() {
        this.destroyed = true;
        this.emit('abort');
      }

      setTimeout(msecs, callback) {
        if (callback) {
          this.on('timeout', callback);
        }
        return this;
      }

      setNoDelay(noDelay) {
        // Not applicable in browser
        return this;
      }

      setSocketKeepAlive(enable, initialDelay) {
        // Not applicable in browser
        return this;
      }
    }

    /**
     * Server - mock implementation (not functional in browser)
     */
    class Server extends HttpEventEmitter {
      constructor(options, requestListener) {
        super();
        if (typeof options === 'function') {
          requestListener = options;
          options = {};
        }
        if (requestListener) {
          this.on('request', requestListener);
        }
        this.listening = false;
      }

      listen(port, hostname, backlog, callback) {
        if (typeof port === 'function') {
          callback = port;
          port = 0;
        } else if (typeof hostname === 'function') {
          callback = hostname;
          hostname = undefined;
        } else if (typeof backlog === 'function') {
          callback = backlog;
          backlog = undefined;
        }

        // Cannot actually listen in browser environment
        const error = new Error('HTTP server not supported in browser environment');
        if (callback) {
          setTimeout(() => callback(error), 0);
        } else {
          setTimeout(() => this.emit('error', error), 0);
        }

        return this;
      }

      close(callback) {
        this.listening = false;
        if (callback) {
          callback();
        }
        return this;
      }
    }

    /**
     * ServerResponse - mock implementation
     */
    class ServerResponse extends HttpEventEmitter {
      constructor() {
        super();
        this.statusCode = 200;
        this.statusMessage = 'OK';
        this.headersSent = false;
        this._headers = {};
      }

      writeHead(statusCode, statusMessage, headers) {
        if (typeof statusMessage === 'object') {
          headers = statusMessage;
          statusMessage = undefined;
        }
        this.statusCode = statusCode;
        if (statusMessage) {
          this.statusMessage = statusMessage;
        }
        if (headers) {
          for (const key in headers) {
            this._headers[key.toLowerCase()] = headers[key];
          }
        }
        this.headersSent = true;
        return this;
      }

      setHeader(name, value) {
        this._headers[name.toLowerCase()] = value;
        return this;
      }

      getHeader(name) {
        return this._headers[name.toLowerCase()];
      }

      removeHeader(name) {
        delete this._headers[name.toLowerCase()];
        return this;
      }

      write(chunk, encoding, callback) {
        // Not functional in browser
        if (typeof encoding === 'function') {
          callback = encoding;
        }
        if (callback) {
          callback();
        }
        return true;
      }

      end(chunk, encoding, callback) {
        if (typeof chunk === 'function') {
          callback = chunk;
        } else if (typeof encoding === 'function') {
          callback = encoding;
        }
        if (callback) {
          callback();
        }
        this.emit('finish');
        return this;
      }
    }

    /**
     * HTTP status codes
     */
    const STATUS_CODES = {
      100: 'Continue',
      101: 'Switching Protocols',
      102: 'Processing',
      200: 'OK',
      201: 'Created',
      202: 'Accepted',
      203: 'Non-Authoritative Information',
      204: 'No Content',
      205: 'Reset Content',
      206: 'Partial Content',
      207: 'Multi-Status',
      208: 'Already Reported',
      226: 'IM Used',
      300: 'Multiple Choices',
      301: 'Moved Permanently',
      302: 'Found',
      303: 'See Other',
      304: 'Not Modified',
      305: 'Use Proxy',
      307: 'Temporary Redirect',
      308: 'Permanent Redirect',
      400: 'Bad Request',
      401: 'Unauthorized',
      402: 'Payment Required',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      406: 'Not Acceptable',
      407: 'Proxy Authentication Required',
      408: 'Request Timeout',
      409: 'Conflict',
      410: 'Gone',
      411: 'Length Required',
      412: 'Precondition Failed',
      413: 'Payload Too Large',
      414: 'URI Too Long',
      415: 'Unsupported Media Type',
      416: 'Range Not Satisfiable',
      417: 'Expectation Failed',
      418: "I'm a Teapot",
      421: 'Misdirected Request',
      422: 'Unprocessable Entity',
      423: 'Locked',
      424: 'Failed Dependency',
      425: 'Too Early',
      426: 'Upgrade Required',
      428: 'Precondition Required',
      429: 'Too Many Requests',
      431: 'Request Header Fields Too Large',
      451: 'Unavailable For Legal Reasons',
      500: 'Internal Server Error',
      501: 'Not Implemented',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
      505: 'HTTP Version Not Supported',
      506: 'Variant Also Negotiates',
      507: 'Insufficient Storage',
      508: 'Loop Detected',
      510: 'Not Extended',
      511: 'Network Authentication Required',
    };

    /**
     * HTTP methods
     */
    const METHODS = [
      'ACL', 'BIND', 'CHECKOUT', 'CONNECT', 'COPY', 'DELETE', 'GET', 'HEAD',
      'LINK', 'LOCK', 'M-SEARCH', 'MERGE', 'MKACTIVITY', 'MKCALENDAR', 'MKCOL',
      'MOVE', 'NOTIFY', 'OPTIONS', 'PATCH', 'POST', 'PROPFIND', 'PROPPATCH',
      'PURGE', 'PUT', 'REBIND', 'REPORT', 'SEARCH', 'SOURCE', 'SUBSCRIBE',
      'TRACE', 'UNBIND', 'UNLINK', 'UNLOCK', 'UNSUBSCRIBE',
    ];

    /**
     * Parse URL or options
     */
    function parseOptions(url, options, callback) {
      if (typeof url === 'string') {
        // Parse URL string
        const urlObj = new URL(url);
        const parsedOptions = {
          protocol: urlObj.protocol,
          hostname: urlObj.hostname,
          port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: 'GET',
          headers: {},
        };
        if (options && typeof options === 'object') {
          Object.assign(parsedOptions, options);
        }
        return parsedOptions;
      } else {
        // Already options object
        if (typeof options === 'function') {
          callback = options;
        }
        return {
          protocol: url.protocol || 'http:',
          hostname: url.hostname || url.host || 'localhost',
          port: url.port || 80,
          path: url.path || '/',
          method: url.method || 'GET',
          headers: url.headers || {},
        };
      }
    }

    /**
     * Make HTTP request
     */
    function request(url, options, callback) {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }

      const parsedOptions = parseOptions(url, options, callback);
      return new ClientRequest(parsedOptions, callback);
    }

    /**
     * Convenience GET request
     */
    function get(url, options, callback) {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }

      const parsedOptions = parseOptions(url, options, callback);
      parsedOptions.method = 'GET';

      const req = new ClientRequest(parsedOptions, callback);
      req.end();
      return req;
    }

    /**
     * Create HTTP server
     */
    function createServer(options, requestListener) {
      return new Server(options, requestListener);
    }

    const http = {
      STATUS_CODES,
      METHODS,
      IncomingMessage,
      ClientRequest,
      Server,
      ServerResponse,
      request,
      get,
      createServer,
      // Agent not implemented
      Agent: class Agent {},
      globalAgent: new (class Agent {})(),
    };

    http;
  `;

  const result = vm.evalCode(httpCode);
  if (result.error) {
    const error = vm.dump(result.error);
    result.error.dispose();
    throw new Error(`Failed to create http module: ${error}`);
  }

  const httpHandle = result.value;

  // Attach the fetch function
  const fetchHandle = vm.getProp(httpObj, '__fetch');
  vm.setProp(httpHandle, '__fetch', fetchHandle);
  fetchHandle.dispose();

  httpObj.dispose();

  return httpHandle;
}
