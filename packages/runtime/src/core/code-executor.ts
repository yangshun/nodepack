/**
 * Code Executor
 * Handles execution of user code (both ESM and CommonJS formats)
 */

import type { QuickJSContext } from 'quickjs-emscripten';
import type { IFs } from 'memfs';
import type { ExecutionResult, RuntimeOptions } from '../types.js';
import type { TimerTracker } from '../builtins/timers.js';
// import { detectImports } from '../module-system/import-detector.js'; // Disabled for debugging
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
/**
 * Strip shebang line from code if present
 */
function stripShebang(code: string): string {
  // Remove shebang line if present (#!/usr/bin/env node, #!/bin/sh, etc.)
  if (code.startsWith('#!')) {
    const newlineIndex = code.indexOf('\n');
    if (newlineIndex !== -1) {
      return code.substring(newlineIndex + 1);
    }
  }
  return code;
}

export async function executeCode(
  code: string,
  context: CodeExecutorContext,
  options: RuntimeOptions = {},
): Promise<ExecutionResult> {
  const { vm, runtime, filesystem, timerTracker, consoleLogs, npmPackageManager } = context;

  try {
    // Strip shebang if present
    code = stripShebang(code);

    // Determine the file path to use (from options or default to /main.js)
    const filepath = options.filename || '/main.js';
    const fileDir = filepath.substring(0, filepath.lastIndexOf('/')) || '/';

    // Write the code to the virtual filesystem so the module loader can find it
    filesystem.writeFileSync(filepath, code);

    // Detect module format (ES module or CommonJS)
    const format = detectModuleFormat(code);

    let result;

    if (format === 'esm') {
      // Execute as ES module
      // For modules with top-level await, errors will be caught during job execution
      const wrapperCode = `
        globalThis.__moduleLoaded = false;
        import('${filepath}').then(
          (mod) => {
            globalThis.__result = mod.default !== undefined ? mod.default : mod;
            globalThis.__moduleLoaded = true;
          },
          (error) => {
            globalThis.__importError = error;
            globalThis.__moduleLoaded = true;
          }
        );
      `;
      result = vm.evalCode(wrapperCode);
    } else {
      // Execute as CommonJS module (synchronous)
      const cjsExecutionCode = `
        (function() {
          const module = {
            exports: {},
            filename: '${filepath}',
            loaded: false,
            children: []
          };

          globalThis.__nodepack_module_cache['${filepath}'] = module;
          globalThis.__nodepack_current_module_dir = '${fileDir}';

          const code = globalThis.__nodepack_fs.readFileSync('${filepath}', 'utf8');
          globalThis.__nodepack_execute_commonjs_module(code, module, '${filepath}');

          module.loaded = true;
          globalThis.__result = module.exports;
          globalThis.__moduleLoaded = true; // CommonJS loads synchronously
        })();
      `;
      result = vm.evalCode(cjsExecutionCode);
    }

    // Execute pending jobs immediately after code execution
    // This is critical for ES modules with top-level await
    // If the module has a rejected promise, it will fail here
    if (!result.error) {
      const jobResult = await executePendingJobs(runtime, vm);
      if (!jobResult.ok) {
        result.value.dispose();
        cleanupTimers(timerTracker);
        vm.dispose();
        runtime.dispose();

        return {
          ok: false,
          error: jobResult.error,
          logs: consoleLogs,
        };
      }
    }

    if (result.error) {
      const error = vm.dump(result.error);
      result.error.dispose();

      // Clean up any pending timers
      cleanupTimers(timerTracker);

      vm.dispose();
      runtime.dispose();

      // Convert error to a readable string with full details
      const errorMessage = formatError(error);

      return {
        ok: false,
        error: errorMessage,
        logs: consoleLogs,
      };
    }

    // Dispose the initial result
    result.value.dispose();

    // Wait for pending timers and jobs to complete
    // This includes waiting for ES module loading (which may have top-level await)
    // Timers may create new promise callbacks, and promise callbacks may create new timers
    // So we need to loop until both are done
    await waitForTimersAndJobs(runtime, vm, timerTracker, options);

    // Check for import errors (from top-level await failures in ES modules)
    const importErrorHandle = vm.getProp(vm.global, '__importError');
    const importErrorType = vm.typeof(importErrorHandle);
    if (importErrorType !== 'undefined') {
      const error = vm.dump(importErrorHandle);
      importErrorHandle.dispose();

      cleanupTimers(timerTracker);
      vm.dispose();
      runtime.dispose();

      return {
        ok: false,
        error: formatError(error),
        logs: consoleLogs,
      };
    }
    importErrorHandle.dispose();

    // Get the result from global (after module has fully loaded)
    const resultHandle = vm.getProp(vm.global, '__result');
    const data = vm.dump(resultHandle);
    resultHandle.dispose();

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
 * Execute all pending jobs (promises, async/await) in the QuickJS runtime
 */
async function executePendingJobs(
  runtime: any,
  vm: QuickJSContext,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Keep executing jobs while there are pending jobs
  while (runtime.hasPendingJob()) {
    const result = runtime.executePendingJobs();

    // Check if execution resulted in an error
    if (result.error) {
      const errorHandle = result.error;
      const error = vm.dump(errorHandle);
      errorHandle.dispose();

      return {
        ok: false,
        error: formatError(error),
      };
    }
  }

  return { ok: true };
}

/**
 * Wait for all pending timers and jobs to complete
 * Timers can create new promise jobs, and promise jobs can create new timers
 * So we need to loop until both are done
 */
async function waitForTimersAndJobs(
  runtime: any,
  vm: QuickJSContext,
  timerTracker: TimerTracker,
  options: RuntimeOptions,
): Promise<void> {
  const maxWaitTime = options.timeout || 30000; // Default 30 seconds
  const startTime = Date.now();

  // Helper to check if module has finished loading
  function isModuleLoaded(): boolean {
    const handle = vm.getProp(vm.global, '__moduleLoaded');
    const loaded = vm.dump(handle);
    handle.dispose();
    return loaded === true;
  }

  while (true) {
    // Execute any pending jobs (promise callbacks)
    while (runtime.hasPendingJob()) {
      const result = runtime.executePendingJobs();

      // Note: We don't throw errors here because promise callbacks
      // might have intentional error handling with .catch()
      if (result.error) {
        result.error.dispose();
      }
    }

    // Check if module is loaded and no more work to do
    if (isModuleLoaded() && timerTracker.pendingTimers.size === 0) {
      // Module loaded, no pending timers, no pending jobs - we're done
      break;
    }

    // Check timeout
    if (Date.now() - startTime > maxWaitTime) {
      cleanupTimers(timerTracker);
      break;
    }

    // Wait a bit for timers to fire and module to load
    // Timer callbacks will create new pending jobs
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/**
 * Format an error into a readable string with full details
 */
function formatError(error: any): string {
  if (typeof error === 'string') {
    return error;
  } else if (error && typeof error === 'object') {
    const parts: string[] = [];

    // Add error name if available
    if (error.name) {
      parts.push(`${error.name}`);
    }

    // Add error message if available
    if (error.message) {
      parts.push(error.message);
    }

    // Add stack trace if available
    if (error.stack) {
      parts.push(error.stack);
    }

    // If we got some parts, join them; otherwise fall back to JSON
    if (parts.length > 0) {
      return parts.join(': ');
    }

    return JSON.stringify(error, null, 2) || String(error);
  } else {
    return String(error);
  }
}
