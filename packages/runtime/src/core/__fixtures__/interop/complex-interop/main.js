const formatter = require('/formatter-esm.js');

module.exports = {
  formatted: formatter.formatNumber(5),
  processed: formatter.processData('HELLO', 7),
};
