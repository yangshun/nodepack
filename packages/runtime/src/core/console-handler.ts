/**
 * Console Handler
 * Sets up console.log and other console methods in QuickJS context
 */

import type { QuickJSContext, QuickJSHandle } from 'quickjs-emscripten';

export interface ConsoleSetupOptions {
  /**
   * Array to store console logs
   */
  logStore: string[];
  /**
   * Optional callback for streaming logs
   */
  onLog?: (message: string) => void;
}

/**
 * Set up console object in QuickJS context
 * Creates console methods that capture output to an array and optionally stream it
 */
export function setupConsole(vm: QuickJSContext, options: ConsoleSetupOptions): QuickJSHandle {
  const consoleObj = vm.newObject();

  // Timers storage
  const timers = new Map<string, number>();
  const counts = new Map<string, number>();

  // Helper to format arguments
  function formatArgs(...args: any[]): string {
    const messages = args.map((arg: any) => {
      const value = vm.dump(arg);
      return String(value);
    });
    return messages.join(' ');
  }

  // Helper to log with prefix
  function logWithPrefix(prefix: string, ...args: any[]) {
    const message = formatArgs(...args);
    const fullMessage = prefix ? `${prefix} ${message}` : message;
    console.log(fullMessage);
    options.logStore.push(fullMessage);

    if (options.onLog) {
      options.onLog(fullMessage);
    }
  }

  // console.log
  const logFn = vm.newFunction('log', (...args: any[]) => {
    logWithPrefix('', ...args);
  });
  vm.setProp(consoleObj, 'log', logFn);
  logFn.dispose();

  // console.error
  const errorFn = vm.newFunction('error', (...args: any[]) => {
    const message = formatArgs(...args);
    console.error(message);
    options.logStore.push(`ERROR: ${message}`);

    if (options.onLog) {
      options.onLog(`ERROR: ${message}`);
    }
  });
  vm.setProp(consoleObj, 'error', errorFn);
  errorFn.dispose();

  // console.warn
  const warnFn = vm.newFunction('warn', (...args: any[]) => {
    const message = formatArgs(...args);
    console.warn(message);
    options.logStore.push(`WARN: ${message}`);

    if (options.onLog) {
      options.onLog(`WARN: ${message}`);
    }
  });
  vm.setProp(consoleObj, 'warn', warnFn);
  warnFn.dispose();

  // console.info
  const infoFn = vm.newFunction('info', (...args: any[]) => {
    const message = formatArgs(...args);
    console.info(message);
    options.logStore.push(`INFO: ${message}`);

    if (options.onLog) {
      options.onLog(`INFO: ${message}`);
    }
  });
  vm.setProp(consoleObj, 'info', infoFn);
  infoFn.dispose();

  // console.debug
  const debugFn = vm.newFunction('debug', (...args: any[]) => {
    const message = formatArgs(...args);
    console.debug(message);
    options.logStore.push(`DEBUG: ${message}`);

    if (options.onLog) {
      options.onLog(`DEBUG: ${message}`);
    }
  });
  vm.setProp(consoleObj, 'debug', debugFn);
  debugFn.dispose();

  // console.trace
  const traceFn = vm.newFunction('trace', (...args: any[]) => {
    const message = args.length > 0 ? formatArgs(...args) : 'Trace';
    console.trace(message);
    options.logStore.push(`TRACE: ${message}`);

    if (options.onLog) {
      options.onLog(`TRACE: ${message}`);
    }
  });
  vm.setProp(consoleObj, 'trace', traceFn);
  traceFn.dispose();

  // console.dir
  const dirFn = vm.newFunction('dir', (...args: any[]) => {
    const message = formatArgs(...args);
    console.dir(message);
    options.logStore.push(`DIR: ${message}`);

    if (options.onLog) {
      options.onLog(`DIR: ${message}`);
    }
  });
  vm.setProp(consoleObj, 'dir', dirFn);
  dirFn.dispose();

  // console.table
  const tableFn = vm.newFunction('table', (...args: any[]) => {
    const message = formatArgs(...args);
    console.table(message);
    options.logStore.push(`TABLE: ${message}`);

    if (options.onLog) {
      options.onLog(`TABLE: ${message}`);
    }
  });
  vm.setProp(consoleObj, 'table', tableFn);
  tableFn.dispose();

  // console.time
  const timeFn = vm.newFunction('time', (labelHandle?: any) => {
    const label = labelHandle ? String(vm.dump(labelHandle)) : 'default';
    timers.set(label, Date.now());
  });
  vm.setProp(consoleObj, 'time', timeFn);
  timeFn.dispose();

  // console.timeEnd
  const timeEndFn = vm.newFunction('timeEnd', (labelHandle?: any) => {
    const label = labelHandle ? String(vm.dump(labelHandle)) : 'default';
    const startTime = timers.get(label);

    if (startTime !== undefined) {
      const duration = Date.now() - startTime;
      const message = `${label}: ${duration}ms`;
      console.timeEnd(label);
      options.logStore.push(message);

      if (options.onLog) {
        options.onLog(message);
      }

      timers.delete(label);
    } else {
      const message = `Timer '${label}' does not exist`;
      console.warn(message);
      options.logStore.push(`WARN: ${message}`);

      if (options.onLog) {
        options.onLog(`WARN: ${message}`);
      }
    }
  });
  vm.setProp(consoleObj, 'timeEnd', timeEndFn);
  timeEndFn.dispose();

  // console.timeLog
  const timeLogFn = vm.newFunction('timeLog', (labelHandle?: any, ...args: any[]) => {
    const label = labelHandle ? String(vm.dump(labelHandle)) : 'default';
    const startTime = timers.get(label);

    if (startTime !== undefined) {
      const duration = Date.now() - startTime;
      const extraMessage = args.length > 0 ? ' ' + formatArgs(...args) : '';
      const message = `${label}: ${duration}ms${extraMessage}`;
      console.log(message);
      options.logStore.push(message);

      if (options.onLog) {
        options.onLog(message);
      }
    } else {
      const message = `Timer '${label}' does not exist`;
      console.warn(message);
      options.logStore.push(`WARN: ${message}`);

      if (options.onLog) {
        options.onLog(`WARN: ${message}`);
      }
    }
  });
  vm.setProp(consoleObj, 'timeLog', timeLogFn);
  timeLogFn.dispose();

  // console.count
  const countFn = vm.newFunction('count', (labelHandle?: any) => {
    const label = labelHandle ? String(vm.dump(labelHandle)) : 'default';
    const currentCount = (counts.get(label) || 0) + 1;
    counts.set(label, currentCount);

    const message = `${label}: ${currentCount}`;
    console.count(label);
    options.logStore.push(message);

    if (options.onLog) {
      options.onLog(message);
    }
  });
  vm.setProp(consoleObj, 'count', countFn);
  countFn.dispose();

  // console.countReset
  const countResetFn = vm.newFunction('countReset', (labelHandle?: any) => {
    const label = labelHandle ? String(vm.dump(labelHandle)) : 'default';
    counts.delete(label);
  });
  vm.setProp(consoleObj, 'countReset', countResetFn);
  countResetFn.dispose();

  // console.group
  const groupFn = vm.newFunction('group', (...args: any[]) => {
    const message = args.length > 0 ? formatArgs(...args) : '';
    console.group(message);
    if (message) {
      options.logStore.push(`GROUP: ${message}`);

      if (options.onLog) {
        options.onLog(`GROUP: ${message}`);
      }
    }
  });
  vm.setProp(consoleObj, 'group', groupFn);
  groupFn.dispose();

  // console.groupCollapsed
  const groupCollapsedFn = vm.newFunction('groupCollapsed', (...args: any[]) => {
    const message = args.length > 0 ? formatArgs(...args) : '';
    console.groupCollapsed(message);
    if (message) {
      options.logStore.push(`GROUP_COLLAPSED: ${message}`);

      if (options.onLog) {
        options.onLog(`GROUP_COLLAPSED: ${message}`);
      }
    }
  });
  vm.setProp(consoleObj, 'groupCollapsed', groupCollapsedFn);
  groupCollapsedFn.dispose();

  // console.groupEnd
  const groupEndFn = vm.newFunction('groupEnd', () => {
    console.groupEnd();
  });
  vm.setProp(consoleObj, 'groupEnd', groupEndFn);
  groupEndFn.dispose();

  // console.clear
  const clearFn = vm.newFunction('clear', () => {
    console.clear();
    options.logStore.length = 0;
  });
  vm.setProp(consoleObj, 'clear', clearFn);
  clearFn.dispose();

  // console.assert
  const assertFn = vm.newFunction('assert', (conditionHandle: any, ...args: any[]) => {
    const condition = vm.dump(conditionHandle);

    if (!condition) {
      const message = args.length > 0 ? formatArgs(...args) : 'Assertion failed';
      console.assert(false, message);
      options.logStore.push(`ASSERTION FAILED: ${message}`);

      if (options.onLog) {
        options.onLog(`ASSERTION FAILED: ${message}`);
      }
    }
  });
  vm.setProp(consoleObj, 'assert', assertFn);
  assertFn.dispose();

  return consoleObj;
}
