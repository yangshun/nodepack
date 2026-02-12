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

  return fsObj;
}
