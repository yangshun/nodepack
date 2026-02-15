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

  // Add async versions of fs functions using QuickJS code
  // These wrap the sync versions in Promises or use callbacks
  const asyncFsCode = `
    // Get the fs object from the module
    const fsSync = globalThis.__nodepack_fs_sync;

    // readFile - async version of readFileSync
    function readFile(path, options, callback) {
      // Handle argument variations
      if (typeof options === 'function') {
        callback = options;
        options = undefined;
      }

      // Parse options
      let encoding = 'utf8';
      if (typeof options === 'string') {
        encoding = options;
      } else if (options && typeof options === 'object') {
        encoding = options.encoding || 'utf8';
      }

      // If callback provided, use callback-based API
      if (typeof callback === 'function') {
        try {
          const result = fsSync.readFileSync(path, encoding);
          callback(null, result);
        } catch (error) {
          callback(error);
        }
        return;
      }

      // Otherwise, return Promise
      return new Promise((resolve, reject) => {
        try {
          const result = fsSync.readFileSync(path, encoding);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    }

    // writeFile - async version of writeFileSync
    function writeFile(path, content, options, callback) {
      // Handle argument variations
      if (typeof options === 'function') {
        callback = options;
        options = undefined;
      }

      // If callback provided, use callback-based API
      if (typeof callback === 'function') {
        try {
          fsSync.writeFileSync(path, content, options);
          callback(null);
        } catch (error) {
          callback(error);
        }
        return;
      }

      // Otherwise, return Promise
      return new Promise((resolve, reject) => {
        try {
          fsSync.writeFileSync(path, content, options);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    }

    // appendFile - async version of appendFileSync
    function appendFile(path, data, options, callback) {
      // Handle argument variations
      if (typeof options === 'function') {
        callback = options;
        options = undefined;
      }

      // If callback provided, use callback-based API
      if (typeof callback === 'function') {
        try {
          fsSync.appendFileSync(path, data, options);
          callback(null);
        } catch (error) {
          callback(error);
        }
        return;
      }

      // Otherwise, return Promise
      return new Promise((resolve, reject) => {
        try {
          fsSync.appendFileSync(path, data, options);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    }

    // readdir - async version of readdirSync
    function readdir(path, options, callback) {
      // Handle argument variations
      if (typeof options === 'function') {
        callback = options;
        options = undefined;
      }

      // If callback provided, use callback-based API
      if (typeof callback === 'function') {
        try {
          const result = fsSync.readdirSync(path, options);
          callback(null, result);
        } catch (error) {
          callback(error);
        }
        return;
      }

      // Otherwise, return Promise
      return new Promise((resolve, reject) => {
        try {
          const result = fsSync.readdirSync(path, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    }

    // mkdir - async version of mkdirSync
    function mkdir(path, options, callback) {
      // Handle argument variations
      if (typeof options === 'function') {
        callback = options;
        options = undefined;
      }

      // If callback provided, use callback-based API
      if (typeof callback === 'function') {
        try {
          fsSync.mkdirSync(path, options);
          callback(null);
        } catch (error) {
          callback(error);
        }
        return;
      }

      // Otherwise, return Promise
      return new Promise((resolve, reject) => {
        try {
          fsSync.mkdirSync(path, options);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    }

    // unlink - async version of unlinkSync
    function unlink(path, callback) {
      // If callback provided, use callback-based API
      if (typeof callback === 'function') {
        try {
          fsSync.unlinkSync(path);
          callback(null);
        } catch (error) {
          callback(error);
        }
        return;
      }

      // Otherwise, return Promise
      return new Promise((resolve, reject) => {
        try {
          fsSync.unlinkSync(path);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    }

    // stat - async version of statSync
    function stat(path, options, callback) {
      // Handle argument variations
      if (typeof options === 'function') {
        callback = options;
        options = undefined;
      }

      // If callback provided, use callback-based API
      if (typeof callback === 'function') {
        try {
          const result = fsSync.statSync(path, options);
          callback(null, result);
        } catch (error) {
          callback(error);
        }
        return;
      }

      // Otherwise, return Promise
      return new Promise((resolve, reject) => {
        try {
          const result = fsSync.statSync(path, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    }

    // lstat - async version of lstatSync
    function lstat(path, options, callback) {
      // Handle argument variations
      if (typeof options === 'function') {
        callback = options;
        options = undefined;
      }

      // If callback provided, use callback-based API
      if (typeof callback === 'function') {
        try {
          const result = fsSync.lstatSync(path, options);
          callback(null, result);
        } catch (error) {
          callback(error);
        }
        return;
      }

      // Otherwise, return Promise
      return new Promise((resolve, reject) => {
        try {
          const result = fsSync.lstatSync(path, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    }

    // copyFile - async version of copyFileSync
    function copyFile(src, dest, flags, callback) {
      // Handle argument variations
      if (typeof flags === 'function') {
        callback = flags;
        flags = undefined;
      }

      // If callback provided, use callback-based API
      if (typeof callback === 'function') {
        try {
          fsSync.copyFileSync(src, dest, flags);
          callback(null);
        } catch (error) {
          callback(error);
        }
        return;
      }

      // Otherwise, return Promise
      return new Promise((resolve, reject) => {
        try {
          fsSync.copyFileSync(src, dest, flags);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    }

    // rename - async version of renameSync
    function rename(oldPath, newPath, callback) {
      // If callback provided, use callback-based API
      if (typeof callback === 'function') {
        try {
          fsSync.renameSync(oldPath, newPath);
          callback(null);
        } catch (error) {
          callback(error);
        }
        return;
      }

      // Otherwise, return Promise
      return new Promise((resolve, reject) => {
        try {
          fsSync.renameSync(oldPath, newPath);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    }

    // rmdir - async version of rmdirSync
    function rmdir(path, options, callback) {
      // Handle argument variations
      if (typeof options === 'function') {
        callback = options;
        options = undefined;
      }

      // If callback provided, use callback-based API
      if (typeof callback === 'function') {
        try {
          fsSync.rmdirSync(path, options);
          callback(null);
        } catch (error) {
          callback(error);
        }
        return;
      }

      // Otherwise, return Promise
      return new Promise((resolve, reject) => {
        try {
          fsSync.rmdirSync(path, options);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    }

    // rm - async version of rmSync
    function rm(path, options, callback) {
      // Handle argument variations
      if (typeof options === 'function') {
        callback = options;
        options = undefined;
      }

      // If callback provided, use callback-based API
      if (typeof callback === 'function') {
        try {
          fsSync.rmSync(path, options);
          callback(null);
        } catch (error) {
          callback(error);
        }
        return;
      }

      // Otherwise, return Promise
      return new Promise((resolve, reject) => {
        try {
          fsSync.rmSync(path, options);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    }

    // access - async version of accessSync
    function access(path, mode, callback) {
      // Handle argument variations
      if (typeof mode === 'function') {
        callback = mode;
        mode = undefined;
      }

      // If callback provided, use callback-based API
      if (typeof callback === 'function') {
        try {
          fsSync.accessSync(path, mode);
          callback(null);
        } catch (error) {
          callback(error);
        }
        return;
      }

      // Otherwise, return Promise
      return new Promise((resolve, reject) => {
        try {
          fsSync.accessSync(path, mode);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    }

    // realpath - async version of realpathSync
    function realpath(path, options, callback) {
      // Handle argument variations
      if (typeof options === 'function') {
        callback = options;
        options = undefined;
      }

      // If callback provided, use callback-based API
      if (typeof callback === 'function') {
        try {
          const result = fsSync.realpathSync(path, options);
          callback(null, result);
        } catch (error) {
          callback(error);
        }
        return;
      }

      // Otherwise, return Promise
      return new Promise((resolve, reject) => {
        try {
          const result = fsSync.realpathSync(path, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    }

    // exists - async version of existsSync
    function exists(path, callback) {
      // If callback provided, use callback-based API
      // Note: exists is deprecated with callback, but we support it for compatibility
      if (typeof callback === 'function') {
        try {
          const result = fsSync.existsSync(path);
          callback(result);
        } catch (error) {
          callback(false);
        }
        return;
      }

      // Otherwise, return Promise
      return new Promise((resolve) => {
        try {
          const result = fsSync.existsSync(path);
          resolve(result);
        } catch (error) {
          resolve(false);
        }
      });
    }

    const asyncFs = {
      readFile,
      writeFile,
      appendFile,
      readdir,
      mkdir,
      unlink,
      stat,
      lstat,
      copyFile,
      rename,
      rmdir,
      rm,
      access,
      realpath,
      exists,
    };

    asyncFs;
  `;

  // Store sync version globally for async wrappers to use
  vm.setProp(vm.global, '__nodepack_fs_sync', fsObj);

  // Evaluate async fs functions
  const asyncResult = vm.evalCode(asyncFsCode);
  if (asyncResult.error) {
    const error = vm.dump(asyncResult.error);
    asyncResult.error.dispose();
    throw new Error(`Failed to create async fs functions: ${error}`);
  }

  const asyncFsHandle = asyncResult.value;

  // Add async functions to the main fs object
  const asyncFunctions = [
    'readFile',
    'writeFile',
    'appendFile',
    'readdir',
    'mkdir',
    'unlink',
    'stat',
    'lstat',
    'copyFile',
    'rename',
    'rmdir',
    'rm',
    'access',
    'realpath',
    'exists',
  ];

  for (const funcName of asyncFunctions) {
    const funcHandle = vm.getProp(asyncFsHandle, funcName);
    vm.setProp(fsObj, funcName, funcHandle);
    funcHandle.dispose();
  }

  asyncFsHandle.dispose();

  return fsObj;
}
