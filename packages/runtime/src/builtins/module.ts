/**
 * Module builtin stub
 * Provides minimal module API for compatibility
 */

import type { QuickJSContext, QuickJSHandle } from 'quickjs-emscripten';

export function createModuleBuiltin(vm: QuickJSContext): QuickJSHandle {
  const moduleObj = vm.newObject();

  // enableCompileCache is a V8/Node.js optimization
  // We provide a no-op stub for compatibility
  const enableCompileCache = vm.newFunction('enableCompileCache', () => {
    // No-op in browser environment
    return vm.undefined;
  });
  vm.setProp(moduleObj, 'enableCompileCache', enableCompileCache);
  enableCompileCache.dispose();

  return moduleObj;
}
