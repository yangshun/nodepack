# Week 4 Implementation Plan: NPM Package Installation from CDN

**Status:** 🚧 In Progress
**Date:** 2026-02-11

## Goal

Enable importing npm packages from CDN (esm.sh) so code like this works:

```javascript
import _ from 'lodash';
import axios from 'axios';
import { format } from 'date-fns';

console.log(_.sum([1, 2, 3, 4, 5])); // 15
console.log(format(new Date(), 'yyyy-MM-dd')); // 2026-02-11
```

## Architecture Overview

### Current State (Week 3)
The module loader resolves imports in this order:
1. **Builtin modules** (fs, path, process) → return from Map
2. **Local filesystem** (/utils.js, ./helpers.js) → read from memfs
3. **Not found** → throw error

### Week 4: Add CDN Resolution
Extend the module loader to add a third tier:
1. Builtin modules → return from Map
2. Local filesystem → read from memfs
3. **NPM packages** → fetch from esm.sh CDN, cache in memfs
4. Not found → throw error

## Implementation Strategy

### Phase 1: Basic CDN Fetching (2 hours)

**Goal:** Get `import _ from 'lodash'` working

**Changes to `/packages/runtime/src/module-loader.ts`:**

Add async `load()` method that:
1. Checks if module name looks like npm package (no `.`, `/`, `./`)
2. If package not in filesystem cache, fetch from esm.sh
3. Save to `/node_modules/{package}/index.js` in memfs
4. Return the code

**Challenge:** QuickJS's `setModuleLoader()` expects synchronous `load()` function, but CDN fetches are async!

**Solution:** Pre-fetch packages before execution:
- Add `async preloadPackage(packageName: string)` method
- Detect imports in code (simple regex scan)
- Pre-fetch all npm packages before calling `execute()`
- Then `load()` just reads from cache

### Phase 2: Import Detection (1 hour)

**Goal:** Automatically detect which packages to fetch

**New file:** `/packages/runtime/src/import-detector.ts`

```typescript
export function detectImports(code: string): string[] {
  const imports: Set<string> = new Set();

  // Match: import foo from 'package-name'
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;

  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const moduleName = match[1];

    // Only npm packages (no ./, ../, /, builtin)
    if (!moduleName.startsWith('.') &&
        !moduleName.startsWith('/') &&
        !['fs', 'path', 'process'].includes(moduleName)) {
      imports.add(moduleName);
    }
  }

  return Array.from(imports);
}
```

### Phase 3: CDN Package Fetcher (2 hours)

**New file:** `/packages/runtime/src/cdn-fetcher.ts`

```typescript
export class CDNFetcher {
  private cache = new Map<string, string>();

  /**
   * Fetch package from esm.sh CDN
   * Returns ES module code as string
   */
  async fetchPackage(packageName: string, version?: string): Promise<string> {
    // Check memory cache
    const cacheKey = version ? `${packageName}@${version}` : packageName;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Construct esm.sh URL
    const url = version
      ? `https://esm.sh/${packageName}@${version}`
      : `https://esm.sh/${packageName}`;

    // Fetch from CDN
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${packageName}: ${response.statusText}`);
    }

    const code = await response.text();

    // Cache the result
    this.cache.set(cacheKey, code);

    return code;
  }

  /**
   * Fetch multiple packages in parallel
   */
  async fetchPackages(packages: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    await Promise.all(
      packages.map(async (pkg) => {
        try {
          const code = await this.fetchPackage(pkg);
          results.set(pkg, code);
        } catch (error) {
          console.error(`Failed to fetch ${pkg}:`, error);
          throw error;
        }
      })
    );

    return results;
  }
}
```

### Phase 4: Integrate into Module Loader (1 hour)

**Update `/packages/runtime/src/module-loader.ts`:**

```typescript
export class NodepackModuleLoader {
  private filesystem: any;
  private builtinModules: Map<string, string>;
  private cdnFetcher: CDNFetcher; // NEW

  constructor(filesystem: any) {
    this.filesystem = filesystem;
    this.builtinModules = this.createBuiltinModules();
    this.cdnFetcher = new CDNFetcher(); // NEW
  }

  /**
   * Pre-load npm packages from CDN before execution
   */
  async preloadPackages(packages: string[]): Promise<void> {
    const packagesMap = await this.cdnFetcher.fetchPackages(packages);

    // Write packages to /node_modules in filesystem
    for (const [packageName, code] of packagesMap) {
      const modulePath = `/node_modules/${packageName}/index.js`;

      // Create directory
      this.filesystem.mkdirSync(`/node_modules/${packageName}`, { recursive: true });

      // Write module
      this.filesystem.writeFileSync(modulePath, code);
    }
  }

  load(moduleName: string): string {
    // 1. Builtin modules
    if (this.builtinModules.has(moduleName)) {
      return this.builtinModules.get(moduleName)!;
    }

    // 2. Local filesystem
    const resolvedPath = this.resolveModulePath(moduleName);
    if (this.filesystem.existsSync(resolvedPath)) {
      return this.filesystem.readFileSync(resolvedPath, 'utf8');
    }

    // 3. NPM packages (from /node_modules cache)
    const npmPath = `/node_modules/${moduleName}/index.js`;
    if (this.filesystem.existsSync(npmPath)) {
      return this.filesystem.readFileSync(npmPath, 'utf8');
    }

    // 4. Not found
    throw new Error(`Cannot find module '${moduleName}'. Make sure to import it first.`);
  }

  normalize(baseName: string, requestedName: string): string {
    // ... existing code ...

    // If looks like npm package, return as-is
    // The load() method will handle it
    return requestedName;
  }
}
```

### Phase 5: Update Runtime (30 min)

**Update `/packages/runtime/src/quickjs-runtime.ts`:**

```typescript
import { detectImports } from './import-detector.js';

async execute(code: string, options: RuntimeOptions = {}): Promise<ExecutionResult> {
  // ... existing setup code ...

  // Set up module loader
  const moduleLoader = new NodepackModuleLoader(this.filesystem);
  runtime.setModuleLoader(
    (moduleName: string) => moduleLoader.load(moduleName),
    (baseName: string, requestedName: string) => moduleLoader.normalize(baseName, requestedName)
  );

  // NEW: Detect and pre-load npm packages
  const npmPackages = detectImports(code);
  if (npmPackages.length > 0) {
    console.log('[Nodepack] Pre-loading packages:', npmPackages);
    await moduleLoader.preloadPackages(npmPackages);
  }

  // ... rest of execution code ...
}
```

### Phase 6: Add Example (15 min)

**Update `/examples/basic-poc/app.ts`:**

Add new example:

```typescript
const examples: Record<string, string> = {
  // ... existing examples ...

  packages: `// NPM packages from esm.sh CDN 🎉
import _ from 'lodash';

const numbers = [1, 2, 3, 4, 5];
const sum = _.sum(numbers);
const doubled = _.map(numbers, n => n * 2);

console.log('Numbers:', numbers);
console.log('Sum:', sum);
console.log('Doubled:', doubled);
console.log('Unique:', _.uniq([1, 2, 2, 3, 3, 4]));

export default { sum, doubled };`,
};
```

Enable the button in `index.html`:
```html
<button data-example="packages">NPM Packages 🎉</button>
```

## Testing Plan

### Test 1: Single Package (lodash)
```javascript
import _ from 'lodash';
console.log(_.sum([1, 2, 3])); // 6
```

**Expected:**
- Fetches `https://esm.sh/lodash`
- Caches to `/node_modules/lodash/index.js`
- Logs: `6`

### Test 2: Multiple Packages
```javascript
import _ from 'lodash';
import { format } from 'date-fns';

console.log(_.sum([1, 2, 3]));
console.log(format(new Date(), 'yyyy-MM-dd'));
```

**Expected:**
- Fetches both packages in parallel
- Both work correctly

### Test 3: Package with Dependencies
```javascript
import axios from 'axios';
// axios depends on other packages - esm.sh handles this
```

**Expected:**
- esm.sh bundles dependencies automatically
- Works out of the box

### Test 4: Scoped Packages
```javascript
import { useState } from '@preact/hooks';
```

**Expected:**
- Handles `@scope/package` format correctly

## Potential Issues & Solutions

### Issue 1: CORS Errors
**Problem:** Browser blocks cross-origin requests to esm.sh
**Solution:** esm.sh has CORS enabled - should work. If not, use CORS proxy or self-host CDN.

### Issue 2: Package has Native Dependencies
**Problem:** Packages with native modules (like `fs-extra`) won't work
**Solution:** Document limitations. Focus on pure JavaScript packages.

### Issue 3: Slow First Load
**Problem:** Fetching packages takes time
**Solution:** Show loading indicator. Cache in memfs. Future: IndexedDB persistence.

### Issue 4: Dependency Resolution
**Problem:** Package A imports package B
**Solution:** esm.sh handles this! It bundles dependencies automatically.

### Issue 5: Version Conflicts
**Problem:** User imports `lodash@4` and `lodash@3`
**Solution:** For Phase 1, don't support versions. Just fetch latest. Phase 2: add version support.

## Success Criteria

✅ Phase 1 complete when:
- Can import and use `lodash` from esm.sh
- Package is cached in memfs after first fetch
- Example in demo works

✅ Week 4 complete when:
- Multiple packages work (lodash, date-fns, axios)
- Import detection is automatic
- Loading is reasonably fast (< 3 seconds for small packages)
- Error messages are clear when package not found
- Demo has working "NPM Packages" example

## Timeline

- **Phase 1** (Basic CDN Fetching): 2 hours
- **Phase 2** (Import Detection): 1 hour
- **Phase 3** (CDN Fetcher): 2 hours
- **Phase 4** (Module Loader Integration): 1 hour
- **Phase 5** (Runtime Update): 30 minutes
- **Phase 6** (Demo Example): 15 minutes

**Total:** ~7 hours of focused work

## Files to Create

1. `/packages/runtime/src/cdn-fetcher.ts` - CDN package fetcher
2. `/packages/runtime/src/import-detector.ts` - Detect npm imports

## Files to Modify

1. `/packages/runtime/src/module-loader.ts` - Add `preloadPackages()` method
2. `/packages/runtime/src/quickjs-runtime.ts` - Add import detection and preloading
3. `/examples/basic-poc/app.ts` - Add npm packages example
4. `/examples/basic-poc/index.html` - Enable packages button

## Future Enhancements (Post-Week 4)

- **IndexedDB Persistence:** Cache packages across browser sessions
- **Version Support:** `import _ from 'lodash@4.17.21'`
- **Package.json Support:** Read dependencies from package.json
- **Progress Indicator:** Show download progress for large packages
- **Error Recovery:** Retry failed fetches
- **CDN Fallback:** Try unpkg.com if esm.sh fails
- **Treeshaking:** Only download parts of packages actually used

## References

- [esm.sh Documentation](https://esm.sh)
- [Import Maps Specification](https://github.com/WICG/import-maps)
- [Skypack CDN](https://www.skypack.dev) (alternative)
- [UNPKG CDN](https://unpkg.com) (alternative)

---

**Ready to implement!** 🚀
