/**
 * Module Loader for QuickJS
 * Implements ES module resolution using QuickJS's native setModuleLoader() API
 */

import * as pathBrowserify from 'path-browserify';
import { CDNFetcher } from './cdn-fetcher.js';

/**
 * NodepackModuleLoader
 * Handles module loading and path resolution for QuickJS runtime
 */
export class NodepackModuleLoader {
  private filesystem: any; // memfs Volume instance
  private builtinModules: Map<string, string>;
  private cdnFetcher: CDNFetcher;

  constructor(filesystem: any) {
    this.filesystem = filesystem;
    this.builtinModules = this.createBuiltinModules();
    this.cdnFetcher = new CDNFetcher();
  }

  /**
   * Pre-load npm packages from CDN
   * Fetches packages and stores them in /node_modules in the virtual filesystem
   *
   * This must be called BEFORE execution since QuickJS's load() is synchronous
   *
   * @param packages - Array of package names to fetch
   */
  async preloadPackages(packages: string[]): Promise<void> {
    if (packages.length === 0) {
      return;
    }

    // Fetch all packages from CDN
    const packagesMap = await this.cdnFetcher.fetchPackages(packages);

    // Write each package to /node_modules in the virtual filesystem
    for (const [packageName, code] of packagesMap) {
      const modulePath = `/node_modules/${packageName}/index.js`;

      // Create directory
      const packageDir = `/node_modules/${packageName}`;
      if (!this.filesystem.existsSync(packageDir)) {
        this.filesystem.mkdirSync(packageDir, { recursive: true });
      }

      // Write module code
      this.filesystem.writeFileSync(modulePath, code);
      console.log(`[ModuleLoader] Cached ${packageName} at ${modulePath}`);
    }
  }

  /**
   * Load module source code
   * Called by QuickJS when code contains import statement
   *
   * @param moduleName - The normalized module name/path
   * @returns Module source code as string
   */
  load(moduleName: string): string {
    // 1. Check if builtin module (fs, path, process)
    if (this.builtinModules.has(moduleName)) {
      return this.builtinModules.get(moduleName)!;
    }

    // 2. Try to load from virtual filesystem (local files)
    const resolvedPath = this.resolveModulePath(moduleName);
    if (this.filesystem.existsSync(resolvedPath)) {
      return this.filesystem.readFileSync(resolvedPath, 'utf8');
    }

    // 3. Try to load from /node_modules (CDN packages)
    const npmPath = `/node_modules/${moduleName}/index.js`;
    if (this.filesystem.existsSync(npmPath)) {
      return this.filesystem.readFileSync(npmPath, 'utf8');
    }

    // 4. Not found
    throw new Error(
      `Cannot find module '${moduleName}'. ` +
        `Make sure the package is imported or the file exists.`,
    );
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
    // Return as-is - the load() method will look in /node_modules
    return requestedName;
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
}
