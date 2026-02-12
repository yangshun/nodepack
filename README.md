# Nodepack

> **Status:** ⚠️ Early Development (Week 3) - Basic PoC working, not production-ready

A browser-based Node.js runtime for educational purposes. Run Node.js code directly in the browser without server infrastructure.

## 🎯 Why Nodepack?

**Problem:** Teaching Node.js requires expensive cloud infrastructure or licensing fees for solutions like WebContainers.

**Solution:** Run Node.js code entirely in the browser using WebAssembly (QuickJS) with virtual filesystem and Node.js API polyfills.

**Target Use Case:** Online coding platforms for teaching Node.js fundamentals - file operations, modules, and eventually npm packages.

## ✨ What Works Now

- ✅ **JavaScript Execution** - QuickJS WASM engine running in browser
- ✅ **Virtual File System** - In-memory filesystem (memfs) with full CRUD operations
- ✅ **Node.js Modules** - `fs`, `path`, `process`, `timers` modules working
- ✅ **ES Module Syntax** - `import`/`export` support
- ✅ **CommonJS Support** - `require()`, `module.exports`, `exports` support (NEW!)
- ✅ **Mixed Module Systems** - Use both ES imports and CommonJS requires together
- ✅ **NPM Packages** - Load packages from CDN (with ES imports)
- ✅ **Console Output** - Capture and display console.log in UI
- ✅ **Interactive Demo** - Live code editor at http://localhost:3000

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start demo (from examples/basic-poc/)
cd examples/basic-poc
pnpm dev
# Open http://localhost:3000
```

## 💻 Usage Example

```typescript
import { Nodepack } from '@nodepack/client';

// Initialize runtime
const runtime = await Nodepack.boot({ useWorker: false });

// Write and execute Node.js code
const code = `
  import { writeFileSync, readFileSync } from 'fs';
  import { join } from 'path';

  const filepath = join('/data', 'hello.txt');
  writeFileSync(filepath, 'Hello from browser!');
  const content = readFileSync(filepath, 'utf8');

  console.log('File content:', content);

  export default { content };
`;

const result = await runtime.execute(code);

if (result.ok) {
  console.log('Logs:', result.logs); // ["File content: Hello from browser!"]
  console.log('Returned:', result.data); // { content: "Hello from browser!" }
} else {
  console.error('Error:', result.error);
}
```

### Working Code Examples

**File Operations:**

```javascript
fs.writeFileSync('/hello.txt', 'Hello World');
fs.mkdirSync('/data', { recursive: true });
const files = fs.readdirSync('/');
const content = fs.readFileSync('/hello.txt', 'utf8');
console.log(files, content);
```

**Path Utilities:**

```javascript
const fullPath = path.join('/home', 'user', 'file.txt');
const dir = path.dirname(fullPath); // /home/user
const file = path.basename(fullPath); // file.txt
const ext = path.extname(fullPath); // .txt
```

**Process Info:**

```javascript
console.log(process.platform); // 'browser'
console.log(process.version); // 'v18.0.0-browser'
console.log(process.cwd()); // '/'
```

**CommonJS require():**

```javascript
// Basic require with builtin modules
const fs = require('fs');
const path = require('path');

fs.writeFileSync('/data.txt', 'Hello CommonJS!');
const content = fs.readFileSync('/data.txt', 'utf8');

// Local modules with exports
fs.writeFileSync('/math.js', `
  exports.add = (a, b) => a + b;
  exports.multiply = (a, b) => a * b;
`);

const math = require('./math.js');
console.log(math.add(2, 3)); // 5

// Module with module.exports
fs.writeFileSync('/utils.js', `
  module.exports = {
    greet: (name) => 'Hello, ' + name
  };
`);

const utils = require('./utils.js');
console.log(utils.greet('World')); // Hello, World

// Mixed ES and CommonJS
import { writeFileSync } from 'fs';
const process = require('process');
```

## 🏗️ Architecture

### Current Package Structure

```
nodepack/
├── packages/
│   ├── client/          # Public API wrapper (Nodepack.boot())
│   ├── runtime/         # QuickJS engine + Node.js modules
│   ├── package-manager/ # Placeholder for npm CDN support (Week 4)
│   └── worker/          # Placeholder for Web Worker support
└── examples/
    └── basic-poc/       # Live demo at localhost:3000
```

### How It Works

1. **QuickJS WASM** - Lightweight JavaScript engine (~1MB) runs user code
2. **memfs** - Virtual in-memory filesystem for file operations
3. **Module Injection** - `fs`, `path`, `process` injected as globals before execution
4. **Transform Layer** - Converts ES module syntax to QuickJS-compatible code
5. **Console Capture** - Intercepts console.log and sends to UI

## 📋 Development Progress

### ✅ Completed (Week 1-3)

**Week 1: Foundation**

- [x] Monorepo setup with pnpm workspaces
- [x] TypeScript configuration
- [x] Build system working
- [x] Basic project structure

**Week 2: QuickJS Integration**

- [x] QuickJS WASM runtime initialized
- [x] Virtual filesystem (memfs) working
- [x] Console output capture
- [x] Basic demo UI

**Week 3: Node.js Modules**

- [x] `fs` module (readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync)
- [x] `path` module (join, dirname, basename, extname, resolve, normalize)
- [x] `process` module (env, cwd, argv, version, platform)
- [x] ES module import/export syntax support
- [x] Working demo with examples

### 🚧 In Progress / Planned

**Week 3+ (Current): Module System**

- [ ] CommonJS `require()` for local files
- [ ] Multi-file project support
- [ ] Module caching
- [ ] Relative path resolution

**Week 4: NPM Packages**

- [ ] Fetch packages from CDN (esm.sh)
- [ ] Basic dependency resolution
- [ ] Package caching (IndexedDB)
- [ ] Test with lodash, axios, date-fns

**Future (Month 2+):**

- [ ] HTTP server support (Express.js)
- [ ] Web Worker isolation
- [ ] File persistence (OPFS)
- [ ] Better error messages
- [ ] Monaco code editor integration

## 🛠️ Technology Stack

| Component               | Technology                                                                                                       | Purpose                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **JavaScript Engine**   | [QuickJS](https://bellard.org/quickjs/) via [quickjs-emscripten](https://github.com/justjake/quickjs-emscripten) | ES2023 support, WASM compiled, ~1MB |
| **Virtual Filesystem**  | [memfs](https://github.com/streamich/memfs)                                                                      | In-memory file operations           |
| **Path Utilities**      | [path-browserify](https://www.npmjs.com/package/path-browserify)                                                 | Browser-compatible path module      |
| **Build System**        | pnpm workspaces + TypeScript                                                                                     | Monorepo management                 |
| **Demo UI**             | Vite + Vanilla JS                                                                                                | Development server                  |
| **Future: Package CDN** | [esm.sh](https://esm.sh)                                                                                         | npm packages as ES modules          |
| **Future: Workers**     | [Comlink](https://github.com/GoogleChromeLabs/comlink)                                                           | Web Worker communication            |

## 📊 Current Limitations

### What Doesn't Work Yet

- ❌ **Multi-file projects** - Cannot `require('./utils.js')`
- ❌ **CommonJS require()** - Only ES modules work via transform
- ❌ **NPM packages** - Cannot install lodash, axios, etc.
- ❌ **HTTP servers** - Express.js not supported
- ❌ **Async file operations** - Only sync methods work
- ❌ **Binary files** - Only UTF-8 text files
- ❌ **File persistence** - Files reset on page refresh
- ❌ **Child processes** - No `child_process` module
- ❌ **Network requests** - No `http.request()` or `fetch` polyfill

### Known Issues

1. **Import transforms are regex-based** - Won't handle complex syntax
2. **Only `export default` works** - Named exports not supported
3. **No module resolution** - Can't look up node_modules
4. **Poor error messages** - QuickJS errors are cryptic
5. **Memory not tested** - Potential leaks with heavy usage

## 🎓 Educational Focus

**Designed for teaching Node.js basics:**

✅ **Good for:**

- Console.log fundamentals
- File system operations (fs)
- Path manipulation (path)
- Process environment (process)
- Basic JavaScript concepts
- Single-file scripts

❌ **Not good for (yet):**

- Real-world Node.js applications
- Multi-file projects with imports
- Using npm packages
- Running web servers
- Production use cases

## 📚 Documentation

- **[PROGRESS.md](./PROGRESS.md)** - Detailed development log and next steps
- **[Plan Document](/.claude/plans/cheerful-riding-lark.md)** - Original implementation plan
- **API Types** - See `packages/runtime/src/types.ts` for TypeScript definitions

## 🔧 Development

### Building

```bash
# Build all packages
pnpm build

# Watch mode for runtime package
cd packages/runtime
pnpm dev

# Watch mode for client package
cd packages/client
pnpm dev
```

### Testing

```bash
# Start demo server
cd examples/basic-poc
pnpm dev

# Open http://localhost:3000
# Click example buttons to test features
```

### Project Commands

```bash
pnpm install        # Install all dependencies
pnpm build          # Build all packages
pnpm -r build       # Build packages recursively
pnpm example:basic  # Start basic-poc demo (defined in root package.json)
```

## 🚦 Project Status

**Current Phase:** Week 3 - Basic Node.js modules working

**Stability:** ⚠️ Proof of Concept

- Good for experimentation
- Not production-ready
- API may change significantly
- Limited testing

**Next Milestone:** Implement `require()` for multi-file projects

## 🤝 Contributing

This project is in early development. Contributions welcome, but expect breaking changes!

**To contribute:**

1. Read [PROGRESS.md](./PROGRESS.md) to understand current state
2. Pick a feature from "In Progress / Planned" section
3. Open an issue to discuss approach
4. Submit PR with tests

## 💡 Inspiration & Alternatives

### Inspiration

- **[StackBlitz WebContainers](https://webcontainers.io)** - Commercial, full Node.js in browser
- **[CodeSandbox Nodebox](https://github.com/codesandbox/nodebox-runtime)** - Open source, similar approach
- **[RunKit](https://runkit.com)** - Server-side Node.js execution

### Why Build This?

- **Cost** - WebContainers requires licensing for commercial use
- **Learning** - Educational project to understand browser runtimes
- **Control** - Full control over features and implementation
- **Open Source** - Can be freely used and modified

### When to Use Alternatives?

- **Production apps** → Use WebContainers (more mature)
- **Full Node.js compatibility** → Use server-side execution
- **Complex projects** → Use CodeSandbox Nodebox (more complete)

## 📄 License

MIT

## 🙏 Acknowledgments

- **Fabrice Bellard** - Creator of QuickJS
- **StackBlitz Team** - Pioneering WebContainers
- **CodeSandbox Team** - Open source Nodebox runtime
- **quickjs-emscripten contributors** - Making QuickJS easy to use

---

**Note:** This project is a proof of concept for educational platforms. For production use, consider mature alternatives like WebContainers or server-side Node.js execution.
