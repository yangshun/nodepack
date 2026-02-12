/**
 * Events module stub
 * Provides minimal EventEmitter for compatibility
 */

import type { QuickJSContext, QuickJSHandle } from 'quickjs-emscripten';

export function createEventsModule(vm: QuickJSContext): QuickJSHandle {
  const eventsObj = vm.newObject();

  // Evaluate EventEmitter class directly in QuickJS
  // This creates a proper ES6 class that can be extended
  const eventEmitterCode = `
    class EventEmitter {
      constructor() {
        this._events = {};
        this._maxListeners = 10;
      }

      on(event, listener) {
        if (!this._events[event]) {
          this._events[event] = [];
        }
        this._events[event].push(listener);
        return this;
      }

      emit(event, ...args) {
        const listeners = this._events[event];
        if (!listeners || listeners.length === 0) {
          return false;
        }
        for (const listener of listeners) {
          listener.apply(this, args);
        }
        return true;
      }

      once(event, listener) {
        const onceWrapper = (...args) => {
          listener.apply(this, args);
          this.removeListener(event, onceWrapper);
        };
        return this.on(event, onceWrapper);
      }

      removeListener(event, listener) {
        const listeners = this._events[event];
        if (!listeners) {
          return this;
        }
        const index = listeners.indexOf(listener);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
        return this;
      }

      removeAllListeners(event) {
        if (event) {
          delete this._events[event];
        } else {
          this._events = {};
        }
        return this;
      }

      setMaxListeners(n) {
        this._maxListeners = n;
        return this;
      }

      getMaxListeners() {
        return this._maxListeners;
      }

      listeners(event) {
        return this._events[event] || [];
      }

      listenerCount(event) {
        const listeners = this._events[event];
        return listeners ? listeners.length : 0;
      }
    }

    EventEmitter;
  `;

  const result = vm.evalCode(eventEmitterCode);
  if (result.error) {
    const error = vm.dump(result.error);
    result.error.dispose();
    throw new Error(`Failed to create EventEmitter: ${error}`);
  }

  // Get the EventEmitter class
  vm.setProp(eventsObj, 'EventEmitter', result.value);
  result.value.dispose();

  return eventsObj;
}
