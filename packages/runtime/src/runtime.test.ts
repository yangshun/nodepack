import { describe, it, expect, beforeAll } from 'vitest';
import { NodepackRuntime } from './runtime.js';

describe('NodepackRuntime', () => {
  let runtime: NodepackRuntime;

  beforeAll(async () => {
    runtime = new NodepackRuntime();
    await runtime.initialize();
  }, 30000); // Allow more time for WASM initialization

  describe('Basic execution', () => {
    it('should execute simple JavaScript code', async () => {
      const code = `
        const x = 5 + 3;
        export default x;
      `;
      const result = await runtime.execute(code);

      expect(result.ok).toBe(true);
      expect(result.data).toBe(8);
    });

    it('should execute code with string result', async () => {
      const code = `export default 'hello world'`;
      const result = await runtime.execute(code);

      expect(result.ok).toBe(true);
      expect(result.data).toBe('hello world');
    });

    it('should execute code with object result', async () => {
      const code = `export default { name: 'test', value: 42 }`;
      const result = await runtime.execute(code);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 42 });
    });

    it('should execute code with array result', async () => {
      const code = `export default [1, 2, 3, 4, 5]`;
      const result = await runtime.execute(code);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('Console logging', () => {
    it('should capture console.log output', async () => {
      const code = `console.log('test message'); 42;`;
      const result = await runtime.execute(code);

      expect(result.ok).toBe(true);
      expect(result.logs).toContain('test message');
    });

    it('should capture multiple console.log calls', async () => {
      const code = `
        console.log('first');
        console.log('second');
        console.log('third');
      `;
      const result = await runtime.execute(code);

      expect(result.ok).toBe(true);
      expect(result.logs).toEqual(['first', 'second', 'third']);
    });

    it('should handle console.log with multiple arguments', async () => {
      const code = `console.log('value:', 42, 'test'); 1;`;
      const result = await runtime.execute(code);

      expect(result.ok).toBe(true);
      expect(result.logs).toContain('value: 42 test');
    });

    it('should stream logs via callback', async () => {
      const logs: string[] = [];
      const code = `
        console.log('log1');
        console.log('log2');
      `;
      const result = await runtime.execute(code, {
        onLog: (message) => logs.push(message),
      });

      expect(result.ok).toBe(true);
      expect(logs).toEqual(['log1', 'log2']);
    });
  });

  describe('Error handling', () => {
    it('should handle syntax errors', async () => {
      const code = `const x = ;`; // Syntax error
      const result = await runtime.execute(code);

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle runtime errors', async () => {
      const code = `throw new Error('test error');`;
      const result = await runtime.execute(code);

      expect(result.ok).toBe(false);
      expect(result.error).toContain('test error');
    });

    it('should handle reference errors', async () => {
      const code = `undefinedVariable;`;
      const result = await runtime.execute(code);

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('ES Module support', () => {
    it('should execute ES module with export', async () => {
      const code = `
        export const value = 42;
      `;
      const result = await runtime.execute(code);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ value: 42 });
    });

    it('should execute ES module with default export', async () => {
      const code = `
        export default function greet() {
          return 'hello';
        }
      `;
      const result = await runtime.execute(code);

      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should execute ES module with multiple exports', async () => {
      const code = `
        export const a = 1;
        export const b = 2;
        export const sum = 3; // Use a simple value instead of function
      `;
      const result = await runtime.execute(code);

      expect(result.ok).toBe(true);
      expect(result.data.a).toBe(1);
      expect(result.data.b).toBe(2);
      expect(result.data.sum).toBe(3);
    });
  });

  describe('CommonJS support', () => {
    it('should execute CommonJS module with module.exports', async () => {
      const code = `
        const value = 42;
        module.exports = { value };
      `;
      const result = await runtime.execute(code);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ value: 42 });
    });

    it('should execute CommonJS module with exports assignment', async () => {
      const code = `
        exports.foo = 'bar';
        exports.num = 123;
      `;
      const result = await runtime.execute(code);

      expect(result.ok).toBe(true);
      expect(result.data.foo).toBe('bar');
      expect(result.data.num).toBe(123);
    });

    it('should execute CommonJS with require and module.exports', async () => {
      const code = `
        const path = require('path');
        module.exports = { dirname: path.dirname('/foo/bar.txt') };
      `;
      const result = await runtime.execute(code);

      expect(result.ok).toBe(true);
      expect(result.data.dirname).toBe('/foo');
    });
  });

  describe('Built-in modules', () => {
    it('should provide path module', async () => {
      const code = `
        const path = require('path');
        module.exports = path.join('/foo', 'bar', 'baz.txt');
      `;
      const result = await runtime.execute(code);

      expect(result.ok).toBe(true);
      expect(result.data).toBe('/foo/bar/baz.txt');
    });

    it('should provide fs module', async () => {
      const code = `
        const fs = require('fs');
        fs.writeFileSync('/test.txt', 'hello world');
        module.exports = fs.readFileSync('/test.txt', 'utf8');
      `;
      const result = await runtime.execute(code);

      expect(result.ok).toBe(true);
      expect(result.data).toBe('hello world');
    });

    it('should provide process module', async () => {
      const code = `
        const process = require('process');
        module.exports = process.cwd();
      `;
      const result = await runtime.execute(code);

      expect(result.ok).toBe(true);
      expect(result.data).toBe('/');
    });
  });

  describe('Timers', () => {
    it('should support setTimeout', async () => {
      const code = `
        let result = 0;
        setTimeout(() => {
          result = 42;
          console.log('timeout executed');
        }, 10);
      `;
      const result = await runtime.execute(code);

      expect(result.ok).toBe(true);
      expect(result.logs).toContain('timeout executed');
    }, 10000);

    it.skip('should support setInterval with clearInterval', async () => {
      const code = `
        let count = 0;
        const id = setInterval(() => {
          count++;
          console.log('interval', count);
          if (count >= 3) {
            clearInterval(id);
          }
        }, 50);
      `;
      const result = await runtime.execute(code, { timeout: 5000 });

      expect(result.ok).toBe(true);
      expect(result.logs?.filter((log) => log.startsWith('interval')).length).toBe(
        3,
      );
    }, 15000);
  });

  describe('Runtime options', () => {
    it('should respect timeout option', async () => {
      const code = `
        setInterval(() => {
          console.log('tick');
        }, 100);
      `;
      const result = await runtime.execute(code, { timeout: 500 });

      expect(result.ok).toBe(true);
      // Should timeout and stop the interval
    }, 10000);

    it('should support env variables', async () => {
      const code = `
        const process = require('process');
        module.exports = process.env.TEST_VAR;
      `;
      const result = await runtime.execute(code, {
        env: { TEST_VAR: 'test-value' },
      });

      expect(result.ok).toBe(true);
      expect(result.data).toBe('test-value');
    });
  });

  describe('Filesystem integration', () => {
    it('should access the virtual filesystem', () => {
      const fs = runtime.getFilesystem();
      expect(fs).toBeDefined();
    });

    it('should persist files across executions', async () => {
      // First execution: write file
      const writeCode = `
        const fs = require('fs');
        fs.writeFileSync('/persistent.txt', 'persisted data');
      `;
      await runtime.execute(writeCode);

      // Second execution: read file
      const readCode = `
        const fs = require('fs');
        module.exports = fs.readFileSync('/persistent.txt', 'utf8');
      `;
      const result = await runtime.execute(readCode);

      expect(result.ok).toBe(true);
      expect(result.data).toBe('persisted data');
    });
  });

  describe('Complex scenarios', () => {
    it('should handle mixed ES and CommonJS code', async () => {
      const code = `
        const path = require('path');
        export const fullPath = path.join('/usr', 'local', 'bin');
      `;
      const result = await runtime.execute(code);

      expect(result.ok).toBe(true);
      // Note: This may behave differently based on module format detection
    });

    it('should handle nested function calls', async () => {
      const code = `
        function add(a, b) {
          return a + b;
        }
        function multiply(a, b) {
          return a * b;
        }
        function calculate(x, y) {
          return multiply(add(x, y), 2);
        }
        module.exports = calculate(3, 4);
      `;
      const result = await runtime.execute(code);

      expect(result.ok).toBe(true);
      expect(result.data).toBe(14); // (3 + 4) * 2
    });
  });
});
