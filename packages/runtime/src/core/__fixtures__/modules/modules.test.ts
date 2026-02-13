import { describe, it, expect, beforeAll } from 'vitest';
import { NodepackRuntime } from '../../runtime.js';
import { loadFixture, loadFixtureIntoFilesystem } from '../fixture-loader.js';

describe('NodepackRuntime - Module execution', () => {
  let runtime: NodepackRuntime;

  beforeAll(async () => {
    runtime = new NodepackRuntime();
    await runtime.initialize();
  }, 30000);

  it('should execute ES modules', async () => {
    const fixture = loadFixture('modules/esm');
    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data).toBe('a/b');
  });

  it('should execute CommonJS modules', async () => {
    const fixture = loadFixture('modules/cjs');
    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data).toBe('x/y');
  });

  it('should resolve require() with package subpaths', async () => {
    const fixture = loadFixture('modules/require-subpath');
    loadFixtureIntoFilesystem(runtime, fixture);

    const result = await runtime.execute(fixture.mainFile);

    if (!result.ok) {
      console.log('Error:', result.error);
    }

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      syncValue: 'sync-module',
      asyncValue: 'async-module',
    });
  });
});
