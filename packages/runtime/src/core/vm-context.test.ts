import { describe, it, expect, beforeEach } from 'vitest';
import { newQuickJSWASMModule } from 'quickjs-emscripten';
import { vol } from 'memfs';
import type { IFs } from 'memfs';
import { setupVMContext } from './vm-context.js';
import type { TimerTracker } from '../builtins/timers.js';

describe('vm-context', () => {
  let QuickJS: any;
  let runtime: any;
  let vm: any;
  let filesystem: IFs;
  let timerTracker: TimerTracker;

  beforeEach(async () => {
    // Reset filesystem
    vol.reset();

    // Initialize QuickJS context
    QuickJS = await newQuickJSWASMModule();
    runtime = QuickJS.newRuntime();
    vm = runtime.newContext();
    filesystem = vol as any;
    timerTracker = {
      pendingTimers: new Set(),
    };
  }, 30000);

  describe('built-in module injection', () => {
    it('should inject fs module', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof __nodepack_fs');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('object');
    });

    it('should inject path module', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof __nodepack_path');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('object');
    });

    it('should inject process module', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof __nodepack_process');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('object');
    });

    it('should inject timers module', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof __nodepack_timers');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('object');
    });

    it('should inject module builtin', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof __nodepack_module');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('object');
    });

    it('should inject url module', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof __nodepack_url');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('object');
    });

    it('should inject events module', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof __nodepack_events');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('object');
    });

    it('should inject child_process module', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof __nodepack_child_process');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('object');
    });
  });

  describe('global object setup', () => {
    it('should expose process as global', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof process');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('object');
    });

    it('should expose setTimeout as global', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof setTimeout');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');
    });

    it('should expose setInterval as global', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof setInterval');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');
    });

    it('should expose clearTimeout as global', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof clearTimeout');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');
    });

    it('should expose clearInterval as global', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof clearInterval');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');
    });
  });

  describe('CommonJS support', () => {
    it('should initialize require function', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof require');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');
    });

    it('should set up module cache', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof __nodepack_module_cache');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('object');
    });

    it('should set up CommonJS executor function', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof __nodepack_execute_commonjs_module');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');
    });

    it('should set up ES module require function', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof __nodepack_require_es_module');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');
    });
  });

  describe('require() functionality', () => {
    it('should require built-in fs module', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode(`
        const fs = require('fs');
        typeof fs.readFileSync;
      `);

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw new Error(`Evaluation failed: ${JSON.stringify(error)}`);
      }

      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');
    });

    it('should require built-in path module', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode(`
        const path = require('path');
        typeof path.join;
      `);

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw new Error(`Evaluation failed: ${JSON.stringify(error)}`);
      }

      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');
    });

    it('should require built-in process module', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode(`
        const process = require('process');
        typeof process.cwd;
      `);

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw new Error(`Evaluation failed: ${JSON.stringify(error)}`);
      }

      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');
    });

    it('should cache required modules', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode(`
        const fs1 = require('fs');
        const fs2 = require('fs');
        fs1 === fs2;
      `);

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw new Error(`Evaluation failed: ${JSON.stringify(error)}`);
      }

      const isSame = vm.dump(result.value);
      result.value.dispose();

      expect(isSame).toBe(true);
    });
  });

  describe('runtime options', () => {
    it('should pass env variables to process module', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {
        env: { TEST_VAR: 'test_value' },
      });

      const result = vm.evalCode('process.env.TEST_VAR');

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw new Error(`Evaluation failed: ${JSON.stringify(error)}`);
      }

      const value = vm.dump(result.value);
      result.value.dispose();

      expect(value).toBe('test_value');
    });

    it('should handle missing env option', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof process.env');

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw new Error(`Evaluation failed: ${JSON.stringify(error)}`);
      }

      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('object');
    });
  });

  describe('module loader', () => {
    it('should configure module loader', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      // Module loader should be set up on the runtime
      // We can test this by importing a module
      filesystem.mkdirSync('/test', { recursive: true });
      filesystem.writeFileSync('/test/module.js', 'export const value = 42;');

      const result = vm.evalCode(`import('/test/module.js')`);

      // The module loader should handle this import
      expect(result.error).toBeUndefined();

      if (result.value) {
        result.value.dispose();
      }
    });

    it('should load built-in modules via module loader', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode(`import('fs')`);

      // Should be able to import built-in modules
      expect(result.error).toBeUndefined();

      if (result.value) {
        result.value.dispose();
      }
    });
  });

  describe('error handling', () => {
    it('should handle errors in CommonJS module execution', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      filesystem.writeFileSync(
        '/error-module.js',
        `
        throw new Error('Module error');
      `,
      );

      const result = vm.evalCode(`
        try {
          require('/error-module.js');
        } catch (e) {
          'caught';
        }
      `);

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw new Error(`Evaluation failed: ${JSON.stringify(error)}`);
      }

      const value = vm.dump(result.value);
      result.value.dispose();

      expect(value).toBe('caught');
    });
  });

  describe('cleanup', () => {
    it('should properly dispose all resources', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      // Test that we can dispose without errors
      vm.dispose();
      runtime.dispose();

      expect(true).toBe(true);
    });
  });
});
