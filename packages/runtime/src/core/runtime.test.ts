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

    it('should capture console.log output', async () => {
      const code = `
        console.log('Hello from test');
        export default 'done';
      `;

      const result = await runtime.execute(code);

      expect(result.ok).toBe(true);
      expect(result.logs).toContain('Hello from test');
    });

    it('should handle errors gracefully', async () => {
      const code = `
        throw new Error('Test error');
      `;

      const result = await runtime.execute(code);

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Test error');
    });
  });

  describe('Module execution', () => {
    it('should execute ES modules', async () => {
      const code = `
        import { join } from 'path';
        const result = join('a', 'b');
        export default result;
      `;

      const result = await runtime.execute(code);

      expect(result.ok).toBe(true);
      expect(result.data).toBe('a/b');
    });

    it('should execute CommonJS modules', async () => {
      const code = `
        const path = require('path');
        module.exports = path.join('x', 'y');
      `;

      const result = await runtime.execute(code);

      expect(result.ok).toBe(true);
      expect(result.data).toBe('x/y');
    });
  });

  describe('Built-in modules', () => {
    it('should provide fs module', async () => {
      const code = `
        const fs = require('fs');
        fs.writeFileSync('/test.txt', 'hello');
        const content = fs.readFileSync('/test.txt', 'utf8');
        export default content;
      `;

      const result = await runtime.execute(code);

      expect(result.ok).toBe(true);
      expect(result.data).toBe('hello');
    });

    it('should provide process module', async () => {
      const code = `
        const process = require('process');
        export default process.cwd();
      `;

      const result = await runtime.execute(code);

      expect(result.ok).toBe(true);
      expect(typeof result.data).toBe('string');
    });
  });

  describe('Filesystem access', () => {
    it('should provide filesystem instance', () => {
      const fs = runtime.getFilesystem();
      expect(fs).toBeDefined();
      expect(typeof fs.writeFileSync).toBe('function');
      expect(typeof fs.readFileSync).toBe('function');
    });

    it('should persist files across executions', async () => {
      // First execution: write file
      const writeCode = `
        const fs = require('fs');
        fs.writeFileSync('/data.txt', 'persistent data');
        export default 'written';
      `;
      await runtime.execute(writeCode);

      // Second execution: read file
      const readCode = `
        const fs = require('fs');
        const content = fs.readFileSync('/data.txt', 'utf8');
        export default content;
      `;
      const result = await runtime.execute(readCode);

      expect(result.ok).toBe(true);
      expect(result.data).toBe('persistent data');
    });
  });

  describe('NPM package management', () => {
    it('should expose npm API', () => {
      const npm = runtime.npm;
      expect(npm).toBeDefined();
      expect(typeof npm.install).toBe('function');
      expect(typeof npm.isInstalled).toBe('function');
      expect(typeof npm.clearCache).toBe('function');
    });
  });

  describe('Error handling', () => {
    it('should require initialization', async () => {
      const uninitializedRuntime = new NodepackRuntime();

      await expect(uninitializedRuntime.execute('export default 42;')).rejects.toThrow(
        'Runtime not initialized',
      );
    });

    it('should handle syntax errors', async () => {
      const code = `
        const x = ;
      `;

      const result = await runtime.execute(code);

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle runtime errors', async () => {
      const code = `
        const obj = null;
        obj.property; // Will throw
      `;

      const result = await runtime.execute(code);

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Console logs', () => {
    it('should clear logs after execution', async () => {
      const code1 = `
        console.log('First execution');
        export default 1;
      `;
      await runtime.execute(code1);

      const code2 = `
        console.log('Second execution');
        export default 2;
      `;
      const result = await runtime.execute(code2);

      // Should only have logs from second execution
      expect(result.logs).toBeDefined();
      expect(result.logs).toHaveLength(1);
      expect(result.logs![0]).toBe('Second execution');
    });

    it('should stream logs via callback', async () => {
      const streamedLogs: string[] = [];

      const code = `
        console.log('Message 1');
        console.log('Message 2');
        export default 'done';
      `;

      await runtime.execute(code, {
        onLog: (msg) => streamedLogs.push(msg),
      });

      expect(streamedLogs).toHaveLength(2);
      expect(streamedLogs[0]).toBe('Message 1');
      expect(streamedLogs[1]).toBe('Message 2');
    });
  });
});
