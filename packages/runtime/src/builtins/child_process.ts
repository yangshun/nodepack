/**
 * Child Process module stub
 * Provides minimal child_process for compatibility
 */

import type { QuickJSContext, QuickJSHandle } from 'quickjs-emscripten';
import { addModuleFunction } from './helpers.js';

export function createChildProcessModule(vm: QuickJSContext): QuickJSHandle {
  const childProcessObj = vm.newObject();

  // spawn() - returns a stub ChildProcess object
  addModuleFunction(vm, childProcessObj, 'spawn', (commandHandle, argsHandle, optionsHandle) => {
    const childProcess = vm.newObject();

    // stdout property
    const stdout = vm.newObject();
    const stdoutOn = vm.newFunction('on', () => vm.undefined);
    vm.setProp(stdout, 'on', stdoutOn);
    stdoutOn.dispose();
    vm.setProp(childProcess, 'stdout', stdout);
    stdout.dispose();

    // stderr property
    const stderr = vm.newObject();
    const stderrOn = vm.newFunction('on', () => vm.undefined);
    vm.setProp(stderr, 'on', stderrOn);
    stderrOn.dispose();
    vm.setProp(childProcess, 'stderr', stderr);
    stderr.dispose();

    // on() method
    const onMethod = vm.newFunction('on', () => vm.undefined);
    vm.setProp(childProcess, 'on', onMethod);
    onMethod.dispose();

    return childProcess;
  });

  // exec() - stub that calls callback with empty result
  addModuleFunction(vm, childProcessObj, 'exec', (commandHandle, optionsOrCallbackHandle, callbackHandle) => {
    return vm.undefined;
  });

  // execSync() - returns empty string
  addModuleFunction(vm, childProcessObj, 'execSync', (commandHandle, optionsHandle) => {
    return vm.newString('');
  });

  // fork() - returns stub ChildProcess
  addModuleFunction(vm, childProcessObj, 'fork', (modulePathHandle, argsHandle, optionsHandle) => {
    const childProcess = vm.newObject();

    const onMethod = vm.newFunction('on', () => vm.undefined);
    vm.setProp(childProcess, 'on', onMethod);
    onMethod.dispose();

    const sendMethod = vm.newFunction('send', () => vm.undefined);
    vm.setProp(childProcess, 'send', sendMethod);
    sendMethod.dispose();

    return childProcess;
  });

  // execFile() - stub
  addModuleFunction(vm, childProcessObj, 'execFile', (fileHandle, argsHandle, optionsHandle, callbackHandle) => {
    return vm.undefined;
  });

  return childProcessObj;
}
