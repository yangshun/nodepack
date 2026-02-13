const { greet, farewell } = require('/cjs-utils.js');

module.exports = {
  greeting: greet('World'),
  goodbye: farewell('World'),
};
