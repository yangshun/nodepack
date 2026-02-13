import type { ExampleDefinition } from '../types';

export const multifileComplex: ExampleDefinition = {
  id: 'multifile-complex',
  label: 'Complex Module Dependencies',
  code: `// Advanced example: Complex dependency graph with mixed module systems
// 4-layer architecture with alternating ES modules and CommonJS

// Use the complete stack
import { registerUser, fetchUser } from './api/users.js';

console.log('=== Complex Module Dependency Graph ===\\n');
console.log('Architecture (4 layers):');
console.log('  Layer 4: api/users.js (ES) → require(services)');
console.log('  Layer 3: services/user-service.js (CJS) → require(data)');
console.log('  Layer 2: data/store.js (CJS) → require(logger)');
console.log('  Layer 1: base/logger.js (CJS) → base utilities');
console.log('');
console.log('Module type:');
console.log('  Top layer is ES module, lower layers are CommonJS');
console.log('');
console.log('Creating users...');
const user1 = registerUser(1, 'Alice');
const user2 = registerUser(2, 'Bob');
const user3 = registerUser(1, 'Charlie'); // Duplicate
console.log('');
console.log('Results:');
console.log('  User 1:', user1.status, user1.user ? user1.user.name : user1.message);
console.log('  User 2:', user2.status, user2.user ? user2.user.name : user2.message);
console.log('  User 3:', user3.status, user3.message);

console.log('');
console.log('Fetching users...');
const fetch1 = fetchUser(1);
const fetch2 = fetchUser(999);

console.log('  Fetch 1:', fetch1.status, fetch1.user ? fetch1.user.name : fetch1.message);
console.log('  Fetch 999:', fetch2.status, fetch2.message);

console.log('');
console.log('✓ Complex mixed module dependencies work perfectly!');
`,
  files: {
    'base/logger.js': `// Layer 1: Base utilities (CommonJS)
exports.log = function(message) {
  return '[LOG] ' + new Date().toISOString() + ' - ' + message;
};

exports.error = function(message) {
  return '[ERROR] ' + message;
};
`,
    'data/store.js': `// Layer 2: Data layer (CommonJS) - depends on logger (CJS)
const logger = require('../base/logger.js');

const data = new Map();

exports.set = function(key, value) {
  console.log(logger.log('Setting ' + key));
  data.set(key, value);
};

exports.get = function(key) {
  console.log(logger.log('Getting ' + key));
  return data.get(key);
};

exports.has = function(key) {
  return data.has(key);
};
`,
    'services/user-service.js': `// Layer 3: Business logic (CommonJS) - depends on data layer (ES)
const store = require('../data/store.js');

exports.createUser = function(id, name) {
  if (store.has('user_' + id)) {
    return { error: 'User already exists' };
  }
  store.set('user_' + id, { id, name, created: Date.now() });
  return { success: true, id };
};

exports.getUser = function(id) {
  return store.get('user_' + id) || null;
};
`,
    'api/users.js': `// Layer 4: API layer (ES Module) - depends on services (CJS)
const userService = require('../services/user-service.js');

export function registerUser(id, name) {
  const result = userService.createUser(id, name);
  if (result.error) {
    return { status: 400, message: result.error };
  }
  return { status: 200, user: userService.getUser(id) };
}

export function fetchUser(id) {
  const user = userService.getUser(id);
  if (!user) {
    return { status: 404, message: 'User not found' };
  }
  return { status: 200, user };
}`,
  },
};
