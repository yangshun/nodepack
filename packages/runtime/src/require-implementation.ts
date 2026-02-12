/**
 * CommonJS require() Implementation
 * Provides the global require() function that will be injected into QuickJS
 */

/**
 * Create the require() function source code to be injected into QuickJS global scope
 *
 * This returns JavaScript code as a string that will be evaluated in the QuickJS context.
 * The require() function handles:
 * - Builtin modules (fs, path, process, timers)
 * - Local files (./utils.js, ../config.js)
 * - npm packages (/node_modules/lodash/index.js)
 * - JSON files (./data.json)
 * - Module caching for performance
 * - Circular dependency support
 *
 * @returns JavaScript code string defining the global require() function
 */
export function createRequireFunction(): string {
  return `
(function() {
  // Initialize module cache if not exists
  if (!globalThis.__nodepack_module_cache) {
    globalThis.__nodepack_module_cache = {};
  }

  // Initialize current module directory for relative requires
  if (!globalThis.__nodepack_current_module_dir) {
    globalThis.__nodepack_current_module_dir = '/';
  }

  // List of builtin modules
  const BUILTIN_MODULES = ['fs', 'path', 'process', 'timers'];

  /**
   * Main require function
   * @param {string} modulePath - Module to require (builtin, relative, or package)
   * @returns {any} Module exports
   */
  function require(modulePath) {
    // 1. Handle builtin modules
    if (BUILTIN_MODULES.includes(modulePath)) {
      return globalThis['__nodepack_' + modulePath];
    }

    // 2. Resolve module path
    let resolvedPath;

    if (modulePath.startsWith('/')) {
      // Absolute path
      resolvedPath = modulePath;
    } else if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
      // Relative path - resolve from current module directory
      resolvedPath = globalThis.__nodepack_path.resolve(
        globalThis.__nodepack_current_module_dir,
        modulePath
      );
    } else {
      // npm package - look in /node_modules
      resolvedPath = '/node_modules/' + modulePath + '/index.js';
    }

    // 3. Add .js extension if missing (try multiple patterns)
    if (!resolvedPath.endsWith('.js') && !resolvedPath.endsWith('.json')) {
      // Try with .js
      if (globalThis.__nodepack_fs.existsSync(resolvedPath + '.js')) {
        resolvedPath = resolvedPath + '.js';
      } else if (globalThis.__nodepack_fs.existsSync(resolvedPath + '/index.js')) {
        // Try as directory with index.js
        resolvedPath = resolvedPath + '/index.js';
      } else if (globalThis.__nodepack_fs.existsSync(resolvedPath + '.json')) {
        // Try with .json
        resolvedPath = resolvedPath + '.json';
      } else {
        // Default to .js (will fail later if doesn't exist)
        resolvedPath = resolvedPath + '.js';
      }
    }

    // 4. Check cache - return cached module if already loaded
    if (globalThis.__nodepack_module_cache[resolvedPath]) {
      return globalThis.__nodepack_module_cache[resolvedPath].exports;
    }

    // 5. Check if file exists
    if (!globalThis.__nodepack_fs.existsSync(resolvedPath)) {
      throw new Error("Cannot find module '" + modulePath + "'");
    }

    // 6. Load module source code
    const code = globalThis.__nodepack_fs.readFileSync(resolvedPath, 'utf8');

    // 7. Create module object
    const module = {
      exports: {},
      filename: resolvedPath,
      loaded: false,
      children: []
    };

    // 8. Cache module immediately (enables circular dependencies)
    globalThis.__nodepack_module_cache[resolvedPath] = module;

    // 9. Handle JSON files specially
    if (resolvedPath.endsWith('.json')) {
      try {
        module.exports = JSON.parse(code);
        module.loaded = true;
        return module.exports;
      } catch (e) {
        const errMsg = (e && e.message) || JSON.stringify(e) || String(e);
        throw new Error("Failed to parse JSON in '" + modulePath + "': " + errMsg);
      }
    }

    // 10. Detect if this is an ES module (has export/import statements)
    // Use word boundary \\b to avoid matching "exports" or "imported"
    const isESModule = /^\s*(export|import)\b/m.test(code);

    if (isESModule) {
      // ES module - use dynamic import via helper
      try {
        const esResult = globalThis.__nodepack_require_es_module(resolvedPath);
        module.exports = esResult;
        module.loaded = true;
        return module.exports;
      } catch (e) {
        const errMsg = (e && e.message) || JSON.stringify(e) || String(e);
        throw new Error("Failed to require ES module '" + modulePath + "': " + errMsg);
      }
    }

    // 11. Set current directory for nested requires
    const previousDir = globalThis.__nodepack_current_module_dir;
    globalThis.__nodepack_current_module_dir = globalThis.__nodepack_path.dirname(resolvedPath);

    try {
      // 12. Execute module code via host function
      // This delegates to the TypeScript side which handles the wrapper
      globalThis.__nodepack_execute_commonjs_module(code, module, resolvedPath);

      // 13. Mark module as loaded
      module.loaded = true;
    } finally {
      // 14. Restore previous directory
      globalThis.__nodepack_current_module_dir = previousDir;
    }

    // 15. Return module exports
    return module.exports;
  }

  // Attach require to global scope
  globalThis.require = require;
})();
  `.trim();
}
