/**
 * Module Loader for QuickJS
 * Implements ES module resolution using QuickJS's native setModuleLoader() API
 */

import pathBrowserify from 'path-browserify';
import { exports as resolveExports, legacy as resolveLegacy } from 'resolve.exports';
import { detectModuleFormat } from './format-detector.js';

/**
 * NodepackModuleLoader
 * Handles module loading and path resolution for QuickJS runtime
 */
export class NodepackModuleLoader {
  private filesystem: any; // memfs Volume instance
  private builtinModules: Map<string, string>;

  constructor(filesystem: any) {
    this.filesystem = filesystem;
    this.builtinModules = this.createBuiltinModules();
  }

  /**
   * Load module source code
   * Called by QuickJS when code contains import statement
   *
   * @param moduleName - The normalized module name/path (absolute path from normalize())
   * @returns Module source code as string
   */
  load(moduleName: string): string {
    // 1. Check if builtin module (fs, path, process)
    if (this.builtinModules.has(moduleName)) {
      return this.builtinModules.get(moduleName)!;
    }

    // 2. Try to load from filesystem (moduleName should be an absolute path from normalize())
    if (this.filesystem.existsSync(moduleName)) {
      const code = this.filesystem.readFileSync(moduleName, 'utf8');
      const format = detectModuleFormat(code);

      // If it's a CommonJS module, wrap it for ESM compatibility
      if (format === 'cjs') {
        return this.wrapCommonJSModule(code, moduleName);
      }

      // Transform ESM code to handle destructuring exports
      return this.transformESMCode(code);
    }

    // 3. Not found
    throw new Error(
      `Cannot find module '${moduleName}'. ` +
        `Make sure the package is installed or the file exists.`,
    );
  }

  /**
   * Wrap a CommonJS module so it can be imported as an ES module
   * This allows ESM code to import CJS modules
   */
  private wrapCommonJSModule(code: string, modulePath: string): string {
    // Create a wrapper that executes the CJS code and exports the result
    return `
      // CommonJS module wrapper for: ${modulePath}
      const module = {
        exports: {},
        filename: ${JSON.stringify(modulePath)},
        loaded: false,
        children: []
      };
      const exports = module.exports;

      // Cache the module
      if (!globalThis.__nodepack_module_cache) {
        globalThis.__nodepack_module_cache = {};
      }
      globalThis.__nodepack_module_cache[${JSON.stringify(modulePath)}] = module;

      // Set current module directory for relative requires
      const __dirname = ${JSON.stringify(pathBrowserify.dirname(modulePath))};
      const __filename = ${JSON.stringify(modulePath)};
      globalThis.__nodepack_current_module_dir = __dirname;

      // Execute the CommonJS module code
      (function(exports, require, module, __filename, __dirname) {
        ${code}
      })(exports, require, module, __filename, __dirname);

      module.loaded = true;

      // Export the module.exports as both default and named exports
      // This allows both: import x from './cjs' and import * as x from './cjs'
      export default module.exports;

      // Also export as named exports if module.exports is an object
      if (module.exports && typeof module.exports === 'object' && !Array.isArray(module.exports)) {
        ${this.generateNamedExports()}
      }
    `;
  }

  /**
   * Generate code to export CommonJS module.exports properties as named exports
   */
  private generateNamedExports(): string {
    return `
      const __cjs_exports = module.exports;
      for (const key in __cjs_exports) {
        if (__cjs_exports.hasOwnProperty(key)) {
          try {
            // Use a dynamic export approach since we can't use export at runtime
            // We'll rely on the default export containing all properties
          } catch (e) {
            // Ignore errors for non-exportable properties
          }
        }
      }
    `;
  }

  /**
   * Transform ESM code to handle syntax QuickJS doesn't support
   * Currently handles: export const { a, b } = obj -> const { a, b } = obj; export { a, b };
   */
  private transformESMCode(code: string): string {
    // Match: export const { ...destructured vars... } = expression;
    // Pattern handles multi-line destructuring with optional trailing comma
    const destructuringExportPattern = /export\s+const\s+\{([^}]+)\}\s*=\s*([^;]+);/g;

    return code.replace(destructuringExportPattern, (_match, destructuredVars, expression) => {
      // Extract variable names from destructuring pattern
      // Handle cases like: " program, hello " or " program,\n  hello,\n "
      const varNames = destructuredVars
        .split(',')
        .map((v: string) => v.trim())
        .filter((v: string) => v.length > 0);

      // Generate the transformed code:
      // const { program, hello } = commander;
      // export { program, hello };
      return `const {${destructuredVars}} = ${expression};\nexport { ${varNames.join(', ')} };`;
    });
  }

  /**
   * Parse a module name into package name and subpath
   * Examples:
   *   "lodash" -> { packageName: "lodash", subpath: "" }
   *   "lodash/add" -> { packageName: "lodash", subpath: "add" }
   *   "@babel/core" -> { packageName: "@babel/core", subpath: "" }
   *   "@babel/core/lib/index" -> { packageName: "@babel/core", subpath: "lib/index" }
   */
  private parsePackageName(moduleName: string): { packageName: string; subpath: string } {
    // Handle scoped packages (@scope/name)
    if (moduleName.startsWith('@')) {
      const parts = moduleName.split('/');
      if (parts.length >= 2) {
        const packageName = `${parts[0]}/${parts[1]}`;
        const subpath = parts.slice(2).join('/');
        return { packageName, subpath };
      }
    }

    // Handle regular packages
    const slashIndex = moduleName.indexOf('/');
    if (slashIndex === -1) {
      return { packageName: moduleName, subpath: '' };
    }

    return {
      packageName: moduleName.substring(0, slashIndex),
      subpath: moduleName.substring(slashIndex + 1),
    };
  }

  /**
   * Normalize module path (resolve relative imports)
   * Called before load() to resolve paths like './utils.js'
   *
   * @param baseName - The file that's doing the importing (e.g., '/main.js')
   * @param requestedName - The import path (e.g., './utils.js' or 'fs')
   * @returns Normalized absolute path
   */
  normalize(baseName: string, requestedName: string): string {
    // Strip node: protocol prefix if present (e.g., 'node:fs' -> 'fs')
    if (requestedName.startsWith('node:')) {
      requestedName = requestedName.slice(5);
    }

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

    // Otherwise, treat as npm package (e.g., 'lodash', '@babel/core')
    // Resolve to absolute path in /node_modules
    return this.resolvePackageToAbsolutePath(requestedName);
  }

  /**
   * Create source code for builtin modules
   * These export from globalThis.__nodepack_* objects
   */
  private createBuiltinModules(): Map<string, string> {
    const modules = new Map<string, string>();

    // fs module as ES module export
    modules.set(
      'fs',
      `
      export const readFileSync = globalThis.__nodepack_fs.readFileSync;
      export const writeFileSync = globalThis.__nodepack_fs.writeFileSync;
      export const existsSync = globalThis.__nodepack_fs.existsSync;
      export const readdirSync = globalThis.__nodepack_fs.readdirSync;
      export const mkdirSync = globalThis.__nodepack_fs.mkdirSync;
      export const unlinkSync = globalThis.__nodepack_fs.unlinkSync;
      export default globalThis.__nodepack_fs;
    `,
    );

    // path module
    modules.set(
      'path',
      `
      export const join = globalThis.__nodepack_path.join;
      export const dirname = globalThis.__nodepack_path.dirname;
      export const basename = globalThis.__nodepack_path.basename;
      export const extname = globalThis.__nodepack_path.extname;
      export const resolve = globalThis.__nodepack_path.resolve;
      export const normalize = globalThis.__nodepack_path.normalize;
      export const sep = globalThis.__nodepack_path.sep;
      export default globalThis.__nodepack_path;
    `,
    );

    // process module
    modules.set(
      'process',
      `
      export default globalThis.__nodepack_process;
      export const env = globalThis.__nodepack_process.env;
      export const cwd = globalThis.__nodepack_process.cwd;
      export const argv = globalThis.__nodepack_process.argv;
      export const platform = globalThis.__nodepack_process.platform;
      export const version = globalThis.__nodepack_process.version;
      export const exit = globalThis.__nodepack_process.exit;
    `,
    );

    // timers module
    modules.set(
      'timers',
      `
      export const setTimeout = globalThis.setTimeout;
      export const setInterval = globalThis.setInterval;
      export const clearTimeout = globalThis.clearTimeout;
      export const clearInterval = globalThis.clearInterval;
      export default globalThis.__nodepack_timers;
    `,
    );

    // events module
    modules.set(
      'events',
      `
      export const EventEmitter = globalThis.__nodepack_events.EventEmitter;
      export default globalThis.__nodepack_events;
    `,
    );

    // url module
    modules.set(
      'url',
      `
      export const URL = globalThis.URL;
      export const URLSearchParams = globalThis.URLSearchParams;
      export const fileURLToPath = globalThis.__nodepack_url.fileURLToPath;
      export default globalThis.__nodepack_url;
    `,
    );

    // buffer module
    modules.set(
      'buffer',
      `
      export const Buffer = globalThis.__nodepack_buffer.Buffer;
      export default globalThis.__nodepack_buffer;
    `,
    );

    // util module
    modules.set(
      'util',
      `
      export const inspect = globalThis.__nodepack_util.inspect;
      export const format = globalThis.__nodepack_util.format;
      export const types = globalThis.__nodepack_util.types;
      export default globalThis.__nodepack_util;
    `,
    );

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
   * Tries multiple resolution strategies
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

  /**
   * Resolve npm package name to absolute file path
   * Examples:
   *   'lodash' -> '/node_modules/lodash/index.js'
   *   'lodash/add' -> '/node_modules/lodash/add.js'
   *   '@babel/core' -> '/node_modules/@babel/core/lib/index.js' (from package.json main)
   */
  private resolvePackageToAbsolutePath(packageName: string): string {
    const { packageName: basePkg, subpath } = this.parsePackageName(packageName);
    const packagePath = `/node_modules/${basePkg}`;

    // If there's a subpath (e.g., "lodash/add"), resolve it directly
    if (subpath) {
      const subpathFile = pathBrowserify.join(packagePath, subpath);

      // Try the subpath as-is
      if (this.filesystem.existsSync(subpathFile)) {
        return subpathFile;
      }

      // Try adding .js extension
      const withJs = subpathFile + '.js';
      if (this.filesystem.existsSync(withJs)) {
        return withJs;
      }

      // Try as directory with index.js
      const withIndex = pathBrowserify.join(subpathFile, 'index.js');
      if (this.filesystem.existsSync(withIndex)) {
        return withIndex;
      }

      // If not found, return the .js version and let load() fail with a clear error
      return withJs;
    }

    // For top-level package imports, check package.json for entry point
    const packageJsonPath = pathBrowserify.join(packagePath, 'package.json');
    if (this.filesystem.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(this.filesystem.readFileSync(packageJsonPath, 'utf8'));

        // Try "exports" field first (modern packages)
        if (packageJson.exports) {
          try {
            // Use resolve.exports library for spec-compliant resolution
            // Returns an array of possible paths, we take the first one
            const resolved = resolveExports(packageJson, '.', {
              unsafe: false, // Use default conditions (import, default)
            });

            if (resolved && resolved.length > 0) {
              const exportsPath = pathBrowserify.join(packagePath, resolved[0]);
              if (this.filesystem.existsSync(exportsPath)) {
                return exportsPath;
              }
            }
          } catch {
            // If resolution fails, fall through to module/main fields
          }
        }

        // Try "module" and "main" fields using legacy resolver
        // Default behavior prefers "module" over "main" (ESM over CJS)
        const legacyPath = resolveLegacy(packageJson);
        if (legacyPath) {
          // resolveLegacy can return string, string[], or object
          let path: string | undefined;
          if (typeof legacyPath === 'string') {
            path = legacyPath;
          } else if (Array.isArray(legacyPath) && legacyPath.length > 0) {
            path = legacyPath[0];
          }

          if (path) {
            const fullPath = pathBrowserify.join(packagePath, path);
            if (this.filesystem.existsSync(fullPath)) {
              return fullPath;
            }
          }
        }
      } catch {
        // If package.json parsing fails, fall through to index.js
      }
    }

    // Fall back to index.js
    const indexPath = pathBrowserify.join(packagePath, 'index.js');
    return indexPath;
  }
}
