import { describe, it, expect, beforeAll } from 'vitest';
import { NodepackRuntime } from '../../runtime.js';
import { loadFixture, loadFixtureIntoFilesystem } from '../fixture-loader.js';

describe('NodepackRuntime - Multi-file CommonJS modules', () => {
  let runtime: NodepackRuntime;

  beforeAll(async () => {
    runtime = new NodepackRuntime();
    await runtime.initialize();
  }, 30000);

  it('should handle CJS requiring another CJS module', async () => {
    const fixture = loadFixture('cjs/require-cjs');
    loadFixtureIntoFilesystem(runtime, fixture);

    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      greeting: 'Hello, World',
      goodbye: 'Goodbye, World',
    });
  });

  it('should handle CJS with exports shorthand', async () => {
    const fixture = loadFixture('cjs/exports-shorthand');
    loadFixtureIntoFilesystem(runtime, fixture);

    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data).toBe('NodePack v1.0.0');
  });

  it('should handle nested CJS requires', async () => {
    const fixture = loadFixture('cjs/nested');
    loadFixtureIntoFilesystem(runtime, fixture);

    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      url: 'https://api.example.com/users',
      timeout: 5000,
    });
  });
});
