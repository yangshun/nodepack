import { describe, test, expect, beforeEach } from 'vitest';
import { newQuickJSWASMModule } from 'quickjs-emscripten';
import { createTimersModule } from './timers.js';
import type { TimerTracker } from './timers.js';

describe('timers module', () => {
  let QuickJS: any;
  let runtime: any;
  let vm: any;
  let tracker: TimerTracker;

  beforeEach(async () => {
    QuickJS = await newQuickJSWASMModule();
    runtime = QuickJS.newRuntime();
    vm = runtime.newContext();
    tracker = {
      pendingTimers: new Set(),
    };
  }, 30000);

  describe('setTimeout', () => {
    test('provide setTimeout function', async () => {
      const timersHandle = createTimersModule(vm, tracker);
      vm.setProp(vm.global, 'timers', timersHandle);
      timersHandle.dispose();

      const result = vm.evalCode('typeof setTimeout');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');

      vm.dispose();
      runtime.dispose();
    });

    test('execute callback after delay', async () => {
      const timersHandle = createTimersModule(vm, tracker);
      vm.setProp(vm.global, 'timers', timersHandle);
      timersHandle.dispose();

      const code = `
        let executed = false;
        setTimeout(() => {
          executed = true;
        }, 50);
        executed;
      `;

      const result = vm.evalCode(code);
      const initialValue = vm.dump(result.value);
      result.value.dispose();

      expect(initialValue).toBe(false);

      // Wait for timer to execute
      await new Promise((resolve) => setTimeout(resolve, 100));

      const checkResult = vm.evalCode('executed');
      const finalValue = vm.dump(checkResult.value);
      checkResult.value.dispose();

      expect(finalValue).toBe(true);

      vm.dispose();
      runtime.dispose();
    });

    test('return timer ID', async () => {
      const timersHandle = createTimersModule(vm, tracker);
      vm.setProp(vm.global, 'timers', timersHandle);
      timersHandle.dispose();

      const result = vm.evalCode(`
        const timerId = setTimeout(() => {}, 100);
        typeof timerId;
      `);

      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('number');

      vm.dispose();
      runtime.dispose();
    });

    test('track pending timers', async () => {
      const timersHandle = createTimersModule(vm, tracker);
      vm.setProp(vm.global, 'timers', timersHandle);
      timersHandle.dispose();

      vm.evalCode('setTimeout(() => {}, 100);');

      expect(tracker.pendingTimers.size).toBe(1);

      vm.dispose();
      runtime.dispose();
    });

    test('remove timer from tracker after execution', async () => {
      const timersHandle = createTimersModule(vm, tracker);
      vm.setProp(vm.global, 'timers', timersHandle);
      timersHandle.dispose();

      vm.evalCode('setTimeout(() => {}, 50);');

      expect(tracker.pendingTimers.size).toBe(1);

      // Wait for timer to execute
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(tracker.pendingTimers.size).toBe(0);

      vm.dispose();
      runtime.dispose();
    });

    test('handle zero delay', async () => {
      const timersHandle = createTimersModule(vm, tracker);
      vm.setProp(vm.global, 'timers', timersHandle);
      timersHandle.dispose();

      const code = `
        let executed = false;
        setTimeout(() => {
          executed = true;
        }, 0);
        executed;
      `;

      const result = vm.evalCode(code);
      const initialValue = vm.dump(result.value);
      result.value.dispose();

      expect(initialValue).toBe(false);

      // Wait for next tick
      await new Promise((resolve) => setTimeout(resolve, 10));

      const checkResult = vm.evalCode('executed');
      const finalValue = vm.dump(checkResult.value);
      checkResult.value.dispose();

      expect(finalValue).toBe(true);

      vm.dispose();
      runtime.dispose();
    });
  });

  describe('setInterval', () => {
    test('provide setInterval function', async () => {
      const timersHandle = createTimersModule(vm, tracker);
      vm.setProp(vm.global, 'timers', timersHandle);
      timersHandle.dispose();

      const result = vm.evalCode('typeof setInterval');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');

      vm.dispose();
      runtime.dispose();
    });

    test('execute callback repeatedly', async () => {
      const timersHandle = createTimersModule(vm, tracker);
      vm.setProp(vm.global, 'timers', timersHandle);
      timersHandle.dispose();

      const code = `
        let count = 0;
        const intervalId = setInterval(() => {
          count++;
        }, 30);
        intervalId;
      `;

      const result = vm.evalCode(code);
      const timerId = vm.dump(result.value);
      result.value.dispose();

      // Wait for multiple executions
      await new Promise((resolve) => setTimeout(resolve, 120));

      const checkResult = vm.evalCode('count');
      const count = vm.dump(checkResult.value);
      checkResult.value.dispose();

      expect(count).toBeGreaterThanOrEqual(2);

      // Clean up
      const clearCode = `clearInterval(${timerId});`;
      const clearResult = vm.evalCode(clearCode);
      clearResult.value.dispose();

      vm.dispose();
      runtime.dispose();
    });

    test('return timer ID', async () => {
      const timersHandle = createTimersModule(vm, tracker);
      vm.setProp(vm.global, 'timers', timersHandle);
      timersHandle.dispose();

      const result = vm.evalCode(`
        const intervalId = setInterval(() => {}, 100);
        typeof intervalId;
      `);

      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('number');

      vm.dispose();
      runtime.dispose();
    });

    test('track pending intervals', async () => {
      const timersHandle = createTimersModule(vm, tracker);
      vm.setProp(vm.global, 'timers', timersHandle);
      timersHandle.dispose();

      vm.evalCode('setInterval(() => {}, 100);');

      expect(tracker.pendingTimers.size).toBe(1);

      vm.dispose();
      runtime.dispose();
    });
  });

  describe('clearTimeout', () => {
    test('provide clearTimeout function', async () => {
      const timersHandle = createTimersModule(vm, tracker);
      vm.setProp(vm.global, 'timers', timersHandle);
      timersHandle.dispose();

      const result = vm.evalCode('typeof clearTimeout');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');

      vm.dispose();
      runtime.dispose();
    });

    test('cancel timer before execution', async () => {
      const timersHandle = createTimersModule(vm, tracker);
      vm.setProp(vm.global, 'timers', timersHandle);
      timersHandle.dispose();

      const code = `
        let executed = false;
        const timerId = setTimeout(() => {
          executed = true;
        }, 50);
        clearTimeout(timerId);
        executed;
      `;

      const result = vm.evalCode(code);
      const value = vm.dump(result.value);
      result.value.dispose();

      expect(value).toBe(false);

      // Wait to ensure it doesn't execute
      await new Promise((resolve) => setTimeout(resolve, 100));

      const checkResult = vm.evalCode('executed');
      const finalValue = vm.dump(checkResult.value);
      checkResult.value.dispose();

      expect(finalValue).toBe(false);

      vm.dispose();
      runtime.dispose();
    });

    test('work with clearTimeout', async () => {
      const timersHandle = createTimersModule(vm, tracker);
      vm.setProp(vm.global, 'timers', timersHandle);
      timersHandle.dispose();

      const code = `
        let executed = false;
        const timerId = setTimeout(() => {
          executed = true;
        }, 50);
        clearTimeout(timerId);
        executed;
      `;

      const result = vm.evalCode(code);
      const value = vm.dump(result.value);
      result.value.dispose();

      expect(value).toBe(false);

      // Wait and confirm it doesn't execute
      await new Promise((resolve) => setTimeout(resolve, 100));

      const checkResult = vm.evalCode('executed');
      const finalValue = vm.dump(checkResult.value);
      checkResult.value.dispose();

      expect(finalValue).toBe(false);

      vm.dispose();
      runtime.dispose();
    });

    test('handle invalid timer ID gracefully', async () => {
      const timersHandle = createTimersModule(vm, tracker);
      vm.setProp(vm.global, 'timers', timersHandle);
      timersHandle.dispose();

      const result = vm.evalCode('clearTimeout(99999);');

      expect(result.error).toBeUndefined();
      result.value.dispose();

      vm.dispose();
      runtime.dispose();
    });
  });

  describe('clearInterval', () => {
    test('provide clearInterval function', async () => {
      const timersHandle = createTimersModule(vm, tracker);
      vm.setProp(vm.global, 'timers', timersHandle);
      timersHandle.dispose();

      const result = vm.evalCode('typeof clearInterval');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');

      vm.dispose();
      runtime.dispose();
    });

    test('stop interval from executing', async () => {
      const timersHandle = createTimersModule(vm, tracker);
      vm.setProp(vm.global, 'timers', timersHandle);
      timersHandle.dispose();

      const code = `
        let count = 0;
        const intervalId = setInterval(() => {
          count++;
        }, 30);
        intervalId;
      `;

      const result = vm.evalCode(code);
      const timerId = vm.dump(result.value);
      result.value.dispose();

      // Let it run once or twice
      await new Promise((resolve) => setTimeout(resolve, 60));

      const clearCode = `clearInterval(${timerId});`;
      const clearResult = vm.evalCode(clearCode);
      clearResult.value.dispose();

      const countResult = vm.evalCode('count');
      const countBefore = vm.dump(countResult.value);
      countResult.value.dispose();

      // Wait and verify count doesn't increase
      await new Promise((resolve) => setTimeout(resolve, 100));

      const countResult2 = vm.evalCode('count');
      const countAfter = vm.dump(countResult2.value);
      countResult2.value.dispose();

      expect(countAfter).toBe(countBefore);

      vm.dispose();
      runtime.dispose();
    });

    test('work with clearInterval', async () => {
      const timersHandle = createTimersModule(vm, tracker);
      vm.setProp(vm.global, 'timers', timersHandle);
      timersHandle.dispose();

      const code = `
        let count = 0;
        const intervalId = setInterval(() => {
          count++;
        }, 30);
        intervalId;
      `;

      const result = vm.evalCode(code);
      const intervalId = vm.dump(result.value);
      result.value.dispose();

      // Let it run once or twice
      await new Promise((resolve) => setTimeout(resolve, 70));

      const clearCode = `clearInterval(${intervalId});`;
      const clearResult = vm.evalCode(clearCode);
      clearResult.value.dispose();

      const countResult = vm.evalCode('count');
      const countBefore = vm.dump(countResult.value);
      countResult.value.dispose();

      expect(countBefore).toBeGreaterThanOrEqual(1);

      // Wait and verify count doesn't increase
      await new Promise((resolve) => setTimeout(resolve, 100));

      const countResult2 = vm.evalCode('count');
      const countAfter = vm.dump(countResult2.value);
      countResult2.value.dispose();

      expect(countAfter).toBe(countBefore);

      vm.dispose();
      runtime.dispose();
    });

    test('handle invalid interval ID gracefully', async () => {
      const timersHandle = createTimersModule(vm, tracker);
      vm.setProp(vm.global, 'timers', timersHandle);
      timersHandle.dispose();

      const result = vm.evalCode('clearInterval(99999);');

      expect(result.error).toBeUndefined();
      result.value.dispose();

      vm.dispose();
      runtime.dispose();
    });
  });

  describe('multiple timers', () => {
    test('handle multiple setTimeout calls', async () => {
      const timersHandle = createTimersModule(vm, tracker);
      vm.setProp(vm.global, 'timers', timersHandle);
      timersHandle.dispose();

      vm.evalCode(`
        setTimeout(() => {}, 100);
        setTimeout(() => {}, 200);
        setTimeout(() => {}, 300);
      `);

      expect(tracker.pendingTimers.size).toBe(3);

      vm.dispose();
      runtime.dispose();
    });

    test('handle multiple setInterval calls', async () => {
      const timersHandle = createTimersModule(vm, tracker);
      vm.setProp(vm.global, 'timers', timersHandle);
      timersHandle.dispose();

      vm.evalCode(`
        setInterval(() => {}, 100);
        setInterval(() => {}, 200);
      `);

      expect(tracker.pendingTimers.size).toBe(2);

      vm.dispose();
      runtime.dispose();
    });

    test('handle mixed timers', async () => {
      const timersHandle = createTimersModule(vm, tracker);
      vm.setProp(vm.global, 'timers', timersHandle);
      timersHandle.dispose();

      vm.evalCode(`
        setTimeout(() => {}, 100);
        setInterval(() => {}, 200);
        setTimeout(() => {}, 300);
      `);

      expect(tracker.pendingTimers.size).toBe(3);

      vm.dispose();
      runtime.dispose();
    });
  });

  describe('error handling', () => {
    test('handle callback errors gracefully', async () => {
      const timersHandle = createTimersModule(vm, tracker);
      vm.setProp(vm.global, 'timers', timersHandle);
      timersHandle.dispose();

      const code = `
        setTimeout(() => {
          throw new Error('Timer error');
        }, 50);
      `;

      vm.evalCode(code);

      // Wait for timer to execute
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Error should not crash and timer should be cleaned up
      expect(tracker.pendingTimers.size).toBe(0);

      vm.dispose();
      runtime.dispose();
    });
  });

  describe('edge cases', () => {
    test('handle undefined delay', async () => {
      const timersHandle = createTimersModule(vm, tracker);
      vm.setProp(vm.global, 'timers', timersHandle);
      timersHandle.dispose();

      const code = `
        let executed = false;
        setTimeout(() => {
          executed = true;
        });
        executed;
      `;

      const result = vm.evalCode(code);
      const initialValue = vm.dump(result.value);
      result.value.dispose();

      expect(initialValue).toBe(false);

      // Wait for next tick
      await new Promise((resolve) => setTimeout(resolve, 10));

      const checkResult = vm.evalCode('executed');
      const finalValue = vm.dump(checkResult.value);
      checkResult.value.dispose();

      expect(finalValue).toBe(true);

      vm.dispose();
      runtime.dispose();
    });
  });
});
