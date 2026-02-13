const { URL, URLSearchParams } = require('url');

const url = new URL('https://example.com:8080/path?foo=bar&baz=qux#hash');

const params = new URLSearchParams('foo=bar&baz=qux');
const fooValue = params.get('foo');

module.exports = {
  protocol: url.protocol,
  hostname: url.hostname,
  port: url.port,
  pathname: url.pathname,
  hash: url.hash,
  fooValue,
  hasURL: URL !== undefined,
  hasURLSearchParams: URLSearchParams !== undefined,
};
