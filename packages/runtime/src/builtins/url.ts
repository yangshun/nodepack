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

  // Add URL and URLSearchParams classes
  const urlClassCode = `
    // Simple URL class implementation
    (function() {
      class URL {
        constructor(urlString, base) {
          const url = base ? new URL(base).href + urlString : urlString;

          // Parse URL manually
          const match = url.match(/^(\\w+):\\/\\/([^:\\/?#]*)(?::(\\d+))?([^?#]*)(\\?[^#]*)?(#.*)?$/);

          if (!match) {
            throw new TypeError('Invalid URL');
          }

          this.protocol = match[1] + ':';
          this.hostname = match[2];
          this.port = match[3] || '';
          this.pathname = match[4] || '/';
          this.search = match[5] || '';
          this.hash = match[6] || '';
          this.host = this.hostname + (this.port ? ':' + this.port : '');
          this.href = url;
        }
      }

      class URLSearchParams {
        constructor(init) {
          this.params = new Map();

          if (typeof init === 'string') {
            // Remove leading ? if present
            const query = init.startsWith('?') ? init.slice(1) : init;

            // Parse query string
            query.split('&').forEach(pair => {
              if (pair) {
                const [key, value] = pair.split('=');
                this.params.set(decodeURIComponent(key), decodeURIComponent(value || ''));
              }
            });
          }
        }

        get(key) {
          return this.params.get(key) || null;
        }

        set(key, value) {
          this.params.set(key, value);
        }

        has(key) {
          return this.params.has(key);
        }
      }

      return { URL, URLSearchParams };
    })()
  `;

  const urlClassResult = vm.evalCode(urlClassCode);
  if (urlClassResult.error) {
    urlClassResult.error.dispose();
  } else {
    // Set URL and URLSearchParams as globals
    const urlClassHandle = vm.getProp(urlClassResult.value, 'URL');
    vm.setProp(vm.global, 'URL', urlClassHandle);
    // Also add to urlObj for module exports
    vm.setProp(urlObj, 'URL', urlClassHandle);
    urlClassHandle.dispose();

    const urlSearchParamsHandle = vm.getProp(urlClassResult.value, 'URLSearchParams');
    vm.setProp(vm.global, 'URLSearchParams', urlSearchParamsHandle);
    // Also add to urlObj for module exports
    vm.setProp(urlObj, 'URLSearchParams', urlSearchParamsHandle);
    urlSearchParamsHandle.dispose();

    urlClassResult.value.dispose();
  }

  return urlObj;
}
