import { describe, it, expect, beforeEach } from 'vitest';
import { newQuickJSWASMModule } from 'quickjs-emscripten';
import { createEventsModule } from './events.js';

describe('events module', () => {
  let QuickJS: any;
  let runtime: any;
  let vm: any;

  beforeEach(async () => {
    QuickJS = await newQuickJSWASMModule();
    runtime = QuickJS.newRuntime();
    vm = runtime.newContext();
  }, 30000);

  describe('EventEmitter class', () => {
    it('should provide EventEmitter class', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode('typeof events.EventEmitter');
      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');

      vm.dispose();
      runtime.dispose();
    });

    it('should be constructable', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode('new events.EventEmitter()');

      expect(result.error).toBeUndefined();
      result.value.dispose();

      vm.dispose();
      runtime.dispose();
    });

    it('should initialize with empty events object', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        Object.keys(emitter._events).length;
      `);

      const length = vm.dump(result.value);
      result.value.dispose();

      expect(length).toBe(0);

      vm.dispose();
      runtime.dispose();
    });

    it('should set default max listeners', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        emitter._maxListeners;
      `);

      const maxListeners = vm.dump(result.value);
      result.value.dispose();

      expect(maxListeners).toBe(10);

      vm.dispose();
      runtime.dispose();
    });
  });

  describe('on() method', () => {
    it('should register event listener', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        emitter.on('test', () => {});
        emitter._events.test.length;
      `);

      const length = vm.dump(result.value);
      result.value.dispose();

      expect(length).toBe(1);

      vm.dispose();
      runtime.dispose();
    });

    it('should allow multiple listeners for same event', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        emitter.on('test', () => {});
        emitter.on('test', () => {});
        emitter.on('test', () => {});
        emitter._events.test.length;
      `);

      const length = vm.dump(result.value);
      result.value.dispose();

      expect(length).toBe(3);

      vm.dispose();
      runtime.dispose();
    });

    it('should return emitter for chaining', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        const returned = emitter.on('test', () => {});
        returned === emitter;
      `);

      const isSame = vm.dump(result.value);
      result.value.dispose();

      expect(isSame).toBe(true);

      vm.dispose();
      runtime.dispose();
    });
  });

  describe('emit() method', () => {
    it('should call registered listeners', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        let called = false;
        emitter.on('test', () => {
          called = true;
        });
        emitter.emit('test');
        called;
      `);

      const called = vm.dump(result.value);
      result.value.dispose();

      expect(called).toBe(true);

      vm.dispose();
      runtime.dispose();
    });

    it('should pass arguments to listeners', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        let received;
        emitter.on('test', (arg) => {
          received = arg;
        });
        emitter.emit('test', 'hello');
        received;
      `);

      const value = vm.dump(result.value);
      result.value.dispose();

      expect(value).toBe('hello');

      vm.dispose();
      runtime.dispose();
    });

    it('should pass multiple arguments to listeners', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        let result;
        emitter.on('test', (a, b, c) => {
          result = [a, b, c];
        });
        emitter.emit('test', 1, 2, 3);
        JSON.stringify(result);
      `);

      const value = vm.dump(result.value);
      result.value.dispose();

      expect(JSON.parse(value)).toEqual([1, 2, 3]);

      vm.dispose();
      runtime.dispose();
    });

    it('should call all listeners in order', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        const calls = [];
        emitter.on('test', () => calls.push(1));
        emitter.on('test', () => calls.push(2));
        emitter.on('test', () => calls.push(3));
        emitter.emit('test');
        JSON.stringify(calls);
      `);

      const value = vm.dump(result.value);
      result.value.dispose();

      expect(JSON.parse(value)).toEqual([1, 2, 3]);

      vm.dispose();
      runtime.dispose();
    });

    it('should return true if listeners exist', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        emitter.on('test', () => {});
        emitter.emit('test');
      `);

      const returnValue = vm.dump(result.value);
      result.value.dispose();

      expect(returnValue).toBe(true);

      vm.dispose();
      runtime.dispose();
    });

    it('should return false if no listeners exist', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        emitter.emit('test');
      `);

      const returnValue = vm.dump(result.value);
      result.value.dispose();

      expect(returnValue).toBe(false);

      vm.dispose();
      runtime.dispose();
    });
  });

  describe('once() method', () => {
    it('should call listener only once', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        let count = 0;
        emitter.once('test', () => {
          count++;
        });
        emitter.emit('test');
        emitter.emit('test');
        emitter.emit('test');
        count;
      `);

      const count = vm.dump(result.value);
      result.value.dispose();

      expect(count).toBe(1);

      vm.dispose();
      runtime.dispose();
    });

    it('should pass arguments to listener', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        let received;
        emitter.once('test', (arg) => {
          received = arg;
        });
        emitter.emit('test', 'value');
        received;
      `);

      const value = vm.dump(result.value);
      result.value.dispose();

      expect(value).toBe('value');

      vm.dispose();
      runtime.dispose();
    });

    it('should return emitter for chaining', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        const returned = emitter.once('test', () => {});
        returned === emitter;
      `);

      const isSame = vm.dump(result.value);
      result.value.dispose();

      expect(isSame).toBe(true);

      vm.dispose();
      runtime.dispose();
    });
  });

  describe('removeListener() method', () => {
    it('should remove specific listener', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        const listener = () => {};
        emitter.on('test', listener);
        emitter.removeListener('test', listener);
        emitter._events.test.length;
      `);

      const length = vm.dump(result.value);
      result.value.dispose();

      expect(length).toBe(0);

      vm.dispose();
      runtime.dispose();
    });

    it('should only remove first matching listener', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        const listener = () => {};
        emitter.on('test', listener);
        emitter.on('test', listener);
        emitter.removeListener('test', listener);
        emitter._events.test.length;
      `);

      const length = vm.dump(result.value);
      result.value.dispose();

      expect(length).toBe(1);

      vm.dispose();
      runtime.dispose();
    });

    it('should return emitter for chaining', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        const listener = () => {};
        emitter.on('test', listener);
        const returned = emitter.removeListener('test', listener);
        returned === emitter;
      `);

      const isSame = vm.dump(result.value);
      result.value.dispose();

      expect(isSame).toBe(true);

      vm.dispose();
      runtime.dispose();
    });

    it('should handle removing non-existent listener', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        emitter.removeListener('test', () => {});
        true;
      `);

      expect(result.error).toBeUndefined();
      result.value.dispose();

      vm.dispose();
      runtime.dispose();
    });
  });

  describe('removeAllListeners() method', () => {
    it('should remove all listeners for specific event', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        emitter.on('test', () => {});
        emitter.on('test', () => {});
        emitter.removeAllListeners('test');
        emitter._events.test;
      `);

      const value = vm.dump(result.value);
      result.value.dispose();

      expect(value).toBeUndefined();

      vm.dispose();
      runtime.dispose();
    });

    it('should remove all listeners for all events', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        emitter.on('test1', () => {});
        emitter.on('test2', () => {});
        emitter.removeAllListeners();
        Object.keys(emitter._events).length;
      `);

      const length = vm.dump(result.value);
      result.value.dispose();

      expect(length).toBe(0);

      vm.dispose();
      runtime.dispose();
    });

    it('should return emitter for chaining', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        const returned = emitter.removeAllListeners();
        returned === emitter;
      `);

      const isSame = vm.dump(result.value);
      result.value.dispose();

      expect(isSame).toBe(true);

      vm.dispose();
      runtime.dispose();
    });
  });

  describe('setMaxListeners() and getMaxListeners() methods', () => {
    it('should set max listeners', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        emitter.setMaxListeners(20);
        emitter._maxListeners;
      `);

      const maxListeners = vm.dump(result.value);
      result.value.dispose();

      expect(maxListeners).toBe(20);

      vm.dispose();
      runtime.dispose();
    });

    it('should get max listeners', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        emitter.setMaxListeners(15);
        emitter.getMaxListeners();
      `);

      const maxListeners = vm.dump(result.value);
      result.value.dispose();

      expect(maxListeners).toBe(15);

      vm.dispose();
      runtime.dispose();
    });

    it('should return emitter for chaining', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        const returned = emitter.setMaxListeners(20);
        returned === emitter;
      `);

      const isSame = vm.dump(result.value);
      result.value.dispose();

      expect(isSame).toBe(true);

      vm.dispose();
      runtime.dispose();
    });
  });

  describe('listeners() method', () => {
    it('should return array of listeners', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        emitter.on('test', () => {});
        emitter.on('test', () => {});
        emitter.listeners('test').length;
      `);

      const length = vm.dump(result.value);
      result.value.dispose();

      expect(length).toBe(2);

      vm.dispose();
      runtime.dispose();
    });

    it('should return empty array for non-existent event', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        emitter.listeners('test').length;
      `);

      const length = vm.dump(result.value);
      result.value.dispose();

      expect(length).toBe(0);

      vm.dispose();
      runtime.dispose();
    });
  });

  describe('listenerCount() method', () => {
    it('should return count of listeners', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        emitter.on('test', () => {});
        emitter.on('test', () => {});
        emitter.on('test', () => {});
        emitter.listenerCount('test');
      `);

      const count = vm.dump(result.value);
      result.value.dispose();

      expect(count).toBe(3);

      vm.dispose();
      runtime.dispose();
    });

    it('should return zero for non-existent event', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        const emitter = new events.EventEmitter();
        emitter.listenerCount('test');
      `);

      const count = vm.dump(result.value);
      result.value.dispose();

      expect(count).toBe(0);

      vm.dispose();
      runtime.dispose();
    });
  });

  describe('inheritance', () => {
    it('should be extendable', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        class MyEmitter extends events.EventEmitter {
          constructor() {
            super();
          }
        }
        const emitter = new MyEmitter();
        typeof emitter.on;
      `);

      const type = vm.dump(result.value);
      result.value.dispose();

      expect(type).toBe('function');

      vm.dispose();
      runtime.dispose();
    });

    it('should work when extended', () => {
      const eventsHandle = createEventsModule(vm);
      vm.setProp(vm.global, 'events', eventsHandle);
      eventsHandle.dispose();

      const result = vm.evalCode(`
        class MyEmitter extends events.EventEmitter {
          constructor() {
            super();
          }
        }
        const emitter = new MyEmitter();
        let called = false;
        emitter.on('test', () => {
          called = true;
        });
        emitter.emit('test');
        called;
      `);

      const called = vm.dump(result.value);
      result.value.dispose();

      expect(called).toBe(true);

      vm.dispose();
      runtime.dispose();
    });
  });
});
