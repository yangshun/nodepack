/**
 * Code Executor
 * Handles execution of user code (both ESM and CommonJS formats)
 */

import type { QuickJSContext } from 'quickjs-emscripten';
import type { IFs } from 'memfs';
import type { ExecutionResult, RuntimeOptions } from '../types.js';
import type { TimerTracker } from '../builtins/timers.js';
import { detectImports } from '../module-system/import-detector.js';
import { detectModuleFormat } from '../module-system/format-detector.js';
import type { NpmPackageManager } from '../npm/package-manager.js';

export interface CodeExecutorContext {
  vm: QuickJSContext;
  runtime: any;
  filesystem: IFs;
  timerTracker: TimerTracker;
  consoleLogs: string[];
  npmPackageManager: NpmPackageManager;
}

/**
 * Execute user code in the QuickJS context
 * Handles npm package installation, module format detection, and execution
 */
export async function executeCode(
  code: string,
  context: CodeExecutorContext,
  options: RuntimeOptions = {},
): Promise<ExecutionResult> {
  const { vm, runtime, filesystem, timerTracker, consoleLogs, npmPackageManager } = context;

  try {
    // Detect and install npm packages (both ES imports and requires)
    const detectedModules = detectImports(code);
    if (detectedModules.allPackages.length > 0) {
      console.log('[Runtime] Detected npm packages:', detectedModules.allPackages);

      // Install each detected package from npm registry
      const installPromises = detectedModules.allPackages.map((pkg) =>
        npmPackageManager.install(pkg, 'latest'),
      );
      await Promise.all(installPromises);
    }

    // Write the code to the virtual filesystem so the module loader can find it
    // Write to root so relative imports like './utils.js' work correctly
    filesystem.writeFileSync('/main.js', code);

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
      cleanupTimers(timerTracker);

      vm.dispose();
      runtime.dispose();

      // Convert error to a readable string
      const errorMessage = formatError(error);

      return {
        ok: false,
        error: errorMessage,
        logs: consoleLogs,
      };
    }

    // Get the result from global
    const resultHandle = vm.getProp(vm.global, '__result');
    const data = vm.dump(resultHandle);
    resultHandle.dispose();
    result.value.dispose();

    // Wait for pending timers to complete
    await waitForTimers(timerTracker, options);

    vm.dispose();
    runtime.dispose();

    return {
      ok: true,
      data: data,
      logs: consoleLogs,
    };
  } catch (error: any) {
    // Clean up any pending timers
    cleanupTimers(timerTracker);

    vm.dispose();
    runtime.dispose();

    return {
      ok: false,
      error: formatError(error),
      logs: consoleLogs,
    };
  }
}

/**
 * Clean up all pending timers
 */
function cleanupTimers(timerTracker: TimerTracker): void {
  timerTracker.pendingTimers.forEach((timerId) => {
    clearTimeout(timerId);
    clearInterval(timerId);
  });
  timerTracker.pendingTimers.clear();
}

/**
 * Wait for all pending timers to complete
 */
async function waitForTimers(timerTracker: TimerTracker, options: RuntimeOptions): Promise<void> {
  if (timerTracker.pendingTimers.size === 0) {
    return;
  }

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
        cleanupTimers(timerTracker);
        resolve();
      }
    }, 100);
  });
}

/**
 * Format an error into a readable string
 */
function formatError(error: any): string {
  if (typeof error === 'string') {
    return error;
  } else if (error && typeof error === 'object') {
    // Prioritize error.message, then JSON.stringify
    return error.message || JSON.stringify(error, null, 2) || String(error);
  } else {
    return JSON.stringify(error);
  }
}
