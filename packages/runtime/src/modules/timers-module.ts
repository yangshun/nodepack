import type { QuickJSContext, QuickJSHandle } from 'quickjs-emscripten';

export interface TimerTracker {
  pendingTimers: Set<number>;
}

export function createTimersModule(
  vm: QuickJSContext,
  tracker: TimerTracker,
): QuickJSHandle {
  const timersObj = vm.newObject();

  // Create counter for unique callback names
  vm.evalCode('globalThis.__nodepack_timer_callback_counter = 0;');

  // setTimeout(callback, delay, ...args)
  const setTimeoutFn = vm.newFunction('setTimeout', (callbackHandle, delayHandle) => {
    const delay = delayHandle ? vm.dump(delayHandle) : 0;

    // Generate unique callback name
    const counterResult = vm.evalCode('globalThis.__nodepack_timer_callback_counter++');
    if (counterResult.error) {
      console.error('[Timer] Failed to get counter');
      counterResult.error.dispose();
      return vm.newNumber(-1);
    }
    const callbackId = vm.dump(counterResult.value);
    counterResult.value.dispose();
    const callbackName = `__timer_cb_${callbackId}`;

    // Store callback as a global function with a unique name
    vm.setProp(vm.global, callbackName, callbackHandle);

    // Use browser's setTimeout
    const timerId = setTimeout(() => {
      try {
        // Execute the callback by calling the global function
        const result = vm.evalCode(`
          if (typeof globalThis.${callbackName} === 'function') {
            try {
              globalThis.${callbackName}();
            } finally {
              delete globalThis.${callbackName};
            }
          }
        `);

        if (result.error) {
          const error = vm.dump(result.error);
          console.error('[Timer] Callback error:', error);
          result.error.dispose();
        } else {
          result.value.dispose();
        }
      } catch (error) {
        console.error('[Timer] Failed to execute callback:', error);
      } finally {
        tracker.pendingTimers.delete(timerId);
      }
    }, delay) as unknown as number;

    // Track this timer
    tracker.pendingTimers.add(timerId);

    return vm.newNumber(timerId);
  });

  // setInterval(callback, delay, ...args)
  const setIntervalFn = vm.newFunction('setInterval', (callbackHandle, delayHandle) => {
    const delay = delayHandle ? vm.dump(delayHandle) : 0;

    // Generate unique callback name
    const counterResult = vm.evalCode('globalThis.__nodepack_timer_callback_counter++');
    if (counterResult.error) {
      console.error('[Timer] Failed to get counter');
      counterResult.error.dispose();
      return vm.newNumber(-1);
    }
    const callbackId = vm.dump(counterResult.value);
    counterResult.value.dispose();
    const callbackName = `__timer_cb_${callbackId}`;

    // Store callback as a global function with a unique name
    vm.setProp(vm.global, callbackName, callbackHandle);

    // Use browser's setInterval
    const timerId = setInterval(() => {
      try {
        // Execute the callback by calling the global function
        const result = vm.evalCode(`
          if (typeof globalThis.${callbackName} === 'function') {
            globalThis.${callbackName}();
          }
        `);

        if (result.error) {
          const error = vm.dump(result.error);
          console.error('[Timer] Callback error:', error);
          result.error.dispose();
        } else {
          result.value.dispose();
        }
      } catch (error) {
        console.error('[Timer] Failed to execute callback:', error);
      }
    }, delay) as unknown as number;

    // Track this timer and store callback name for cleanup
    tracker.pendingTimers.add(timerId);
    (tracker as any)[`timer_${timerId}_callbackName`] = callbackName;

    return vm.newNumber(timerId);
  });

  // clearTimeout(timerId)
  const clearTimeoutFn = vm.newFunction('clearTimeout', (timerIdHandle) => {
    const timerId = vm.dump(timerIdHandle);
    if (typeof timerId === 'number') {
      clearTimeout(timerId);
      tracker.pendingTimers.delete(timerId);
    }
    return vm.undefined;
  });

  // clearInterval(timerId)
  const clearIntervalFn = vm.newFunction('clearInterval', (timerIdHandle) => {
    const timerId = vm.dump(timerIdHandle);
    if (typeof timerId === 'number') {
      clearInterval(timerId);
      tracker.pendingTimers.delete(timerId);

      // Clean up the global callback function
      const callbackName = (tracker as any)[`timer_${timerId}_callbackName`];
      if (callbackName) {
        vm.evalCode(`delete globalThis.${callbackName};`);
        delete (tracker as any)[`timer_${timerId}_callbackName`];
      }
    }
    return vm.undefined;
  });

  // Add to module object
  vm.setProp(timersObj, 'setTimeout', setTimeoutFn);
  vm.setProp(timersObj, 'setInterval', setIntervalFn);
  vm.setProp(timersObj, 'clearTimeout', clearTimeoutFn);
  vm.setProp(timersObj, 'clearInterval', clearIntervalFn);

  // Also register as global functions
  vm.setProp(vm.global, 'setTimeout', setTimeoutFn);
  vm.setProp(vm.global, 'setInterval', setIntervalFn);
  vm.setProp(vm.global, 'clearTimeout', clearTimeoutFn);
  vm.setProp(vm.global, 'clearInterval', clearIntervalFn);

  // Cleanup handles
  setTimeoutFn.dispose();
  setIntervalFn.dispose();
  clearTimeoutFn.dispose();
  clearIntervalFn.dispose();

  return timersObj;
}
