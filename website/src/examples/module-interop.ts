import type { ExampleDefinition } from '../types';

export const moduleInterop: ExampleDefinition = {
  id: 'module-interop',
  label: 'Module interoperability',
  files: {
    'main.js': `// This example showcases Nodepack's ESM and CJS module system interoperability

console.log('=== Module interoperability demo ===');
console.log('');

import { sleep } from './sleep.js';

// 1. ES Module Named Imports
import { add, multiply } from './esm-named.js';
console.log('1. ESM named imports:');
console.log('');
console.log('   add(5, 3) =', add(5, 3));
console.log('   multiply(4, 7) =', multiply(4, 7));
console.log('');

await sleep(500);

// 2. ES Module Default Import
import Calculator from './esm-default.js';
console.log('2. ESM default import:');
console.log('');
const calc = new Calculator();
console.log('   calc.subtract(10, 4) =', calc.subtract(10, 4));
console.log('   calc.divide(20, 5) =', calc.divide(20, 5));
console.log('');

await sleep(500);

// 3. CommonJS require (module.exports)
const stringUtils = require('./cjs-module-exports.js');
console.log('3. CommonJS require (module.exports):');
console.log('');
console.log('   uppercase("hello") =', stringUtils.uppercase('hello'));
console.log('   reverse("world") =', stringUtils.reverse('world'));
console.log('');

await sleep(500);

// 4. CommonJS require (exports.*)
const validators = require('./cjs-exports.js');
console.log('4. CommonJS require (exports.*):');
console.log('');
console.log('   isEmail("test@example.com") =', validators.isEmail('test@example.com'));
console.log('   isEmail("invalid") =', validators.isEmail('invalid'));
console.log('');

await sleep(500);

// 5. Mixed: require() inside ES module
import { processData } from './esm-with-require.js';
console.log('5. ES module using require() internally:');
console.log('');
console.log('   processData("nodepack") =', processData('nodepack'));
console.log('');

await sleep(500);

// 6. Import from re-export barrel file
import { formatNumber, formatDate, formatCurrency } from './formatters/index.js';
console.log('6. Re-exported modules (barrel exports):');
console.log('');
console.log('   formatNumber(1234567.89) =', formatNumber(1234567.89));
console.log('   formatDate(new Date()) =', formatDate(new Date()));
console.log('   formatCurrency(99.99) =', formatCurrency(99.99));
console.log('');

await sleep(500);

// 7. Namespace import
import * as arrayUtils from './esm-named.js';
console.log('7. Namespace import (import * as):');
console.log('');
console.log('   arrayUtils.add(1, 2) =', arrayUtils.add(1, 2));
console.log('');

await sleep(500);

// 8. Dynamic import() - returns a Promise
console.log('8. Dynamic import():');
console.log('');
const dynamicModule = await import('./esm-default.js');
const calc2 = new dynamicModule.default();
console.log('   Dynamic Calculator.divide(100, 4) =', calc2.divide(100, 4));
console.log('');

await sleep(500);

// 9. Import CJS as ES module
import cjsAsEsm from './cjs-module-exports.js';
console.log('9. Import CommonJS as ESM default:');
console.log('');
console.log('   uppercase("mixed") =', cjsAsEsm.uppercase('mixed'));
console.log('');
`,
    'esm-named.js': `// ES Module with named exports
// Export individual declarations

export function add(a, b) {
  return a + b;
}

export function subtract(a, b) {
  return a - b;
}

// Export multiple at once
function multiply(a, b) {
  return a * b;
}

function divide(a, b) {
  return a / b;
}

export { multiply, divide };

// Export with alias
const PI = 3.14159;
export { PI as pi };
`,
    'sleep.js': `export function sleep(wait) {
  return new Promise(resolve => setTimeout(resolve, wait));
}`,
    'esm-default.js': `// ES Module with default export
// Only one default export per module

export default class Calculator {
  constructor() {
    this.history = [];
  }

  add(a, b) {
    const result = a + b;
    this.history.push(\`\${a} + \${b} = \${result}\`);
    return result;
  }

  subtract(a, b) {
    return a - b;
  }

  multiply(a, b) {
    return a * b;
  }

  divide(a, b) {
    if (b === 0) throw new Error('Division by zero');
    return a / b;
  }

  getHistory() {
    return this.history;
  }
}

// Can also have named exports alongside default
export const VERSION = '1.0.0';
`,
    'cjs-module-exports.js': `// CommonJS: module.exports (entire object)
// Traditional Node.js module pattern

module.exports = {
  uppercase: function(str) {
    return str.toUpperCase();
  },

  lowercase: function(str) {
    return str.toLowerCase();
  },

  reverse: function(str) {
    return str.split('').reverse().join('');
  },

  truncate: function(str, maxLength) {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength) + '...';
  }
};
`,
    'cjs-exports.js': `// CommonJS: exports.* pattern
// Incremental exports - simpler syntax

exports.isEmail = function(str) {
  return str.includes('@') && str.includes('.');
};

exports.isNumeric = function(str) {
  return !isNaN(str) && !isNaN(parseFloat(str));
};

exports.isEmpty = function(str) {
  return !str || str.trim().length === 0;
};

exports.isUrl = function(str) {
  return str.startsWith('http://') || str.startsWith('https://');
};
`,
    'esm-with-require.js': `// ES Module that uses require() internally
// Demonstrates mixing import/require within ES modules

import { add } from './esm-named.js';

// Using require() in an ES module
const stringUtils = require('./cjs-module-exports.js');

export function processData(input) {
  // Use ES import
  const length = add(input.length, 0);

  // Use CommonJS require
  const processed = stringUtils.uppercase(input);

  return \`\${processed} (length: \${length})\`;
}

export function combineModules(str, num) {
  return {
    original: str,
    transformed: stringUtils.reverse(str),
    added: add(num, 100)
  };
}
`,
    'formatters/index.js': `// Barrel export / Re-export pattern
// Central entry point that re-exports from other modules

export { formatNumber } from './number-formatter.js';
export { formatDate } from './date-formatter.js';
export { formatCurrency } from './currency-formatter.js';

// Can also re-export with aliases
export { formatCurrency as formatPrice } from './currency-formatter.js';

// Or re-export everything
export * from './string-formatter.js';
`,
    'formatters/number-formatter.js': `// Number formatting utilities
export function formatNumber(num) {
  return num.toLocaleString('en-US');
}

export function formatPercent(num) {
  return (num * 100).toFixed(2) + '%';
}
`,
    'formatters/date-formatter.js': `// Date formatting utilities
export function formatDate(date) {
  return date.toLocaleDateString('en-US');
}

export function formatTime(date) {
  return date.toLocaleTimeString('en-US');
}
`,
    'formatters/currency-formatter.js': `// Currency formatting utilities
export function formatCurrency(amount) {
  return '$' + amount.toFixed(2);
}
`,
    'formatters/string-formatter.js': `// String formatting utilities
export function formatTitle(str) {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function formatSlug(str) {
  return str.toLowerCase().replace(/\\s+/g, '-');
}
`,
  },
};
