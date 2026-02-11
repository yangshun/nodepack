# Nodepack Development Progress

**Last Updated:** 2026-02-11
**Status:** Week 3 - Basic Node.js modules implemented

## Project Overview

**Goal:** Build a custom Node.js-like runtime that runs in the browser for a teaching platform. This allows students to run Node.js code directly in their browser without server-side execution.

**Why Custom:** Avoid licensing costs from WebContainers/Nodebox while maintaining full control over implementation and features.

**Target Timeline:** 1 month for proof of concept (PoC)

---

## What We've Built (Week 1-3)

### ✅ Completed Features

#### 1. Project Infrastructure
- **Monorepo structure** with pnpm workspaces
- **TypeScript** configuration across all packages
- **Build system** working (pnpm build compiles all packages)
- **Dev environment** with Vite hot-reload at http://localhost:3000

#### 2. QuickJS WASM Runtime Integration
- **Package:** `@nodepack/runtime`
- Using `quickjs-emscripten` for browser compatibility
- Runtime initialization working
- Code execution with `vm.evalCode()`
- Console output capture and display
- Error handling with proper disposal of QuickJS handles

#### 3. Virtual File System
- **Integration:** Using `memfs` (in-memory filesystem)
- Files persist in memory across executions within same session
- No persistence across page refreshes (by design for now)
- Connected to `fs` module implementation

#### 4. Node.js API Polyfills

**fs module** (`packages/runtime/src/modules/fs-module.ts`):
- `fs.readFileSync(path, encoding)` - Read files
- `fs.writeFileSync(path, content)` - Write files (auto-creates parent dirs)
- `fs.existsSync(path)` - Check file existence
- `fs.readdirSync(path)` - List directory contents
- `fs.mkdirSync(path, options)` - Create directories

**path module** (`packages/runtime/src/modules/path-module.ts`):
- `path.join(...paths)` - Join path segments
- `path.dirname(path)` - Get directory name
- `path.basename(path, ext)` - Get filename
- `path.extname(path)` - Get file extension
- `path.resolve(...paths)` - Resolve to absolute path
- `path.normalize(path)` - Normalize path
- `path.sep` - Path separator constant

**process module** (`packages/runtime/src/modules/process-module.ts`):
- `process.env` - Environment variables object
- `process.cwd()` - Current working directory
- `process.argv` - Command line arguments
- `process.version` - Node version string ('v18.0.0-browser')
- `process.platform` - Platform string ('browser')

#### 5. ES Module Syntax Support
- **import statements** transformed to work with QuickJS
  - `import { x } from 'fs'` → `const { x } = fs;`
  - `import * as fs from 'fs'` → `const fs = fs;`
  - `import fs from 'fs'` → `const fs = fs;`
- **export default** transformed to global variable capture
  - `export default value` → `globalThis.__moduleExport = value;`

#### 6. Browser Demo
- **Location:** `/examples/basic-poc/`
- Monaco-like code editor (textarea for now)
- Real-time console output display
- Working example buttons:
  - ✅ Hello World
  - ✅ Math Operations
  - ✅ Loops
  - ✅ File Operations (Week 2)
  - ✅ Modules (Week 3)
- Execution status indicators
- Error display

---

## Project Structure

```
nodepack/
├── packages/
│   ├── client/              # Public API wrapper
│   │   ├── src/
│   │   │   ├── nodepack.ts  # Main Nodepack class
│   │   │   └── index.ts     # Exports
│   │   └── package.json
│   │
│   ├── runtime/             # Core QuickJS runtime + Node.js modules
│   │   ├── src/
│   │   │   ├── quickjs-runtime.ts        # QuickJS wrapper
│   │   │   ├── types.ts                  # TypeScript types
│   │   │   └── modules/
│   │   │       ├── module-helpers.ts     # Factory utilities
│   │   │       ├── fs-module.ts          # File system implementation
│   │   │       ├── path-module.ts        # Path utilities
│   │   │       ├── process-module.ts     # Process info
│   │   │       └── index.ts              # Module exports
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── package-manager/     # Placeholder (Week 4)
│   │   └── package.json
│   │
│   └── worker/              # Placeholder (future: Web Workers)
│       └── package.json
│
├── examples/
│   └── basic-poc/           # Browser demo
│       ├── index.html       # Demo UI
│       ├── app.ts           # Demo app logic
│       ├── vite.config.ts   # Vite configuration
│       └── package.json
│
├── pnpm-workspace.yaml      # Workspace configuration
├── package.json             # Root package
├── README.md                # Project documentation
└── PROGRESS.md              # This file
```

---

## Key Files to Understand

### 1. `/packages/runtime/src/quickjs-runtime.ts` (Core Runtime)
**Purpose:** Wraps QuickJS WASM, handles code execution, module injection

**Key methods:**
- `initialize()` - Loads QuickJS WASM (expensive, do once)
- `execute(code, options)` - Runs JavaScript code
- `mountFiles(tree)` - Loads files into virtual filesystem
- File system helpers (readFile, writeFile, mkdir, etc.)

**Important details:**
- Creates new QuickJS context for each execution
- Injects Node.js modules as globals before execution
- Transforms ES module syntax (import/export) via regex
- Captures console.log output
- Proper memory management (disposes QuickJS handles)

### 2. `/packages/runtime/src/modules/` (Node.js Polyfills)

**module-helpers.ts:**
- `createGlobalModule()` - Factory wrapper for injecting modules
- `addModuleFunction()` - Helper to add functions to modules with error handling

**Pattern for creating modules:**
```typescript
export function createFsModule(vm: QuickJSContext, filesystem: any): QuickJSHandle {
  const fsObj = vm.newObject();

  addModuleFunction(vm, fsObj, 'readFileSync', (pathHandle, encodingHandle) => {
    const path = vm.dump(pathHandle);
    const encoding = encodingHandle ? vm.dump(encodingHandle) : 'utf8';
    const content = filesystem.readFileSync(path, encoding === 'utf8' ? 'utf8' : undefined);
    return vm.newString(content);
  });

  return fsObj;
}
```

### 3. `/packages/client/src/nodepack.ts` (Public API)
**Purpose:** User-facing API, similar to WebContainer API

**Usage:**
```typescript
import { Nodepack } from '@nodepack/client';

const runtime = await Nodepack.boot({ useWorker: false });
const result = await runtime.execute(code);
console.log(result.ok, result.data, result.logs);
```

### 4. `/examples/basic-poc/app.ts` (Demo Application)
**Purpose:** Browser demo showing how to use Nodepack

**Features:**
- Initializes Nodepack on page load
- Code editor with syntax highlighting (basic)
- Run button to execute code
- Console output display
- Example code snippets

---

## What Actually Works

### ✅ Working Code Examples

**1. Basic JavaScript:**
```javascript
console.log('Hello World');
const x = 10 + 5;
console.log('Result:', x);
export default x;
```

**2. File Operations:**
```javascript
fs.writeFileSync('/hello.txt', 'Hello from virtual filesystem!');
const content = fs.readFileSync('/hello.txt', 'utf8');
console.log('File content:', content);

fs.mkdirSync('/data', { recursive: true });
fs.writeFileSync('/data/test.txt', 'Test file');

const files = fs.readdirSync('/');
console.log('Root directory files:', files);
```

**3. Path Utilities:**
```javascript
const fullPath = path.join('/home', 'user', 'documents', 'file.txt');
const dir = path.dirname(fullPath);
const file = path.basename(fullPath);
const ext = path.extname(fullPath);

console.log('Full path:', fullPath);     // /home/user/documents/file.txt
console.log('Directory:', dir);           // /home/user/documents
console.log('Filename:', file);           // file.txt
console.log('Extension:', ext);           // .txt
```

**4. Process Info:**
```javascript
console.log('Platform:', process.platform);   // browser
console.log('Version:', process.version);     // v18.0.0-browser
console.log('Working dir:', process.cwd());   // /
```

**5. ES Modules (Import/Export):**
```javascript
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const filepath = join('/data', 'test.txt');
writeFileSync(filepath, 'Hello!');
const content = readFileSync(filepath, 'utf8');

export default { content };
```

---

## What Doesn't Work Yet

### ❌ Missing Features

1. **Multi-file projects** - Cannot `import './utils.js'` from local files
2. **CommonJS require()** - `const fs = require('fs')` doesn't work
3. **NPM packages** - Cannot install or use lodash, axios, etc.
4. **HTTP servers** - Cannot run Express.js apps
5. **Async file operations** - Only sync methods implemented
6. **Binary file support** - Only UTF-8 text files work properly
7. **File persistence** - Files reset on page refresh
8. **Web Workers** - Everything runs on main thread
9. **Module resolution** - No node_modules lookup
10. **Package.json parsing** - Cannot read dependencies

---

## Honest Assessment

### What Value Have We Added?

**Compared to plain QuickJS:**

✅ **Actual Value:**
1. Node.js API polyfills (`fs`, `path`, `process`) integrated
2. Virtual filesystem so file operations work
3. Console output capture
4. ES module syntax convenience (import/export)
5. Simple API wrapper

⚠️ **Limited Value:**
1. ES module transforms - QuickJS supports ES2023 natively, we should use proper module APIs
2. Current approach is hacky regex transforms instead of proper module resolution

### Critical Realization

**QuickJS natively supports ES2023 including modules!** We're using `vm.evalCode()` instead of proper module APIs like `vm.evalModule()`. Our regex-based transforms are a workaround to avoid implementing proper module loading.

**This means:**
- We should refactor to use QuickJS's native module system
- Or acknowledge we're just a convenience wrapper around QuickJS
- The real value is Node.js compatibility, not module handling

---

## Dependencies

### Runtime Package
```json
{
  "dependencies": {
    "@jitl/quickjs-wasmfile-release-sync": "^0.31.0",  // QuickJS WASM variant
    "memfs": "^4.56.10",                                // Virtual filesystem
    "path-browserify": "^1.0.1",                        // Path polyfill
    "quickjs-emscripten": "^0.31.0"                     // QuickJS bindings
  }
}
```

### Client Package
```json
{
  "dependencies": {
    "@nodepack/runtime": "workspace:*",
    "@nodepack/worker": "workspace:*",
    "comlink": "^4.4.1"  // Web Worker communication (not used yet)
  }
}
```

---

## Known Issues

### 1. Memory Management
- **Issue:** Potential memory leaks if QuickJS handles aren't disposed properly
- **Status:** Current code disposes handles, but needs testing
- **Solution:** Add memory profiling and stress testing

### 2. Import Transforms Are Fragile
- **Issue:** Regex-based import transforms don't handle all cases
- **Example:** Won't handle: `import fs, { readFile } from 'fs'`
- **Solution:** Switch to proper module resolution or use a parser

### 3. Export Handling Is Limited
- **Issue:** Only `export default` works, not named exports
- **Example:** `export const foo = 123;` doesn't work
- **Solution:** Implement proper export handling

### 4. No Relative Module Imports
- **Issue:** Cannot do `import './utils.js'`
- **Blocker:** Need module resolution system + virtual filesystem integration
- **Next Step:** This is Week 3-4 priority

### 5. Error Messages Are Poor
- **Issue:** QuickJS errors are cryptic
- **Example:** "ReferenceError: fs is not defined" if module injection fails
- **Solution:** Add better error handling and user-friendly messages

---

## Architecture Decisions

### Why These Choices Were Made

#### 1. QuickJS over Other Engines
- ✅ Small size (~1MB)
- ✅ Fast startup
- ✅ Good ES2023 support
- ✅ Browser-compatible WASM build
- ❌ But: Less mature than V8/JSCore

#### 2. memfs over OPFS
- ✅ Simpler implementation
- ✅ Works immediately, no async
- ✅ Good enough for teaching (sessions are short)
- ❌ But: No persistence across page refreshes
- **Future:** Could add OPFS as persistence layer

#### 3. Direct Runtime (No Workers Yet)
- ✅ Simpler to debug
- ✅ Faster development
- ✅ Enough for PoC
- ❌ But: Blocks main thread
- **Future:** Add worker support for production

#### 4. Global Module Injection
- ✅ Simple to implement
- ✅ Works immediately
- ✅ Familiar to students (globals like `fs`, `path`)
- ❌ But: Not true Node.js module resolution
- **Future:** Add proper `require()` support

---

## Next Steps & Options

### Option 1: Continue with Current Approach (Quick & Dirty)

**Goal:** Get something working fast for teaching platform

**Week 3 (Continued) - require() Support:**
1. Implement basic CommonJS module loader
2. Handle relative paths: `require('./utils')`
3. Connect to virtual filesystem (memfs)
4. Add module caching
5. Support both `.js` and `.json` files

**Estimated Time:** 2-3 days

**Week 4 - NPM Package Support:**
1. Fetch packages from CDN (esm.sh or unpkg)
2. Parse package.json dependencies
3. Download and cache packages (IndexedDB)
4. Update require() to check node_modules
5. Test with common packages (lodash, axios)

**Estimated Time:** 3-5 days

**Pros:**
- ✅ Fast to implement
- ✅ Gets teaching platform working quickly
- ✅ Students can run real Node.js tutorials

**Cons:**
- ❌ Hacky implementation
- ❌ Won't handle edge cases
- ❌ Technical debt

---

### Option 2: Refactor to Use QuickJS Properly (Correct Approach)

**Goal:** Use QuickJS's native module system instead of regex hacks

**Changes Required:**
1. Switch from `vm.evalCode()` to `vm.evalModule()` or module loader APIs
2. Implement proper module resolution system
3. Create module loader that integrates with virtual filesystem
4. Handle both ESM and CommonJS
5. Remove regex-based import/export transforms

**Research Needed:**
- quickjs-emscripten module APIs documentation
- How to implement custom module loaders in QuickJS
- How Nodebox/WebContainers handle this

**Estimated Time:** 1-2 weeks

**Pros:**
- ✅ Correct architecture
- ✅ Handles all edge cases
- ✅ Maintainable long-term
- ✅ Supports full ES2023 features

**Cons:**
- ❌ Slower to implement
- ❌ Requires deeper QuickJS knowledge
- ❌ More complex

---

### Option 3: Simplify & Focus (Minimal Viable Product)

**Goal:** Admit this is a lightweight wrapper, focus on teaching value

**Scope Reduction:**
1. Keep current implementation (globals + transforms)
2. Add only the most critical feature: require() for local files
3. Skip NPM packages entirely (not essential for teaching)
4. Document limitations clearly
5. Focus on UX: better error messages, examples, tutorials

**Estimated Time:** 1 week

**Pros:**
- ✅ Realistic scope
- ✅ Focuses on core teaching value
- ✅ Easier to maintain
- ✅ Students can still learn Node.js basics

**Cons:**
- ❌ Can't run real-world Node.js apps
- ❌ Limited compared to WebContainers
- ❌ May not justify custom solution vs. using existing tools

---

## Recommended Path Forward

### My Recommendation: Option 1 with Caveat

**Continue with "quick & dirty" approach BUT:**

1. **Add require() for local files** (Week 3)
   - Essential for multi-file projects
   - Students need to learn module patterns
   - Not too complex to implement

2. **Add basic NPM package support** (Week 4)
   - Fetch from CDN (esm.sh)
   - Only support pure JavaScript packages
   - Document which packages work
   - Essential for teaching (lodash, axios, date-fns, etc.)

3. **Stop after that** (Re-evaluate after Week 4)
   - HTTP servers (Express) are nice-to-have, not essential
   - OPFS persistence is nice-to-have
   - Web Workers are optimization, not core feature

4. **Plan refactor for v2.0**
   - Document technical debt
   - Plan proper QuickJS module integration
   - Consider if it's worth it vs. paying for WebContainers

### Why This Approach?

1. **Gets teaching platform working in 1 month** as originally planned
2. **Validates the idea** before investing in perfect architecture
3. **Students can run meaningful Node.js code** (multi-file, packages)
4. **Avoids over-engineering** before we know this is worth it
5. **Can always refactor** if the teaching platform succeeds

---

## How to Continue Development

### For Next Session:

1. **Read this document** to understand current state
2. **Test the demo** at http://localhost:3000 to see what works
3. **Review plan** in `/Users/yangshun/.claude/plans/cheerful-riding-lark.md`
4. **Choose direction**:
   - Option 1: Continue with require() implementation
   - Option 2: Refactor to use QuickJS properly
   - Option 3: Simplify scope

### Starting require() Implementation (Option 1):

**Step 1: Create module loader** (`packages/runtime/src/module-loader.ts`)
```typescript
export class ModuleLoader {
  private cache = new Map<string, any>();
  private fs: any; // memfs instance

  require(modulePath: string, fromFile: string): any {
    // 1. Resolve path (relative or node_modules)
    // 2. Check cache
    // 3. Load file from virtual fs
    // 4. Wrap in CommonJS module function
    // 5. Execute and cache
    // 6. Return module.exports
  }

  private resolve(modulePath: string, fromFile: string): string {
    // Handle: ./utils, ../helpers, fs (builtin), node_modules
  }
}
```

**Step 2: Inject require() into QuickJS**
- Add `require` as global function in `quickjs-runtime.ts`
- Connect to ModuleLoader
- Test with simple examples

**Step 3: Test multi-file projects**
```javascript
// /main.js
const utils = require('./utils');
console.log(utils.greet('World'));

// /utils.js
module.exports = {
  greet: (name) => `Hello, ${name}!`
};
```

### Starting NPM Package Support (Option 1, Week 4):

**Step 1: Create package fetcher** (`packages/package-manager/src/cdn-installer.ts`)
```typescript
export class CDNInstaller {
  async fetchPackage(name: string, version: string): Promise<string> {
    // 1. Fetch from esm.sh or unpkg
    // 2. Parse dependencies
    // 3. Recursively fetch dependencies
    // 4. Cache in IndexedDB
    // 5. Return package code
  }
}
```

**Step 2: Integrate with require()**
- Check node_modules in virtual fs first
- If not found, fetch from CDN
- Add to virtual fs
- Continue normal require() flow

---

## Testing Checklist

### Current Features to Test:

- [ ] Hello World example runs
- [ ] Math operations work
- [ ] Loops and iteration work
- [ ] fs.writeFileSync creates files
- [ ] fs.readFileSync reads files
- [ ] fs.mkdirSync creates directories
- [ ] fs.readdirSync lists files
- [ ] path.join combines paths
- [ ] path.dirname extracts directory
- [ ] path.basename extracts filename
- [ ] process.platform returns 'browser'
- [ ] process.cwd() returns '/'
- [ ] console.log appears in output
- [ ] export default returns value
- [ ] import { } from 'fs' works
- [ ] Error messages display

### Future Features to Test (require()):

- [ ] require('./utils') loads local file
- [ ] require('../helpers') works with relative paths
- [ ] require('fs') returns built-in module
- [ ] Module caching works (multiple requires return same instance)
- [ ] Circular dependencies don't crash
- [ ] module.exports can be object or function
- [ ] exports shorthand works

### Future Features to Test (NPM):

- [ ] Can install lodash from CDN
- [ ] Can use lodash methods
- [ ] Dependencies are resolved automatically
- [ ] Packages are cached (fast second load)
- [ ] Can install multiple packages
- [ ] Error handling for 404/network failures

---

## Resources

### Documentation:
- **QuickJS:** https://bellard.org/quickjs/
- **quickjs-emscripten:** https://github.com/justjake/quickjs-emscripten
- **memfs:** https://github.com/streamich/memfs
- **WebContainers (inspiration):** https://webcontainers.io/

### Similar Projects:
- **Nodebox (Sandpack):** https://github.com/codesandbox/nodebox-runtime
- **WebContainers (StackBlitz):** Commercial product, closed source
- **JsLinux:** https://bellard.org/jslinux/ (QuickJS creator's demo)

### Tools:
- **esm.sh:** https://esm.sh/ - CDN that converts npm packages to ESM
- **unpkg:** https://unpkg.com/ - Direct npm package CDN
- **JSPM:** https://jspm.org/ - CDN with built-in dependency resolution

---

## Questions to Answer

### Before Continuing:

1. **Is the teaching platform the right use case?**
   - Would students actually use this?
   - Do they need full Node.js or just JavaScript?
   - Could we use WebContainers and pay $100/month instead?

2. **What's the actual scope?**
   - Do we need NPM packages?
   - Do we need HTTP servers?
   - What % of Node.js tutorials require these?

3. **How much time are we willing to invest?**
   - 1 month for PoC? (Original plan)
   - 2-3 months for production? (More realistic)
   - Is this worth it vs. alternatives?

4. **What's the competition?**
   - Can we get educational pricing from StackBlitz?
   - What does CodeSandbox charge?
   - Are there other open-source alternatives?

---

## Contact & Continuation

**Session Date:** 2026-02-11
**Conversation Context:** Available in Claude.ai history

**To Resume Development:**
1. Read this document first
2. Test the demo at http://localhost:3000
3. Review architecture in key files listed above
4. Choose direction (Option 1, 2, or 3)
5. Start with small, testable changes
6. Update this document with progress

**Key Commands:**
```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start dev server (from examples/basic-poc/)
cd examples/basic-poc
pnpm dev

# Watch mode for runtime package
cd packages/runtime
pnpm dev
```

---

## Conclusion

We have a **working proof of concept** that demonstrates:
- QuickJS running in browser
- Node.js API polyfills (fs, path, process)
- Virtual filesystem
- ES module syntax support
- Interactive demo

**But we're only 30% done** to achieve the original vision.

The **critical next step** is deciding whether to:
1. **Push forward** with require() and NPM support (2-3 more weeks)
2. **Refactor** to use QuickJS properly (1-2 weeks, better architecture)
3. **Simplify** and ship minimal version (1 week, limited scope)

**Recommendation:** Option 1 - continue with quick implementation to validate the teaching platform concept, then refactor if successful.

Good luck! 🚀
