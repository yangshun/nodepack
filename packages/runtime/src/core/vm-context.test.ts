import { describe, test, expect, beforeEach } from 'vitest';
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
    test('inject fs module', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof __nodepack_fs');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('object');
    });

    test('inject path module', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof __nodepack_path');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('object');
    });

    test('inject process module', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof __nodepack_process');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('object');
    });

    test('inject timers module', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof __nodepack_timers');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('object');
    });

    test('inject module builtin', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof __nodepack_module');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('object');
    });

    test('inject url module', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof __nodepack_url');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('object');
    });

    test('inject events module', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof __nodepack_events');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('object');
    });

    test('inject child_process module', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof __nodepack_child_process');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('object');
    });
  });

  describe('global object setup', () => {
    test('expose process as global', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof process');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('object');
    });

    test('expose setTimeout as global', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof setTimeout');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');
    });

    test('expose setInterval as global', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof setInterval');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');
    });

    test('expose clearTimeout as global', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof clearTimeout');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');
    });

    test('expose clearInterval as global', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof clearInterval');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');
    });
  });

  describe('CommonJS support', () => {
    test('initialize require function', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof require');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');
    });

    test('set up module cache', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof __nodepack_module_cache');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('object');
    });

    test('set up CommonJS executor function', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof __nodepack_execute_commonjs_module');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');
    });

    test('set up ES module require function', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      const result = vm.evalCode('typeof __nodepack_require_es_module');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');
    });
  });

  describe('require() functionality', () => {
    test('require built-in fs module', () => {
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

    test('require built-in path module', () => {
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

    test('require built-in process module', () => {
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

    test('cache required modules', () => {
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
    test('pass env variables to process module', () => {
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

    test('handle missing env option', () => {
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
    test('configure module loader', () => {
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

    test('load built-in modules via module loader', () => {
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
    test('handle errors in CommonJS module execution', () => {
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
    test('properly dispose all resources', () => {
      setupVMContext(vm, runtime, filesystem, timerTracker, {});

      // Test that we can dispose without errors
      vm.dispose();
      runtime.dispose();

      expect(true).toBe(true);
    });
  });
});
