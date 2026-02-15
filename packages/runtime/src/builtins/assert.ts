/**
 * Node.js assert module shim for QuickJS
 * Provides basic assertion functions for unit testing
 */
import type { QuickJSContext, QuickJSHandle } from 'quickjs-emscripten';

export function createAssertModule(vm: QuickJSContext): QuickJSHandle {
  const assertCode = `
    (function() {
      function deepStrictEqual(actual, expected) {
        if (actual === expected) {
          return true;
        }

        if (actual === null || expected === null ||
            actual === undefined || expected === undefined) {
          return false;
        }

        if (typeof actual !== typeof expected) {
          return false;
        }

        if (typeof actual !== 'object') {
          if (typeof actual === 'number' && isNaN(actual) && isNaN(expected)) {
            return true;
          }
          return false;
        }

        if (Array.isArray(actual) !== Array.isArray(expected)) {
          return false;
        }

        const actualKeys = Object.keys(actual);
        const expectedKeys = Object.keys(expected);

        if (actualKeys.length !== expectedKeys.length) {
          return false;
        }

        for (const key of actualKeys) {
          if (!Object.prototype.hasOwnProperty.call(expected, key)) {
            return false;
          }
          if (!deepStrictEqual(actual[key], expected[key])) {
            return false;
          }
        }

        return true;
      }

      function formatValue(value) {
        if (value === undefined) return 'undefined';
        if (value === null) return 'null';
        if (typeof value === 'string') return JSON.stringify(value);
        if (typeof value === 'object') {
          try {
            return JSON.stringify(value);
          } catch (e) {
            return String(value);
          }
        }
        return String(value);
      }

      class AssertionError extends Error {
        constructor(options) {
          const message = options.message ||
            (options.operator === '==='
              ? 'Expected values to be strictly equal: ' + formatValue(options.actual) + ' !== ' + formatValue(options.expected)
              : options.operator === 'deepStrictEqual'
              ? 'Expected values to be deeply strictly equal: ' + formatValue(options.actual) + ' !== ' + formatValue(options.expected)
              : options.operator === '!=='
              ? 'Expected values to be strictly unequal: ' + formatValue(options.actual)
              : options.operator === 'notDeepStrictEqual'
              ? 'Expected values NOT to be deeply strictly equal: ' + formatValue(options.actual)
              : options.operator === 'ok'
              ? 'The expression evaluated to a falsy value: ' + formatValue(options.actual)
              : options.operator === 'throws'
              ? 'Missing expected exception'
              : options.operator === 'doesNotThrow'
              ? 'Got unwanted exception'
              : 'Assertion failed');
          super(message);
          this.name = 'AssertionError';
          this.actual = options.actual;
          this.expected = options.expected;
          this.operator = options.operator;
        }
      }

      function ok(value, message) {
        if (!value) {
          throw new AssertionError({
            actual: value,
            expected: true,
            operator: 'ok',
            message: message,
          });
        }
      }

      function assert(value, message) {
        ok(value, message);
      }

      assert.ok = ok;

      assert.strictEqual = function strictEqual(actual, expected, message) {
        if (actual !== expected) {
          throw new AssertionError({
            actual: actual,
            expected: expected,
            operator: '===',
            message: message,
          });
        }
      };

      assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
        if (actual === expected) {
          throw new AssertionError({
            actual: actual,
            expected: expected,
            operator: '!==',
            message: message,
          });
        }
      };

      assert.deepStrictEqual = function assertDeepStrictEqual(actual, expected, message) {
        if (!deepStrictEqual(actual, expected)) {
          throw new AssertionError({
            actual: actual,
            expected: expected,
            operator: 'deepStrictEqual',
            message: message,
          });
        }
      };

      assert.notDeepStrictEqual = function notDeepStrictEqual(actual, expected, message) {
        if (deepStrictEqual(actual, expected)) {
          throw new AssertionError({
            actual: actual,
            expected: expected,
            operator: 'notDeepStrictEqual',
            message: message,
          });
        }
      };

      assert.throws = function assertThrows(fn, expected, message) {
        let threw = false;
        let actual;

        try {
          fn();
        } catch (err) {
          threw = true;
          actual = err;
        }

        if (!threw) {
          throw new AssertionError({
            actual: undefined,
            expected: expected,
            operator: 'throws',
            message: message || 'Missing expected exception',
          });
        }

        if (expected !== undefined) {
          if (typeof expected === 'function') {
            if (expected.prototype !== undefined && actual instanceof expected) {
              return;
            }
            if (expected.prototype === undefined) {
              const result = expected(actual);
              if (result === true) {
                return;
              }
            }
            throw new AssertionError({
              actual: actual,
              expected: expected,
              operator: 'throws',
              message: message || 'The error did not match the expected type',
            });
          }

          if (typeof expected === 'object' && expected !== null) {
            for (const key of Object.keys(expected)) {
              if (actual[key] !== expected[key]) {
                throw new AssertionError({
                  actual: actual,
                  expected: expected,
                  operator: 'throws',
                  message: message || 'The error did not match the expected properties',
                });
              }
            }
          }
        }
      };

      assert.doesNotThrow = function doesNotThrow(fn, message) {
        try {
          fn();
        } catch (err) {
          throw new AssertionError({
            actual: err,
            expected: undefined,
            operator: 'doesNotThrow',
            message: message || 'Got unwanted exception: ' + (err && err.message ? err.message : String(err)),
          });
        }
      };

      assert.fail = function fail(message) {
        throw new AssertionError({
          actual: undefined,
          expected: undefined,
          operator: 'fail',
          message: message || 'Failed',
        });
      };

      assert.ifError = function ifError(value) {
        if (value !== null && value !== undefined) {
          throw value instanceof Error ? value : new AssertionError({
            actual: value,
            expected: null,
            operator: 'ifError',
            message: 'ifError got unwanted exception: ' + formatValue(value),
          });
        }
      };

      assert.AssertionError = AssertionError;

      return assert;
    })()
  `;

  const result = vm.evalCode(assertCode);
  if (result.error) {
    const error = vm.dump(result.error);
    result.error.dispose();
    throw new Error(`Failed to create assert module: ${JSON.stringify(error)}`);
  }

  return result.value;
}
