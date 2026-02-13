const { EventEmitter } = require('events');

const emitter = new EventEmitter();
const results = [];

emitter.on('test', (data) => {
  results.push(data);
});

emitter.emit('test', 'first');
emitter.emit('test', 'second');

const listenerCount = emitter.listenerCount('test');

module.exports = {
  results,
  listenerCount,
  hasEventEmitter: EventEmitter !== undefined,
};
