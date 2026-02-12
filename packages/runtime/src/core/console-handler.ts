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
 * Creates console.log that captures output to an array and optionally streams it
 */
export function setupConsole(vm: QuickJSContext, options: ConsoleSetupOptions): QuickJSHandle {
  const consoleObj = vm.newObject();

  const logFn = vm.newFunction('log', (...args: any[]) => {
    const messages = args.map((arg: any) => {
      const str = vm.dump(arg);
      return String(str);
    });
    const logMessage = messages.join(' ');
    console.log(logMessage);
    options.logStore.push(logMessage);

    // Stream log update to callback if provided
    if (options.onLog) {
      options.onLog(logMessage);
    }
  });

  vm.setProp(consoleObj, 'log', logFn);
  logFn.dispose();

  return consoleObj;
}
