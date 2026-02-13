import { describe, test, expect } from 'vitest';
import { detectModuleFormat } from './format-detector.js';

describe('detectModuleFormat', () => {
  describe('ES Module detection', () => {
    test('detect ES module with import statement', () => {
      const code = `import fs from 'fs';`;
      expect(detectModuleFormat(code)).toBe('esm');
    });

    test('detect ES module with export statement', () => {
      const code = `export function foo() {}`;
      expect(detectModuleFormat(code)).toBe('esm');
    });

    test('detect ES module with export default', () => {
      const code = `export default function() {}`;
      expect(detectModuleFormat(code)).toBe('esm');
    });

    test('detect ES module with named export', () => {
      const code = `export const bar = 123;`;
      expect(detectModuleFormat(code)).toBe('esm');
    });

    test('detect ES module with both import and export', () => {
      const code = `
        import { something } from 'package';
        export function foo() {}
      `;
      expect(detectModuleFormat(code)).toBe('esm');
    });

    test('detect ES module with multiline import', () => {
      const code = `
        import {
          foo,
          bar
        } from 'package';
      `;
      expect(detectModuleFormat(code)).toBe('esm');
    });
  });

  describe('CommonJS detection', () => {
    test('detect CommonJS with require', () => {
      const code = `const fs = require('fs');`;
      expect(detectModuleFormat(code)).toBe('cjs');
    });

    test('detect CommonJS with module.exports', () => {
      const code = `module.exports = { foo: 'bar' };`;
      expect(detectModuleFormat(code)).toBe('cjs');
    });

    test('detect CommonJS with exports assignment', () => {
      const code = `exports.foo = function() {};`;
      expect(detectModuleFormat(code)).toBe('cjs');
    });

    test('detect CommonJS with both require and module.exports', () => {
      const code = `
        const path = require('path');
        module.exports = path;
      `;
      expect(detectModuleFormat(code)).toBe('cjs');
    });

    test('detect CommonJS with require and exports', () => {
      const code = `
        const util = require('util');
        exports.helper = util.format;
      `;
      expect(detectModuleFormat(code)).toBe('cjs');
    });
  });

  describe('Edge cases', () => {
    test('default to ESM for empty code', () => {
      const code = ``;
      expect(detectModuleFormat(code)).toBe('esm');
    });

    test('default to ESM for code without module syntax', () => {
      const code = `const x = 5; console.log(x);`;
      expect(detectModuleFormat(code)).toBe('esm');
    });

    test('prioritize export over require', () => {
      const code = `
        const fs = require('fs');
        export function readFile() {}
      `;
      expect(detectModuleFormat(code)).toBe('esm');
    });

    test('detect CJS when has import but also has module.exports', () => {
      const code = `
        import { foo } from 'bar';
        module.exports = foo;
      `;
      expect(detectModuleFormat(code)).toBe('cjs');
    });

    test('handle require in comments', () => {
      const code = `
        // const fs = require('fs');
        export const x = 1;
      `;
      expect(detectModuleFormat(code)).toBe('esm');
    });

    test('handle require in strings', () => {
      const code = `
        const str = "require('fs')";
        export const x = 1;
      `;
      expect(detectModuleFormat(code)).toBe('esm');
    });
  });
});
