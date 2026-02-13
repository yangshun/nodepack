/**
 * Node.js fs module implementation using memfs
 */
import type { QuickJSContext, QuickJSHandle } from 'quickjs-emscripten';
import { addModuleFunction } from './helpers.js';

export function createFsModule(vm: QuickJSContext, filesystem: any): QuickJSHandle {
  const fsObj = vm.newObject();

  // readFileSync(path, encoding)
  addModuleFunction(vm, fsObj, 'readFileSync', (pathHandle, encodingHandle) => {
    const path = vm.dump(pathHandle);
    const encoding = encodingHandle ? vm.dump(encodingHandle) : 'utf8';

    if (typeof path !== 'string') {
      throw new Error('Path must be a string');
    }

    try {
      const content = filesystem.readFileSync(path, encoding === 'utf8' ? 'utf8' : undefined);

      if (typeof content === 'string') {
        return vm.newString(content);
      } else {
        // Return buffer as Uint8Array for binary content
        const arrayHandle = vm.newArray();
        for (let i = 0; i < content.length; i++) {
          const numHandle = vm.newNumber(content[i]);
          vm.setProp(arrayHandle, i, numHandle);
          numHandle.dispose();
        }
        return arrayHandle;
      }
    } catch (error: any) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
  });

  // writeFileSync(path, content)
  addModuleFunction(vm, fsObj, 'writeFileSync', (pathHandle, contentHandle) => {
    const path = vm.dump(pathHandle);
    const content = vm.dump(contentHandle);

    if (typeof path !== 'string') {
      throw new Error('Path must be a string');
    }

    try {
      // Ensure parent directory exists
      const dir = path.substring(0, path.lastIndexOf('/'));
      if (dir && !filesystem.existsSync(dir)) {
        filesystem.mkdirSync(dir, { recursive: true });
      }

      filesystem.writeFileSync(path, content);
      return vm.undefined;
    } catch (error: any) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  });

  // existsSync(path)
  addModuleFunction(vm, fsObj, 'existsSync', (pathHandle) => {
    const path = vm.dump(pathHandle);

    if (typeof path !== 'string') {
      throw new Error('Path must be a string');
    }

    const exists = filesystem.existsSync(path);
    return exists ? vm.true : vm.false;
  });

  // readdirSync(path)
  addModuleFunction(vm, fsObj, 'readdirSync', (pathHandle) => {
    const path = vm.dump(pathHandle);

    if (typeof path !== 'string') {
      throw new Error('Path must be a string');
    }

    try {
      const files = filesystem.readdirSync(path) as string[];
      const arrayHandle = vm.newArray();

      files.forEach((file, index) => {
        const strHandle = vm.newString(file);
        vm.setProp(arrayHandle, index, strHandle);
        strHandle.dispose();
      });

      return arrayHandle;
    } catch (error: any) {
      throw new Error(`ENOENT: no such file or directory, scandir '${path}'`);
    }
  });

  // mkdirSync(path, options)
  addModuleFunction(vm, fsObj, 'mkdirSync', (pathHandle, optionsHandle) => {
    const path = vm.dump(pathHandle);
    const options = optionsHandle ? vm.dump(optionsHandle) : { recursive: false };

    if (typeof path !== 'string') {
      throw new Error('Path must be a string');
    }

    try {
      filesystem.mkdirSync(path, options);
      return vm.undefined;
    } catch (error: any) {
      throw new Error(`Failed to create directory: ${error.message}`);
    }
  });

  // unlinkSync(path)
  addModuleFunction(vm, fsObj, 'unlinkSync', (pathHandle) => {
    const path = vm.dump(pathHandle);

    if (typeof path !== 'string') {
      throw new Error('Path must be a string');
    }

    try {
      filesystem.unlinkSync(path);
      return vm.undefined;
    } catch (error: any) {
      throw new Error(`ENOENT: no such file or directory, unlink '${path}'`);
    }
  });

  // Helper function to convert stats to QuickJS object
  const convertStatsToObject = (stats: any, vm: QuickJSContext): QuickJSHandle => {
    const statsObj = vm.newObject();

    // Add common stat properties
    const props = [
      'dev',
      'ino',
      'mode',
      'nlink',
      'uid',
      'gid',
      'rdev',
      'size',
      'blksize',
      'blocks',
      'atimeMs',
      'mtimeMs',
      'ctimeMs',
      'birthtimeMs',
    ];

    for (const prop of props) {
      if (stats[prop] !== undefined) {
        const value = vm.newNumber(stats[prop]);
        vm.setProp(statsObj, prop, value);
        value.dispose();
      }
    }

    // Add date objects
    if (stats.atime) {
      const atimeStr = vm.newString(stats.atime.toISOString());
      vm.setProp(statsObj, 'atime', atimeStr);
      atimeStr.dispose();
    }
    if (stats.mtime) {
      const mtimeStr = vm.newString(stats.mtime.toISOString());
      vm.setProp(statsObj, 'mtime', mtimeStr);
      mtimeStr.dispose();
    }
    if (stats.ctime) {
      const ctimeStr = vm.newString(stats.ctime.toISOString());
      vm.setProp(statsObj, 'ctime', ctimeStr);
      ctimeStr.dispose();
    }
    if (stats.birthtime) {
      const birthtimeStr = vm.newString(stats.birthtime.toISOString());
      vm.setProp(statsObj, 'birthtime', birthtimeStr);
      birthtimeStr.dispose();
    }

    // Add stat check methods as functions
    const isFileCode = vm.evalCode(`(function() { return ${stats.isFile()}; })`);
    if (!isFileCode.error) {
      vm.setProp(statsObj, 'isFile', isFileCode.value);
      isFileCode.value.dispose();
    }

    const isDirCode = vm.evalCode(`(function() { return ${stats.isDirectory()}; })`);
    if (!isDirCode.error) {
      vm.setProp(statsObj, 'isDirectory', isDirCode.value);
      isDirCode.value.dispose();
    }

    const isSymLinkCode = vm.evalCode(`(function() { return ${stats.isSymbolicLink()}; })`);
    if (!isSymLinkCode.error) {
      vm.setProp(statsObj, 'isSymbolicLink', isSymLinkCode.value);
      isSymLinkCode.value.dispose();
    }

    return statsObj;
  };

  // statSync(path) - Get file stats (follows symlinks)
  addModuleFunction(vm, fsObj, 'statSync', (pathHandle) => {
    const path = vm.dump(pathHandle);

    if (typeof path !== 'string') {
      throw new Error('Path must be a string');
    }

    try {
      const stats = filesystem.statSync(path);
      return convertStatsToObject(stats, vm);
    } catch (error: any) {
      throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
    }
  });

  // lstatSync(path) - Get file stats (for symlinks, returns link stats)
  addModuleFunction(vm, fsObj, 'lstatSync', (pathHandle) => {
    const path = vm.dump(pathHandle);

    if (typeof path !== 'string') {
      throw new Error('Path must be a string');
    }

    try {
      const stats = filesystem.lstatSync(path);
      return convertStatsToObject(stats, vm);
    } catch (error: any) {
      throw new Error(`ENOENT: no such file or directory, lstat '${path}'`);
    }
  });

  // appendFileSync(path, data, options)
  addModuleFunction(vm, fsObj, 'appendFileSync', (pathHandle, dataHandle, optionsHandle) => {
    const path = vm.dump(pathHandle);
    const data = vm.dump(dataHandle);
    const options = optionsHandle ? vm.dump(optionsHandle) : { encoding: 'utf8' };

    if (typeof path !== 'string') {
      throw new Error('Path must be a string');
    }

    try {
      filesystem.appendFileSync(path, data, options);
      return vm.undefined;
    } catch (error: any) {
      throw new Error(`Failed to append file: ${error.message}`);
    }
  });

  // copyFileSync(src, dest, flags)
  addModuleFunction(vm, fsObj, 'copyFileSync', (srcHandle, destHandle, flagsHandle) => {
    const src = vm.dump(srcHandle);
    const dest = vm.dump(destHandle);
    const flags = flagsHandle ? vm.dump(flagsHandle) : 0;

    if (typeof src !== 'string' || typeof dest !== 'string') {
      throw new Error('Source and destination must be strings');
    }

    try {
      filesystem.copyFileSync(src, dest, flags);
      return vm.undefined;
    } catch (error: any) {
      throw new Error(`Failed to copy file: ${error.message}`);
    }
  });

  // renameSync(oldPath, newPath)
  addModuleFunction(vm, fsObj, 'renameSync', (oldPathHandle, newPathHandle) => {
    const oldPath = vm.dump(oldPathHandle);
    const newPath = vm.dump(newPathHandle);

    if (typeof oldPath !== 'string' || typeof newPath !== 'string') {
      throw new Error('Old path and new path must be strings');
    }

    try {
      filesystem.renameSync(oldPath, newPath);
      return vm.undefined;
    } catch (error: any) {
      throw new Error(`Failed to rename: ${error.message}`);
    }
  });

  // rmdirSync(path, options)
  addModuleFunction(vm, fsObj, 'rmdirSync', (pathHandle, optionsHandle) => {
    const path = vm.dump(pathHandle);
    const options = optionsHandle ? vm.dump(optionsHandle) : {};

    if (typeof path !== 'string') {
      throw new Error('Path must be a string');
    }

    try {
      filesystem.rmdirSync(path, options);
      return vm.undefined;
    } catch (error: any) {
      throw new Error(`Failed to remove directory: ${error.message}`);
    }
  });

  // rmSync(path, options) - Remove files and directories
  addModuleFunction(vm, fsObj, 'rmSync', (pathHandle, optionsHandle) => {
    const path = vm.dump(pathHandle);
    const options = optionsHandle ? vm.dump(optionsHandle) : {};

    if (typeof path !== 'string') {
      throw new Error('Path must be a string');
    }

    try {
      // rmSync is newer, use it if available, otherwise fallback to rmdirSync or unlinkSync
      if (filesystem.rmSync) {
        filesystem.rmSync(path, options);
      } else {
        // Fallback: check if it's a directory or file
        const stats = filesystem.statSync(path);
        if (stats.isDirectory()) {
          filesystem.rmdirSync(path, { recursive: options.recursive });
        } else {
          filesystem.unlinkSync(path);
        }
      }
      return vm.undefined;
    } catch (error: any) {
      throw new Error(`Failed to remove: ${error.message}`);
    }
  });

  // accessSync(path, mode) - Test file access permissions
  addModuleFunction(vm, fsObj, 'accessSync', (pathHandle, modeHandle) => {
    const path = vm.dump(pathHandle);
    const mode = modeHandle ? vm.dump(modeHandle) : 0; // F_OK by default

    if (typeof path !== 'string') {
      throw new Error('Path must be a string');
    }

    try {
      filesystem.accessSync(path, mode);
      return vm.undefined;
    } catch (error: any) {
      throw new Error(`EACCES: permission denied, access '${path}'`);
    }
  });

  // realpathSync(path, options) - Resolve path to absolute path
  addModuleFunction(vm, fsObj, 'realpathSync', (pathHandle, optionsHandle) => {
    const path = vm.dump(pathHandle);
    const options = optionsHandle ? vm.dump(optionsHandle) : { encoding: 'utf8' };

    if (typeof path !== 'string') {
      throw new Error('Path must be a string');
    }

    try {
      const realpath = filesystem.realpathSync(path, options);
      return vm.newString(realpath);
    } catch (error: any) {
      throw new Error(`ENOENT: no such file or directory, realpath '${path}'`);
    }
  });

  // Add fs constants
  const constantsObj = vm.newObject();
  const constants = {
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
  };

  for (const [key, value] of Object.entries(constants)) {
    const numHandle = vm.newNumber(value);
    vm.setProp(constantsObj, key, numHandle);
    numHandle.dispose();
  }
  vm.setProp(fsObj, 'constants', constantsObj);
  constantsObj.dispose();

  return fsObj;
}
