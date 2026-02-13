import { describe, test, expect, beforeAll } from 'vitest';
import { NodepackRuntime } from '../../runtime.js';
import { loadFixture, loadFixtureIntoFilesystem } from '../fixture-loader.js';

describe('NodepackRuntime - Multi-file ESM modules', () => {
  let runtime: NodepackRuntime;

  beforeAll(async () => {
    runtime = new NodepackRuntime();
    await runtime.initialize();
  }, 30000);

  test('handle ESM importing another ESM module', async () => {
    const fixture = loadFixture('esm/import-esm');
    loadFixtureIntoFilesystem(runtime, fixture);

    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ sum: 8, product: 28 });
  });

  test('handle import.meta', async () => {
    const fixture = loadFixture('esm/import-meta');
    loadFixtureIntoFilesystem(runtime, fixture);

    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      filename: '/bin/index.js',
      dirname: '/bin',
      version: '9.8.7',
    });
  });

  test('handle ESM with default and named exports', async () => {
    const fixture = loadFixture('esm/default-named');
    loadFixtureIntoFilesystem(runtime, fixture);

    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data.result).toBeCloseTo(5.85987, 5);
    expect(result.data.PI).toBe(3.14159);
    expect(result.data.E).toBe(2.71828);
  });

  test('handle chain of ESM imports', async () => {
    const fixture = loadFixture('esm/chain');
    loadFixtureIntoFilesystem(runtime, fixture);

    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data).toBe(84);
  });

  test('handle ESM with re-exports', async () => {
    const fixture = loadFixture('esm/reexports');
    loadFixtureIntoFilesystem(runtime, fixture);

    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ sum: 15, diff: 5, product: 50 });
  });

  test('handle ESM exports destructure', async () => {
    const fixture = loadFixture('esm/exports-destructure');
    loadFixtureIntoFilesystem(runtime, fixture);

    const result = await runtime.execute(fixture.mainFile);

    if (!result.ok) {
      console.log('ESM wrapper error:', result.error);
    }
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ hello: 'world' });
  });
});
