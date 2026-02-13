/**
 * Util module stub
 * Provides minimal utility functions for compatibility
 */

import type { QuickJSContext, QuickJSHandle } from 'quickjs-emscripten';
import { addModuleFunction } from './helpers.js';

export function createUtilModule(vm: QuickJSContext): QuickJSHandle {
  const utilObj = vm.newObject();

  // inspect function - basic object stringification
  addModuleFunction(vm, utilObj, 'inspect', (objHandle) => {
    const obj = vm.dump(objHandle);
    return vm.newString(JSON.stringify(obj, null, 2));
  });

  // format function - basic string formatting
  const formatCode = `
    function format(formatStr, ...args) {
      let i = 0;
      return formatStr.replace(/%([sdifjoO])/g, (match, type) => {
        if (i >= args.length) return match;
        const arg = args[i++];
        switch (type) {
          case 's': return String(arg);
          case 'd':
          case 'i': return parseInt(arg, 10);
          case 'f': return parseFloat(arg);
          case 'j': return JSON.stringify(arg);
          case 'o':
          case 'O': return JSON.stringify(arg);
          default: return match;
        }
      });
    }
    format;
  `;

  const formatResult = vm.evalCode(formatCode);
  if (formatResult.error) {
    formatResult.error.dispose();
  } else {
    vm.setProp(utilObj, 'format', formatResult.value);
    formatResult.value.dispose();
  }

  // types object - type checking utilities
  const typesCode = `
    ({
      isArray: (val) => Array.isArray(val),
      isDate: (val) => val instanceof Date,
      isRegExp: (val) => val instanceof RegExp,
      isError: (val) => val instanceof Error,
      isFunction: (val) => typeof val === 'function',
      isObject: (val) => typeof val === 'object' && val !== null,
      isString: (val) => typeof val === 'string',
      isNumber: (val) => typeof val === 'number',
      isBoolean: (val) => typeof val === 'boolean',
      isNull: (val) => val === null,
      isUndefined: (val) => val === undefined,
    })
  `;

  const typesResult = vm.evalCode(typesCode);
  if (typesResult.error) {
    typesResult.error.dispose();
  } else {
    vm.setProp(utilObj, 'types', typesResult.value);
    typesResult.value.dispose();
  }

  return utilObj;
}
