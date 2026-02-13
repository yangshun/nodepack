const esmModule = require('/esm-module.js');

module.exports = {
  formatted: esmModule.format('test'),
  prefix: esmModule.prefix,
};
