/**
 * CommonJS Module Wrapper
 * Wraps CommonJS code with Node.js-style module wrapper function
 */

// @ts-ignore - path-browserify doesn't have type declarations
import pathBrowserify from 'path-browserify';

/**
 * Wrap CommonJS code with the standard Node.js module wrapper:
 * (function(exports, require, module, __filename, __dirname) { ... })
 *
 * This creates the proper CommonJS module scope with all required variables.
 *
 * @param code - The CommonJS module code to wrap
 * @param filepath - Absolute path to the module file (for __filename)
 * @returns Wrapped function as a string
 *
 * @example
 * const wrapped = wrapCommonJS('console.log(__filename);', '/app/main.js');
 * // Returns: (function(exports, require, module, __filename, __dirname) {
 * //   console.log(__filename);
 * // })
 */
export function wrapCommonJS(code: string, filepath: string): string {
  return `(function(exports, require, module, __filename, __dirname) {
${code}
})`;
}

/**
 * Create the full executor code that wraps and executes a CommonJS module
 * This handles injecting the proper context variables and calling the wrapper
 *
 * @param code - The CommonJS module code
 * @param modulePath - Absolute path to the module
 * @returns Complete executor code ready to be eval'd in QuickJS
 */
export function createCommonJSExecutor(code: string, modulePath: string): string {
  const dirname = pathBrowserify.dirname(modulePath);
  const wrapped = wrapCommonJS(code, modulePath);

  return `(function() {
  const module = globalThis.__nodepack_module_cache[${JSON.stringify(modulePath)}];
  const exports = module.exports;
  const __filename = ${JSON.stringify(modulePath)};
  const __dirname = ${JSON.stringify(dirname)};

  const wrappedFn = ${wrapped};
  wrappedFn(exports, require, module, __filename, __dirname);

  return module.exports;
})()`;
}
