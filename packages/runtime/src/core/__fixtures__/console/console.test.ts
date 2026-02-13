import { describe, test, expect, beforeAll } from 'vitest';
import { NodepackRuntime } from '../../runtime.js';
import { loadFixture, loadFixtureIntoFilesystem } from '../fixture-loader.js';

describe('NodepackRuntime - Console logs', () => {
  let runtime: NodepackRuntime;

  beforeAll(async () => {
    runtime = new NodepackRuntime();
    await runtime.initialize();
  }, 30000);

  test('clear logs after execution', async () => {
    const fixture1 = loadFixture('console/clear-first');
    await runtime.execute(fixture1.mainFile);

    const fixture2 = loadFixture('console/clear-second');
    const result = await runtime.execute(fixture2.mainFile);

    // Should only have logs from second execution
    expect(result.logs).toBeDefined();
    expect(result.logs).toHaveLength(1);
    expect(result.logs![0]).toBe('Second execution');
  });

  test('stream logs via callback', async () => {
    const streamedLogs: string[] = [];
    const fixture = loadFixture('console/stream');

    await runtime.execute(fixture.mainFile, {
      onLog: (msg) => streamedLogs.push(msg),
    });

    expect(streamedLogs).toHaveLength(2);
    expect(streamedLogs[0]).toBe('Message 1');
    expect(streamedLogs[1]).toBe('Message 2');
  });

  test('capture logs from imported modules', async () => {
    const fixture = loadFixture('console/from-module');
    loadFixtureIntoFilesystem(runtime, fixture);

    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.logs).toHaveLength(2);
    expect(result.logs![0]).toBe('From main');
    expect(result.logs![1]).toBe('From module: Test');
  });
});
