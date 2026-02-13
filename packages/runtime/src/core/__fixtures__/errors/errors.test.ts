import { describe, test, expect, beforeAll } from 'vitest';
import { NodepackRuntime } from '../../runtime.js';
import { loadFixture, loadFixtureIntoFilesystem } from '../fixture-loader.js';

describe('NodepackRuntime - Error handling', () => {
  let runtime: NodepackRuntime;

  beforeAll(async () => {
    runtime = new NodepackRuntime();
    await runtime.initialize();
  }, 30000);

  test('require initialization', async () => {
    const uninitializedRuntime = new NodepackRuntime();

    await expect(uninitializedRuntime.execute('export default 42;')).rejects.toThrow(
      'Runtime not initialized',
    );
  });

  test('handle syntax errors', async () => {
    const result = await runtime.execute(`const x = ;`);

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('handle runtime errors', async () => {
    const fixture = loadFixture('errors/runtime');
    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('handle errors in imported modules', async () => {
    const fixture = loadFixture('errors/imported');
    loadFixtureIntoFilesystem(runtime, fixture);

    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Error from imported module');
  });

  test('handle missing module imports', async () => {
    const fixture = loadFixture('errors/missing-import');
    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });
});
