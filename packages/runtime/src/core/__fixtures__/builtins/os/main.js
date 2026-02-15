/**
 * ESM os module tests
 */
import os from 'os';
import {
  platform,
  arch,
  type,
  release,
  tmpdir,
  homedir,
  hostname,
  cpus,
  totalmem,
  freemem,
  uptime,
  loadavg,
  networkInterfaces,
  endianness,
  userInfo,
  EOL,
} from 'os';

// Test 1: platform()
const platformResult = platform();

// Test 2: arch()
const archResult = arch();

// Test 3: type()
const typeResult = type();

// Test 4: release()
const releaseResult = release();

// Test 5: tmpdir()
const tmpdirResult = tmpdir();

// Test 6: homedir()
const homedirResult = homedir();

// Test 7: hostname()
const hostnameResult = hostname();

// Test 8: cpus()
const cpusResult = cpus();

// Test 9: totalmem()
const totalmemResult = totalmem();

// Test 10: freemem()
const freememResult = freemem();

// Test 11: uptime()
const uptimeResult = uptime();

// Test 12: loadavg()
const loadavgResult = loadavg();

// Test 13: networkInterfaces()
const networkInterfacesResult = networkInterfaces();

// Test 14: endianness()
const endiannessResult = endianness();

// Test 15: userInfo()
const userInfoResult = userInfo();

// Test 16: EOL constant
const eolResult = EOL;

// Test 17: constants
const constantsResult = os.constants;

export default {
  // Function availability
  hasPlatform: typeof platform === 'function',
  hasArch: typeof arch === 'function',
  hasType: typeof type === 'function',
  hasRelease: typeof release === 'function',
  hasTmpdir: typeof tmpdir === 'function',
  hasHomedir: typeof homedir === 'function',
  hasHostname: typeof hostname === 'function',
  hasCpus: typeof cpus === 'function',
  hasTotalmem: typeof totalmem === 'function',
  hasFreemem: typeof freemem === 'function',
  hasUptime: typeof uptime === 'function',
  hasLoadavg: typeof loadavg === 'function',
  hasNetworkInterfaces: typeof networkInterfaces === 'function',
  hasEndianness: typeof endianness === 'function',
  hasUserInfo: typeof userInfo === 'function',
  hasEOL: typeof EOL === 'string',
  hasOsDefault: typeof os === 'object',

  // Return values are correct types
  platformIsString: typeof platformResult === 'string',
  archIsString: typeof archResult === 'string',
  typeIsString: typeof typeResult === 'string',
  releaseIsString: typeof releaseResult === 'string',
  tmpdirIsString: typeof tmpdirResult === 'string',
  homedirIsString: typeof homedirResult === 'string',
  hostnameIsString: typeof hostnameResult === 'string',
  cpusIsArray: Array.isArray(cpusResult),
  totalmemIsNumber: typeof totalmemResult === 'number',
  freememIsNumber: typeof freememResult === 'number',
  uptimeIsNumber: typeof uptimeResult === 'number',
  loadavgIsArray: Array.isArray(loadavgResult),
  networkInterfacesIsObject: typeof networkInterfacesResult === 'object',
  endiannessIsString: typeof endiannessResult === 'string',
  userInfoIsObject: typeof userInfoResult === 'object',

  // Specific value checks
  platformValue: platformResult,
  archValue: archResult,
  cpusLength: cpusResult.length,
  cpusHasTimes: cpusResult.length > 0 && typeof cpusResult[0].times === 'object',
  loadavgLength: loadavgResult.length,
  endiannessValid: endiannessResult === 'LE' || endiannessResult === 'BE',
  userInfoHasUsername: typeof userInfoResult.username === 'string',
  eolIsNewline: eolResult === '\n',
  hasConstants: typeof constantsResult === 'object',
};
