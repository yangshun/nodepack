// Test requiring a package subpath (like 'fast-folder-size/sync')
const sync = require('test-package/sync');
const async = require('test-package/async');

module.exports = {
  syncValue: sync.value,
  asyncValue: async.value,
};
