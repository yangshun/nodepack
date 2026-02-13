import { describe, it, expect, beforeAll } from 'vitest';
import { NodepackRuntime } from '../../runtime.js';
import { loadFixture, loadFixtureIntoFilesystem } from '../fixture-loader.js';

describe('NodepackRuntime - CJS and ESM interoperability', () => {
  let runtime: NodepackRuntime;

  beforeAll(async () => {
    runtime = new NodepackRuntime();
    await runtime.initialize();
  }, 30000);

  it('should allow ESM to import CJS module', async () => {
    const fixture = loadFixture('interop/esm-import-cjs');
    loadFixtureIntoFilesystem(runtime, fixture);

    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data).toBe(42);
  });

  it('should allow ESM to import CJS module with named exports', async () => {
    const fixture = loadFixture('interop/esm-import-cjs-named');
    loadFixtureIntoFilesystem(runtime, fixture);

    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ sum: 30, diff: 25, value: 100 });
  });

  it('should allow CJS to require ESM module', async () => {
    const fixture = loadFixture('interop/cjs-require-esm');
    loadFixtureIntoFilesystem(runtime, fixture);

    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ formatted: '[test]', prefix: 'PREFIX' });
  });

  it('should allow CJS to require ESM default export', async () => {
    const fixture = loadFixture('interop/cjs-require-esm-default');
    loadFixtureIntoFilesystem(runtime, fixture);

    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data).toBe('Hello, Alice');
  });

  it('should handle mixed CJS and ESM in module chain', async () => {
    const fixture = loadFixture('interop/mixed-chain');
    loadFixtureIntoFilesystem(runtime, fixture);

    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ count: 3, first: 'Alice' });
  });

  it('should handle complex interoperability with multiple modules', async () => {
    const fixture = loadFixture('interop/complex-interop');
    loadFixtureIntoFilesystem(runtime, fixture);

    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      formatted: 'NUMBER: 10',
      processed: { text: 'hello', number: 21 },
    });
  });

  it('should handle circular dependencies between CJS and ESM', async () => {
    const fixture = loadFixture('interop/circular-deps');
    loadFixtureIntoFilesystem(runtime, fixture);

    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      cjsName: 'CJS Module',
      esmName: 'ESM Module',
    });
  });
});
