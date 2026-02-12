import { ExampleDefinition } from './types';

export const examples: ExampleDefinition[] = [
  {
    id: 'hello',
    label: 'Hello World',
    code: `console.log('Hello from Node.js in the browser!');
console.log('This is a proof of concept');
console.log('Date:', new Date().toISOString());

export default { status: 'success', message: 'Hello World!' };`,
  },
  {
    id: 'modules',
    label: 'Built-in Modules',
    code: `// Using ES module imports
import { join, dirname, basename, extname } from 'path';
import process from 'process';

const fullPath = join('/home', 'user', 'documents', 'file.txt');
const dir = dirname(fullPath);
const file = basename(fullPath);
const ext = extname(fullPath);

console.log('Full path:', fullPath);
console.log('Directory:', dir);
console.log('Filename:', file);
console.log('Extension:', ext);

// Using process module
console.log('Platform:', process.platform);
console.log('Version:', process.version);
console.log('Working dir:', process.cwd());

export default { fullPath, dir, file, ext };`,
  },
  {
    id: 'multifile',
    label: 'Multi-file Import',
    code: `// Import from our custom utility module
import { greet, add, multiply, PI, version } from './utils.js';

console.log(greet('World'));
console.log('2 + 3 =', add(2, 3));
console.log('4 × 5 =', multiply(4, 5));
console.log('PI =', PI);
console.log('Utils version:', version);

// Import from another custom module
import { quadruple, square, cube, factorial } from './math-helpers.js';

console.log('');
console.log('5² =', square(5));
console.log('3³ =', cube(3));
console.log('5! =', factorial(5));

// You can also mix builtin and custom imports
import { existsSync } from 'fs';

console.log('');
console.log('Does /utils.js exist?', existsSync('/utils.js'));
console.log('Does /math-helpers.js exist?', existsSync('/math-helpers.js'));

export default {
  greeting: greet('User'),
  sum: add(10, 20),
  quad: quadruple(10),
  square: square(7),
  version
};`,
    files: {
      'utils.js': `export function greet(name) {
  return 'Hello, ' + name + '!';
}

export function add(a, b) {
  return a + b;
}

export function double(a) {
  return a * 2;
}

export function multiply(a, b) {
  return a * b;
}

export const PI = 3.14159;
export const version = '1.0.0';`,
      'math-helpers.js': `import { double } from './utils.js';

export function quadruple(x) {
  return double(double(x));
}
      
export function square(x) {
  return x * x;
}

export function cube(x) {
  return x * x * x;
}

export function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}`,
    },
  },
  {
    id: 'packages',
    label: 'NPM Packages',
    code: `// NPM packages from jsDelivr CDN! 🎉
import _ from 'lodash-es';

const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

console.log('Numbers:', numbers);
console.log('Sum:', _.sum(numbers));
console.log('Average:', _.mean(numbers));
console.log('Max:', _.max(numbers));
console.log('Min:', _.min(numbers));

console.log('');
console.log('Doubled:', _.map(numbers, n => n * 2));
console.log('Evens:', _.filter(numbers, n => n % 2 === 0));
console.log('First 3:', _.take(numbers, 3));
console.log('Last 3:', _.takeRight(numbers, 3));

console.log('');
console.log('Unique:', _.uniq([1, 2, 2, 3, 3, 4, 4, 5]));
console.log('Shuffle:', _.shuffle([1, 2, 3, 4, 5]));

export default {
  sum: _.sum(numbers),
  average: _.mean(numbers),
  doubled: _.map(numbers, n => n * 2)
};`,
  },
  {
    id: 'clsx',
    label: 'Using clsx',
    code: `// Using the 'clsx' package for conditional classNames
// NPM packages from jsDelivr CDN! 🎉
import { clsx } from 'clsx';

console.log(clsx('foo', true && 'bar', 'baz'));
//=> 'foo bar baz'

// Objects
console.log(clsx({ foo:true, bar:false, baz:isTrue() }));
//=> 'foo baz'

// Objects (variadic)
console.log(clsx({ foo:true }, { bar:false }, null, { '--foobar':'hello' }));
//=> 'foo --foobar'

// Arrays
console.log(clsx(['foo', 0, false, 'bar']));

export default {};
`,
  },
  {
    id: 'timers',
    label: 'Timers',
    code: `// Using setTimeout and setInterval
let count = 0;

console.log('Setting up timers...');

setTimeout(() => {
  console.log('Timeout 1: This runs after 500ms');
}, 500);

setTimeout(() => {
  console.log('Timeout 2: This runs after 1 second');
}, 1000);

setTimeout(() => {
  console.log('Timeout 3: This runs after 2 seconds');
}, 2000);

const intervalId = setInterval(() => {
  count++;
  console.log('Interval tick:', count);

  if (count >= 3) {
    clearInterval(intervalId);
    console.log('Interval cleared after 3 ticks');
  }
}, 600);

// You can also import from the timers module
import { setTimeout as setTimeoutAlt } from 'timers';

setTimeoutAlt(() => {
  console.log('Using imported setTimeout from timers module');
}, 1500);

// Demonstrating closures work with timers
const message = 'Closures work!';
setTimeout(() => {
  console.log('Closure test:', message);
}, 800);

console.log('All timers scheduled!');

export default {
  message: 'Check console for timer output',
  timersScheduled: 5
};`,
  },
  {
    id: 'commonjs-basic',
    label: 'CommonJS require()',
    code: `// CommonJS require() is now supported!
const fs = require('fs');
const path = require('path');
const process = require('process');

// File operations
fs.writeFileSync('/data.txt', 'Hello from CommonJS!');
const content = fs.readFileSync('/data.txt', 'utf8');
console.log('File content:', content);

// Path operations
const fullPath = path.join('/home', 'user', 'file.txt');
console.log('Full path:', fullPath);
console.log('Directory:', path.dirname(fullPath));
console.log('Filename:', path.basename(fullPath));

// Process info
console.log('Platform:', process.platform);
console.log('Working dir:', process.cwd());

module.exports = {
  success: true,
  content,
  fullPath
};`,
  },
  {
    id: 'commonjs-modules',
    label: 'CommonJS Local Modules',
    code: `// Using require() with local modules

// Require the modules (files are pre-created below)
const math = require('./math.js');
const utils = require('./utils.js');

console.log('Using math module (exports.x pattern):');
console.log('  2 + 3 =', math.add(2, 3));
console.log('  4 × 5 =', math.multiply(4, 5));
console.log('  PI =', math.PI);

console.log('');
console.log('Using utils module (module.exports pattern):');
console.log(' ', utils.greet('World'));
console.log('  Current time:', utils.formatDate());

// Demonstrate module caching
const math2 = require('./math.js');
console.log('');
console.log('Module caching works:', math === math2); // true

module.exports = {
  sum: math.add(10, 20),
  greeting: utils.greet('CommonJS User')
};`,
    files: {
      'math.js': `// CommonJS module using exports.x pattern
exports.add = function(a, b) {
  return a + b;
};

exports.multiply = function(a, b) {
  return a * b;
};

exports.PI = 3.14159;`,
      'utils.js': `// CommonJS module using module.exports pattern
module.exports = {
  greet: function(name) {
    return 'Hello, ' + name + '!';
  },

  formatDate: function() {
    return new Date().toISOString();
  }
};`,
    },
  },
  {
    id: 'commonjs-mixed',
    label: 'Mixed ES + CommonJS',
    code: `// You can mix ES imports and CommonJS requires!

// ES module import (from builtin)
import { writeFileSync } from 'fs';

// CommonJS require (from builtin)
const path = require('path');

// CommonJS require (from local file)
const helpers = require('./helpers.js');

console.log('Mixed module systems demo:');
console.log('  ✓ ES import for writeFileSync');
console.log('  ✓ CommonJS require for path');
console.log('  ✓ CommonJS require for helpers.js');

console.log('');
console.log('Using path module:', path.join('/data', 'file.txt'));
console.log('double(5) =', helpers.double(5));
console.log('triple(5) =', helpers.triple(5));

// You can also require() process
const process = require('process');
console.log('');
console.log('Process platform:', process.platform);

// And use writeFileSync from ES import
writeFileSync('/test.txt', 'Mixed modules work!');

export default {
  doubled: helpers.double(10),
  tripled: helpers.triple(10),
  mixed: 'ES and CommonJS work together!'
};`,
    files: {
      'helpers.js': `// CommonJS module
exports.double = function(x) {
  return x * 2;
};

exports.triple = function(x) {
  return x * 3;
};`,
    },
  },
  {
    id: 'commonjs-nested',
    label: 'Nested require() Calls',
    code: `// Demonstrating nested requires and __filename/__dirname

// Require module A (which itself requires module B)
const moduleA = require('./moduleA.js');

const info = moduleA.getInfo();

console.log('Module A:');
console.log('  Name:', info.self.name);
console.log('  __dirname:', info.self.location);
console.log('  __filename:', info.self.file);

console.log('');
console.log('Module B (required by A):');
console.log('  Name:', info.dependency.name);
console.log('  __dirname:', info.dependency.location);
console.log('  __filename:', info.dependency.file);

console.log('');
console.log('✓ Nested requires work correctly!');
console.log('✓ __filename and __dirname are properly set!');

module.exports = info;`,
    files: {
      'moduleB.js': `// Module B - Has its own __filename and __dirname
exports.name = 'Module B';
exports.location = __dirname;
exports.file = __filename;

exports.getData = function() {
  return {
    name: exports.name,
    location: exports.location,
    file: exports.file
  };
};`,
      'moduleA.js': `// Module A - Requires Module B
const moduleB = require('./moduleB.js');

exports.name = 'Module A';
exports.location = __dirname;
exports.file = __filename;

exports.getInfo = function() {
  return {
    self: {
      name: exports.name,
      location: exports.location,
      file: exports.file
    },
    dependency: moduleB.getData()
  };
};`,
    },
  },
  {
    id: 'multifile-mixed',
    label: 'Multi-file Mixed ESM/CJS',
    code: `// Demonstrates mixing ES modules and CommonJS across multiple files
// Files: string-utils.js (ES), math-lib.js (CJS), calculator.js (Mixed), formatter.js (ES)

// Import from mixed module (uses both ES import and require internally)
import { compute } from './calculator.js';

// Import from ES module
import formatter from './formatter.js';

// Require from pure CommonJS module
const math = require('./math-lib.js');

console.log('=== Multi-file Mixed Module System Demo ===\\n');

console.log('File types:');
console.log('  string-utils.js → Pure ES module');
console.log('  math-lib.js → Pure CommonJS');
console.log('  calculator.js → Mixed (ES export + require)');
console.log('  formatter.js → Pure ES module');

console.log('\\nUsing calculator.js (Mixed ES module):');
const result1 = compute('square', 5);
console.log('  Operation:', result1.operation);
console.log('  5² =', result1.result);

const result2 = compute('power', 2, 10);
console.log('  2^10 =', result2.result);

console.log('');
console.log('Using math-lib.js (Pure CommonJS):');
console.log('  7³ =', math.cube(7));

console.log('');
console.log('Using formatter.js (Pure ES module):');
console.log(' ', formatter.formatResult(42));
console.log(' ', formatter.formatReversed('Hello'));

console.log('');
console.log('✓ ES modules and CommonJS work seamlessly together!');

export default {
  squareOf5: result1.result,
  powerOf2to10: result2.result,
  message: 'Mixed module systems work!'
};`,
    files: {
      'string-utils.js': `// Pure ES module with named exports
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function reverse(str) {
  return str.split('').reverse().join('');
}

export const version = '1.0.0';`,
      'math-lib.js': `// Pure CommonJS module
exports.square = function(x) {
  return x * x;
};

exports.cube = function(x) {
  return x * x * x;
};

exports.power = function(base, exp) {
  return Math.pow(base, exp);
};`,
      'calculator.js': `// Mixed module - Uses ES import AND require!

// ES import from ES module
import { capitalize } from './string-utils.js';

// CommonJS require from CJS module
const math = require('./math-lib.js');

export function compute(operation, a, b) {
  const result = {
    operation: capitalize(operation),
    input: [a, b],
    result: null
  };

  if (operation === 'square') {
    result.result = math.square(a);
  } else if (operation === 'cube') {
    result.result = math.cube(a);
  } else if (operation === 'power') {
    result.result = math.power(a, b);
  }

  return result;
}`,
      'formatter.js': `// Mixed module - ES module that exports an object
import { reverse } from './string-utils.js';

export default {
  formatResult: function(value) {
    return 'Result: ' + value;
  },

  formatReversed: function(str) {
    return 'Reversed: ' + reverse(str);
  }
};`,
    },
  },
  {
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

console.log('\\nModule type:');
console.log('  Top layer is ES module, lower layers are CommonJS');

console.log('\\nCreating users...');
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

export default {
  users: [user1.user, user2.user].filter(Boolean),
  architecture: 'Mixed ESM/CJS across 4 layers'
};`,
    files: {
      'base/logger.js': `// Layer 1: Base utilities (CommonJS)
exports.log = function(message) {
  return '[LOG] ' + new Date().toISOString() + ' - ' + message;
};

exports.error = function(message) {
  return '[ERROR] ' + message;
};`,
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
};`,
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
};`,
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
  },
];
