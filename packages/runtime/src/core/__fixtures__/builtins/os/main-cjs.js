/**
 * CommonJS os module tests
 */
const os = require('os');
const { platform, arch, cpus, EOL } = require('os');

// Also test node: protocol
const osNode = require('node:os');

// Test basic functions
const platformResult = platform();
const archResult = arch();
const cpusResult = cpus();
const eolResult = EOL;

// Test node: protocol works
const nodeProtocolPlatform = osNode.platform();

module.exports = {
  // Function availability
  hasPlatform: typeof platform === 'function',
  hasArch: typeof arch === 'function',
  hasEOL: typeof EOL === 'string',
  hasOsDefault: typeof os === 'object',

  // Return values are correct types
  platformIsString: typeof platformResult === 'string',
  archIsString: typeof archResult === 'string',
  cpusIsArray: Array.isArray(cpusResult),

  // Specific checks
  platformValue: platformResult,
  archValue: archResult,
  eolIsNewline: eolResult === '\n',

  // node: protocol test
  nodeProtocolWorks: nodeProtocolPlatform === platformResult,
};
