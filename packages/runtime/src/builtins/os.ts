/**
 * OS module implementation
 * Provides Node.js-compatible OS information with browser-appropriate defaults
 */

import type { QuickJSContext, QuickJSHandle } from 'quickjs-emscripten';
import { addModuleFunction } from './helpers.js';

export function createOsModule(vm: QuickJSContext): QuickJSHandle {
  const osObj = vm.newObject();

  // platform() - Returns 'browser' for browser environment
  addModuleFunction(vm, osObj, 'platform', () => {
    return vm.newString('browser');
  });

  // arch() - Returns architecture (use x64 as default)
  addModuleFunction(vm, osObj, 'arch', () => {
    return vm.newString('x64');
  });

  // type() - Returns OS type
  addModuleFunction(vm, osObj, 'type', () => {
    return vm.newString('Browser');
  });

  // release() - Returns OS release version
  addModuleFunction(vm, osObj, 'release', () => {
    // Try to get user agent info if available
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      return vm.newString(navigator.userAgent);
    }
    return vm.newString('unknown');
  });

  // tmpdir() - Returns temp directory path
  addModuleFunction(vm, osObj, 'tmpdir', () => {
    return vm.newString('/tmp');
  });

  // homedir() - Returns home directory path
  addModuleFunction(vm, osObj, 'homedir', () => {
    return vm.newString('/home');
  });

  // hostname() - Returns hostname
  addModuleFunction(vm, osObj, 'hostname', () => {
    if (typeof location !== 'undefined' && location.hostname) {
      return vm.newString(location.hostname);
    }
    return vm.newString('localhost');
  });

  // cpus() - Returns CPU info array
  addModuleFunction(vm, osObj, 'cpus', () => {
    const cpusArray = vm.newArray();

    // Return info based on navigator.hardwareConcurrency if available
    const cores =
      typeof navigator !== 'undefined' && navigator.hardwareConcurrency
        ? navigator.hardwareConcurrency
        : 4;

    for (let i = 0; i < cores; i++) {
      const cpuObj = vm.newObject();

      const modelHandle = vm.newString('Browser CPU');
      vm.setProp(cpuObj, 'model', modelHandle);
      modelHandle.dispose();

      const speedHandle = vm.newNumber(0);
      vm.setProp(cpuObj, 'speed', speedHandle);
      speedHandle.dispose();

      // times object
      const timesObj = vm.newObject();
      const userHandle = vm.newNumber(0);
      const niceHandle = vm.newNumber(0);
      const sysHandle = vm.newNumber(0);
      const idleHandle = vm.newNumber(0);
      const irqHandle = vm.newNumber(0);

      vm.setProp(timesObj, 'user', userHandle);
      vm.setProp(timesObj, 'nice', niceHandle);
      vm.setProp(timesObj, 'sys', sysHandle);
      vm.setProp(timesObj, 'idle', idleHandle);
      vm.setProp(timesObj, 'irq', irqHandle);

      userHandle.dispose();
      niceHandle.dispose();
      sysHandle.dispose();
      idleHandle.dispose();
      irqHandle.dispose();

      vm.setProp(cpuObj, 'times', timesObj);
      timesObj.dispose();

      vm.setProp(cpusArray, i, cpuObj);
      cpuObj.dispose();
    }

    return cpusArray;
  });

  // totalmem() - Returns total memory in bytes
  addModuleFunction(vm, osObj, 'totalmem', () => {
    // Try to get memory info if available
    if (
      typeof performance !== 'undefined' &&
      (performance as any).memory &&
      (performance as any).memory.jsHeapSizeLimit
    ) {
      return vm.newNumber((performance as any).memory.jsHeapSizeLimit);
    }
    // Default to 2GB
    return vm.newNumber(2 * 1024 * 1024 * 1024);
  });

  // freemem() - Returns free memory in bytes
  addModuleFunction(vm, osObj, 'freemem', () => {
    // Try to get memory info if available
    if (
      typeof performance !== 'undefined' &&
      (performance as any).memory &&
      (performance as any).memory.jsHeapSizeLimit &&
      (performance as any).memory.usedJSHeapSize
    ) {
      const total = (performance as any).memory.jsHeapSizeLimit;
      const used = (performance as any).memory.usedJSHeapSize;
      return vm.newNumber(total - used);
    }
    // Default to 1GB
    return vm.newNumber(1024 * 1024 * 1024);
  });

  // uptime() - Returns system uptime in seconds
  addModuleFunction(vm, osObj, 'uptime', () => {
    // Use performance.now() / 1000 as a proxy for uptime
    if (typeof performance !== 'undefined' && performance.now) {
      return vm.newNumber(Math.floor(performance.now() / 1000));
    }
    return vm.newNumber(0);
  });

  // loadavg() - Returns load average array [1, 5, 15 minutes]
  addModuleFunction(vm, osObj, 'loadavg', () => {
    const loadArray = vm.newArray();
    const zero = vm.newNumber(0);
    vm.setProp(loadArray, 0, zero);
    vm.setProp(loadArray, 1, zero);
    vm.setProp(loadArray, 2, zero);
    zero.dispose();
    return loadArray;
  });

  // networkInterfaces() - Returns network interfaces object
  addModuleFunction(vm, osObj, 'networkInterfaces', () => {
    const interfacesObj = vm.newObject();

    // Return empty object - network interfaces not available in browser
    return interfacesObj;
  });

  // endianness() - Returns 'LE' or 'BE'
  addModuleFunction(vm, osObj, 'endianness', () => {
    // Detect endianness
    const buffer = new ArrayBuffer(2);
    new DataView(buffer).setInt16(0, 256, true);
    const isLittleEndian = new Int16Array(buffer)[0] === 256;
    return vm.newString(isLittleEndian ? 'LE' : 'BE');
  });

  // userInfo() - Returns user information
  addModuleFunction(vm, osObj, 'userInfo', () => {
    const userObj = vm.newObject();

    const usernameHandle = vm.newString('user');
    vm.setProp(userObj, 'username', usernameHandle);
    usernameHandle.dispose();

    const uidHandle = vm.newNumber(-1);
    vm.setProp(userObj, 'uid', uidHandle);
    uidHandle.dispose();

    const gidHandle = vm.newNumber(-1);
    vm.setProp(userObj, 'gid', gidHandle);
    gidHandle.dispose();

    const shellHandle = vm.newString('/bin/sh');
    vm.setProp(userObj, 'shell', shellHandle);
    shellHandle.dispose();

    const homedirHandle = vm.newString('/home');
    vm.setProp(userObj, 'homedir', homedirHandle);
    homedirHandle.dispose();

    return userObj;
  });

  // EOL constant - End of line marker
  const eolHandle = vm.newString('\n');
  vm.setProp(osObj, 'EOL', eolHandle);
  eolHandle.dispose();

  // constants object
  const constantsObj = vm.newObject();

  // errno constants (empty for browser)
  const errnoObj = vm.newObject();
  vm.setProp(constantsObj, 'errno', errnoObj);
  errnoObj.dispose();

  // signals constants (empty for browser)
  const signalsObj = vm.newObject();
  vm.setProp(constantsObj, 'signals', signalsObj);
  signalsObj.dispose();

  vm.setProp(osObj, 'constants', constantsObj);
  constantsObj.dispose();

  return osObj;
}
