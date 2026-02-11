/**
 * QuickJS Runtime Wrapper
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
} from './modules/index.js';
import type { TimerTracker } from './modules/timers-module.js';
import { NodepackModuleLoader } from './module-loader.js';
import { detectImports } from './import-detector.js';

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
      processHandle.dispose();

      // Set up timers module
      const timersHandle = createTimersModule(vm, timerTracker);
      vm.setProp(vm.global, '__nodepack_timers', timersHandle);
      timersHandle.dispose();

      // Set up module loader
      const moduleLoader = new NodepackModuleLoader(this.filesystem);
      runtime.setModuleLoader(
        (moduleName: string) => moduleLoader.load(moduleName),
        (baseName: string, requestedName: string) =>
          moduleLoader.normalize(baseName, requestedName),
      );

      // Detect and pre-load npm packages from CDN
      const npmPackages = detectImports(code);
      if (npmPackages.length > 0) {
        console.log('[Runtime] Detected npm packages:', npmPackages);
        await moduleLoader.preloadPackages(npmPackages);
      }

      // Write the code to the virtual filesystem so the module loader can find it
      // Write to root so relative imports like './utils.js' work correctly
      this.filesystem.writeFileSync('/main.js', code);

      // Execute code as a module by dynamically importing it
      // We wrap it to extract the default export or the whole module
      const wrapperCode = `
        import * as mod from '/main.js';
        globalThis.__result = mod.default !== undefined ? mod.default : mod;
      `;

      const result = vm.evalCode(wrapperCode);

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
          errorMessage = error.message || error.toString?.() || JSON.stringify(error, null, 2);
        } else {
          errorMessage = String(error);
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
        error: error.message || String(error),
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
