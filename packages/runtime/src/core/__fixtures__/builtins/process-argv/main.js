// Test process.argv
export default {
  argv: process.argv,
  hasArgv: Array.isArray(process.argv),
  argvLength: process.argv.length,
  firstArg: process.argv[0],
  secondArg: process.argv[1],
  thirdArg: process.argv[2],
};
