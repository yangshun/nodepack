import { EventEmitter } from 'events';

const emitter = new EventEmitter();
const results = [];

emitter.on('test', (data) => {
  results.push(data);
});

emitter.emit('test', 'first');
emitter.emit('test', 'second');

const listenerCount = emitter.listenerCount('test');

export default {
  results,
  listenerCount,
  hasEventEmitter: EventEmitter !== undefined,
};
