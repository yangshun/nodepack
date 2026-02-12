/**
 * Node.js path module implementation using path-browserify
 */
import type { QuickJSContext, QuickJSHandle } from 'quickjs-emscripten';
// @ts-ignore - path-browserify doesn't have type declarations
import pathBrowserify from 'path-browserify';
import { addModuleFunction } from './helpers.js';

export function createPathModule(vm: QuickJSContext): QuickJSHandle {
  const pathObj = vm.newObject();

  // join(...paths)
  addModuleFunction(vm, pathObj, 'join', (...pathHandles) => {
    const paths = pathHandles.map((handle) => {
      const value = vm.dump(handle);
      return String(value);
    });

    const result = pathBrowserify.join(...paths);
    return vm.newString(result);
  });

  // dirname(path)
  addModuleFunction(vm, pathObj, 'dirname', (pathHandle) => {
    const path = vm.dump(pathHandle);

    if (typeof path !== 'string') {
      throw new Error('Path must be a string');
    }

    const result = pathBrowserify.dirname(path);
    return vm.newString(result);
  });

  // basename(path, ext)
  addModuleFunction(vm, pathObj, 'basename', (pathHandle, extHandle) => {
    const path = vm.dump(pathHandle);
    const ext = extHandle ? vm.dump(extHandle) : undefined;

    if (typeof path !== 'string') {
      throw new Error('Path must be a string');
    }

    const result = pathBrowserify.basename(path, ext);
    return vm.newString(result);
  });

  // extname(path)
  addModuleFunction(vm, pathObj, 'extname', (pathHandle) => {
    const path = vm.dump(pathHandle);

    if (typeof path !== 'string') {
      throw new Error('Path must be a string');
    }

    const result = pathBrowserify.extname(path);
    return vm.newString(result);
  });

  // resolve(...paths)
  addModuleFunction(vm, pathObj, 'resolve', (...pathHandles) => {
    const paths = pathHandles.map((handle) => {
      const value = vm.dump(handle);
      return String(value);
    });

    const result = pathBrowserify.resolve(...paths);
    return vm.newString(result);
  });

  // normalize(path)
  addModuleFunction(vm, pathObj, 'normalize', (pathHandle) => {
    const path = vm.dump(pathHandle);

    if (typeof path !== 'string') {
      throw new Error('Path must be a string');
    }

    const result = pathBrowserify.normalize(path);
    return vm.newString(result);
  });

  // sep property
  const sepHandle = vm.newString(pathBrowserify.sep);
  vm.setProp(pathObj, 'sep', sepHandle);
  sepHandle.dispose();

  return pathObj;
}
