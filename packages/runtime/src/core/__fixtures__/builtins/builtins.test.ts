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
});
