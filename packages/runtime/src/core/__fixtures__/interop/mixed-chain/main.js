const processor = require('/processor-esm.js');

module.exports = {
  count: processor.getCount(),
  first: processor.getFirst(),
};
