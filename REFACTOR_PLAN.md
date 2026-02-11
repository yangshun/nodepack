# Refactor Plan: Use QuickJS Native Module System

**Date:** 2026-02-11
**Goal:** Replace regex-based import/export transforms with QuickJS's native ES module support

## Why This Refactor?

**Current Problem:**
- Using regex to transform `import`/`export` syntax is fragile
- Doesn't handle complex cases (mixed imports, relative paths, etc.)
- We're not using QuickJS's native ES2023 module support

**QuickJS Native Support:**
- QuickJS supports ES2023 including full module system
- Has `runtime.setModuleLoader()` for custom module resolution
- Can evaluate code as modules with `evalCode(code, filename)`
- Properly handles import/export without transforms

## Research Findings

### Key APIs from quickjs-emscripten:

```typescript
// 1. Set up module loader
runtime.setModuleLoader(
  (moduleName: string) => string | Promise<string>,  // Load module source
  (baseName: string, name: string) => string          // Normalize paths (optional)
)

// 2. Evaluate as ES module
context.evalCode(code, filename) // When module loader is set, imports work

// 3. Async module evaluation
context.evalCodeAsync(code, filename) // Returns promise
```

### Working Example from Tests:

```typescript
const runtime = QuickJS.newRuntime();

// Set module loader
runtime.setModuleLoader((moduleName) => {
  // Return module source code as string
  return `export default '${moduleName}'`;
});

const context = runtime.newContext();

// Evaluate code with imports
const result = context.evalCode(`
  import fooName from './foo.js'
  globalThis.result = fooName
`, 'main.js');

context.unwrapResult(result).dispose();
```

## Architecture Changes

### Current Flow (Regex Transform):
```
User Code with imports
  ↓
Transform: import {x} from 'fs' → const {x} = fs
  ↓
Transform: export default y → globalThis.__moduleExport = y
  ↓
vm.evalCode(transformedCode)
  ↓
Extract exported value from globalThis.__moduleExport
```

### New Flow (Native Modules):
```
User Code with imports
  ↓
runtime.setModuleLoader(moduleName => {
  if (builtin) return builtin module code
  if (local file) return fs.readFileSync(path, 'utf8')
  throw error
})
  ↓
context.evalCode(code, 'main.js')  // Automatically handles imports
  ↓
QuickJS resolves imports via module loader
  ↓
Module returns exported value naturally
```

## Implementation Steps

### Phase 1: Create Module Loader (2-3 hours)

**File:** `/packages/runtime/src/module-loader.ts`

```typescript
import type { QuickJSContext } from 'quickjs-emscripten';
import * as pathBrowserify from 'path-browserify';

export class NodepackModuleLoader {
  private filesystem: any; // memfs instance
  private builtinModules: Map<string, string>;

  constructor(filesystem: any) {
    this.filesystem = filesystem;
    this.builtinModules = this.createBuiltinModules();
  }

  /**
   * Load module source code
   * Called by QuickJS when code contains import statement
   */
  load(moduleName: string): string {
    // 1. Check if builtin module (fs, path, process)
    if (this.builtinModules.has(moduleName)) {
      return this.builtinModules.get(moduleName)!;
    }

    // 2. Try to load from virtual filesystem
    const resolvedPath = this.resolveModulePath(moduleName);
    if (this.filesystem.existsSync(resolvedPath)) {
      return this.filesystem.readFileSync(resolvedPath, 'utf8');
    }

    // 3. Not found
    throw new Error(`Cannot find module '${moduleName}'`);
  }

  /**
   * Normalize module path (resolve relative imports)
   * Called before load() to resolve paths like './utils.js'
   */
  normalize(baseName: string, requestedName: string): string {
    // If importing a builtin, return as-is
    if (this.builtinModules.has(requestedName)) {
      return requestedName;
    }

    // If absolute path
    if (requestedName.startsWith('/')) {
      return this.addExtension(requestedName);
    }

    // If relative path
    if (requestedName.startsWith('./') || requestedName.startsWith('../')) {
      const baseDir = pathBrowserify.dirname(baseName);
      const resolved = pathBrowserify.join(baseDir, requestedName);
      return this.addExtension(resolved);
    }

    // Otherwise, treat as builtin or node_modules
    return requestedName;
  }

  /**
   * Create source code for builtin modules
   */
  private createBuiltinModules(): Map<string, string> {
    const modules = new Map<string, string>();

    // fs module as ES module export
    modules.set('fs', `
      export const readFileSync = globalThis.__nodepack_fs.readFileSync;
      export const writeFileSync = globalThis.__nodepack_fs.writeFileSync;
      export const existsSync = globalThis.__nodepack_fs.existsSync;
      export const readdirSync = globalThis.__nodepack_fs.readdirSync;
      export const mkdirSync = globalThis.__nodepack_fs.mkdirSync;
      export default globalThis.__nodepack_fs;
    `);

    // path module
    modules.set('path', `
      export const join = globalThis.__nodepack_path.join;
      export const dirname = globalThis.__nodepack_path.dirname;
      export const basename = globalThis.__nodepack_path.basename;
      export const extname = globalThis.__nodepack_path.extname;
      export const resolve = globalThis.__nodepack_path.resolve;
      export const normalize = globalThis.__nodepack_path.normalize;
      export const sep = globalThis.__nodepack_path.sep;
      export default globalThis.__nodepack_path;
    `);

    // process module
    modules.set('process', `
      export default globalThis.__nodepack_process;
      export const env = globalThis.__nodepack_process.env;
      export const cwd = globalThis.__nodepack_process.cwd;
      export const argv = globalThis.__nodepack_process.argv;
      export const platform = globalThis.__nodepack_process.platform;
      export const version = globalThis.__nodepack_process.version;
    `);

    return modules;
  }

  /**
   * Add .js extension if missing
   */
  private addExtension(path: string): string {
    if (!path.endsWith('.js') && !path.endsWith('.json') && !path.endsWith('.mjs')) {
      return path + '.js';
    }
    return path;
  }

  /**
   * Resolve module path in filesystem
   */
  private resolveModulePath(moduleName: string): string {
    // Try with extension
    if (this.filesystem.existsSync(moduleName)) {
      return moduleName;
    }

    // Try adding .js
    const withJs = moduleName + '.js';
    if (this.filesystem.existsSync(withJs)) {
      return withJs;
    }

    // Try as directory with index.js
    const withIndex = pathBrowserify.join(moduleName, 'index.js');
    if (this.filesystem.existsSync(withIndex)) {
      return withIndex;
    }

    return moduleName; // Let it fail naturally
  }
}
```

### Phase 2: Update QuickJS Runtime (1-2 hours)

**File:** `/packages/runtime/src/quickjs-runtime.ts`

**Changes:**
1. Import and create NodepackModuleLoader
2. Set up module loader on runtime instead of injecting globals
3. Inject builtins as `globalThis.__nodepack_*` for module loader to use
4. Remove all regex transform code
5. Call evalCode directly with filename

```typescript
import { NodepackModuleLoader } from './module-loader.js';

export class QuickJSRuntime {
  // ... existing code ...

  async execute(code: string, options: RuntimeOptions = {}): Promise<ExecutionResult> {
    if (!this.isInitialized) {
      throw new Error('Runtime not initialized. Call initialize() first.');
    }

    // Create runtime and context
    const runtime = this.QuickJS.newRuntime();
    const vm = runtime.newContext();

    try {
      // Set up console
      const consoleObj = vm.newObject();
      const logFn = vm.newFunction('log', (...args: any[]) => {
        const messages = args.map((arg: any) => {
          const str = vm.dump(arg);
          return String(str);
        });
        const logMessage = messages.join(' ');
        console.log(logMessage);
        this.consoleLogs.push(logMessage);
      });

      vm.setProp(consoleObj, 'log', logFn);
      vm.setProp(vm.global, 'console', consoleObj);
      logFn.dispose();
      consoleObj.dispose();

      // Inject Node.js modules as hidden globals for module loader
      const fsHandle = createFsModule(vm, this.filesystem);
      vm.setProp(vm.global, '__nodepack_fs', fsHandle);
      fsHandle.dispose();

      const pathHandle = createPathModule(vm);
      vm.setProp(vm.global, '__nodepack_path', pathHandle);
      pathHandle.dispose();

      const processHandle = createProcessModule(vm, options);
      vm.setProp(vm.global, '__nodepack_process', processHandle);
      processHandle.dispose();

      // Set up module loader
      const moduleLoader = new NodepackModuleLoader(this.filesystem);
      runtime.setModuleLoader(
        (moduleName) => moduleLoader.load(moduleName),
        (baseName, requestedName) => moduleLoader.normalize(baseName, requestedName)
      );

      // Execute code (NO TRANSFORMS!)
      const result = vm.evalCode(code, 'main.js');

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        vm.dispose();
        runtime.dispose();

        return {
          ok: false,
          error: String(error),
          logs: this.consoleLogs,
        };
      }

      const data = vm.dump(result.value);
      result.value.dispose();
      vm.dispose();
      runtime.dispose();

      return {
        ok: true,
        data: data,
        logs: this.consoleLogs,
      };
    } catch (error: any) {
      vm.dispose();
      runtime.dispose();
      return {
        ok: false,
        error: error.message || String(error),
        logs: this.consoleLogs,
      };
    } finally {
      this.consoleLogs = [];
    }
  }
}
```

### Phase 3: Update Module Implementations (30 min)

**Files:** Keep existing but ensure they export proper handles

**No changes needed** - The module factories still create QuickJS objects, we just reference them from `globalThis.__nodepack_*` now.

### Phase 4: Update Demo Examples (30 min)

**File:** `/examples/basic-poc/app.ts`

Update examples to use real ES module syntax:

```javascript
// Example: fs module
fs: `import { writeFileSync, readFileSync, mkdirSync, readdirSync } from 'fs';

writeFileSync('/hello.txt', 'Hello from virtual filesystem!');
const content = readFileSync('/hello.txt', 'utf8');

console.log('File content:', content);

mkdirSync('/data', { recursive: true });
writeFileSync('/data/test.txt', 'Test file');

const files = readdirSync('/');
console.log('Root directory files:', files);

export default { content, files };`,

// Example: Multi-file project
multifile: `// Write utils.js to filesystem first
import { writeFileSync } from 'fs';
writeFileSync('/utils.js', \`
  export function greet(name) {
    return 'Hello, ' + name + '!';
  }
  export const version = '1.0.0';
\`);

// Now import it
import { greet, version } from './utils.js';

console.log(greet('World'));
console.log('Version:', version);

export default { greeting: greet('User'), version };`
```

### Phase 5: Testing (1 hour)

**Test Cases:**

1. **Builtin modules work**
   ```javascript
   import { writeFileSync } from 'fs';
   import { join } from 'path';
   ```

2. **Default imports work**
   ```javascript
   import fs from 'fs';
   import path from 'path';
   ```

3. **Local file imports work**
   ```javascript
   // After writing /utils.js
   import { helper } from './utils.js';
   ```

4. **Relative paths work**
   ```javascript
   // From /src/main.js
   import helper from '../lib/utils.js';
   ```

5. **Export default works**
   ```javascript
   export default { result: 123 };
   ```

6. **Named exports work**
   ```javascript
   export const foo = 1;
   export function bar() {}
   ```

7. **Errors are clear**
   ```javascript
   import missing from './nonexistent.js';
   // Should error: "Cannot find module './nonexistent.js'"
   ```

## Migration Strategy

### Step 1: Create module-loader.ts (new file)
- No existing code affected
- Can test in isolation

### Step 2: Add feature flag to runtime
```typescript
execute(code: string, options: RuntimeOptions & { useNativeModules?: boolean } = {})
```
- If `useNativeModules === false`, use old regex approach
- If `useNativeModules === true`, use new module loader
- Default to `false` initially

### Step 3: Test both modes
- Ensure all existing examples work with old mode
- Test new mode with new examples
- Compare behavior

### Step 4: Switch default to native modules
- Change default to `true`
- Update all examples
- Remove feature flag after confirming

### Step 5: Remove old code
- Delete regex transform code
- Clean up

## Estimated Time

- **Phase 1:** 2-3 hours (module loader implementation)
- **Phase 2:** 1-2 hours (runtime refactor)
- **Phase 3:** 30 minutes (module updates - minimal)
- **Phase 4:** 30 minutes (demo examples)
- **Phase 5:** 1 hour (testing)

**Total: 5-7 hours** (1 working day)

## Benefits After Refactor

### Technical:
✅ Use QuickJS's native module system (architecturally correct)
✅ No fragile regex transforms
✅ Proper import/export handling (named exports, mixed imports, etc.)
✅ Better error messages from QuickJS
✅ Support for relative imports (`./utils.js`)
✅ Foundation for multi-file projects
✅ Can add CommonJS require() later on top of this

### Educational:
✅ Students can use real ES module syntax
✅ Matches real Node.js behavior more closely
✅ Can load local files as modules
✅ Clear module resolution (matches Node.js rules)

## Risks & Mitigation

### Risk 1: Breaking existing examples
**Mitigation:** Use feature flag during migration, test both modes

### Risk 2: QuickJS module API is different than expected
**Mitigation:** Create module-loader.ts first, test in isolation before integrating

### Risk 3: Performance regression
**Mitigation:** Benchmark before/after, QuickJS native should be faster

### Risk 4: Some edge cases don't work
**Mitigation:** Document limitations clearly, focus on common use cases first

## Success Criteria

1. ✅ All current examples still work
2. ✅ Can import from local files: `import utils from './utils.js'`
3. ✅ Both named and default exports work
4. ✅ Relative paths resolve correctly
5. ✅ Error messages are clear
6. ✅ No regex transforms in code
7. ✅ Performance is same or better

## Next Steps After Refactor

Once native modules work:

1. **Add CommonJS require()** - Can be implemented as a module that uses the same module loader
2. **Add NPM packages from CDN** - Extend module loader to fetch from esm.sh
3. **Better error messages** - Catch and improve QuickJS errors
4. **Module caching** - Cache loaded modules for performance

## References

- [quickjs-emscripten GitHub](https://github.com/justjake/quickjs-emscripten)
- [Module Loading Tests](https://github.com/justjake/quickjs-emscripten/blob/main/packages/quickjs-emscripten/src/quickjs.test.ts)
- [CHANGELOG - Module Features](https://github.com/justjake/quickjs-emscripten/blob/main/CHANGELOG.md)

---

**Ready to implement?** Start with Phase 1 (module-loader.ts), test it, then proceed to Phase 2.
