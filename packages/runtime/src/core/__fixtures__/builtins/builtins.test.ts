import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { NodepackRuntime } from '../../runtime.js';
import { loadFixture } from '../fixture-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('NodepackRuntime - Built-in modules', () => {
  let runtime: NodepackRuntime;

  beforeAll(async () => {
    runtime = new NodepackRuntime();
    await runtime.initialize();
  }, 30000);

  it('should support path module (ESM)', async () => {
    const fixture = loadFixture('builtins/path');
    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data.joined).toBe('/foo/bar/baz');
    expect(result.data.basename).toBe('file.txt');
    expect(result.data.dirname).toBe('/foo/bar');
    expect(result.data.extname).toBe('.txt');
    expect(result.data.hasResolve).toBe(true);
  });

  it('should support path module (CJS)', async () => {
    const cjsCode = readFileSync(join(__dirname, 'path/main-cjs.js'), 'utf8');
    const result = await runtime.execute(cjsCode);

    expect(result.ok).toBe(true);
    expect(result.data.joined).toBe('/foo/bar/baz');
    expect(result.data.basename).toBe('file.txt');
    expect(result.data.dirname).toBe('/foo/bar');
    expect(result.data.extname).toBe('.txt');
    expect(result.data.hasResolve).toBe(true);
  });

  it('should support events module (ESM)', async () => {
    const fixture = loadFixture('builtins/events');
    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data.hasEventEmitter).toBe(true);
    expect(result.data.results).toEqual(['first', 'second']);
    expect(result.data.listenerCount).toBe(1);
  });

  it('should support events module (CJS)', async () => {
    const cjsCode = readFileSync(join(__dirname, 'events/main-cjs.js'), 'utf8');
    const result = await runtime.execute(cjsCode);

    expect(result.ok).toBe(true);
    expect(result.data.hasEventEmitter).toBe(true);
    expect(result.data.results).toEqual(['first', 'second']);
    expect(result.data.listenerCount).toBe(1);
  });

  it('should support util module (ESM)', async () => {
    const fixture = loadFixture('builtins/util');
    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data.hasInspect).toBe(true);
    expect(result.data.hasFormat).toBe(true);
    expect(result.data.formatted).toBe('Hello world, you have 5 items');
    expect(result.data.inspected).toContain('name');
    expect(result.data.inspected).toContain('test');
  });

  it('should support util module (CJS)', async () => {
    const cjsCode = readFileSync(join(__dirname, 'util/main-cjs.js'), 'utf8');
    const result = await runtime.execute(cjsCode);

    if (!result.ok) {
      console.log('Util CJS error:', result.error);
    }
    expect(result.ok).toBe(true);
    expect(result.data.hasInspect).toBe(true);
    expect(result.data.hasFormat).toBe(true);
    expect(result.data.formatted).toBe('Hello world, you have 5 items');
    expect(result.data.inspected).toContain('name');
    expect(result.data.inspected).toContain('test');
  });

  it('should support buffer module (ESM)', async () => {
    const fixture = loadFixture('builtins/buffer');
    const result = await runtime.execute(fixture.mainFile);

    if (!result.ok) {
      console.log('Buffer ESM error:', result.error);
    }
    expect(result.ok).toBe(true);
    expect(result.data.hasBuffer).toBe(true);
    expect(result.data.str).toBe('hello');
    expect(result.data.length).toBe(10);
    expect(result.data.firstByte).toBe(1);
    expect(result.data.isBuffer).toBe(true);
  });

  it('should support buffer module (CJS)', async () => {
    const cjsCode = readFileSync(join(__dirname, 'buffer/main-cjs.js'), 'utf8');
    const result = await runtime.execute(cjsCode);

    expect(result.ok).toBe(true);
    expect(result.data.hasBuffer).toBe(true);
    expect(result.data.str).toBe('hello');
    expect(result.data.length).toBe(10);
    expect(result.data.firstByte).toBe(1);
    expect(result.data.isBuffer).toBe(true);
  });

  it('should support url module (ESM)', async () => {
    const fixture = loadFixture('builtins/url');
    const result = await runtime.execute(fixture.mainFile);

    if (!result.ok) {
      console.log('URL ESM error:', result.error);
    }
    expect(result.ok).toBe(true);
    expect(result.data.hasURL).toBe(true);
    expect(result.data.hasURLSearchParams).toBe(true);
    expect(result.data.protocol).toBe('https:');
    expect(result.data.hostname).toBe('example.com');
    expect(result.data.port).toBe('8080');
    expect(result.data.pathname).toBe('/path');
    expect(result.data.hash).toBe('#hash');
    expect(result.data.fooValue).toBe('bar');
  });

  it('should support url module (CJS)', async () => {
    const cjsCode = readFileSync(join(__dirname, 'url/main-cjs.js'), 'utf8');
    const result = await runtime.execute(cjsCode);

    expect(result.ok).toBe(true);
    expect(result.data.hasURL).toBe(true);
    expect(result.data.hasURLSearchParams).toBe(true);
    expect(result.data.protocol).toBe('https:');
    expect(result.data.hostname).toBe('example.com');
    expect(result.data.port).toBe('8080');
    expect(result.data.pathname).toBe('/path');
    expect(result.data.hash).toBe('#hash');
    expect(result.data.fooValue).toBe('bar');
  });

  it('should support process event handlers', async () => {
    const fixture = loadFixture('builtins/process-events');
    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data.hasUncaughtListener).toBe(true);
    expect(result.data.hasUnhandledListener).toBe(true);
  });

  it('should support process event handlers with full EventEmitter API', async () => {
    const fixture = loadFixture('builtins/process-events-full');
    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data.hasOnMethod).toBe(true);
    expect(result.data.hasEmitMethod).toBe(true);
    expect(result.data.listenerCount).toBe(1);
  });

  it('should support process.cwd() and process.chdir()', async () => {
    const fixture = loadFixture('builtins/process-cwd');
    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data.hasCwd).toBe(true);
    expect(result.data.hasChdir).toBe(true);
    expect(result.data.initialCwd).toBe('/');
    expect(result.data.afterChdir).toBe('/home/user');
    expect(result.data.backToRoot).toBe('/');
  });

  it('should support fs.lstatSync()', async () => {
    const fixture = loadFixture('builtins/fs-lstat');
    const result = await runtime.execute(fixture.mainFile);

    if (!result.ok) {
      console.log('fs.lstatSync error:', result.error);
    }

    expect(result.ok).toBe(true);
    expect(result.data.hasLstatSync).toBe(true);
    expect(result.data.isFile).toBe(true);
    expect(result.data.isDirectory).toBe(false);
    expect(result.data.size).toBe(11); // 'Hello World' is 11 bytes
    expect(result.data.hasMode).toBe(true);
    expect(result.data.hasMtime).toBe(true);
  });

  it('should support fs.statSync() and fs.readdirSync()', async () => {
    const fixture = loadFixture('builtins/fs-stat');
    const result = await runtime.execute(fixture.mainFile);

    if (!result.ok) {
      console.log('fs.statSync error:', result.error);
    }

    expect(result.ok).toBe(true);
    expect(result.data.hasStatSync).toBe(true);
    expect(result.data.hasReaddirSync).toBe(true);
    expect(result.data.fileIsFile).toBe(true);
    expect(result.data.fileIsDirectory).toBe(false);
    expect(result.data.fileSize).toBe(12); // 'Test content' is 12 bytes
    expect(result.data.dirIsFile).toBe(false);
    expect(result.data.dirIsDirectory).toBe(true);
    expect(result.data.filesInDir).toEqual(['file.txt']);
  });

  it('should support comprehensive fs methods', async () => {
    const fixture = loadFixture('builtins/fs-comprehensive');
    const result = await runtime.execute(fixture.mainFile);

    if (!result.ok) {
      console.log('fs comprehensive error:', result.error);
    }

    expect(result.ok).toBe(true);
    expect(result.data.appendResult).toBe('Hello World');
    expect(result.data.copyResult).toBe('Source content');
    expect(result.data.renameExists).toBe(true);
    expect(result.data.oldExists).toBe(false);
    expect(result.data.rmdirExists).toBe(false);
    expect(result.data.rmFileExists).toBe(false);
    expect(result.data.rmDirExists).toBe(false);
    expect(result.data.accessPassed).toBe(true);
    expect(result.data.realpath).toBe('/real/path/file.txt');
    expect(result.data.hasConstants).toBe(true);
    expect(result.data.hasFOK).toBe(true);
  });
});
