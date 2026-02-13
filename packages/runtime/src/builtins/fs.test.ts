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
});
