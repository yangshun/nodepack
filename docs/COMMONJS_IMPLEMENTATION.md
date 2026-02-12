# CommonJS require() Implementation Summary

## ✅ Implementation Complete!

CommonJS support has been successfully added to Nodepack! This document summarizes what was implemented and how to use it.

## 🎯 What Was Added

### Core Features

1. **`require()` Function**
   - Global `require()` function available in all code
   - Works with builtin modules (`fs`, `path`, `process`, `timers`)
   - Works with local files (`./module.js`, `../utils.js`)
   - Supports both relative and absolute paths

2. **Module Patterns**
   - `exports.key = value` pattern
   - `module.exports = {}` pattern
   - Both patterns work correctly

3. **Module Variables**
   - `__filename` - Absolute path to current module
   - `__dirname` - Directory of current module
   - `module` - Module object with `exports`, `filename`, `loaded` properties
   - `exports` - Reference to `module.exports`

4. **Module Caching**
   - Modules are cached after first require
   - Multiple `require()` calls return same object
   - Supports circular dependencies

5. **Mixed Module Systems**
   - ES `import` and CommonJS `require()` can be used together
   - Same file can have both `import` and `require()`

## 📁 Files Created

### New Runtime Files

1. **`packages/runtime/src/module-format-detector.ts`**
   - Detects whether code is ES module or CommonJS
   - Uses regex patterns to identify module syntax

2. **`packages/runtime/src/commonjs-wrapper.ts`**
   - Wraps CommonJS code with Node.js module wrapper
   - Pattern: `(function(exports, require, module, __filename, __dirname) { ... })`

3. **`packages/runtime/src/require-implementation.ts`**
   - Core `require()` function implementation
   - Handles path resolution, module caching, JSON files
   - Detects and handles ES modules in require()

### Modified Files

1. **`packages/runtime/src/import-detector.ts`**
   - Extended to detect both `import` and `require()` calls
   - Returns `DetectedModules` object with both ES and CJS imports

2. **`packages/runtime/src/quickjs-runtime.ts`**
   - Integrated CommonJS support into runtime
   - Added `__nodepack_execute_commonjs_module` helper
   - Added `__nodepack_require_es_module` for ES module interop
   - Added format detection to choose execution path

## 🧪 Test Results

All tests passing! ✅

```
✓ Basic require() with builtin modules
✓ exports.key = value pattern
✓ module.exports = {} pattern
✓ Module caching
✓ ES modules still work (backward compatibility)
✓ Mixed ES/CJS usage
```

## 📚 Usage Examples

### 1. Basic require() with Builtin Modules

```javascript
const fs = require('fs');
const path = require('path');
const process = require('process');

fs.writeFileSync('/test.txt', 'Hello!');
const content = fs.readFileSync('/test.txt', 'utf8');
console.log(content); // "Hello!"

const filepath = path.join('/home', 'user', 'file.txt');
console.log(filepath); // "/home/user/file.txt"

console.log(process.platform); // "browser"
```

### 2. Local Modules with exports.key

```javascript
const fs = require('fs');

// Create module
fs.writeFileSync(
  '/math.js',
  `
  exports.add = function(a, b) {
    return a + b;
  };

  exports.multiply = function(a, b) {
    return a * b;
  };
`,
);

// Require module
const math = require('./math.js');
console.log(math.add(2, 3)); // 5
console.log(math.multiply(4, 5)); // 20
```

### 3. Local Modules with module.exports

```javascript
const fs = require('fs');

// Create module
fs.writeFileSync(
  '/utils.js',
  `
  module.exports = {
    greet: function(name) {
      return 'Hello, ' + name + '!';
    }
  };
`,
);

// Require module
const utils = require('./utils.js');
console.log(utils.greet('World')); // "Hello, World!"
```

### 4. Module Caching

```javascript
const fs = require('fs');

fs.writeFileSync(
  '/counter.js',
  `
  let count = 0;
  exports.increment = () => ++count;
  exports.getCount = () => count;
`,
);

const counter1 = require('./counter.js');
const counter2 = require('./counter.js');

counter1.increment();
counter1.increment();

console.log(counter1.getCount()); // 2
console.log(counter2.getCount()); // 2 (same state!)
console.log(counter1 === counter2); // true
```

### 5. Special Variables (**filename, **dirname)

```javascript
const fs = require('fs');

fs.writeFileSync(
  '/app.js',
  `
  exports.location = __dirname;
  exports.file = __filename;
`,
);

const app = require('./app.js');
console.log(app.location); // "/"
console.log(app.file); // "/app.js"
```

### 6. Mixed ES and CommonJS

```javascript
// ES module import
import { writeFileSync } from 'fs';

// CommonJS require
const path = require('path');

writeFileSync('/test.txt', 'Mixed modules work!');
const filepath = path.join('/data', 'test.txt');

console.log(filepath); // "/data/test.txt"

export default { success: true };
```

### 7. Nested Requires

```javascript
const fs = require('fs');

// Create module B
fs.writeFileSync(
  '/moduleB.js',
  `
  exports.name = 'Module B';
  exports.getData = () => exports.name;
`,
);

// Create module A that requires B
fs.writeFileSync(
  '/moduleA.js',
  `
  const moduleB = require('./moduleB.js');
  exports.name = 'Module A';
  exports.getInfo = () => {
    return 'I am ' + exports.name + ', I use ' + moduleB.getData();
  };
`,
);

const moduleA = require('./moduleA.js');
console.log(moduleA.getInfo());
// "I am Module A, I use Module B"
```

### 8. Multi-file Mixed ESM and CJS

**Real-world scenario:** Different files using different module systems

```javascript
const fs = require('fs');

// File 1: ES module
fs.writeFileSync(
  '/string-utils.js',
  `
  export function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  export const version = '1.0.0';
`,
);

// File 2: CommonJS module
fs.writeFileSync(
  '/math.js',
  `
  exports.square = function(x) {
    return x * x;
  };
`,
);

// File 3: Mixed - uses both import and require!
fs.writeFileSync(
  '/calculator.js',
  `
  // ES import from ES module
  import { capitalize } from './string-utils.js';

  // CommonJS require from CJS module
  const math = require('./math.js');

  export function compute(op, x) {
    return {
      operation: capitalize(op),
      result: math.square(x)
    };
  }
`,
);

// Use the mixed module
import { compute } from './calculator.js';
const result = compute('square', 5);
console.log(result.operation); // "Square"
console.log(result.result); // 25

// This demonstrates real-world interoperability!
// - ES modules can import other ES modules
// - ES modules can require() CommonJS modules
// - CommonJS modules can import ES modules
// - All module types work together seamlessly
```

## ⚠️ Known Limitations

### NPM Packages from CDN

Packages loaded from jsDelivr CDN are **ES modules**, so they work with `import` but not with `require()`:

```javascript
// ✅ Works - use import for npm packages
import _ from 'lodash';
console.log(_.sum([1, 2, 3])); // 6

// ❌ Does not work - npm packages from CDN are ES modules
const _ = require('lodash'); // Error
```

**Workaround:** Use ES `import` syntax for npm packages from CDN. The `require()` function works perfectly with local CommonJS files.

## 🎨 Interactive Examples

The demo app (`examples/basic/`) includes **6 new CommonJS examples**:

### Basic Examples

1. **CommonJS require()** - Basic require with builtin modules
2. **CommonJS Local Modules** - Local files with exports patterns
3. **Mixed ES + CommonJS** - Using both module systems together
4. **Nested require() Calls** - Modules requiring other modules with `__filename`/`__dirname`

### Advanced Multi-file Examples

5. **Multi-file Mixed ESM/CJS** - Real-world scenario with multiple files using different module systems
   - ES module utility (`string-utils.js`)
   - CommonJS module (`math-lib.js`)
   - Mixed module using both (`calculator.js`)
   - Shows how they all work together seamlessly

6. **Complex Module Dependencies** - Advanced dependency graph across 4 layers
   - Layer 1: Base utilities (CommonJS logger)
   - Layer 2: Data layer (ES module using CJS)
   - Layer 3: Business logic (CommonJS using ES)
   - Layer 4: API layer (ES module using CJS)
   - Demonstrates real-world architecture with mixed module systems

### Standalone Demos

- `examples/commonjs-demo.js` - Complete standalone demo of all CommonJS features
- `examples/mixed-modules-demo.js` - Multi-file project structure with mixed modules

Run the demo:

```bash
cd examples/basic
pnpm dev
# Open http://localhost:3000
# Try the new "Multi-file Mixed ESM/CJS" example!
```

## 🔧 Implementation Details

### Module Format Detection

The runtime automatically detects whether code is ES module or CommonJS:

```typescript
// ES module indicators
- Has: export or import statements
- Treated as: ES module

// CommonJS indicators
- Has: module.exports or exports.x =
- Treated as: CommonJS module

// Default: ES module (backward compatibility)
```

### Module Resolution

The `require()` function resolves modules in this order:

1. **Builtin modules**: `fs`, `path`, `process`, `timers`
2. **Absolute paths**: `/utils.js`
3. **Relative paths**: `./utils.js`, `../config.js`
4. **NPM packages**: Looks in `/node_modules/{package}/index.js`

### File Extension Resolution

If no extension is provided, tries in order:

1. `.js` extension
2. `/index.js` (directory)
3. `.json` extension

### Module Caching

Modules are cached by **absolute path**:

- First `require()` loads and executes module
- Subsequent `require()` calls return cached `module.exports`
- Enables circular dependencies

## 🎓 Educational Value

This implementation provides students with:

✅ **Real Node.js patterns** - Learn actual CommonJS syntax
✅ **Gradual learning** - Start with `require()`, move to `import`
✅ **Understanding both systems** - See how ES and CJS differ
✅ **No server needed** - Run everything in the browser

## 📈 What's Next?

Possible future enhancements:

1. **Better ES module interop** - Make `require()` work seamlessly with ES modules from CDN
2. **JSON module support** - Auto-detect and parse `require('./data.json')`
3. **Conditional exports** - Support package.json exports field
4. **Version pinning** - Allow `require('lodash@4.17.21')`

## 🎉 Success!

CommonJS support is fully functional and ready to use for teaching Node.js fundamentals!
