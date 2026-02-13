import { describe, it, expect } from 'vitest';
import { createRequireFunction } from './require.js';

describe('createRequireFunction', () => {
  it('should generate require function code', () => {
    const code = createRequireFunction();

    expect(code).toBeDefined();
    expect(typeof code).toBe('string');
    expect(code.length).toBeGreaterThan(0);
  });

  it('should define globalThis.require', () => {
    const code = createRequireFunction();

    expect(code).toContain('globalThis.require = require');
  });

  it('should initialize module cache', () => {
    const code = createRequireFunction();

    expect(code).toContain('globalThis.__nodepack_module_cache');
  });

  it('should initialize current module directory', () => {
    const code = createRequireFunction();

    expect(code).toContain('globalThis.__nodepack_current_module_dir');
  });

  describe('Built-in modules handling', () => {
    it('should list all built-in modules', () => {
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

    it('should handle node: protocol prefix', () => {
      const code = createRequireFunction();

      expect(code).toContain("modulePath.startsWith('node:')");
      expect(code).toContain('modulePath.slice(5)');
    });

    it('should return built-in modules from global', () => {
      const code = createRequireFunction();

      expect(code).toContain("globalThis['__nodepack_' + modulePath]");
    });
  });

  describe('Path resolution', () => {
    it('should handle absolute paths', () => {
      const code = createRequireFunction();

      expect(code).toContain("modulePath.startsWith('/')");
    });

    it('should handle relative paths', () => {
      const code = createRequireFunction();

      expect(code).toContain("modulePath.startsWith('./')");
      expect(code).toContain("modulePath.startsWith('../')");
    });

    it('should resolve relative paths using path.resolve', () => {
      const code = createRequireFunction();

      expect(code).toContain('globalThis.__nodepack_path.resolve');
    });

    it('should handle npm packages', () => {
      const code = createRequireFunction();

      expect(code).toContain('/node_modules/');
    });
  });

  describe('File extension handling', () => {
    it('should try adding .js extension', () => {
      const code = createRequireFunction();

      expect(code).toContain("resolvedPath.endsWith('.js')");
      expect(code).toContain("resolvedPath + '.js'");
    });

    it('should try adding .json extension', () => {
      const code = createRequireFunction();

      expect(code).toContain("resolvedPath.endsWith('.json')");
      expect(code).toContain("resolvedPath + '.json'");
    });

    it('should try index.js in directories', () => {
      const code = createRequireFunction();

      expect(code).toContain("resolvedPath + '/index.js'");
    });
  });

  describe('Module caching', () => {
    it('should check cache before loading', () => {
      const code = createRequireFunction();

      expect(code).toContain('globalThis.__nodepack_module_cache[resolvedPath]');
    });

    it('should return cached module exports', () => {
      const code = createRequireFunction();

      expect(code).toContain('.exports');
    });

    it('should cache module immediately', () => {
      const code = createRequireFunction();

      expect(code).toContain('globalThis.__nodepack_module_cache[resolvedPath] = module');
    });
  });

  describe('JSON file handling', () => {
    it('should detect JSON files', () => {
      const code = createRequireFunction();

      expect(code).toContain("resolvedPath.endsWith('.json')");
    });

    it('should parse JSON files', () => {
      const code = createRequireFunction();

      expect(code).toContain('JSON.parse(code)');
    });

    it('should handle JSON parsing errors', () => {
      const code = createRequireFunction();

      expect(code).toContain('Failed to parse JSON');
    });
  });

  describe('ES Module detection', () => {
    it('should have regex to detect ESM with export keyword', () => {
      const code = createRequireFunction();

      // Should have regex with proper character classes
      expect(code).toContain('\\s*');
      expect(code).toContain('export');
      expect(code).toContain('import');
      expect(code).toContain('\\b');
    });

    it('should use multiline regex flag', () => {
      const code = createRequireFunction();

      expect(code).toContain('/m.test(code)');
    });

    it('should call __nodepack_require_es_module for ESM', () => {
      const code = createRequireFunction();

      expect(code).toContain('globalThis.__nodepack_require_es_module(resolvedPath)');
    });

    it('should handle ESM require errors', () => {
      const code = createRequireFunction();

      expect(code).toContain('Failed to require ES module');
    });

    it('should properly escape backslashes in regex', () => {
      const code = createRequireFunction();

      // The regex in the source has \\ which becomes \ in the generated string
      // So we should see /^\s*(export|import)\b/m in the output
      expect(code).toContain('/^\\s*(export|import)\\b/m');
    });
  });

  describe('CommonJS execution', () => {
    it('should call __nodepack_execute_commonjs_module', () => {
      const code = createRequireFunction();

      expect(code).toContain('globalThis.__nodepack_execute_commonjs_module');
    });

    it('should pass code, module, and path to executor', () => {
      const code = createRequireFunction();

      expect(code).toContain('__nodepack_execute_commonjs_module(code, module, resolvedPath)');
    });

    it('should mark module as loaded after execution', () => {
      const code = createRequireFunction();

      expect(code).toContain('module.loaded = true');
    });

    it('should manage current module directory', () => {
      const code = createRequireFunction();

      expect(code).toContain('globalThis.__nodepack_current_module_dir');
      expect(code).toContain('previousDir');
    });

    it('should restore previous directory in finally block', () => {
      const code = createRequireFunction();

      expect(code).toContain('finally');
      expect(code).toContain('globalThis.__nodepack_current_module_dir = previousDir');
    });
  });

  describe('Shebang handling', () => {
    it('should strip shebang lines', () => {
      const code = createRequireFunction();

      expect(code).toContain('stripShebang');
      expect(code).toContain("code.startsWith('#!')");
    });

    it('should handle shebang removal', () => {
      const code = createRequireFunction();

      expect(code).toContain("code.indexOf('\\n')");
      expect(code).toContain('code.substring');
    });
  });

  describe('Error handling', () => {
    it('should throw error for non-existent modules', () => {
      const code = createRequireFunction();

      expect(code).toContain('Cannot find module');
      expect(code).toContain('throw new Error');
    });

    it('should handle file system check', () => {
      const code = createRequireFunction();

      expect(code).toContain('globalThis.__nodepack_fs.existsSync');
    });

    it('should read files using virtual fs', () => {
      const code = createRequireFunction();

      expect(code).toContain('globalThis.__nodepack_fs.readFileSync');
    });
  });

  describe('Module object structure', () => {
    it('should create module object with exports', () => {
      const code = createRequireFunction();

      expect(code).toContain('exports: {}');
    });

    it('should include filename in module object', () => {
      const code = createRequireFunction();

      expect(code).toContain('filename: resolvedPath');
    });

    it('should include loaded flag in module object', () => {
      const code = createRequireFunction();

      expect(code).toContain('loaded: false');
    });

    it('should include children array in module object', () => {
      const code = createRequireFunction();

      expect(code).toContain('children: []');
    });
  });

  describe('Integration points', () => {
    it('should use __nodepack_path for path operations', () => {
      const code = createRequireFunction();

      expect(code).toContain('globalThis.__nodepack_path');
    });

    it('should use __nodepack_fs for file operations', () => {
      const code = createRequireFunction();

      expect(code).toContain('globalThis.__nodepack_fs');
    });

    it('should use __nodepack_execute_commonjs_module for CJS', () => {
      const code = createRequireFunction();

      expect(code).toContain('globalThis.__nodepack_execute_commonjs_module');
    });

    it('should use __nodepack_require_es_module for ESM', () => {
      const code = createRequireFunction();

      expect(code).toContain('globalThis.__nodepack_require_es_module');
    });
  });

  describe('Code structure', () => {
    it('should wrap everything in IIFE', () => {
      const code = createRequireFunction();

      expect(code).toMatch(/^\(function\(\)/);
      expect(code).toMatch(/\}\)\(\);$/);
    });

    it('should trim the output', () => {
      const code = createRequireFunction();

      // Should not have leading/trailing whitespace
      expect(code.startsWith(' ')).toBe(false);
      expect(code.endsWith(' ')).toBe(false);
      expect(code.startsWith('\n')).toBe(false);
      expect(code.endsWith('\n')).toBe(false);
    });
  });
});
