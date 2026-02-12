/**
 * Nodepack Runtime Wrapper
 * Uses quickjs-emscripten directly for browser compatibility
 */

import { newQuickJSWASMModuleFromVariant } from 'quickjs-emscripten';
import variant from '@jitl/quickjs-wasmfile-release-sync';
import { vol } from 'memfs';
import type { ExecutionResult, RuntimeOptions } from './types.js';
import {
  createFsModule,
  createPathModule,
  createProcessModule,
  createTimersModule,
} from './builtins/index.js';
import type { TimerTracker } from './builtins/timers.js';
import { NodepackModuleLoader } from './module-system/loader.js';
import { detectImports } from './module-system/import-detector.js';
import { detectModuleFormat } from './module-system/format-detector.js';
import { createRequireFunction } from './module-system/commonjs/require.js';
import { createCommonJSExecutor } from './module-system/commonjs/wrapper.js';
import { NpmPackageManager } from './npm/package-manager.js';
import type { InstallOptions } from './npm/types.js';

export class NodepackRuntime {
  private QuickJS: any;
  private isInitialized = false;
  private filesystem = vol;
  private consoleLogs: string[] = [];
  private npmPackageManager: NpmPackageManager;

  constructor() {
    this.npmPackageManager = new NpmPackageManager(this.filesystem);
  }

  /**
   * Public API for npm package management
   */
  get npm() {
    return {
      install: (pkg: string, version?: string, options?: InstallOptions) =>
        this.npmPackageManager.install(pkg, version, options),
      installFromPackageJson: (content: string, options?: InstallOptions) =>
        this.npmPackageManager.installFromPackageJson(content, options),
      isInstalled: (pkg: string, version?: string) =>
        this.npmPackageManager.isInstalled(pkg, version),
      clearCache: () => this.npmPackageManager.clearCache(),
    };
  }

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
   * Execute JavaScript/TypeScript code
   */
  async execute(code: string, options: RuntimeOptions = {}): Promise<ExecutionResult> {
    if (!this.isInitialized) {
      throw new Error('Runtime not initialized. Call initialize() first.');
    }

    // Create runtime and context
    const runtime = this.QuickJS.newRuntime();
    const vm = runtime.newContext();
    const timerTracker: TimerTracker = {
      pendingTimers: new Set(),
    };

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

        // Stream log update to callback if provided
        if (options.onLog) {
          options.onLog(logMessage);
        }
      });

      vm.setProp(consoleObj, 'log', logFn);
      vm.setProp(vm.global, 'console', consoleObj);

      logFn.dispose();
      consoleObj.dispose();

      // Inject Node.js modules as hidden globals for module loader to use
      const fsHandle = createFsModule(vm, this.filesystem);
      vm.setProp(vm.global, '__nodepack_fs', fsHandle);
      fsHandle.dispose();

      const pathHandle = createPathModule(vm);
      vm.setProp(vm.global, '__nodepack_path', pathHandle);
      pathHandle.dispose();

      const processHandle = createProcessModule(vm, options);
      vm.setProp(vm.global, '__nodepack_process', processHandle);
      // Also set process as a global for npm packages that expect it
      vm.setProp(vm.global, 'process', processHandle);
      processHandle.dispose();

      // Set up timers module
      const timersHandle = createTimersModule(vm, timerTracker);
      vm.setProp(vm.global, '__nodepack_timers', timersHandle);
      timersHandle.dispose();

      // Set up CommonJS module executor function
      // This is called from require() to execute CommonJS modules
      const executeModuleFn = vm.newFunction(
        '__nodepack_execute_commonjs_module',
        (codeHandle: any, moduleHandle: any, pathHandle: any) => {
          const code = vm.dump(codeHandle);
          const modulePath = vm.dump(pathHandle);

          // Create executor code that wraps and executes the CommonJS module
          const executorCode = createCommonJSExecutor(code, modulePath);

          // Execute the wrapped module
          const result = vm.evalCode(executorCode);
          if (result.error) {
            const error = vm.dump(result.error);
            result.error.dispose();
            // Properly stringify error object
            const errorMsg = error.message || (typeof error === 'object' ? JSON.stringify(error, null, 2) : String(error));
            throw vm.newError(errorMsg);
          }
          result.value.dispose();

          return vm.undefined;
        },
      );
      vm.setProp(vm.global, '__nodepack_execute_commonjs_module', executeModuleFn);
      executeModuleFn.dispose();

      // Set up ES module importer for require()
      // When require() encounters an ES module, use QuickJS's import system
      const requireESModuleFn = vm.newFunction(
        '__nodepack_require_es_module',
        (pathHandle: any) => {
          const modulePath = vm.dump(pathHandle);

          // Use a synchronous import via the module system
          // Write a temporary wrapper that imports and exposes the module
          const wrapperId = '__req_' + Math.random().toString(36).substring(7);
          const wrapperPath = '/' + wrapperId + '.js';
          const wrapperCode = `
            import * as mod from ${JSON.stringify(modulePath)};
            globalThis.${wrapperId} = mod.default !== undefined ? mod.default : mod;
          `;

          this.filesystem.writeFileSync(wrapperPath, wrapperCode);

          const result = vm.evalCode(`import ${JSON.stringify(wrapperPath)}`);
          if (result.error) {
            const error = vm.dump(result.error);
            result.error.dispose();
            // Clean up
            this.filesystem.unlinkSync(wrapperPath);
            // Properly stringify error object
            const errorMsg = error.message || (typeof error === 'object' ? JSON.stringify(error, null, 2) : String(error));
            throw vm.newError(errorMsg);
          }
          result.value.dispose();

          // Get the cached result
          const tempHandle = vm.getProp(vm.global, wrapperId);
          const value = tempHandle; // Return the handle directly

          // Clean up temp global and wrapper file
          vm.setProp(vm.global, wrapperId, vm.undefined);
          this.filesystem.unlinkSync(wrapperPath);

          return value;
        },
      );
      vm.setProp(vm.global, '__nodepack_require_es_module', requireESModuleFn);
      requireESModuleFn.dispose();

      // Initialize require() function
      const requireCode = createRequireFunction();
      const requireResult = vm.evalCode(requireCode);
      if (requireResult.error) {
        const error = vm.dump(requireResult.error);
        requireResult.error.dispose();
        throw new Error(`Failed to initialize require(): ${error}`);
      }
      requireResult.value.dispose();

      // Set up module loader
      const moduleLoader = new NodepackModuleLoader(this.filesystem);
      runtime.setModuleLoader(
        (moduleName: string) => moduleLoader.load(moduleName),
        (baseName: string, requestedName: string) =>
          moduleLoader.normalize(baseName, requestedName),
      );

      // Detect and install npm packages (both ES imports and requires)
      const detectedModules = detectImports(code);
      if (detectedModules.allPackages.length > 0) {
        console.log('[Runtime] Detected npm packages:', detectedModules.allPackages);

        // Install each detected package from npm registry
        const installPromises = detectedModules.allPackages.map((pkg) =>
          this.npmPackageManager.install(pkg, 'latest'),
        );
        await Promise.all(installPromises);
      }

      // Write the code to the virtual filesystem so the module loader can find it
      // Write to root so relative imports like './utils.js' work correctly
      this.filesystem.writeFileSync('/main.js', code);

      // Detect module format (ES module or CommonJS)
      const format = detectModuleFormat(code);

      let result;

      if (format === 'esm') {
        // Execute as ES module (existing behavior)
        const wrapperCode = `
          import * as mod from '/main.js';
          globalThis.__result = mod.default !== undefined ? mod.default : mod;
        `;
        result = vm.evalCode(wrapperCode);
      } else {
        // Execute as CommonJS module
        const cjsExecutionCode = `
          (function() {
            const module = {
              exports: {},
              filename: '/main.js',
              loaded: false,
              children: []
            };

            globalThis.__nodepack_module_cache['/main.js'] = module;
            globalThis.__nodepack_current_module_dir = '/';

            const code = globalThis.__nodepack_fs.readFileSync('/main.js', 'utf8');
            globalThis.__nodepack_execute_commonjs_module(code, module, '/main.js');

            module.loaded = true;
            globalThis.__result = module.exports;
          })();
        `;
        result = vm.evalCode(cjsExecutionCode);
      }

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();

        // Clean up any pending timers
        timerTracker.pendingTimers.forEach((timerId) => {
          clearTimeout(timerId);
          clearInterval(timerId);
        });
        timerTracker.pendingTimers.clear();

        vm.dispose();
        runtime.dispose();

        // Convert error to a readable string
        let errorMessage: string;
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (error && typeof error === 'object') {
          // Prioritize error.message, then JSON.stringify (toString() can return "[object Object]")
          errorMessage = error.message || JSON.stringify(error, null, 2) || String(error);
        } else {
          errorMessage = JSON.stringify(error);
        }

        return {
          ok: false,
          error: errorMessage,
          logs: this.consoleLogs,
        };
      }

      // Get the result from global
      const resultHandle = vm.getProp(vm.global, '__result');
      const data = vm.dump(resultHandle);
      resultHandle.dispose();
      result.value.dispose();

      // Wait for pending timers to complete
      if (timerTracker.pendingTimers.size > 0) {
        const maxWaitTime = options.timeout || 30000; // Default 30 seconds
        const startTime = Date.now();

        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            // Check if all timers are done
            if (timerTracker.pendingTimers.size === 0) {
              clearInterval(checkInterval);
              resolve();
            }

            // Check timeout
            if (Date.now() - startTime > maxWaitTime) {
              console.warn('[Runtime] Timer execution timeout reached');
              clearInterval(checkInterval);
              // Clear all pending timers
              timerTracker.pendingTimers.forEach((timerId) => {
                clearTimeout(timerId);
                clearInterval(timerId);
              });
              timerTracker.pendingTimers.clear();

              resolve();
            }
          }, 100);
        });
      }

      vm.dispose();
      runtime.dispose();

      return {
        ok: true,
        data: data,
        logs: this.consoleLogs,
      };
    } catch (error: any) {
      // Clean up any pending timers
      timerTracker.pendingTimers.forEach((timerId) => {
        clearTimeout(timerId);
        clearInterval(timerId);
      });
      timerTracker.pendingTimers.clear();

      vm.dispose();
      runtime.dispose();
      return {
        ok: false,
        error: error.message || (typeof error === 'object' ? JSON.stringify(error, null, 2) : String(error)),
        logs: this.consoleLogs,
      };
    } finally {
      this.consoleLogs = []; // Clear logs after execution
    }
  }

  /**
   * Get all console logs from last execution
   */
  getConsoleLogs(): string[] {
    return [...this.consoleLogs];
  }

  /**
   * Get the virtual filesystem instance
   * Useful for integrating with terminal or other filesystem tools
   */
  getFilesystem() {
    return this.filesystem;
  }
}
