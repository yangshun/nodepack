import { describe, it, expect, beforeEach } from 'vitest';
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
    it('should load file from filesystem', () => {
      vol.writeFileSync('/test.js', 'export default 42;');

      const content = loader.load('/test.js');

      expect(content).toBe('export default 42;');
    });

    it('should throw error for non-existent file', () => {
      expect(() => {
        loader.load('/nonexistent.js');
      }).toThrow('Cannot find module');
    });

    it('should load built-in modules', () => {
      const fsModule = loader.load('fs');

      expect(fsModule).toBeDefined();
      expect(fsModule).toContain('readFileSync');
      expect(fsModule).toContain('writeFileSync');
    });
  });

  describe('normalize()', () => {
    it('should resolve relative imports from root', () => {
      const result = loader.normalize('/main.js', './utils.js');

      expect(result).toBe('/utils.js');
    });

    it('should resolve relative imports from subdirectory', () => {
      const result = loader.normalize('/src/main.js', './helper.js');

      expect(result).toBe('/src/helper.js');
    });

    it('should resolve parent directory imports', () => {
      const result = loader.normalize('/src/sub/file.js', '../utils.js');

      expect(result).toBe('/src/utils.js');
    });

    it('should handle npm package imports', () => {
      vol.mkdirSync('/node_modules/lodash', { recursive: true });
      vol.writeFileSync('/node_modules/lodash/package.json', JSON.stringify({
        main: 'index.js'
      }));
      vol.writeFileSync('/node_modules/lodash/index.js', 'export default {}');

      const result = loader.normalize('/main.js', 'lodash');

      expect(result).toBe('/node_modules/lodash/index.js');
    });

    it('should handle scoped packages', () => {
      vol.mkdirSync('/node_modules/@babel/core/lib', { recursive: true });
      vol.writeFileSync('/node_modules/@babel/core/package.json', JSON.stringify({
        main: 'lib/index.js'
      }));
      vol.writeFileSync('/node_modules/@babel/core/lib/index.js', 'export default {}');

      const result = loader.normalize('/main.js', '@babel/core');

      expect(result).toBe('/node_modules/@babel/core/lib/index.js');
    });

    it('should resolve package subpaths', () => {
      vol.mkdirSync('/node_modules/lodash', { recursive: true });
      vol.writeFileSync('/node_modules/lodash/add.js', 'export default function() {}');

      const result = loader.normalize('/main.js', 'lodash/add');

      expect(result).toBe('/node_modules/lodash/add.js');
    });

    it('should add .js extension if missing', () => {
      vol.writeFileSync('/utils.js', 'export default {}');

      const result = loader.normalize('/main.js', './utils');

      expect(result).toBe('/utils.js');
    });

    it('should handle built-in modules', () => {
      const result = loader.normalize('/main.js', 'fs');

      expect(result).toBe('fs');
    });

    it('should handle node: protocol', () => {
      const result = loader.normalize('/main.js', 'node:fs');

      expect(result).toBe('fs');
    });
  });

  describe('Package resolution', () => {
    it('should read package.json main field', () => {
      vol.mkdirSync('/node_modules/mypackage/dist', { recursive: true });
      vol.writeFileSync('/node_modules/mypackage/package.json', JSON.stringify({
        main: 'dist/index.js'
      }));
      vol.writeFileSync('/node_modules/mypackage/dist/index.js', 'export default {}');

      const result = loader.normalize('/main.js', 'mypackage');

      expect(result).toBe('/node_modules/mypackage/dist/index.js');
    });

    it('should fallback to index.js if no main field', () => {
      vol.mkdirSync('/node_modules/mypackage', { recursive: true });
      vol.writeFileSync('/node_modules/mypackage/package.json', JSON.stringify({}));
      vol.writeFileSync('/node_modules/mypackage/index.js', 'export default {}');

      const result = loader.normalize('/main.js', 'mypackage');

      expect(result).toBe('/node_modules/mypackage/index.js');
    });

    it('should use module field over main for ESM', () => {
      vol.mkdirSync('/node_modules/mypackage/dist', { recursive: true });
      vol.writeFileSync('/node_modules/mypackage/package.json', JSON.stringify({
        main: 'dist/cjs.js',
        module: 'dist/esm.js'
      }));
      vol.writeFileSync('/node_modules/mypackage/dist/esm.js', 'export default {}');

      const result = loader.normalize('/main.js', 'mypackage');

      expect(result).toBe('/node_modules/mypackage/dist/esm.js');
    });
  });

  describe('Built-in modules', () => {
    it('should provide fs module', () => {
      const content = loader.load('fs');

      expect(content).toContain('readFileSync');
      expect(content).toContain('writeFileSync');
      expect(content).toContain('existsSync');
    });

    it('should provide path module', () => {
      const content = loader.load('path');

      expect(content).toContain('join');
      expect(content).toContain('resolve');
      expect(content).toContain('dirname');
    });

    it('should provide process module', () => {
      const content = loader.load('process');

      expect(content).toContain('cwd');
      expect(content).toContain('env');
      expect(content).toContain('exit');
    });

    it('should provide timers module', () => {
      const content = loader.load('timers');

      expect(content).toContain('setTimeout');
      expect(content).toContain('setInterval');
    });
  });
});
