let uncaughtCount = 0;
let unhandledCount = 0;

process.on('uncaughtException', (error) => {
  uncaughtCount++;
});

process.on('unhandledRejection', (reason) => {
  unhandledCount++;
});

// Test that the listeners were registered
export default {
  hasUncaughtListener: typeof process.on === 'function',
  hasUnhandledListener: typeof process.on === 'function',
  listenerCount: process.listenerCount ? process.listenerCount('uncaughtException') : -1,
};
