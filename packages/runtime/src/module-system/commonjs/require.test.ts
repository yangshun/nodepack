import { describe, test, expect } from 'vitest';
import { createRequireFunction } from './require.js';

describe('createRequireFunction', () => {
  test('generate require function code', () => {
    const code = createRequireFunction();

    expect(code).toBeDefined();
    expect(typeof code).toBe('string');
    expect(code.length).toBeGreaterThan(0);
  });

  test('define globalThis.require', () => {
    const code = createRequireFunction();

    expect(code).toContain('globalThis.require = require');
  });

  test('initialize module cache', () => {
    const code = createRequireFunction();

    expect(code).toContain('globalThis.__nodepack_module_cache');
  });

  test('initialize current module directory', () => {
    const code = createRequireFunction();

    expect(code).toContain('globalThis.__nodepack_current_module_dir');
  });

  describe('Built-in modules handling', () => {
    test('list all built-in modules', () => {
      const code = createRequireFunction();

      expect(code).toContain('fs');
      expect(code).toContain('path');
      expect(code).toContain('process');
      expect(code).toContain('timers');
      expect(code).toContain('module');
      expect(code).toContain('url');
      expect(code).toContain('events');
      expect(code).toContain('child_process');
    });

    test('handle node: protocol prefix', () => {
      const code = createRequireFunction();

      expect(code).toContain("modulePath.startsWith('node:')");
      expect(code).toContain('modulePath.slice(5)');
    });

    test('return built-in modules from global', () => {
      const code = createRequireFunction();

      expect(code).toContain("globalThis['__nodepack_' + modulePath]");
    });
  });

  describe('Path resolution', () => {
    test('handle absolute paths', () => {
      const code = createRequireFunction();

      expect(code).toContain("modulePath.startsWith('/')");
    });

    test('handle relative paths', () => {
      const code = createRequireFunction();

      expect(code).toContain("modulePath.startsWith('./')");
      expect(code).toContain("modulePath.startsWith('../')");
    });

    test('resolve relative paths using path.resolve', () => {
      const code = createRequireFunction();

      expect(code).toContain('globalThis.__nodepack_path.resolve');
    });

    test('handle npm packages', () => {
      const code = createRequireFunction();

      expect(code).toContain('/node_modules/');
    });
  });

  describe('File extension handling', () => {
    test('try adding .js extension', () => {
      const code = createRequireFunction();

      expect(code).toContain("resolvedPath.endsWith('.js')");
      expect(code).toContain("resolvedPath + '.js'");
    });

    test('try adding .json extension', () => {
      const code = createRequireFunction();

      expect(code).toContain("resolvedPath.endsWith('.json')");
      expect(code).toContain("resolvedPath + '.json'");
    });

    test('try index.js in directories', () => {
      const code = createRequireFunction();

      expect(code).toContain("resolvedPath + '/index.js'");
    });
  });

  describe('Module caching', () => {
    test('check cache before loading', () => {
      const code = createRequireFunction();

      expect(code).toContain('globalThis.__nodepack_module_cache[resolvedPath]');
    });

    test('return cached module exports', () => {
      const code = createRequireFunction();

      expect(code).toContain('.exports');
    });

    test('cache module immediately', () => {
      const code = createRequireFunction();

      expect(code).toContain('globalThis.__nodepack_module_cache[resolvedPath] = module');
    });
  });

  describe('JSON file handling', () => {
    test('detect JSON files', () => {
      const code = createRequireFunction();

      expect(code).toContain("resolvedPath.endsWith('.json')");
    });

    test('parse JSON files', () => {
      const code = createRequireFunction();

      expect(code).toContain('JSON.parse(code)');
    });

    test('handle JSON parsing errors', () => {
      const code = createRequireFunction();

      expect(code).toContain('Failed to parse JSON');
    });
  });

  describe('ES Module detection', () => {
    test('have regex to detect ESM with export keyword', () => {
      const code = createRequireFunction();

      // Should have regex with proper character classes
      expect(code).toContain('\\s*');
      expect(code).toContain('export');
      expect(code).toContain('import');
      expect(code).toContain('\\b');
    });

    test('use multiline regex flag', () => {
      const code = createRequireFunction();

      expect(code).toContain('/m.test(code)');
    });

    test('call __nodepack_require_es_module for ESM', () => {
      const code = createRequireFunction();

      expect(code).toContain('globalThis.__nodepack_require_es_module(resolvedPath)');
    });

    test('handle ESM require errors', () => {
      const code = createRequireFunction();

      expect(code).toContain('Failed to require ES module');
    });

    test('properly escape backslashes in regex', () => {
      const code = createRequireFunction();

      // The regex in the source has \\ which becomes \ in the generated string
      // So we should see /^\s*(export|import)\b/m in the output
      expect(code).toContain('/^\\s*(export|import)\\b/m');
    });
  });

  describe('CommonJS execution', () => {
    test('call __nodepack_execute_commonjs_module', () => {
      const code = createRequireFunction();

      expect(code).toContain('globalThis.__nodepack_execute_commonjs_module');
    });

    test('pass code, module, and path to executor', () => {
      const code = createRequireFunction();

      expect(code).toContain('__nodepack_execute_commonjs_module(code, module, resolvedPath)');
    });

    test('mark module as loaded after execution', () => {
      const code = createRequireFunction();

      expect(code).toContain('module.loaded = true');
    });

    test('manage current module directory', () => {
      const code = createRequireFunction();

      expect(code).toContain('globalThis.__nodepack_current_module_dir');
      expect(code).toContain('previousDir');
    });

    test('restore previous directory in finally block', () => {
      const code = createRequireFunction();

      expect(code).toContain('finally');
      expect(code).toContain('globalThis.__nodepack_current_module_dir = previousDir');
    });
  });

  describe('Shebang handling', () => {
    test('strip shebang lines', () => {
      const code = createRequireFunction();

      expect(code).toContain('stripShebang');
      expect(code).toContain("code.startsWith('#!')");
    });

    test('handle shebang removal', () => {
      const code = createRequireFunction();

      expect(code).toContain("code.indexOf('\\n')");
      expect(code).toContain('code.substring');
    });
  });

  describe('Error handling', () => {
    test('throw error for non-existent modules', () => {
      const code = createRequireFunction();

      expect(code).toContain('Cannot find module');
      expect(code).toContain('throw new Error');
    });

    test('handle file system check', () => {
      const code = createRequireFunction();

      expect(code).toContain('globalThis.__nodepack_fs.existsSync');
    });

    test('read files using virtual fs', () => {
      const code = createRequireFunction();

      expect(code).toContain('globalThis.__nodepack_fs.readFileSync');
    });
  });

  describe('Module object structure', () => {
    test('create module object with exports', () => {
      const code = createRequireFunction();

      expect(code).toContain('exports: {}');
    });

    test('include filename in module object', () => {
      const code = createRequireFunction();

      expect(code).toContain('filename: resolvedPath');
    });

    test('include loaded flag in module object', () => {
      const code = createRequireFunction();

      expect(code).toContain('loaded: false');
    });

    test('include children array in module object', () => {
      const code = createRequireFunction();

      expect(code).toContain('children: []');
    });
  });

  describe('Integration points', () => {
    test('use __nodepack_path for path operations', () => {
      const code = createRequireFunction();

      expect(code).toContain('globalThis.__nodepack_path');
    });

    test('use __nodepack_fs for file operations', () => {
      const code = createRequireFunction();

      expect(code).toContain('globalThis.__nodepack_fs');
    });

    test('use __nodepack_execute_commonjs_module for CJS', () => {
      const code = createRequireFunction();

      expect(code).toContain('globalThis.__nodepack_execute_commonjs_module');
    });

    test('use __nodepack_require_es_module for ESM', () => {
      const code = createRequireFunction();

      expect(code).toContain('globalThis.__nodepack_require_es_module');
    });
  });

  describe('Code structure', () => {
    test('wrap everything in IIFE', () => {
      const code = createRequireFunction();

      expect(code).toMatch(/^\(function\(\)/);
      expect(code).toMatch(/\}\)\(\);$/);
    });

    test('trim the output', () => {
      const code = createRequireFunction();

      // Should not have leading/trailing whitespace
      expect(code.startsWith(' ')).toBe(false);
      expect(code.endsWith(' ')).toBe(false);
      expect(code.startsWith('\n')).toBe(false);
      expect(code.endsWith('\n')).toBe(false);
    });
  });
});
