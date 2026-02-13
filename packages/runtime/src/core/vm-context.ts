/**
 * VM Context Setup
 * Configures QuickJS context with Node.js built-ins and module system
 */

import type { QuickJSContext } from 'quickjs-emscripten';
import type { IFs } from 'memfs';
import type { RuntimeOptions } from '../types.js';
import {
  createFsModule,
  createPathModule,
  createProcessModule,
  createTimersModule,
  createModuleBuiltin,
  createUrlModule,
  createEventsModule,
  createChildProcessModule,
} from '../builtins/index.js';
import type { TimerTracker } from '../builtins/timers.js';
import { NodepackModuleLoader } from '../module-system/loader.js';
import { createRequireFunction } from '../module-system/commonjs/require.js';
import { createCommonJSExecutor } from '../module-system/commonjs/wrapper.js';

/**
 * Set up VM context with Node.js built-in modules and CommonJS support
 */
export function setupVMContext(
  vm: QuickJSContext,
  runtime: any,
  filesystem: IFs,
  timerTracker: TimerTracker,
  options: RuntimeOptions,
): void {
  // Inject Node.js modules as hidden globals for module loader to use
  const fsHandle = createFsModule(vm, filesystem);
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

  // Set environment flag for logger
  const env = options.env || { NODE_ENV: 'development' };
  const envCode = `globalThis.__NODEPACK_ENV__ = ${JSON.stringify(env.NODE_ENV || 'development')};`;
  const envResult = vm.evalCode(envCode);
  if (envResult.error) {
    envResult.error.dispose();
  } else {
    envResult.value.dispose();
  }

  // Set up timers module
  const timersHandle = createTimersModule(vm, timerTracker);
  vm.setProp(vm.global, '__nodepack_timers', timersHandle);
  timersHandle.dispose();

  // Set up module builtin
  const moduleHandle = createModuleBuiltin(vm);
  vm.setProp(vm.global, '__nodepack_module', moduleHandle);
  moduleHandle.dispose();

  // Set up url builtin
  const urlHandle = createUrlModule(vm);
  vm.setProp(vm.global, '__nodepack_url', urlHandle);
  urlHandle.dispose();

  // Set up events builtin
  const eventsHandle = createEventsModule(vm);
  vm.setProp(vm.global, '__nodepack_events', eventsHandle);
  eventsHandle.dispose();

  // Set up child_process builtin
  const childProcessHandle = createChildProcessModule(vm);
  vm.setProp(vm.global, '__nodepack_child_process', childProcessHandle);
  childProcessHandle.dispose();

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

        // Create detailed error message with stack trace
        let errorMsg = '';
        if (error && typeof error === 'object') {
          if (error.name && error.message) {
            errorMsg = `${error.name}: ${error.message}`;
          } else if (error.message) {
            errorMsg = error.message;
          } else {
            errorMsg = JSON.stringify(error, null, 2);
          }

          if (error.stack) {
            errorMsg += '\n' + error.stack;
          }
        } else {
          errorMsg = String(error);
        }

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
  const requireESModuleFn = vm.newFunction('__nodepack_require_es_module', (pathHandle: any) => {
    const modulePath = vm.dump(pathHandle);

    // Use a synchronous import via the module system
    // Write a temporary wrapper that imports and exposes the module
    const wrapperId = '__req_' + Math.random().toString(36).substring(7);
    const wrapperPath = '/' + wrapperId + '.js';
    const wrapperCode = `
        import * as mod from ${JSON.stringify(modulePath)};
        globalThis.${wrapperId} = mod.default !== undefined ? mod.default : mod;
      `;

    filesystem.writeFileSync(wrapperPath, wrapperCode);

    const result = vm.evalCode(`import ${JSON.stringify(wrapperPath)}`);
    if (result.error) {
      const error = vm.dump(result.error);
      result.error.dispose();
      // Clean up
      filesystem.unlinkSync(wrapperPath);
      // Properly stringify error object
      const errorMsg =
        error.message ||
        (typeof error === 'object' ? JSON.stringify(error, null, 2) : String(error));
      throw vm.newError(errorMsg);
    }
    result.value.dispose();

    // Get the cached result
    const tempHandle = vm.getProp(vm.global, wrapperId);
    const value = tempHandle; // Return the handle directly

    // Clean up temp global and wrapper file
    vm.setProp(vm.global, wrapperId, vm.undefined);
    filesystem.unlinkSync(wrapperPath);

    return value;
  });
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
  const moduleLoader = new NodepackModuleLoader(filesystem);
  runtime.setModuleLoader(
    (moduleName: string) => moduleLoader.load(moduleName),
    (baseName: string, requestedName: string) => moduleLoader.normalize(baseName, requestedName),
  );
}
