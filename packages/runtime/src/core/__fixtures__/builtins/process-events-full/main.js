let uncaughtExceptionCaught = false;
let unhandledRejectionCaught = false;

process.on('uncaughtException', (error) => {
  console.error('Unexpected error:', error.message);
  uncaughtExceptionCaught = true;
  // Note: In real Node.js, process.exit(1) would terminate
  // For testing, we just set a flag
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  unhandledRejectionCaught = true;
});

// Test that listeners are registered
const hasOnMethod = typeof process.on === 'function';
const hasEmitMethod = typeof process.emit === 'function';
const listenerCount = process.listenerCount('uncaughtException');

export default {
  hasOnMethod,
  hasEmitMethod,
  listenerCount,
  uncaughtExceptionCaught,
  unhandledRejectionCaught,
};
