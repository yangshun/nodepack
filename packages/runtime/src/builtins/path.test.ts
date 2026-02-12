import { describe, it, expect } from 'vitest';
import { newQuickJSWASMModule } from 'quickjs-emscripten';
import { createPathModule } from './path.js';

describe('path module', () => {
  it('should provide join', async () => {
    const QuickJS = await newQuickJSWASMModule();
    const runtime = QuickJS.newRuntime();
    const vm = runtime.newContext();

    const pathHandle = createPathModule(vm);
    vm.setProp(vm.global, 'path', pathHandle);
    pathHandle.dispose();

    const result = vm.evalCode(`path.join('a', 'b', 'c')`);

    if (result.error) {
      const error = vm.dump(result.error);
      result.error.dispose();
      throw new Error(`Evaluation failed: ${error}`);
    }

    const joined = vm.dump(result.value);
    expect(joined).toBe('a/b/c');

    result.value.dispose();
    vm.dispose();
    runtime.dispose();
  });

  it('should provide dirname', async () => {
    const QuickJS = await newQuickJSWASMModule();
    const runtime = QuickJS.newRuntime();
    const vm = runtime.newContext();

    const pathHandle = createPathModule(vm);
    vm.setProp(vm.global, 'path', pathHandle);
    pathHandle.dispose();

    const result = vm.evalCode(`path.dirname('/path/to/file.js')`);

    if (result.error) {
      const error = vm.dump(result.error);
      result.error.dispose();
      throw new Error(`Evaluation failed: ${error}`);
    }
    const dir = vm.dump(result.value);
    expect(dir).toBe('/path/to');

    result.value.dispose();
    vm.dispose();
    runtime.dispose();
  });

  it('should provide basename', async () => {
    const QuickJS = await newQuickJSWASMModule();
    const runtime = QuickJS.newRuntime();
    const vm = runtime.newContext();

    const pathHandle = createPathModule(vm);
    vm.setProp(vm.global, 'path', pathHandle);
    pathHandle.dispose();

    const result = vm.evalCode(`path.basename('/path/to/file.js')`);

    if (result.error) {
      const error = vm.dump(result.error);
      result.error.dispose();
      throw new Error(`Evaluation failed: ${error}`);
    }
    const base = vm.dump(result.value);
    expect(base).toBe('file.js');

    result.value.dispose();
    vm.dispose();
    runtime.dispose();
  });

  it('should provide resolve', async () => {
    const QuickJS = await newQuickJSWASMModule();
    const runtime = QuickJS.newRuntime();
    const vm = runtime.newContext();

    const pathHandle = createPathModule(vm);
    vm.setProp(vm.global, 'path', pathHandle);
    pathHandle.dispose();

    const result = vm.evalCode(`path.resolve('a', 'b', 'c')`);

    if (result.error) {
      const error = vm.dump(result.error);
      result.error.dispose();
      throw new Error(`Evaluation failed: ${error}`);
    }
    const resolved = vm.dump(result.value);
    expect(resolved).toContain('a/b/c');

    result.value.dispose();
    vm.dispose();
    runtime.dispose();
  });

  it('should provide extname', async () => {
    const QuickJS = await newQuickJSWASMModule();
    const runtime = QuickJS.newRuntime();
    const vm = runtime.newContext();

    const pathHandle = createPathModule(vm);
    vm.setProp(vm.global, 'path', pathHandle);
    pathHandle.dispose();

    const result = vm.evalCode(`path.extname('file.txt')`);

    if (result.error) {
      const error = vm.dump(result.error);
      result.error.dispose();
      throw new Error(`Evaluation failed: ${error}`);
    }
    const ext = vm.dump(result.value);
    expect(ext).toBe('.txt');

    result.value.dispose();
    vm.dispose();
    runtime.dispose();
  });
});
