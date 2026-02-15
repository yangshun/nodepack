import { describe, test, expect, beforeEach } from 'vitest';
import { newQuickJSWASMModule } from 'quickjs-emscripten';
import { vol } from 'memfs';
import { createFsModule } from './fs.js';

describe('fs module', () => {
  beforeEach(() => {
    vol.reset();
  });

  test('provide readFileSync', async () => {
    const QuickJS = await newQuickJSWASMModule();
    const runtime = QuickJS.newRuntime();
    const vm = runtime.newContext();

    vol.writeFileSync('/test.txt', 'Hello, World!');

    const fsHandle = createFsModule(vm, vol as any);
    vm.setProp(vm.global, 'fs', fsHandle);
    fsHandle.dispose();

    const result = vm.evalCode(`
      fs.readFileSync('/test.txt', 'utf8')
    `);

    if (result.error) {
      const error = vm.dump(result.error);
      result.error.dispose();
      throw new Error(`Evaluation failed: ${error}`);
    }

    const content = vm.dump(result.value);
    expect(content).toBe('Hello, World!');

    result.value.dispose();
    vm.dispose();
    runtime.dispose();
  });

  test('provide writeFileSync', async () => {
    const QuickJS = await newQuickJSWASMModule();
    const runtime = QuickJS.newRuntime();
    const vm = runtime.newContext();

    const fsHandle = createFsModule(vm, vol as any);
    vm.setProp(vm.global, 'fs', fsHandle);
    fsHandle.dispose();

    const result = vm.evalCode(`
      fs.writeFileSync('/output.txt', 'Test content');
    `);

    if (result.error) {
      const error = vm.dump(result.error);
      result.error.dispose();
      throw new Error(`Evaluation failed: ${error}`);
    }
    result.value.dispose();

    const content = vol.readFileSync('/output.txt', 'utf8');
    expect(content).toBe('Test content');

    vm.dispose();
    runtime.dispose();
  });

  test('provide existsSync', async () => {
    const QuickJS = await newQuickJSWASMModule();
    const runtime = QuickJS.newRuntime();
    const vm = runtime.newContext();

    vol.writeFileSync('/exists.txt', 'content');

    const fsHandle = createFsModule(vm, vol as any);
    vm.setProp(vm.global, 'fs', fsHandle);
    fsHandle.dispose();

    const existsResult = vm.evalCode(`fs.existsSync('/exists.txt')`);
    if (existsResult.error) {
      const error = vm.dump(existsResult.error);
      existsResult.error.dispose();
      throw new Error(`Evaluation failed: ${error}`);
    }
    expect(vm.dump(existsResult.value)).toBe(true);
    existsResult.value.dispose();

    const notExistsResult = vm.evalCode(`fs.existsSync('/not-exists.txt')`);
    if (notExistsResult.error) {
      const error = vm.dump(notExistsResult.error);
      notExistsResult.error.dispose();
      throw new Error(`Evaluation failed: ${error}`);
    }
    expect(vm.dump(notExistsResult.value)).toBe(false);
    notExistsResult.value.dispose();

    vm.dispose();
    runtime.dispose();
  });

  test('provide unlinkSync', async () => {
    const QuickJS = await newQuickJSWASMModule();
    const runtime = QuickJS.newRuntime();
    const vm = runtime.newContext();

    vol.writeFileSync('/delete-me.txt', 'content');

    const fsHandle = createFsModule(vm, vol as any);
    vm.setProp(vm.global, 'fs', fsHandle);
    fsHandle.dispose();

    const result = vm.evalCode(`fs.unlinkSync('/delete-me.txt')`);

    if (result.error) {
      const error = vm.dump(result.error);
      result.error.dispose();
      throw new Error(`Evaluation failed: ${error}`);
    }
    result.value.dispose();

    expect(vol.existsSync('/delete-me.txt')).toBe(false);

    vm.dispose();
    runtime.dispose();
  });

  test('provide readdirSync', async () => {
    const QuickJS = await newQuickJSWASMModule();
    const runtime = QuickJS.newRuntime();
    const vm = runtime.newContext();

    vol.mkdirSync('/testdir', { recursive: true });
    vol.writeFileSync('/testdir/file1.txt', 'content1');
    vol.writeFileSync('/testdir/file2.txt', 'content2');

    const fsHandle = createFsModule(vm, vol as any);
    vm.setProp(vm.global, 'fs', fsHandle);
    fsHandle.dispose();

    const result = vm.evalCode(`
      fs.readdirSync('/testdir')
    `);

    if (result.error) {
      const error = vm.dump(result.error);
      result.error.dispose();
      throw new Error(`Evaluation failed: ${error}`);
    }

    const files = vm.dump(result.value);
    expect(Array.isArray(files)).toBe(true);
    expect(files).toContain('file1.txt');
    expect(files).toContain('file2.txt');

    result.value.dispose();
    vm.dispose();
    runtime.dispose();
  });

  test('provide async readFile', async () => {
    const QuickJS = await newQuickJSWASMModule();
    const runtime = QuickJS.newRuntime();
    const vm = runtime.newContext();

    vol.writeFileSync('/test-async.txt', 'Hello async!');

    const fsHandle = createFsModule(vm, vol as any);
    vm.setProp(vm.global, 'fs', fsHandle);
    fsHandle.dispose();

    const promiseResult = vm.evalCode(`
      (async () => {
        const content = await fs.readFile('/test-async.txt', 'utf8');
        return content;
      })()
    `);

    if (promiseResult.error) {
      const error = vm.dump(promiseResult.error);
      promiseResult.error.dispose();
      throw new Error(`Evaluation failed: ${error}`);
    }

    // Execute pending jobs to process the promise
    while (runtime.hasPendingJob()) {
      runtime.executePendingJobs();
    }

    const promiseHandle = promiseResult.value;
    const promiseState = vm.getPromiseState(promiseHandle);

    if (promiseState.type === 'fulfilled') {
      const content = vm.dump(promiseState.value);
      expect(content).toBe('Hello async!');
      promiseState.value.dispose();
    } else if (promiseState.type === 'rejected') {
      const error = vm.dump(promiseState.error);
      promiseState.error.dispose();
      promiseHandle.dispose();
      throw new Error(`Promise rejected: ${error}`);
    } else {
      promiseHandle.dispose();
      throw new Error('Promise is still pending');
    }

    promiseHandle.dispose();
    vm.dispose();
    runtime.dispose();
  });

  test('provide async writeFile', async () => {
    const QuickJS = await newQuickJSWASMModule();
    const runtime = QuickJS.newRuntime();
    const vm = runtime.newContext();

    const fsHandle = createFsModule(vm, vol as any);
    vm.setProp(vm.global, 'fs', fsHandle);
    fsHandle.dispose();

    const promiseResult = vm.evalCode(`
      (async () => {
        await fs.writeFile('/output-async.txt', 'Async content');
        return true;
      })()
    `);

    if (promiseResult.error) {
      const error = vm.dump(promiseResult.error);
      promiseResult.error.dispose();
      throw new Error(`Evaluation failed: ${error}`);
    }

    // Execute pending jobs to process the promise
    while (runtime.hasPendingJob()) {
      runtime.executePendingJobs();
    }

    const promiseHandle = promiseResult.value;
    const promiseState = vm.getPromiseState(promiseHandle);

    if (promiseState.type === 'fulfilled') {
      promiseState.value.dispose();
    } else if (promiseState.type === 'rejected') {
      const error = vm.dump(promiseState.error);
      promiseState.error.dispose();
      promiseHandle.dispose();
      throw new Error(`Promise rejected: ${error}`);
    } else {
      promiseHandle.dispose();
      throw new Error('Promise is still pending');
    }

    promiseHandle.dispose();

    const content = vol.readFileSync('/output-async.txt', 'utf8');
    expect(content).toBe('Async content');

    vm.dispose();
    runtime.dispose();
  });

  test('provide async exists', async () => {
    const QuickJS = await newQuickJSWASMModule();
    const runtime = QuickJS.newRuntime();
    const vm = runtime.newContext();

    vol.writeFileSync('/exists-async.txt', 'content');

    const fsHandle = createFsModule(vm, vol as any);
    vm.setProp(vm.global, 'fs', fsHandle);
    fsHandle.dispose();

    const promiseResult = vm.evalCode(`
      (async () => {
        const exists = await fs.exists('/exists-async.txt');
        const notExists = await fs.exists('/not-exists-async.txt');
        return { exists, notExists };
      })()
    `);

    if (promiseResult.error) {
      const error = vm.dump(promiseResult.error);
      promiseResult.error.dispose();
      throw new Error(`Evaluation failed: ${error}`);
    }

    // Execute pending jobs to process the promise
    while (runtime.hasPendingJob()) {
      runtime.executePendingJobs();
    }

    const promiseHandle = promiseResult.value;
    const promiseState = vm.getPromiseState(promiseHandle);

    if (promiseState.type === 'fulfilled') {
      const data = vm.dump(promiseState.value);
      expect(data.exists).toBe(true);
      expect(data.notExists).toBe(false);
      promiseState.value.dispose();
    } else if (promiseState.type === 'rejected') {
      const error = vm.dump(promiseState.error);
      promiseState.error.dispose();
      promiseHandle.dispose();
      throw new Error(`Promise rejected: ${error}`);
    } else {
      promiseHandle.dispose();
      throw new Error('Promise is still pending');
    }

    promiseHandle.dispose();
    vm.dispose();
    runtime.dispose();
  });

  test('provide async mkdir and readdir', async () => {
    const QuickJS = await newQuickJSWASMModule();
    const runtime = QuickJS.newRuntime();
    const vm = runtime.newContext();

    const fsHandle = createFsModule(vm, vol as any);
    vm.setProp(vm.global, 'fs', fsHandle);
    fsHandle.dispose();

    const promiseResult = vm.evalCode(`
      (async () => {
        await fs.mkdir('/async-dir');
        await fs.writeFile('/async-dir/file1.txt', 'file1');
        await fs.writeFile('/async-dir/file2.txt', 'file2');
        const files = await fs.readdir('/async-dir');
        return files;
      })()
    `);

    if (promiseResult.error) {
      const error = vm.dump(promiseResult.error);
      promiseResult.error.dispose();
      throw new Error(`Evaluation failed: ${error}`);
    }

    // Execute pending jobs to process the promise
    while (runtime.hasPendingJob()) {
      runtime.executePendingJobs();
    }

    const promiseHandle = promiseResult.value;
    const promiseState = vm.getPromiseState(promiseHandle);

    if (promiseState.type === 'fulfilled') {
      const files = vm.dump(promiseState.value);
      expect(Array.isArray(files)).toBe(true);
      expect(files).toContain('file1.txt');
      expect(files).toContain('file2.txt');
      promiseState.value.dispose();
    } else if (promiseState.type === 'rejected') {
      const error = vm.dump(promiseState.error);
      promiseState.error.dispose();
      promiseHandle.dispose();
      throw new Error(`Promise rejected: ${error}`);
    } else {
      promiseHandle.dispose();
      throw new Error('Promise is still pending');
    }

    promiseHandle.dispose();
    vm.dispose();
    runtime.dispose();
  });

  test('provide async stat', async () => {
    const QuickJS = await newQuickJSWASMModule();
    const runtime = QuickJS.newRuntime();
    const vm = runtime.newContext();

    vol.writeFileSync('/stat-test.txt', 'content');

    const fsHandle = createFsModule(vm, vol as any);
    vm.setProp(vm.global, 'fs', fsHandle);
    fsHandle.dispose();

    const promiseResult = vm.evalCode(`
      (async () => {
        const stats = await fs.stat('/stat-test.txt');
        return {
          isFile: stats.isFile(),
          size: stats.size
        };
      })()
    `);

    if (promiseResult.error) {
      const error = vm.dump(promiseResult.error);
      promiseResult.error.dispose();
      throw new Error(`Evaluation failed: ${error}`);
    }

    // Execute pending jobs to process the promise
    while (runtime.hasPendingJob()) {
      runtime.executePendingJobs();
    }

    const promiseHandle = promiseResult.value;
    const promiseState = vm.getPromiseState(promiseHandle);

    if (promiseState.type === 'fulfilled') {
      const data = vm.dump(promiseState.value);
      expect(data.isFile).toBe(true);
      expect(data.size).toBe(7); // 'content' is 7 bytes
      promiseState.value.dispose();
    } else if (promiseState.type === 'rejected') {
      const error = vm.dump(promiseState.error);
      promiseState.error.dispose();
      promiseHandle.dispose();
      throw new Error(`Promise rejected: ${error}`);
    } else {
      promiseHandle.dispose();
      throw new Error('Promise is still pending');
    }

    promiseHandle.dispose();
    vm.dispose();
    runtime.dispose();
  });

  test('provide async unlink', async () => {
    const QuickJS = await newQuickJSWASMModule();
    const runtime = QuickJS.newRuntime();
    const vm = runtime.newContext();

    vol.writeFileSync('/delete-async.txt', 'content');

    const fsHandle = createFsModule(vm, vol as any);
    vm.setProp(vm.global, 'fs', fsHandle);
    fsHandle.dispose();

    const promiseResult = vm.evalCode(`
      (async () => {
        await fs.unlink('/delete-async.txt');
        return await fs.exists('/delete-async.txt');
      })()
    `);

    if (promiseResult.error) {
      const error = vm.dump(promiseResult.error);
      promiseResult.error.dispose();
      throw new Error(`Evaluation failed: ${error}`);
    }

    // Execute pending jobs to process the promise
    while (runtime.hasPendingJob()) {
      runtime.executePendingJobs();
    }

    const promiseHandle = promiseResult.value;
    const promiseState = vm.getPromiseState(promiseHandle);

    if (promiseState.type === 'fulfilled') {
      const exists = vm.dump(promiseState.value);
      expect(exists).toBe(false);
      promiseState.value.dispose();
    } else if (promiseState.type === 'rejected') {
      const error = vm.dump(promiseState.error);
      promiseState.error.dispose();
      promiseHandle.dispose();
      throw new Error(`Promise rejected: ${error}`);
    } else {
      promiseHandle.dispose();
      throw new Error('Promise is still pending');
    }

    promiseHandle.dispose();
    vm.dispose();
    runtime.dispose();
  });
});
