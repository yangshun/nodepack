import { describe, test, expect, beforeEach } from 'vitest';
import { vol } from 'memfs';
import { NodepackModuleLoader } from './loader.js';

describe('NodepackModuleLoader', () => {
  let loader: NodepackModuleLoader;

  beforeEach(() => {
    // Reset filesystem
    vol.reset();
    loader = new NodepackModuleLoader(vol as any);
  });

  describe('load()', () => {
    test('load file from filesystem', () => {
      vol.writeFileSync('/test.js', 'export default 42;');

      const content = loader.load('/test.js');

      expect(content).toBe('export default 42;');
    });

    test('throw error for non-existent file', () => {
      expect(() => {
        loader.load('/nonexistent.js');
      }).toThrow('Cannot find module');
    });

    test('load built-in modules', () => {
      const fsModule = loader.load('fs');

      expect(fsModule).toBeDefined();
      expect(fsModule).toContain('readFileSync');
      expect(fsModule).toContain('writeFileSync');
    });
  });

  describe('normalize()', () => {
    test('resolve relative imports from root', () => {
      const result = loader.normalize('/main.js', './utils.js');

      expect(result).toBe('/utils.js');
    });

    test('resolve relative imports from subdirectory', () => {
      const result = loader.normalize('/src/main.js', './helper.js');

      expect(result).toBe('/src/helper.js');
    });

    test('resolve parent directory imports', () => {
      const result = loader.normalize('/src/sub/file.js', '../utils.js');

      expect(result).toBe('/src/utils.js');
    });

    test('handle npm package imports', () => {
      vol.mkdirSync('/node_modules/lodash', { recursive: true });
      vol.writeFileSync(
        '/node_modules/lodash/package.json',
        JSON.stringify({
          main: 'index.js',
        }),
      );
      vol.writeFileSync('/node_modules/lodash/index.js', 'export default {}');

      const result = loader.normalize('/main.js', 'lodash');

      expect(result).toBe('/node_modules/lodash/index.js');
    });

    test('handle scoped packages', () => {
      vol.mkdirSync('/node_modules/@babel/core/lib', { recursive: true });
      vol.writeFileSync(
        '/node_modules/@babel/core/package.json',
        JSON.stringify({
          main: 'lib/index.js',
        }),
      );
      vol.writeFileSync('/node_modules/@babel/core/lib/index.js', 'export default {}');

      const result = loader.normalize('/main.js', '@babel/core');

      expect(result).toBe('/node_modules/@babel/core/lib/index.js');
    });

    test('resolve package subpaths', () => {
      vol.mkdirSync('/node_modules/lodash', { recursive: true });
      vol.writeFileSync('/node_modules/lodash/add.js', 'export default function() {}');

      const result = loader.normalize('/main.js', 'lodash/add');

      expect(result).toBe('/node_modules/lodash/add.js');
    });

    test('add .js extension if missing', () => {
      vol.writeFileSync('/utils.js', 'export default {}');

      const result = loader.normalize('/main.js', './utils');

      expect(result).toBe('/utils.js');
    });

    test('handle built-in modules', () => {
      const result = loader.normalize('/main.js', 'fs');

      expect(result).toBe('fs');
    });

    test('handle node: protocol', () => {
      const result = loader.normalize('/main.js', 'node:fs');

      expect(result).toBe('fs');
    });
  });

  describe('Package resolution', () => {
    test('read package.json main field', () => {
      vol.mkdirSync('/node_modules/mypackage/dist', { recursive: true });
      vol.writeFileSync(
        '/node_modules/mypackage/package.json',
        JSON.stringify({
          main: 'dist/index.js',
        }),
      );
      vol.writeFileSync('/node_modules/mypackage/dist/index.js', 'export default {}');

      const result = loader.normalize('/main.js', 'mypackage');

      expect(result).toBe('/node_modules/mypackage/dist/index.js');
    });

    test('fallback to index.js if no main field', () => {
      vol.mkdirSync('/node_modules/mypackage', { recursive: true });
      vol.writeFileSync('/node_modules/mypackage/package.json', JSON.stringify({}));
      vol.writeFileSync('/node_modules/mypackage/index.js', 'export default {}');

      const result = loader.normalize('/main.js', 'mypackage');

      expect(result).toBe('/node_modules/mypackage/index.js');
    });

    test('use module field over main for ESM', () => {
      vol.mkdirSync('/node_modules/mypackage/dist', { recursive: true });
      vol.writeFileSync(
        '/node_modules/mypackage/package.json',
        JSON.stringify({
          main: 'dist/cjs.js',
          module: 'dist/esm.js',
        }),
      );
      vol.writeFileSync('/node_modules/mypackage/dist/esm.js', 'export default {}');

      const result = loader.normalize('/main.js', 'mypackage');

      expect(result).toBe('/node_modules/mypackage/dist/esm.js');
    });

    test('use module field when only module is specified', () => {
      vol.mkdirSync('/node_modules/mypackage/dist', { recursive: true });
      vol.writeFileSync(
        '/node_modules/mypackage/package.json',
        JSON.stringify({
          module: 'dist/esm.js',
        }),
      );
      vol.writeFileSync('/node_modules/mypackage/dist/esm.js', 'export default {}');

      const result = loader.normalize('/main.js', 'mypackage');

      expect(result).toBe('/node_modules/mypackage/dist/esm.js');
    });

    test('use exports field as simple string', () => {
      vol.mkdirSync('/node_modules/mypackage/dist', { recursive: true });
      vol.writeFileSync(
        '/node_modules/mypackage/package.json',
        JSON.stringify({
          exports: './dist/index.js',
          main: 'index.js',
        }),
      );
      vol.writeFileSync('/node_modules/mypackage/dist/index.js', 'export default {}');

      const result = loader.normalize('/main.js', 'mypackage');

      expect(result).toBe('/node_modules/mypackage/dist/index.js');
    });

    test('use exports field with dot notation as string', () => {
      vol.mkdirSync('/node_modules/mypackage/dist', { recursive: true });
      vol.writeFileSync(
        '/node_modules/mypackage/package.json',
        JSON.stringify({
          exports: {
            '.': './dist/index.js',
          },
          main: 'index.js',
        }),
      );
      vol.writeFileSync('/node_modules/mypackage/dist/index.js', 'export default {}');

      const result = loader.normalize('/main.js', 'mypackage');

      expect(result).toBe('/node_modules/mypackage/dist/index.js');
    });

    test('use exports field with import condition', () => {
      vol.mkdirSync('/node_modules/mypackage/dist', { recursive: true });
      vol.writeFileSync(
        '/node_modules/mypackage/package.json',
        JSON.stringify({
          exports: {
            '.': {
              import: './dist/esm.js',
              require: './dist/cjs.js',
            },
          },
          main: 'index.js',
        }),
      );
      vol.writeFileSync('/node_modules/mypackage/dist/esm.js', 'export default {}');

      const result = loader.normalize('/main.js', 'mypackage');

      expect(result).toBe('/node_modules/mypackage/dist/esm.js');
    });

    test('use exports field with nested import default', () => {
      vol.mkdirSync('/node_modules/mypackage/dist', { recursive: true });
      vol.writeFileSync(
        '/node_modules/mypackage/package.json',
        JSON.stringify({
          exports: {
            '.': {
              import: {
                default: './dist/esm.mjs',
              },
            },
          },
          main: 'index.js',
        }),
      );
      vol.writeFileSync('/node_modules/mypackage/dist/esm.mjs', 'export default {}');

      const result = loader.normalize('/main.js', 'mypackage');

      expect(result).toBe('/node_modules/mypackage/dist/esm.mjs');
    });

    test('use exports field with default condition', () => {
      vol.mkdirSync('/node_modules/mypackage/dist', { recursive: true });
      vol.writeFileSync(
        '/node_modules/mypackage/package.json',
        JSON.stringify({
          exports: {
            '.': {
              default: './dist/index.js',
            },
          },
          main: 'index.js',
        }),
      );
      vol.writeFileSync('/node_modules/mypackage/dist/index.js', 'export default {}');

      const result = loader.normalize('/main.js', 'mypackage');

      expect(result).toBe('/node_modules/mypackage/dist/index.js');
    });

    test('use exports field with nested default default', () => {
      vol.mkdirSync('/node_modules/mypackage/dist', { recursive: true });
      vol.writeFileSync(
        '/node_modules/mypackage/package.json',
        JSON.stringify({
          exports: {
            '.': {
              default: {
                default: './dist/index.js',
              },
            },
          },
          main: 'index.js',
        }),
      );
      vol.writeFileSync('/node_modules/mypackage/dist/index.js', 'export default {}');

      const result = loader.normalize('/main.js', 'mypackage');

      expect(result).toBe('/node_modules/mypackage/dist/index.js');
    });

    test('prioritize exports over main', () => {
      vol.mkdirSync('/node_modules/mypackage/dist', { recursive: true });
      vol.writeFileSync(
        '/node_modules/mypackage/package.json',
        JSON.stringify({
          exports: './dist/exports.js',
          main: 'dist/main.js',
        }),
      );
      vol.writeFileSync('/node_modules/mypackage/dist/exports.js', 'export default {}');

      const result = loader.normalize('/main.js', 'mypackage');

      expect(result).toBe('/node_modules/mypackage/dist/exports.js');
    });

    test('prioritize exports over module', () => {
      vol.mkdirSync('/node_modules/mypackage/dist', { recursive: true });
      vol.writeFileSync(
        '/node_modules/mypackage/package.json',
        JSON.stringify({
          exports: './dist/exports.js',
          module: 'dist/module.js',
        }),
      );
      vol.writeFileSync('/node_modules/mypackage/dist/exports.js', 'export default {}');

      const result = loader.normalize('/main.js', 'mypackage');

      expect(result).toBe('/node_modules/mypackage/dist/exports.js');
    });

    test('prioritize exports over module and main', () => {
      vol.mkdirSync('/node_modules/mypackage/dist', { recursive: true });
      vol.writeFileSync(
        '/node_modules/mypackage/package.json',
        JSON.stringify({
          exports: './dist/exports.js',
          module: 'dist/module.js',
          main: 'dist/main.js',
        }),
      );
      vol.writeFileSync('/node_modules/mypackage/dist/exports.js', 'export default {}');

      const result = loader.normalize('/main.js', 'mypackage');

      expect(result).toBe('/node_modules/mypackage/dist/exports.js');
    });

    test('prioritize module over main when exports is not present', () => {
      vol.mkdirSync('/node_modules/mypackage/dist', { recursive: true });
      vol.writeFileSync(
        '/node_modules/mypackage/package.json',
        JSON.stringify({
          module: 'dist/module.js',
          main: 'dist/main.js',
        }),
      );
      vol.writeFileSync('/node_modules/mypackage/dist/module.js', 'export default {}');

      const result = loader.normalize('/main.js', 'mypackage');

      expect(result).toBe('/node_modules/mypackage/dist/module.js');
    });
  });

  describe('Built-in modules', () => {
    test('provide fs module', () => {
      const content = loader.load('fs');

      expect(content).toContain('readFileSync');
      expect(content).toContain('writeFileSync');
      expect(content).toContain('existsSync');
    });

    test('provide path module', () => {
      const content = loader.load('path');

      expect(content).toContain('join');
      expect(content).toContain('resolve');
      expect(content).toContain('dirname');
    });

    test('provide process module', () => {
      const content = loader.load('process');

      expect(content).toContain('cwd');
      expect(content).toContain('env');
      expect(content).toContain('exit');
    });

    test('provide timers module', () => {
      const content = loader.load('timers');

      expect(content).toContain('setTimeout');
      expect(content).toContain('setInterval');
    });
  });

  describe('CommonJS/ESM interoperability', () => {
    test('detect and wrap CommonJS modules', () => {
      const cjsCode = `
        function greet(name) {
          return 'Hello, ' + name;
        }
        module.exports = greet;
      `;
      vol.writeFileSync('/cjs-module.js', cjsCode);

      const content = loader.load('/cjs-module.js');

      // Should wrap the CJS code for ESM compatibility
      expect(content).toContain('CommonJS module wrapper');
      expect(content).toContain('export default module.exports');
      expect(content).toContain('const module = {');
      expect(content).toContain('const exports = module.exports');
    });

    test('wrap CJS modules with module.exports assignment', () => {
      const cjsCode = `
        const value = 42;
        module.exports = { value };
      `;
      vol.writeFileSync('/cjs-exports.js', cjsCode);

      const content = loader.load('/cjs-exports.js');

      expect(content).toContain('CommonJS module wrapper');
      expect(content).toContain('export default module.exports');
      expect(content).toContain(cjsCode);
    });

    test('wrap CJS modules with exports shorthand', () => {
      const cjsCode = `
        exports.name = 'test';
        exports.value = 123;
      `;
      vol.writeFileSync('/cjs-shorthand.js', cjsCode);

      const content = loader.load('/cjs-shorthand.js');

      expect(content).toContain('CommonJS module wrapper');
      expect(content).toContain('export default module.exports');
      expect(content).toContain('const exports = module.exports');
    });

    test('wrap CJS modules with require statements', () => {
      const cjsCode = `
        const path = require('path');
        module.exports = path.join('a', 'b');
      `;
      vol.writeFileSync('/cjs-require.js', cjsCode);

      const content = loader.load('/cjs-require.js');

      expect(content).toContain('CommonJS module wrapper');
      expect(content).toContain('export default module.exports');
    });

    test('include __dirname and __filename in wrapped CJS modules', () => {
      vol.mkdirSync('/subdir', { recursive: true });
      const cjsCode = `module.exports = __dirname;`;
      vol.writeFileSync('/subdir/cjs-dirname.js', cjsCode);

      const content = loader.load('/subdir/cjs-dirname.js');

      expect(content).toContain('const __dirname = "/subdir"');
      expect(content).toContain('const __filename = "/subdir/cjs-dirname.js"');
    });

    test('pass require, module, exports to wrapped CJS modules', () => {
      const cjsCode = `
        module.exports = { test: true };
      `;
      vol.writeFileSync('/cjs-params.js', cjsCode);

      const content = loader.load('/cjs-params.js');

      expect(content).toContain('(function(exports, require, module, __filename, __dirname)');
      expect(content).toContain('})(exports, require, module, __filename, __dirname);');
    });

    test('set up module cache in wrapped CJS modules', () => {
      const cjsCode = `module.exports = 42;`;
      vol.writeFileSync('/cjs-cache.js', cjsCode);

      const content = loader.load('/cjs-cache.js');

      expect(content).toContain('globalThis.__nodepack_module_cache');
      expect(content).toContain('globalThis.__nodepack_module_cache["/cjs-cache.js"] = module');
    });

    test('not wrap ESM modules', () => {
      const esmCode = `
        export function greet(name) {
          return 'Hello, ' + name;
        }
      `;
      vol.writeFileSync('/esm-module.js', esmCode);

      const content = loader.load('/esm-module.js');

      // Should return the ESM code as-is
      expect(content).toBe(esmCode);
      expect(content).not.toContain('CommonJS module wrapper');
      expect(content).toContain('export function greet');
    });

    test('not wrap ESM modules with export default', () => {
      const esmCode = `export default function() { return 42; }`;
      vol.writeFileSync('/esm-default.js', esmCode);

      const content = loader.load('/esm-default.js');

      expect(content).toBe(esmCode);
      expect(content).not.toContain('CommonJS module wrapper');
    });

    test('not wrap ESM modules with import statements', () => {
      const esmCode = `
        import path from 'path';
        export const result = path.join('a', 'b');
      `;
      vol.writeFileSync('/esm-import.js', esmCode);

      const content = loader.load('/esm-import.js');

      expect(content).toBe(esmCode);
      expect(content).not.toContain('CommonJS module wrapper');
    });

    test('handle mixed CJS/ESM detection correctly', () => {
      // Module with require but also export (should be detected as ESM)
      const mixedCode = `
        export const value = 42;
        const helper = require('./helper');
      `;
      vol.writeFileSync('/mixed.js', mixedCode);

      const content = loader.load('/mixed.js');

      // Should not wrap because it has export statement
      expect(content).toBe(mixedCode);
      expect(content).not.toContain('CommonJS module wrapper');
    });

    test('wrap CJS with only require and no exports', () => {
      const cjsCode = `
        const fs = require('fs');
        console.log('test');
      `;
      vol.writeFileSync('/cjs-no-exports.js', cjsCode);

      const content = loader.load('/cjs-no-exports.js');

      // Should wrap because it has require but no export
      expect(content).toContain('CommonJS module wrapper');
      expect(content).toContain('export default module.exports');
    });

    test('preserve original code in wrapped CJS modules', () => {
      const cjsCode = `
        function add(a, b) {
          return a + b;
        }
        module.exports = add;
      `;
      vol.writeFileSync('/cjs-preserve.js', cjsCode);

      const content = loader.load('/cjs-preserve.js');

      // Original code should be preserved inside the wrapper
      expect(content).toContain(cjsCode);
      expect(content).toContain('function add(a, b)');
      expect(content).toContain('return a + b;');
    });

    test('handle CJS modules in subdirectories', () => {
      vol.mkdirSync('/lib/utils', { recursive: true });
      const cjsCode = `module.exports = { test: true };`;
      vol.writeFileSync('/lib/utils/helper.js', cjsCode);

      const content = loader.load('/lib/utils/helper.js');

      expect(content).toContain('CommonJS module wrapper');
      expect(content).toContain('const __dirname = "/lib/utils"');
      expect(content).toContain('const __filename = "/lib/utils/helper.js"');
    });

    test('mark module as loaded in wrapped CJS', () => {
      const cjsCode = `module.exports = 42;`;
      vol.writeFileSync('/cjs-loaded.js', cjsCode);

      const content = loader.load('/cjs-loaded.js');

      expect(content).toContain('loaded: false');
      expect(content).toContain('module.loaded = true');
    });

    test('set current module directory in wrapped CJS', () => {
      vol.mkdirSync('/src', { recursive: true });
      const cjsCode = `module.exports = 42;`;
      vol.writeFileSync('/src/cjs-dir.js', cjsCode);

      const content = loader.load('/src/cjs-dir.js');

      expect(content).toContain('const __dirname = "/src"');
      expect(content).toContain('globalThis.__nodepack_current_module_dir = __dirname');
    });
  });
});
