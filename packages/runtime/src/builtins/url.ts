/**
 * URL module stub
 * Provides minimal URL utilities for compatibility
 */

import type { QuickJSContext, QuickJSHandle } from 'quickjs-emscripten';
import { addModuleFunction } from './helpers.js';

export function createUrlModule(vm: QuickJSContext): QuickJSHandle {
  const urlObj = vm.newObject();

  // fileURLToPath - converts file:// URLs to paths
  // In browser environment, we just strip the file:// prefix
  addModuleFunction(vm, urlObj, 'fileURLToPath', (urlHandle) => {
    const url = vm.dump(urlHandle);

    // Handle undefined/null/empty - return a reasonable default
    // This can happen if import.meta.url is not set in certain contexts
    if (url === undefined || url === null || url === '') {
      return vm.newString('/index.js');
    }

    // Convert to string if it's an object
    const urlString = typeof url === 'string' ? url : String(url);

    // Strip file:// protocol
    if (urlString.startsWith('file://')) {
      return vm.newString(urlString.substring(7));
    }

    // If it's already a path (not a URL), return as-is
    return vm.newString(urlString);
  });

  return urlObj;
}
