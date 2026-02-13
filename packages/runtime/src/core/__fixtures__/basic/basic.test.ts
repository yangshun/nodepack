import { describe, test, expect, beforeAll } from 'vitest';
import { NodepackRuntime } from '../../runtime.js';
import { loadFixture } from '../fixture-loader.js';

describe('NodepackRuntime - Basic execution', () => {
  let runtime: NodepackRuntime;

  beforeAll(async () => {
    runtime = new NodepackRuntime();
    await runtime.initialize();
  }, 30000);

  test('execute simple JavaScript code', async () => {
    const fixture = loadFixture('basic/simple');
    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data).toBe(8);
  });

  test('capture console.log output', async () => {
    const fixture = loadFixture('basic/console');
    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.logs).toContain('Hello from test');
  });

  test('handle errors gracefully', async () => {
    const fixture = loadFixture('basic/error');
    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Test error');
  });
});
