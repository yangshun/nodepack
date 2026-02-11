/**
 * Helper utilities for creating QuickJS modules
 */
import type { QuickJSContext, QuickJSHandle } from 'quickjs-emscripten';

export type ModuleFactory = (vm: QuickJSContext) => QuickJSHandle;

/**
 * Create a module object and set it as a global
 */
export function createGlobalModule(
  vm: QuickJSContext,
  moduleName: string,
  factory: ModuleFactory
): void {
  const moduleObj = factory(vm);
  vm.setProp(vm.global, moduleName, moduleObj);
  moduleObj.dispose();
}

/**
 * Helper to create a function and add it to a module object
 */
export function addModuleFunction(
  vm: QuickJSContext,
  moduleObj: QuickJSHandle,
  functionName: string,
  implementation: (...args: any[]) => any
): void {
  const fnHandle = vm.newFunction(functionName, (...args: any[]) => {
    try {
      return implementation(...args);
    } catch (error: any) {
      // Convert JavaScript errors to QuickJS errors
      throw vm.newError(error.message);
    }
  });

  vm.setProp(moduleObj, functionName, fnHandle);
  fnHandle.dispose();
}
