/**
 * Node.js process module implementation
 */
import type { QuickJSContext, QuickJSHandle } from 'quickjs-emscripten';
import type { RuntimeOptions } from '../types.js';
import { addModuleFunction } from './helpers.js';

export function createProcessModule(
  vm: QuickJSContext,
  options: RuntimeOptions = {},
): QuickJSHandle {
  // Create process as an EventEmitter instance
  const processCode = `
    new globalThis.__nodepack_events.EventEmitter();
  `;
  const processResult = vm.evalCode(processCode);

  if (processResult.error) {
    const error = vm.dump(processResult.error);
    processResult.error.dispose();
    const errorMsg =
      typeof error === 'object' && error.message
        ? error.message
        : JSON.stringify(error, null, 2) || String(error);
    throw new Error(`Failed to create process EventEmitter: ${errorMsg}`);
  }

  const processObj = processResult.value;

  // process.env - environment variables
  const envObj = vm.newObject();
  const env = options.env || {
    NODE_ENV: 'development',
    PATH: ['/node_modules/.bin', '/usr/local/bin', '/usr/bin', '/bin'].join(':'),
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
  const argv = options.argv || ['node', '/main.js'];
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

  // process.arch - CPU architecture
  const archHandle = vm.newString('x64');
  vm.setProp(processObj, 'arch', archHandle);
  archHandle.dispose();

  // process.versions - version information
  const versionsObj = vm.newObject();
  const versions = {
    node: '18.0.0',
    v8: '10.0.0',
    modules: '108',
  };
  for (const [key, value] of Object.entries(versions)) {
    const versionValue = vm.newString(value);
    vm.setProp(versionsObj, key, versionValue);
    versionValue.dispose();
  }
  vm.setProp(processObj, 'versions', versionsObj);
  versionsObj.dispose();

  // process.release - release metadata
  const releaseObj = vm.newObject();
  const releaseName = vm.newString('node');
  vm.setProp(releaseObj, 'name', releaseName);
  releaseName.dispose();
  vm.setProp(processObj, 'release', releaseObj);
  releaseObj.dispose();

  // process.exit(code) - exit process
  addModuleFunction(vm, processObj, 'exit', (codeHandle) => {
    const code = codeHandle ? vm.dump(codeHandle) : 0;
    throw new Error(`Process exited with code ${code}`);
  });

  // process.stdout - standard output stream
  const stdoutCode = `
    (function() {
      const stdout = {
        isTTY: false,
        columns: 80,
        rows: 24,
        write: function(str) {
          console.log(str);
          return true;
        },
        hasColors: function(depth) {
          // In browser environment, assume no color support by default
          // Can be overridden based on browser console capabilities
          return false;
        }
      };
      return stdout;
    })()
  `;
  const stdoutResult = vm.evalCode(stdoutCode);
  if (stdoutResult.error) {
    stdoutResult.error.dispose();
    throw new Error('Failed to create stdout');
  }
  vm.setProp(processObj, 'stdout', stdoutResult.value);
  stdoutResult.value.dispose();

  // process.stderr - standard error stream
  const stderrCode = `
    (function() {
      const stderr = {
        isTTY: false,
        columns: 80,
        rows: 24,
        write: function(str) {
          console.error(str);
          return true;
        },
        hasColors: function(depth) {
          // In browser environment, assume no color support by default
          return false;
        }
      };
      return stderr;
    })()
  `;
  const stderrResult = vm.evalCode(stderrCode);
  if (stderrResult.error) {
    stderrResult.error.dispose();
    throw new Error('Failed to create stderr');
  }
  vm.setProp(processObj, 'stderr', stderrResult.value);
  stderrResult.value.dispose();

  // process.stdin - standard input stream (stub)
  const stdinCode = `
    (function() {
      const stdin = {
        isTTY: false,
        read: function() {
          return null;
        },
        pause: function() {},
        resume: function() {},
        setEncoding: function(encoding) {}
      };
      return stdin;
    })()
  `;
  const stdinResult = vm.evalCode(stdinCode);
  if (stdinResult.error) {
    stdinResult.error.dispose();
    throw new Error('Failed to create stdin');
  }
  vm.setProp(processObj, 'stdin', stdinResult.value);
  stdinResult.value.dispose();

  return processObj;
}
