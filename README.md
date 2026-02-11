# Nodepack

A browser-based Node.js runtime for educational purposes. Run Node.js code directly in the browser without any server infrastructure.

## 🎯 Project Goals

- **Educational Focus**: Optimized for teaching Node.js programming
- **Cost-Free**: Avoid licensing costs from proprietary solutions
- **Browser-Native**: Runs entirely in modern browsers using WebAssembly
- **Package Support**: Install and use npm packages from CDN
- **Dev Servers**: Eventually support Express, Vite, and other dev servers

## 🏗️ Architecture

Nodepack consists of several packages working together:

- **`@nodepack/runtime`** - QuickJS WASM engine and Node.js module implementations (fs, path, console, process)
- **`@nodepack/filesystem`** - Virtual file system using OPFS (Origin Private File System) with IndexedDB fallback
- **`@nodepack/worker`** - Web Worker process management for isolating Node.js execution
- **`@nodepack/client`** - Public API for embedding Nodepack in web applications
- **`@nodepack/package-manager`** - CDN-based npm package installation (esm.sh)

## 🚀 Quickstart

```bash
# Install dependencies
pnpm install

# Run the basic PoC example
pnpm example:basic

# Build all packages
pnpm build
```

## 📖 Usage Example

```typescript
import { Nodepack } from '@nodepack/client';

// Boot the runtime
const runtime = await Nodepack.boot();

// Write a Node.js script to the virtual filesystem
await runtime.fs.writeFile('/hello.js', `
  console.log('Hello from Node.js in the browser!');
`);

// Execute the script
const process = await runtime.spawn('node', ['hello.js']);

// Listen to output
process.output.getReader().read().then(({ value }) => {
  console.log(value); // "Hello from Node.js in the browser!"
});

// Wait for completion
const exitCode = await process.exit;
```

## 🗂️ Project Structure

```
nodepack/
├── packages/
│   ├── runtime/          # QuickJS WASM + Node.js modules
│   ├── filesystem/       # OPFS-based virtual FS
│   ├── worker/           # Web Worker processes
│   ├── client/           # Public API
│   └── package-manager/  # CDN package installer
├── examples/
│   └── basic-poc/        # Basic proof of concept demo
└── docs/                 # Documentation
```

## 📋 Development Phases

### ✅ Phase 1 (Week 1): Foundation
- [x] Monorepo setup with pnpm workspaces
- [ ] Study Nodebox source code
- [ ] OPFS file system implementation
- [ ] QuickJS integration

### 🚧 Phase 2 (Week 2): Core Runtime
- [ ] Web Worker process manager
- [ ] Basic `console` module
- [ ] Basic `fs` module (readFile, writeFile)
- [ ] Execute simple scripts

### ⏳ Phase 3 (Week 3): Module System
- [ ] CommonJS `require()` implementation
- [ ] `path` module
- [ ] `process` module
- [ ] Multi-file project support

### ⏳ Phase 4 (Week 4): Package Installation
- [ ] CDN-based package fetching (esm.sh)
- [ ] Dependency resolution
- [ ] Package caching
- [ ] Test with popular packages (lodash, axios)

### ⏳ Phase 5 (Month 2): HTTP Servers
- [ ] Basic `http` module
- [ ] Service Worker networking
- [ ] Express.js support
- [ ] Preview iframe

## 🛠️ Technologies Used

- **[QuickJS](https://bellard.org/quickjs/)** - Lightweight JavaScript engine compiled to WebAssembly
- **[OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)** - Origin Private File System for fast file operations
- **[Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)** - Isolate Node.js execution from main thread
- **[Comlink](https://github.com/GoogleChromeLabs/comlink)** - Simplify Web Worker communication
- **[esm.sh](https://esm.sh)** - CDN that converts npm packages to ES modules

## 🎓 Educational Features

- **Safety Limits**: File size limits, storage quotas, execution timeouts
- **Clear Errors**: Better error messages than Node.js for learning
- **Progressive**: Start simple (console.log) → Advanced (dev servers)
- **Offline-First**: Works without internet after initial load

## 📚 Resources

- **Plan Document**: [Implementation Plan](/.claude/plans/cheerful-riding-lark.md)
- **WebContainers**: https://webcontainers.io
- **Nodebox**: https://github.com/Sandpack/nodebox-runtime
- **QuickJS Emscripten**: https://github.com/justjake/quickjs-emscripten

## 🤝 Contributing

This project is currently in early development (PoC phase). Contributions welcome!

## 📄 License

MIT

## 🙏 Acknowledgments

Inspired by:
- **StackBlitz WebContainers** - Pioneer in browser-based Node.js
- **CodeSandbox Nodebox** - Open-source browser runtime
- **QuickJS** - Excellent lightweight JavaScript engine
