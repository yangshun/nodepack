const config = require('/config.js');

module.exports = {
  fetch: function (endpoint) {
    return config.apiUrl + endpoint;
  },
  getTimeout: function () {
    return config.timeout;
  },
};
