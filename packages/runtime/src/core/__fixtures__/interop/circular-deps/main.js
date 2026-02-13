const cjs = require('/cjs-circular.js');

module.exports = {
  cjsName: cjs.name,
  esmName: cjs.getEsmName(),
};
