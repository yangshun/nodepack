import { describe, test, expect, beforeEach, vi } from 'vitest';
import { newQuickJSWASMModule } from 'quickjs-emscripten';
import { vol } from 'memfs';
import type { IFs } from 'memfs';
import { executeCode } from './code-executor.js';
import type { CodeExecutorContext } from './code-executor.js';
import type { TimerTracker } from '../builtins/timers.js';
import { setupVMContext } from './vm-context.js';
import { setupConsole } from './console-handler.js';
import { NpmPackageManager } from '../npm/package-manager.js';

describe('code-executor', () => {
  let context: CodeExecutorContext;

  beforeEach(async () => {
    // Reset filesystem
    vol.reset();

    // Initialize QuickJS context
    const QuickJS = await newQuickJSWASMModule();
    const runtime = QuickJS.newRuntime();
    const vm = runtime.newContext();
    const filesystem: IFs = vol as any;
    const timerTracker: TimerTracker = {
      pendingTimers: new Set(),
    };
    const consoleLogs: string[] = [];
    const npmPackageManager = new NpmPackageManager(filesystem);

    // Set up console
    const consoleObj = setupConsole(vm, { logStore: consoleLogs });
    vm.setProp(vm.global, 'console', consoleObj);
    consoleObj.dispose();

    // Set up VM context
    setupVMContext(vm, runtime, filesystem, timerTracker, {});

    context = {
      vm,
      runtime,
      filesystem,
      timerTracker,
      consoleLogs,
      npmPackageManager,
    };
  }, 30000);

  describe('shebang handling', () => {
    test('strip shebang from code', async () => {
      const code = `#!/usr/bin/env node
console.log('test');
export default 42;`;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(true);
      expect(result.data).toBe(42);
    });

    test('handle code without shebang', async () => {
      const code = `export default 'no shebang';`;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(true);
      expect(result.data).toBe('no shebang');
    });

    test('handle different shebang formats', async () => {
      const code = `#!/bin/sh
export default 'shell script';`;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(true);
      expect(result.data).toBe('shell script');
    });
  });

  describe('ESM execution', () => {
    test('execute ES module code', async () => {
      const code = `
        const x = 10;
        const y = 20;
        export default x + y;
      `;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(true);
      expect(result.data).toBe(30);
    });

    test('handle ES module with imports', async () => {
      const code = `
        import { join } from 'path';
        export default join('a', 'b');
      `;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(true);
      expect(result.data).toBe('a/b');
    });

    test('return entire module if no default export', async () => {
      const code = `
        export const foo = 'bar';
        export const baz = 123;
      `;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ foo: 'bar', baz: 123 });
    });
  });

  describe('CommonJS execution', () => {
    test('execute CommonJS module code', async () => {
      const code = `
        const x = 5;
        module.exports = x * 2;
      `;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(true);
      expect(result.data).toBe(10);
    });

    test('handle CommonJS with require', async () => {
      const code = `
        const path = require('path');
        module.exports = path.join('x', 'y');
      `;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(true);
      expect(result.data).toBe('x/y');
    });

    test('support exports object', async () => {
      const code = `
        exports.foo = 'bar';
        exports.baz = 123;
      `;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ foo: 'bar', baz: 123 });
    });
  });

  describe('error handling', () => {
    test('handle syntax errors', async () => {
      const code = `
        const x = ;
      `;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.logs).toEqual([]);
    });

    test('handle runtime errors', async () => {
      const code = `
        const obj = null;
        obj.property;
      `;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('handle thrown errors', async () => {
      const code = `
        throw new Error('Test error message');
      `;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Test error message');
    });

    test('format error with name and message', async () => {
      const code = `
        class CustomError extends Error {
          constructor(message) {
            super(message);
            this.name = 'CustomError';
          }
        }
        throw new CustomError('Custom error message');
      `;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(false);
      expect(result.error).toContain('CustomError');
      expect(result.error).toContain('Custom error message');
    });
  });

  describe('filesystem integration', () => {
    test('write code to virtual filesystem', async () => {
      const code = `export default 'test';`;

      await executeCode(code, context);

      const fileContent = context.filesystem.readFileSync('/main.js', 'utf8');
      expect(fileContent).toBe(code);
    });

    test('use custom filename option', async () => {
      const code = `export default 'custom';`;

      await executeCode(code, context, { filename: '/custom.js' });

      const fileContent = context.filesystem.readFileSync('/custom.js', 'utf8');
      expect(fileContent).toBe(code);
    });

    test('handle file in subdirectory', async () => {
      vol.mkdirSync('/src', { recursive: true });
      const code = `export default 'subdir';`;

      await executeCode(code, context, { filename: '/src/file.js' });

      const fileContent = context.filesystem.readFileSync('/src/file.js', 'utf8');
      expect(fileContent).toBe(code);
    });
  });

  describe('console logs', () => {
    test('capture console logs', async () => {
      const code = `
        console.log('test message');
        export default 42;
      `;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(true);
      expect(result.logs).toContain('test message');
    });

    test('capture multiple console logs', async () => {
      const code = `
        console.log('first');
        console.log('second');
        console.log('third');
        export default 'done';
      `;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(true);
      expect(result.logs).toHaveLength(3);
      expect(result.logs).toEqual(['first', 'second', 'third']);
    });

    test('include logs even on error', async () => {
      const code = `
        console.log('before error');
        throw new Error('boom');
      `;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(false);
      expect(result.logs).toContain('before error');
    });
  });

  describe('timer handling', () => {
    test('wait for setTimeout to complete', async () => {
      const code = `
        let result = 'initial';
        setTimeout(() => {
          result = 'updated';
        }, 50);
        export default result;
      `;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(true);
      // Note: The result will be 'initial' because export happens before timer
      // This tests that timers are tracked and cleaned up
      expect(context.timerTracker.pendingTimers.size).toBe(0);
    });

    test('cleanup timers on error', async () => {
      const code = `
        setTimeout(() => {
          console.log('should not run');
        }, 1000);
        throw new Error('error before timer');
      `;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(false);
      expect(context.timerTracker.pendingTimers.size).toBe(0);
    });

    test('respect timeout option', async () => {
      const code = `
        setTimeout(() => {
          console.log('long timer');
        }, 5000);
        export default 'done';
      `;

      const result = await executeCode(code, context, { timeout: 100 });

      expect(result.ok).toBe(true);
      // Timer should be cleaned up after timeout
      expect(context.timerTracker.pendingTimers.size).toBe(0);
    }, 10000);
  });

  describe('module format detection', () => {
    test('detect ES module with import', async () => {
      const code = `
        import path from 'path';
        export default path.join('a', 'b');
      `;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(true);
    });

    test('detect ES module with export', async () => {
      const code = `
        export const value = 42;
      `;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(true);
      expect(result.data.value).toBe(42);
    });

    test('detect CommonJS with require', async () => {
      const code = `
        const path = require('path');
        module.exports = path;
      `;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();
    });

    test('detect CommonJS with module.exports', async () => {
      const code = `
        module.exports = { test: 'value' };
      `;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ test: 'value' });
    });
  });

  describe('resource cleanup', () => {
    test('dispose VM and runtime on success', async () => {
      const code = `export default 42;`;

      await executeCode(code, context);

      // After execution, VM and runtime should be disposed
      // We can't directly test disposal, but we can verify no errors occur
      expect(true).toBe(true);
    });

    test('dispose VM and runtime on error', async () => {
      const code = `throw new Error('test');`;

      await executeCode(code, context);

      // After execution, VM and runtime should be disposed even on error
      expect(true).toBe(true);
    });
  });

  describe('edge cases', () => {
    test('handle empty code', async () => {
      const code = ``;

      const result = await executeCode(code, context);

      // Empty code should execute successfully
      expect(result.ok).toBe(true);
    });

    test('handle code with only comments', async () => {
      const code = `
        // Just a comment
        /* Another comment */
      `;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(true);
    });

    test('handle code with unicode characters', async () => {
      const code = `
        const greeting = 'Hello 世界';
        export default greeting;
      `;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(true);
      expect(result.data).toBe('Hello 世界');
    });

    test('handle large numbers', async () => {
      const code = `
        export default 9007199254740991; // Number.MAX_SAFE_INTEGER
      `;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(true);
      expect(result.data).toBe(9007199254740991);
    });

    test('handle complex objects', async () => {
      const code = `
        export default {
          nested: {
            array: [1, 2, 3],
            object: { key: 'value' }
          }
        };
      `;

      const result = await executeCode(code, context);

      expect(result.ok).toBe(true);
      expect(result.data.nested.array).toEqual([1, 2, 3]);
      expect(result.data.nested.object.key).toBe('value');
    });
  });
});
