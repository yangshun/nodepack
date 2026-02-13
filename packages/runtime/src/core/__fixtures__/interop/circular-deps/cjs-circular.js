exports.name = 'CJS Module';

// Delay require to avoid circular dependency issues
exports.getEsmName = function () {
  const esm = require('/esm-circular.js');
  return esm.name;
};
