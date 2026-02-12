/**
 * Node.js process module implementation
 */
import type { QuickJSContext, QuickJSHandle } from 'quickjs-emscripten';
import type { RuntimeOptions } from '../types.js';
import { addModuleFunction } from './module-helpers.js';

export function createProcessModule(
  vm: QuickJSContext,
  options: RuntimeOptions = {},
): QuickJSHandle {
  const processObj = vm.newObject();

  // process.env - environment variables
  const envObj = vm.newObject();
  const env = options.env || {
    NODE_ENV: 'development',
    PATH: '/usr/local/bin:/usr/bin:/bin',
  };

  for (const [key, value] of Object.entries(env)) {
    const valueHandle = vm.newString(value);
    vm.setProp(envObj, key, valueHandle);
    valueHandle.dispose();
  }
  vm.setProp(processObj, 'env', envObj);
  envObj.dispose();

  // process.cwd() - current working directory
  let currentWorkingDirectory = '/';
  addModuleFunction(vm, processObj, 'cwd', () => {
    return vm.newString(currentWorkingDirectory);
  });

  // process.chdir(directory) - change working directory
  addModuleFunction(vm, processObj, 'chdir', (dirHandle) => {
    const dir = vm.dump(dirHandle);

    if (typeof dir !== 'string') {
      throw new Error('Path must be a string');
    }

    // In real implementation, would validate directory exists
    currentWorkingDirectory = dir;
    return vm.undefined;
  });

  // process.argv - command line arguments
  const argvArray = vm.newArray();
  const argv = ['node', '/script.js'];
  argv.forEach((arg, index) => {
    const argHandle = vm.newString(arg);
    vm.setProp(argvArray, index, argHandle);
    argHandle.dispose();
  });
  vm.setProp(processObj, 'argv', argvArray);
  argvArray.dispose();

  // process.version - Node.js version (fake it)
  const versionHandle = vm.newString('v18.0.0-browser');
  vm.setProp(processObj, 'version', versionHandle);
  versionHandle.dispose();

  // process.platform - operating system platform
  const platformHandle = vm.newString('browser');
  vm.setProp(processObj, 'platform', platformHandle);
  platformHandle.dispose();

  // process.exit(code) - exit process
  addModuleFunction(vm, processObj, 'exit', (codeHandle) => {
    const code = codeHandle ? vm.dump(codeHandle) : 0;
    throw new Error(`Process exited with code ${code}`);
  });

  return processObj;
}
