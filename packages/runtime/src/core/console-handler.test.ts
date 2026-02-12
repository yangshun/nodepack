import { describe, it, expect } from 'vitest';
import { newQuickJSWASMModule } from 'quickjs-emscripten';
import { setupConsole } from './console-handler.js';

describe('Console Handler', () => {
  it('should capture console.log output', async () => {
    const QuickJS = await newQuickJSWASMModule();
    const runtime = QuickJS.newRuntime();
    const vm = runtime.newContext();

    const logStore: string[] = [];
    const consoleObj = setupConsole(vm, { logStore });
    vm.setProp(vm.global, 'console', consoleObj);
    consoleObj.dispose();

    vm.evalCode('console.log("Hello, World!");');

    expect(logStore).toHaveLength(1);
    expect(logStore[0]).toBe('Hello, World!');

    vm.dispose();
    runtime.dispose();
  });

  it('should join multiple arguments with spaces', async () => {
    const QuickJS = await newQuickJSWASMModule();
    const runtime = QuickJS.newRuntime();
    const vm = runtime.newContext();

    const logStore: string[] = [];
    const consoleObj = setupConsole(vm, { logStore });
    vm.setProp(vm.global, 'console', consoleObj);
    consoleObj.dispose();

    vm.evalCode('console.log("Hello", "World", 123);');

    expect(logStore).toHaveLength(1);
    expect(logStore[0]).toBe('Hello World 123');

    vm.dispose();
    runtime.dispose();
  });

  it('should call onLog callback when provided', async () => {
    const QuickJS = await newQuickJSWASMModule();
    const runtime = QuickJS.newRuntime();
    const vm = runtime.newContext();

    const logStore: string[] = [];
    const streamedLogs: string[] = [];

    const consoleObj = setupConsole(vm, {
      logStore,
      onLog: (msg) => streamedLogs.push(msg),
    });
    vm.setProp(vm.global, 'console', consoleObj);
    consoleObj.dispose();

    vm.evalCode('console.log("Test message");');

    expect(logStore).toHaveLength(1);
    expect(streamedLogs).toHaveLength(1);
    expect(streamedLogs[0]).toBe('Test message');

    vm.dispose();
    runtime.dispose();
  });

  it('should handle multiple console.log calls', async () => {
    const QuickJS = await newQuickJSWASMModule();
    const runtime = QuickJS.newRuntime();
    const vm = runtime.newContext();

    const logStore: string[] = [];
    const consoleObj = setupConsole(vm, { logStore });
    vm.setProp(vm.global, 'console', consoleObj);
    consoleObj.dispose();

    vm.evalCode(`
      console.log("First");
      console.log("Second");
      console.log("Third");
    `);

    expect(logStore).toHaveLength(3);
    expect(logStore[0]).toBe('First');
    expect(logStore[1]).toBe('Second');
    expect(logStore[2]).toBe('Third');

    vm.dispose();
    runtime.dispose();
  });

  it('should handle objects and arrays', async () => {
    const QuickJS = await newQuickJSWASMModule();
    const runtime = QuickJS.newRuntime();
    const vm = runtime.newContext();

    const logStore: string[] = [];
    const consoleObj = setupConsole(vm, { logStore });
    vm.setProp(vm.global, 'console', consoleObj);
    consoleObj.dispose();

    vm.evalCode('console.log([1, 2, 3]);');

    expect(logStore).toHaveLength(1);
    // QuickJS converts arrays to strings like "1,2,3"
    expect(logStore[0]).toMatch(/1.*2.*3/);

    vm.dispose();
    runtime.dispose();
  });
});
