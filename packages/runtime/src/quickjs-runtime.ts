/**
 * QuickJS Runtime Wrapper
 * Uses quickjs-emscripten directly for browser compatibility
 */

import { newQuickJSWASMModuleFromVariant } from 'quickjs-emscripten';
import variant from '@jitl/quickjs-wasmfile-release-sync';
import { vol } from 'memfs';
import type { ExecutionResult, RuntimeOptions, FileSystemTree, ConsoleOutput } from './types.js';
import {
  createFsModule,
  createPathModule,
  createProcessModule,
  createGlobalModule
} from './modules/index.js';

export class QuickJSRuntime {
  private QuickJS: any;
  private isInitialized = false;
  private filesystem = vol;
  private consoleLogs: string[] = [];

  /**
   * Initialize the QuickJS runtime
   * This is expensive and should only be done once
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.QuickJS = await newQuickJSWASMModuleFromVariant(variant);
    this.isInitialized = true;
  }

  /**
   * Mount files into the virtual filesystem
   */
  mountFiles(files: FileSystemTree): void {
    this.filesystem.fromJSON(this.flattenFileTree(files));
  }

  /**
   * Execute JavaScript/TypeScript code
   */
  async execute(code: string, options: RuntimeOptions = {}): Promise<ExecutionResult> {
    if (!this.isInitialized) {
      throw new Error('Runtime not initialized. Call initialize() first.');
    }

    const vm = this.QuickJS.newContext();

    try {
      // Set up console object
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

      // Inject Node.js modules
      createGlobalModule(vm, 'fs', (vm) => createFsModule(vm, this.filesystem));
      createGlobalModule(vm, 'path', (vm) => createPathModule(vm));
      createGlobalModule(vm, 'process', (vm) => createProcessModule(vm, options));

      // Transform ES module syntax to work with QuickJS
      let transformedCode = code;
      let hasExport = false;
      let exportedValue;

      // Transform import statements to use global modules
      // import { readFileSync, writeFileSync } from 'fs' -> const { readFileSync, writeFileSync } = fs;
      transformedCode = transformedCode.replace(
        /import\s+{([^}]+)}\s+from\s+['"](\w+)['"]\s*;?/g,
        (_match, imports, moduleName) => `const {${imports}} = ${moduleName};`
      );

      // import * as fs from 'fs' -> const fs = fs; (works since fs is global)
      transformedCode = transformedCode.replace(
        /import\s+\*\s+as\s+(\w+)\s+from\s+['"](\w+)['"]\s*;?/g,
        (_match, alias, moduleName) => `const ${alias} = ${moduleName};`
      );

      // import fs from 'fs' -> const fs = fs; (default import as global)
      transformedCode = transformedCode.replace(
        /import\s+(\w+)\s+from\s+['"](\w+)['"]\s*;?/g,
        (_match, varName, moduleName) => `const ${varName} = ${moduleName};`
      );

      // Check if code uses export syntax
      const hasExportSyntax = /\bexport\s+(default\s+|{|const|let|var|function|class)/i.test(transformedCode);

      if (hasExportSyntax) {
        // Transform export default to use a global variable
        transformedCode = transformedCode.replace(
          /export\s+default\s+(.*);?\s*$/m,
          'globalThis.__moduleExport = $1;'
        );
        hasExport = true;
      }

      // Execute the transformed code
      const result = vm.evalCode(transformedCode);

      if (!result.error && hasExport) {
        // Get the exported value from global
        const exportHandle = vm.getProp(vm.global, '__moduleExport');
        exportedValue = vm.dump(exportHandle);
        exportHandle.dispose();
      }

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        vm.dispose();

        return {
          ok: false,
          error: String(error),
          logs: this.consoleLogs,
        };
      }

      const data = hasExport ? exportedValue : vm.dump(result.value);
      result.value.dispose();
      vm.dispose();

      return {
        ok: true,
        data: data,
        logs: this.consoleLogs,
      };
    } catch (error: any) {
      vm.dispose();
      return {
        ok: false,
        error: error.message || String(error),
        logs: this.consoleLogs,
      };
    } finally {
      this.consoleLogs = []; // Clear logs after execution
    }
  }

  /**
   * Read a file from the virtual filesystem
   */
  readFile(path: string, encoding: 'utf8' | 'buffer' = 'utf8'): string | Buffer {
    try {
      return this.filesystem.readFileSync(path, encoding === 'utf8' ? 'utf8' : undefined) as any;
    } catch (error: any) {
      throw new Error(`Failed to read file ${path}: ${error.message}`);
    }
  }

  /**
   * Write a file to the virtual filesystem
   */
  writeFile(path: string, content: string | Buffer): void {
    try {
      // Ensure parent directory exists
      const dir = path.substring(0, path.lastIndexOf('/'));
      if (dir && !this.filesystem.existsSync(dir)) {
        this.filesystem.mkdirSync(dir, { recursive: true });
      }
      this.filesystem.writeFileSync(path, content);
    } catch (error: any) {
      throw new Error(`Failed to write file ${path}: ${error.message}`);
    }
  }

  /**
   * List files in a directory
   */
  readdir(path: string): string[] {
    try {
      return this.filesystem.readdirSync(path) as string[];
    } catch (error: any) {
      throw new Error(`Failed to read directory ${path}: ${error.message}`);
    }
  }

  /**
   * Create a directory
   */
  mkdir(path: string, recursive = true): void {
    try {
      this.filesystem.mkdirSync(path, { recursive });
    } catch (error: any) {
      throw new Error(`Failed to create directory ${path}: ${error.message}`);
    }
  }

  /**
   * Check if a file/directory exists
   */
  exists(path: string): boolean {
    return this.filesystem.existsSync(path);
  }

  /**
   * Remove a file or directory
   */
  remove(path: string, recursive = false): void {
    try {
      const stats = this.filesystem.statSync(path);
      if (stats.isDirectory()) {
        this.filesystem.rmdirSync(path, { recursive });
      } else {
        this.filesystem.unlinkSync(path);
      }
    } catch (error: any) {
      throw new Error(`Failed to remove ${path}: ${error.message}`);
    }
  }

  /**
   * Get all console logs from last execution
   */
  getConsoleLogs(): string[] {
    return [...this.consoleLogs];
  }

  /**
   * Clear the virtual filesystem
   */
  clearFileSystem(): void {
    this.filesystem.reset();
  }

  /**
   * Export the entire filesystem as JSON
   */
  exportFileSystem(): Record<string, string> {
    return this.filesystem.toJSON() as Record<string, string>;
  }

  /**
   * Flatten nested file tree into flat object for memfs
   */
  private flattenFileTree(tree: FileSystemTree, prefix = ''): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(tree)) {
      const path = prefix + '/' + key;

      if (typeof value === 'string' || value instanceof Uint8Array) {
        result[path] = value;
      } else if (typeof value === 'object') {
        Object.assign(result, this.flattenFileTree(value, path));
      }
    }

    return result;
  }

}
