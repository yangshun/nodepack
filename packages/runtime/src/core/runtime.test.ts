import { describe, it, expect, beforeAll } from 'vitest';
import { NodepackRuntime } from './runtime.js';

describe('NodepackRuntime - API', () => {
  let runtime: NodepackRuntime;

  beforeAll(async () => {
    runtime = new NodepackRuntime();
    await runtime.initialize();
  }, 30000); // Allow more time for WASM initialization

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
});
