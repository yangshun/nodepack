import { describe, test, expect, beforeEach } from 'vitest';
import { newQuickJSWASMModule } from 'quickjs-emscripten';
import { createUrlModule } from './url.js';

describe('url module', () => {
  let QuickJS: any;
  let runtime: any;
  let vm: any;

  beforeEach(async () => {
    QuickJS = await newQuickJSWASMModule();
    runtime = QuickJS.newRuntime();
    vm = runtime.newContext();
  }, 30000);

  describe('fileURLToPath', () => {
    test('provide fileURLToPath function', () => {
      const urlHandle = createUrlModule(vm);
      vm.setProp(vm.global, 'url', urlHandle);
      urlHandle.dispose();

      const result = vm.evalCode('typeof url.fileURLToPath');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');

      vm.dispose();
      runtime.dispose();
    });

    test('convert file:// URL to path', () => {
      const urlHandle = createUrlModule(vm);
      vm.setProp(vm.global, 'url', urlHandle);
      urlHandle.dispose();

      const result = vm.evalCode(`url.fileURLToPath('file:///path/to/file.js')`);

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw new Error(`Evaluation failed: ${JSON.stringify(error)}`);
      }

      const path = vm.dump(result.value);
      result.value.dispose();

      expect(path).toBe('/path/to/file.js');

      vm.dispose();
      runtime.dispose();
    });

    test('handle file:// URL with localhost', () => {
      const urlHandle = createUrlModule(vm);
      vm.setProp(vm.global, 'url', urlHandle);
      urlHandle.dispose();

      const result = vm.evalCode(`url.fileURLToPath('file://localhost/path/to/file.js')`);

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw new Error(`Evaluation failed: ${JSON.stringify(error)}`);
      }

      const path = vm.dump(result.value);
      result.value.dispose();

      expect(path).toBe('localhost/path/to/file.js');

      vm.dispose();
      runtime.dispose();
    });

    test('handle regular path without file:// prefix', () => {
      const urlHandle = createUrlModule(vm);
      vm.setProp(vm.global, 'url', urlHandle);
      urlHandle.dispose();

      const result = vm.evalCode(`url.fileURLToPath('/path/to/file.js')`);

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw new Error(`Evaluation failed: ${JSON.stringify(error)}`);
      }

      const path = vm.dump(result.value);
      result.value.dispose();

      expect(path).toBe('/path/to/file.js');

      vm.dispose();
      runtime.dispose();
    });

    test('handle relative paths', () => {
      const urlHandle = createUrlModule(vm);
      vm.setProp(vm.global, 'url', urlHandle);
      urlHandle.dispose();

      const result = vm.evalCode(`url.fileURLToPath('./relative/path.js')`);

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw new Error(`Evaluation failed: ${JSON.stringify(error)}`);
      }

      const path = vm.dump(result.value);
      result.value.dispose();

      expect(path).toBe('./relative/path.js');

      vm.dispose();
      runtime.dispose();
    });

    test('handle undefined input', () => {
      const urlHandle = createUrlModule(vm);
      vm.setProp(vm.global, 'url', urlHandle);
      urlHandle.dispose();

      const result = vm.evalCode(`url.fileURLToPath(undefined)`);

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw new Error(`Evaluation failed: ${JSON.stringify(error)}`);
      }

      const path = vm.dump(result.value);
      result.value.dispose();

      expect(path).toBe('/index.js');

      vm.dispose();
      runtime.dispose();
    });

    test('handle null input', () => {
      const urlHandle = createUrlModule(vm);
      vm.setProp(vm.global, 'url', urlHandle);
      urlHandle.dispose();

      const result = vm.evalCode(`url.fileURLToPath(null)`);

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw new Error(`Evaluation failed: ${JSON.stringify(error)}`);
      }

      const path = vm.dump(result.value);
      result.value.dispose();

      expect(path).toBe('/index.js');

      vm.dispose();
      runtime.dispose();
    });

    test('handle empty string input', () => {
      const urlHandle = createUrlModule(vm);
      vm.setProp(vm.global, 'url', urlHandle);
      urlHandle.dispose();

      const result = vm.evalCode(`url.fileURLToPath('')`);

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw new Error(`Evaluation failed: ${JSON.stringify(error)}`);
      }

      const path = vm.dump(result.value);
      result.value.dispose();

      expect(path).toBe('/index.js');

      vm.dispose();
      runtime.dispose();
    });

    test('handle Windows-style file:// URLs', () => {
      const urlHandle = createUrlModule(vm);
      vm.setProp(vm.global, 'url', urlHandle);
      urlHandle.dispose();

      const result = vm.evalCode(`url.fileURLToPath('file:///C:/path/to/file.js')`);

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw new Error(`Evaluation failed: ${JSON.stringify(error)}`);
      }

      const path = vm.dump(result.value);
      result.value.dispose();

      // In browser environment, we strip file:// but keep the path structure
      expect(path).toBe('/C:/path/to/file.js');

      vm.dispose();
      runtime.dispose();
    });

    test('handle URLs with query parameters', () => {
      const urlHandle = createUrlModule(vm);
      vm.setProp(vm.global, 'url', urlHandle);
      urlHandle.dispose();

      const result = vm.evalCode(`url.fileURLToPath('file:///path/to/file.js?query=value')`);

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw new Error(`Evaluation failed: ${JSON.stringify(error)}`);
      }

      const path = vm.dump(result.value);
      result.value.dispose();

      expect(path).toBe('/path/to/file.js?query=value');

      vm.dispose();
      runtime.dispose();
    });

    test('handle URLs with hash fragments', () => {
      const urlHandle = createUrlModule(vm);
      vm.setProp(vm.global, 'url', urlHandle);
      urlHandle.dispose();

      const result = vm.evalCode(`url.fileURLToPath('file:///path/to/file.js#section')`);

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw new Error(`Evaluation failed: ${JSON.stringify(error)}`);
      }

      const path = vm.dump(result.value);
      result.value.dispose();

      expect(path).toBe('/path/to/file.js#section');

      vm.dispose();
      runtime.dispose();
    });

    test('handle percent-encoded URLs', () => {
      const urlHandle = createUrlModule(vm);
      vm.setProp(vm.global, 'url', urlHandle);
      urlHandle.dispose();

      const result = vm.evalCode(`url.fileURLToPath('file:///path%20with%20spaces/file.js')`);

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw new Error(`Evaluation failed: ${JSON.stringify(error)}`);
      }

      const path = vm.dump(result.value);
      result.value.dispose();

      expect(path).toBe('/path%20with%20spaces/file.js');

      vm.dispose();
      runtime.dispose();
    });

    test('convert object to string', () => {
      const urlHandle = createUrlModule(vm);
      vm.setProp(vm.global, 'url', urlHandle);
      urlHandle.dispose();

      const result = vm.evalCode(`
        const urlObj = { toString: () => 'file:///path/to/file.js' };
        url.fileURLToPath(urlObj);
      `);

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw new Error(`Evaluation failed: ${JSON.stringify(error)}`);
      }

      const path = vm.dump(result.value);
      result.value.dispose();

      // Objects are converted using String() which returns [object Object] in QuickJS
      expect(path).toBe('[object Object]');

      vm.dispose();
      runtime.dispose();
    });

    test('handle deep paths', () => {
      const urlHandle = createUrlModule(vm);
      vm.setProp(vm.global, 'url', urlHandle);
      urlHandle.dispose();

      const result = vm.evalCode(
        `url.fileURLToPath('file:///very/deep/nested/path/to/some/file.js')`,
      );

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw new Error(`Evaluation failed: ${JSON.stringify(error)}`);
      }

      const path = vm.dump(result.value);
      result.value.dispose();

      expect(path).toBe('/very/deep/nested/path/to/some/file.js');

      vm.dispose();
      runtime.dispose();
    });

    test('handle special characters in path', () => {
      const urlHandle = createUrlModule(vm);
      vm.setProp(vm.global, 'url', urlHandle);
      urlHandle.dispose();

      const result = vm.evalCode(`url.fileURLToPath('file:///path/with-dashes_and.dots/file.js')`);

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw new Error(`Evaluation failed: ${JSON.stringify(error)}`);
      }

      const path = vm.dump(result.value);
      result.value.dispose();

      expect(path).toBe('/path/with-dashes_and.dots/file.js');

      vm.dispose();
      runtime.dispose();
    });
  });

  describe('module integration', () => {
    test('be usable with require', () => {
      const urlHandle = createUrlModule(vm);
      vm.setProp(vm.global, '__nodepack_url', urlHandle);
      urlHandle.dispose();

      const result = vm.evalCode(`
        globalThis.__nodepack_module_cache = {};
        globalThis.require = (id) => {
          if (id === 'url') {
            return __nodepack_url;
          }
        };
        const url = require('url');
        typeof url.fileURLToPath;
      `);

      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');

      vm.dispose();
      runtime.dispose();
    });
  });
});
