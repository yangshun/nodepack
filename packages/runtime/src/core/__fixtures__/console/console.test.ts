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

  test('support console.error', async () => {
    const code = `console.error('This is an error');`;
    const result = await runtime.execute(code);

    expect(result.ok).toBe(true);
    expect(result.logs).toHaveLength(1);
    expect(result.logs![0]).toBe('ERROR: This is an error');
  });

  test('support console.warn', async () => {
    const code = `console.warn('This is a warning');`;
    const result = await runtime.execute(code);

    expect(result.ok).toBe(true);
    expect(result.logs).toHaveLength(1);
    expect(result.logs![0]).toBe('WARN: This is a warning');
  });

  test('support console.info', async () => {
    const code = `console.info('This is info');`;
    const result = await runtime.execute(code);

    expect(result.ok).toBe(true);
    expect(result.logs).toHaveLength(1);
    expect(result.logs![0]).toBe('INFO: This is info');
  });

  test('support console.debug', async () => {
    const code = `console.debug('Debug message');`;
    const result = await runtime.execute(code);

    expect(result.ok).toBe(true);
    expect(result.logs).toHaveLength(1);
    expect(result.logs![0]).toBe('DEBUG: Debug message');
  });

  test('support console.time and console.timeEnd', async () => {
    const code = `
      console.time('test');
      for (let i = 0; i < 1000; i++) {}
      console.timeEnd('test');
    `;
    const result = await runtime.execute(code);

    expect(result.ok).toBe(true);
    expect(result.logs).toHaveLength(1);
    expect(result.logs![0]).toMatch(/^test: \d+ms$/);
  });

  test('support console.timeLog', async () => {
    const code = `
      console.time('test');
      console.timeLog('test', 'checkpoint');
      console.timeEnd('test');
    `;
    const result = await runtime.execute(code);

    expect(result.ok).toBe(true);
    expect(result.logs).toHaveLength(2);
    expect(result.logs![0]).toMatch(/^test: \d+ms checkpoint$/);
    expect(result.logs![1]).toMatch(/^test: \d+ms$/);
  });

  test('support console.count and console.countReset', async () => {
    const code = `
      console.count('clicks');
      console.count('clicks');
      console.count('clicks');
      console.countReset('clicks');
      console.count('clicks');
    `;
    const result = await runtime.execute(code);

    expect(result.ok).toBe(true);
    expect(result.logs).toHaveLength(4);
    expect(result.logs![0]).toBe('clicks: 1');
    expect(result.logs![1]).toBe('clicks: 2');
    expect(result.logs![2]).toBe('clicks: 3');
    expect(result.logs![3]).toBe('clicks: 1');
  });

  test('support console.group and console.groupEnd', async () => {
    const code = `
      console.group('Group 1');
      console.log('Inside group');
      console.groupEnd();
    `;
    const result = await runtime.execute(code);

    expect(result.ok).toBe(true);
    expect(result.logs).toHaveLength(2);
    expect(result.logs![0]).toBe('GROUP: Group 1');
    expect(result.logs![1]).toBe('Inside group');
  });

  test('support console.assert', async () => {
    const code = `
      console.assert(true, 'Should not log');
      console.assert(false, 'Should log this');
      console.assert(1 === 2, 'Math is broken');
    `;
    const result = await runtime.execute(code);

    expect(result.ok).toBe(true);
    expect(result.logs).toHaveLength(2);
    expect(result.logs![0]).toBe('ASSERTION FAILED: Should log this');
    expect(result.logs![1]).toBe('ASSERTION FAILED: Math is broken');
  });

  test('support console.trace', async () => {
    const code = `console.trace('Stack trace');`;
    const result = await runtime.execute(code);

    expect(result.ok).toBe(true);
    expect(result.logs).toHaveLength(1);
    expect(result.logs![0]).toBe('TRACE: Stack trace');
  });

  test('support console.dir', async () => {
    const code = `console.dir({ foo: 'bar' });`;
    const result = await runtime.execute(code);

    expect(result.ok).toBe(true);
    expect(result.logs).toHaveLength(1);
    expect(result.logs![0]).toContain('DIR:');
  });

  test('support console.table', async () => {
    const code = `console.table([1, 2, 3]);`;
    const result = await runtime.execute(code);

    expect(result.ok).toBe(true);
    expect(result.logs).toHaveLength(1);
    expect(result.logs![0]).toContain('TABLE:');
  });

  test('support console.clear', async () => {
    const code = `
      console.log('Before clear');
      console.clear();
      console.log('After clear');
    `;
    const result = await runtime.execute(code);

    expect(result.ok).toBe(true);
    // After clear, only the last log should remain
    expect(result.logs).toHaveLength(1);
    expect(result.logs![0]).toBe('After clear');
  });

  test('support multiple arguments in console methods', async () => {
    const code = `console.log('Hello', 'World', 123, true);`;
    const result = await runtime.execute(code);

    expect(result.ok).toBe(true);
    expect(result.logs).toHaveLength(1);
    expect(result.logs![0]).toBe('Hello World 123 true');
  });
});
