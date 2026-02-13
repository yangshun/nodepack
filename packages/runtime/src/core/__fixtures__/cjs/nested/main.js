const client = require('/client.js');

module.exports = {
  url: client.fetch('/users'),
  timeout: client.getTimeout(),
};
