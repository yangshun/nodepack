import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { NodepackRuntime } from '../../runtime.js';
import { loadFixture } from '../fixture-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('NodepackRuntime - Built-in modules', () => {
  let runtime: NodepackRuntime;

  beforeAll(async () => {
    runtime = new NodepackRuntime();
    await runtime.initialize();
  }, 30000);

  test('support path module (ESM)', async () => {
    const fixture = loadFixture('builtins/path');
    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data.joined).toBe('/foo/bar/baz');
    expect(result.data.basename).toBe('file.txt');
    expect(result.data.dirname).toBe('/foo/bar');
    expect(result.data.extname).toBe('.txt');
    expect(result.data.hasResolve).toBe(true);
  });

  test('support path module (CJS)', async () => {
    const cjsCode = readFileSync(join(__dirname, 'path/main-cjs.js'), 'utf8');
    const result = await runtime.execute(cjsCode);

    expect(result.ok).toBe(true);
    expect(result.data.joined).toBe('/foo/bar/baz');
    expect(result.data.basename).toBe('file.txt');
    expect(result.data.dirname).toBe('/foo/bar');
    expect(result.data.extname).toBe('.txt');
    expect(result.data.hasResolve).toBe(true);
  });

  test('support events module (ESM)', async () => {
    const fixture = loadFixture('builtins/events');
    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data.hasEventEmitter).toBe(true);
    expect(result.data.results).toEqual(['first', 'second']);
    expect(result.data.listenerCount).toBe(1);
  });

  test('support events module (CJS)', async () => {
    const cjsCode = readFileSync(join(__dirname, 'events/main-cjs.js'), 'utf8');
    const result = await runtime.execute(cjsCode);

    expect(result.ok).toBe(true);
    expect(result.data.hasEventEmitter).toBe(true);
    expect(result.data.results).toEqual(['first', 'second']);
    expect(result.data.listenerCount).toBe(1);
  });

  test('support util module (ESM)', async () => {
    const fixture = loadFixture('builtins/util');
    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data.hasInspect).toBe(true);
    expect(result.data.hasFormat).toBe(true);
    expect(result.data.formatted).toBe('Hello world, you have 5 items');
    expect(result.data.inspected).toContain('name');
    expect(result.data.inspected).toContain('test');
  });

  test('support util module (CJS)', async () => {
    const cjsCode = readFileSync(join(__dirname, 'util/main-cjs.js'), 'utf8');
    const result = await runtime.execute(cjsCode);

    if (!result.ok) {
      console.log('Util CJS error:', result.error);
    }
    expect(result.ok).toBe(true);
    expect(result.data.hasInspect).toBe(true);
    expect(result.data.hasFormat).toBe(true);
    expect(result.data.formatted).toBe('Hello world, you have 5 items');
    expect(result.data.inspected).toContain('name');
    expect(result.data.inspected).toContain('test');
  });

  test('support buffer module (ESM)', async () => {
    const fixture = loadFixture('builtins/buffer');
    const result = await runtime.execute(fixture.mainFile);

    if (!result.ok) {
      console.log('Buffer ESM error:', result.error);
    }
    expect(result.ok).toBe(true);
    expect(result.data.hasBuffer).toBe(true);
    expect(result.data.str).toBe('hello');
    expect(result.data.length).toBe(10);
    expect(result.data.firstByte).toBe(1);
    expect(result.data.isBuffer).toBe(true);
  });

  test('support buffer module (CJS)', async () => {
    const cjsCode = readFileSync(join(__dirname, 'buffer/main-cjs.js'), 'utf8');
    const result = await runtime.execute(cjsCode);

    expect(result.ok).toBe(true);
    expect(result.data.hasBuffer).toBe(true);
    expect(result.data.str).toBe('hello');
    expect(result.data.length).toBe(10);
    expect(result.data.firstByte).toBe(1);
    expect(result.data.isBuffer).toBe(true);
  });

  test('support url module (ESM)', async () => {
    const fixture = loadFixture('builtins/url');
    const result = await runtime.execute(fixture.mainFile);

    if (!result.ok) {
      console.log('URL ESM error:', result.error);
    }
    expect(result.ok).toBe(true);
    expect(result.data.hasURL).toBe(true);
    expect(result.data.hasURLSearchParams).toBe(true);
    expect(result.data.protocol).toBe('https:');
    expect(result.data.hostname).toBe('example.com');
    expect(result.data.port).toBe('8080');
    expect(result.data.pathname).toBe('/path');
    expect(result.data.hash).toBe('#hash');
    expect(result.data.fooValue).toBe('bar');
  });

  test('support url module (CJS)', async () => {
    const cjsCode = readFileSync(join(__dirname, 'url/main-cjs.js'), 'utf8');
    const result = await runtime.execute(cjsCode);

    expect(result.ok).toBe(true);
    expect(result.data.hasURL).toBe(true);
    expect(result.data.hasURLSearchParams).toBe(true);
    expect(result.data.protocol).toBe('https:');
    expect(result.data.hostname).toBe('example.com');
    expect(result.data.port).toBe('8080');
    expect(result.data.pathname).toBe('/path');
    expect(result.data.hash).toBe('#hash');
    expect(result.data.fooValue).toBe('bar');
  });

  test('support process event handlers', async () => {
    const fixture = loadFixture('builtins/process-events');
    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data.hasUncaughtListener).toBe(true);
    expect(result.data.hasUnhandledListener).toBe(true);
  });

  test('support process event handlers with full EventEmitter API', async () => {
    const fixture = loadFixture('builtins/process-events-full');
    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data.hasOnMethod).toBe(true);
    expect(result.data.hasEmitMethod).toBe(true);
    expect(result.data.listenerCount).toBe(1);
  });

  test('support process.cwd() and process.chdir()', async () => {
    const fixture = loadFixture('builtins/process-cwd');
    const result = await runtime.execute(fixture.mainFile);

    expect(result.ok).toBe(true);
    expect(result.data.hasCwd).toBe(true);
    expect(result.data.hasChdir).toBe(true);
    expect(result.data.initialCwd).toBe('/');
    expect(result.data.afterChdir).toBe('/home/user');
    expect(result.data.backToRoot).toBe('/');
  });

  test('support fs.lstatSync()', async () => {
    const fixture = loadFixture('builtins/fs-lstat');
    const result = await runtime.execute(fixture.mainFile);

    if (!result.ok) {
      console.log('fs.lstatSync error:', result.error);
    }

    expect(result.ok).toBe(true);
    expect(result.data.hasLstatSync).toBe(true);
    expect(result.data.isFile).toBe(true);
    expect(result.data.isDirectory).toBe(false);
    expect(result.data.size).toBe(11); // 'Hello World' is 11 bytes
    expect(result.data.hasMode).toBe(true);
    expect(result.data.hasMtime).toBe(true);
  });

  test('support fs.statSync() and fs.readdirSync()', async () => {
    const fixture = loadFixture('builtins/fs-stat');
    const result = await runtime.execute(fixture.mainFile);

    if (!result.ok) {
      console.log('fs.statSync error:', result.error);
    }

    expect(result.ok).toBe(true);
    expect(result.data.hasStatSync).toBe(true);
    expect(result.data.hasReaddirSync).toBe(true);
    expect(result.data.fileIsFile).toBe(true);
    expect(result.data.fileIsDirectory).toBe(false);
    expect(result.data.fileSize).toBe(12); // 'Test content' is 12 bytes
    expect(result.data.dirIsFile).toBe(false);
    expect(result.data.dirIsDirectory).toBe(true);
    expect(result.data.filesInDir).toEqual(['file.txt']);
  });

  test('support comprehensive fs methods', async () => {
    const fixture = loadFixture('builtins/fs-comprehensive');
    const result = await runtime.execute(fixture.mainFile);

    if (!result.ok) {
      console.log('fs comprehensive error:', result.error);
    }

    expect(result.ok).toBe(true);
    expect(result.data.appendResult).toBe('Hello World');
    expect(result.data.copyResult).toBe('Source content');
    expect(result.data.renameExists).toBe(true);
    expect(result.data.oldExists).toBe(false);
    expect(result.data.rmdirExists).toBe(false);
    expect(result.data.rmFileExists).toBe(false);
    expect(result.data.rmDirExists).toBe(false);
    expect(result.data.accessPassed).toBe(true);
    expect(result.data.realpath).toBe('/real/path/file.txt');
    expect(result.data.hasConstants).toBe(true);
    expect(result.data.hasFOK).toBe(true);
  });

  test('support process.argv with default values (ESM)', async () => {
    const fixture = loadFixture('builtins/process-argv');
    const result = await runtime.execute(fixture.mainFile);

    if (!result.ok) {
      console.log('process.argv ESM error:', result.error);
    }

    expect(result.ok).toBe(true);
    expect(result.data.hasArgv).toBe(true);
    expect(result.data.argvLength).toBe(2);
    expect(result.data.firstArg).toBe('node');
    expect(result.data.secondArg).toBe('/main.js');
    expect(result.data.thirdArg).toBe(undefined);
  });

  test('support process.argv with default values (CJS)', async () => {
    const cjsCode = readFileSync(join(__dirname, 'process-argv/main-cjs.js'), 'utf8');
    const result = await runtime.execute(cjsCode);

    if (!result.ok) {
      console.log('process.argv CJS error:', result.error);
    }

    expect(result.ok).toBe(true);
    expect(result.data.hasArgv).toBe(true);
    expect(result.data.argvLength).toBe(2);
    expect(result.data.firstArg).toBe('node');
    expect(result.data.secondArg).toBe('/main.js');
    expect(result.data.thirdArg).toBe(undefined);
  });

  test('support process.argv with custom values (ESM)', async () => {
    const fixture = loadFixture('builtins/process-argv');
    const result = await runtime.execute(fixture.mainFile, {
      argv: ['node', '/custom/script.js', '--flag', 'value', '123'],
    });

    if (!result.ok) {
      console.log('process.argv custom ESM error:', result.error);
    }

    expect(result.ok).toBe(true);
    expect(result.data.hasArgv).toBe(true);
    expect(result.data.argvLength).toBe(5);
    expect(result.data.firstArg).toBe('node');
    expect(result.data.secondArg).toBe('/custom/script.js');
    expect(result.data.thirdArg).toBe('--flag');
    expect(result.data.argv).toEqual(['node', '/custom/script.js', '--flag', 'value', '123']);
  });

  test('support process.argv with custom values (CJS)', async () => {
    const cjsCode = readFileSync(join(__dirname, 'process-argv/main-cjs.js'), 'utf8');
    const result = await runtime.execute(cjsCode, {
      argv: ['node', '/custom/script.js', '--debug', 'true'],
    });

    if (!result.ok) {
      console.log('process.argv custom CJS error:', result.error);
    }

    expect(result.ok).toBe(true);
    expect(result.data.hasArgv).toBe(true);
    expect(result.data.argvLength).toBe(4);
    expect(result.data.firstArg).toBe('node');
    expect(result.data.secondArg).toBe('/custom/script.js');
    expect(result.data.thirdArg).toBe('--debug');
    expect(result.data.argv).toEqual(['node', '/custom/script.js', '--debug', 'true']);
  });

  test('support crypto module (ESM)', async () => {
    const fixture = loadFixture('builtins/crypto');
    const result = await runtime.execute(fixture.mainFile);

    if (!result.ok) {
      console.log('Crypto ESM error:', result.error);
    }

    expect(result.ok).toBe(true);

    // Function availability
    expect(result.data.hasCreateHash).toBe(true);
    expect(result.data.hasCreateHmac).toBe(true);
    expect(result.data.hasRandomBytes).toBe(true);
    expect(result.data.hasRandomUUID).toBe(true);
    expect(result.data.hasCryptoDefault).toBe(true);

    // Streaming works
    expect(result.data.streamingWorks).toBe(true);

    // Known hash values
    expect(result.data.sha256Correct).toBe(true);
    expect(result.data.sha256TestCorrect).toBe(true);
    expect(result.data.md5TestCorrect).toBe(true);

    // Hash lengths
    expect(result.data.sha1Length).toBe(40);
    expect(result.data.sha512Length).toBe(128);
    expect(result.data.sha384Length).toBe(96);

    // Encoding tests
    expect(result.data.base64Works).toBe(true);

    // HMAC tests
    expect(result.data.hmacWorks).toBe(true);
    expect(result.data.hmacStreamingWorks).toBe(true);

    // Random tests
    expect(result.data.randomBytesWorks).toBe(true);
    expect(result.data.randomBytesLength).toBe(16);
    expect(result.data.uuidValid).toBe(true);
    expect(result.data.uuidsUnique).toBe(true);

    // Error handling
    expect(result.data.doubleDigestThrows).toBe(true);
    expect(result.data.invalidAlgoThrows).toBe(true);
    expect(result.data.hmacDoubleDigestThrows).toBe(true);
    expect(result.data.invalidSizeThrows).toBe(true);
  });

  test('support crypto module (CJS)', async () => {
    const cjsCode = readFileSync(join(__dirname, 'crypto/main-cjs.js'), 'utf8');
    const result = await runtime.execute(cjsCode);

    if (!result.ok) {
      console.log('Crypto CJS error:', result.error);
    }

    expect(result.ok).toBe(true);

    // Function availability
    expect(result.data.hasCreateHash).toBe(true);
    expect(result.data.hasCreateHmac).toBe(true);
    expect(result.data.hasRandomBytes).toBe(true);
    expect(result.data.hasRandomUUID).toBe(true);
    expect(result.data.hasCryptoDefault).toBe(true);

    // Streaming works
    expect(result.data.streamingWorks).toBe(true);

    // Known hash values
    expect(result.data.sha256Correct).toBe(true);
    expect(result.data.sha256TestCorrect).toBe(true);
    expect(result.data.md5TestCorrect).toBe(true);

    // HMAC and random tests
    expect(result.data.hmacWorks).toBe(true);
    expect(result.data.randomBytesWorks).toBe(true);
    expect(result.data.uuidValid).toBe(true);

    // node: protocol test
    expect(result.data.nodeProtocolWorks).toBe(true);
  });

  test('support os module (ESM)', async () => {
    const fixture = loadFixture('builtins/os');
    const result = await runtime.execute(fixture.mainFile);

    if (!result.ok) {
      console.log('OS ESM error:', result.error);
    }

    expect(result.ok).toBe(true);

    // Function availability
    expect(result.data.hasPlatform).toBe(true);
    expect(result.data.hasArch).toBe(true);
    expect(result.data.hasType).toBe(true);
    expect(result.data.hasRelease).toBe(true);
    expect(result.data.hasTmpdir).toBe(true);
    expect(result.data.hasHomedir).toBe(true);
    expect(result.data.hasHostname).toBe(true);
    expect(result.data.hasCpus).toBe(true);
    expect(result.data.hasTotalmem).toBe(true);
    expect(result.data.hasFreemem).toBe(true);
    expect(result.data.hasUptime).toBe(true);
    expect(result.data.hasLoadavg).toBe(true);
    expect(result.data.hasNetworkInterfaces).toBe(true);
    expect(result.data.hasEndianness).toBe(true);
    expect(result.data.hasUserInfo).toBe(true);
    expect(result.data.hasEOL).toBe(true);
    expect(result.data.hasOsDefault).toBe(true);

    // Return types
    expect(result.data.platformIsString).toBe(true);
    expect(result.data.archIsString).toBe(true);
    expect(result.data.typeIsString).toBe(true);
    expect(result.data.releaseIsString).toBe(true);
    expect(result.data.tmpdirIsString).toBe(true);
    expect(result.data.homedirIsString).toBe(true);
    expect(result.data.hostnameIsString).toBe(true);
    expect(result.data.cpusIsArray).toBe(true);
    expect(result.data.totalmemIsNumber).toBe(true);
    expect(result.data.freememIsNumber).toBe(true);
    expect(result.data.uptimeIsNumber).toBe(true);
    expect(result.data.loadavgIsArray).toBe(true);
    expect(result.data.networkInterfacesIsObject).toBe(true);
    expect(result.data.endiannessIsString).toBe(true);
    expect(result.data.userInfoIsObject).toBe(true);

    // Specific values
    expect(result.data.platformValue).toBe('browser');
    expect(result.data.archValue).toBe('x64');
    expect(result.data.cpusLength).toBeGreaterThan(0);
    expect(result.data.cpusHasTimes).toBe(true);
    expect(result.data.loadavgLength).toBe(3);
    expect(result.data.endiannessValid).toBe(true);
    expect(result.data.userInfoHasUsername).toBe(true);
    expect(result.data.eolIsNewline).toBe(true);
    expect(result.data.hasConstants).toBe(true);
  });

  test('support os module (CJS)', async () => {
    const cjsCode = readFileSync(join(__dirname, 'os/main-cjs.js'), 'utf8');
    const result = await runtime.execute(cjsCode);

    if (!result.ok) {
      console.log('OS CJS error:', result.error);
    }

    expect(result.ok).toBe(true);

    // Function availability
    expect(result.data.hasPlatform).toBe(true);
    expect(result.data.hasArch).toBe(true);
    expect(result.data.hasEOL).toBe(true);
    expect(result.data.hasOsDefault).toBe(true);

    // Return types
    expect(result.data.platformIsString).toBe(true);
    expect(result.data.archIsString).toBe(true);
    expect(result.data.cpusIsArray).toBe(true);

    // Specific values
    expect(result.data.platformValue).toBe('browser');
    expect(result.data.archValue).toBe('x64');
    expect(result.data.eolIsNewline).toBe(true);

    // node: protocol test
    expect(result.data.nodeProtocolWorks).toBe(true);
  });

  test('support querystring module (ESM)', async () => {
    const fixture = loadFixture('builtins/querystring');
    const result = await runtime.execute(fixture.mainFile);

    if (!result.ok) {
      console.log('Querystring ESM error:', result.error);
    }

    expect(result.ok).toBe(true);

    // Function availability
    expect(result.data.hasParse).toBe(true);
    expect(result.data.hasStringify).toBe(true);
    expect(result.data.hasEscape).toBe(true);
    expect(result.data.hasUnescape).toBe(true);
    expect(result.data.hasEncode).toBe(true);
    expect(result.data.hasDecode).toBe(true);
    expect(result.data.hasDefault).toBe(true);

    // Parse tests
    expect(result.data.parseBasicCorrect).toBe(true);
    expect(result.data.duplicateKeysIsArray).toBe(true);
    expect(result.data.duplicateKeysLength).toBe(3);
    expect(result.data.duplicateKeysValues).toBe(true);
    expect(result.data.customSepCorrect).toBe(true);
    expect(result.data.maxKeysRespected).toBe(3);
    expect(result.data.emptyParseIsObject).toBe(true);
    expect(result.data.missingValueCorrect).toBe(true);
    expect(result.data.noEqualsCorrect).toBe(true);
    expect(result.data.encodedParseCorrect).toBe(true);

    // Stringify tests
    expect(result.data.stringifyBasicCorrect).toBe(true);
    expect(result.data.arrayStringifyCorrect).toBe(true);
    expect(result.data.customStringifyCorrect).toBe(true);
    expect(result.data.nullUndefinedCorrect).toBe(true);
    expect(result.data.emptyStringifyCorrect).toBe(true);

    // Escape/Unescape tests
    expect(result.data.escapeSpace).toBe(true);
    expect(result.data.escapeSpecialChars).toBe(true);
    expect(result.data.unescapePlus).toBe(true);
    expect(result.data.unescapePercent).toBe(true);

    // Aliases work
    expect(result.data.encodeIsAlias).toBe(true);
    expect(result.data.decodeIsAlias).toBe(true);
  });

  test('support querystring module (CJS)', async () => {
    const cjsCode = readFileSync(join(__dirname, 'querystring/main-cjs.js'), 'utf8');
    const result = await runtime.execute(cjsCode);

    if (!result.ok) {
      console.log('Querystring CJS error:', result.error);
    }

    expect(result.ok).toBe(true);

    // Function availability
    expect(result.data.hasParse).toBe(true);
    expect(result.data.hasStringify).toBe(true);
    expect(result.data.hasEscape).toBe(true);
    expect(result.data.hasUnescape).toBe(true);
    expect(result.data.hasDefault).toBe(true);

    // Return types
    expect(result.data.parseIsObject).toBe(true);
    expect(result.data.stringifyIsString).toBe(true);
    expect(result.data.escapeIsString).toBe(true);
    expect(result.data.unescapeIsString).toBe(true);

    // Specific checks
    expect(result.data.parseCorrect).toBe(true);
    expect(result.data.stringifyCorrect).toBe(true);
    expect(result.data.escapeCorrect).toBe(true);
    expect(result.data.unescapeCorrect).toBe(true);

    // node: protocol test
    expect(result.data.nodeProtocolWorks).toBe(true);
  });

  test('support stream module (ESM)', async () => {
    const fixture = loadFixture('builtins/stream');
    const result = await runtime.execute(fixture.mainFile);

    if (!result.ok) {
      console.log('Stream ESM error:', result.error);
    }

    expect(result.ok).toBe(true);

    // Module availability
    expect(result.data.hasStream).toBe(true);
    expect(result.data.hasReadable).toBe(true);
    expect(result.data.hasWritable).toBe(true);
    expect(result.data.hasDuplex).toBe(true);
    expect(result.data.hasTransform).toBe(true);
    expect(result.data.hasPassThrough).toBe(true);
    expect(result.data.hasPipeline).toBe(true);
    expect(result.data.hasFinished).toBe(true);

    // Readable tests
    expect(result.data.readableChunksLength).toBeGreaterThan(0);
    expect(result.data.readableEnded).toBe(true);
    expect(result.data.readableHasData).toBe(true);

    // Writable tests
    expect(result.data.writableDataLength).toBe(2);
    expect(result.data.writableFinished).toBe(true);
    expect(result.data.writableData0).toBe('test1');
    expect(result.data.writableData1).toBe('test2');

    // Transform tests
    expect(result.data.transformDataLength).toBe(2);
    expect(result.data.transformOutputLength).toBe(2);
    expect(result.data.transformUppercase).toBe(true);

    // PassThrough tests
    expect(result.data.passthroughDataLength).toBe(2);
    expect(result.data.passthroughCorrect).toBe(true);

    // Pipe tests
    expect(result.data.pipeDataLength).toBeGreaterThan(0);
    expect(result.data.pipeCorrect).toBe(true);

    // Duplex tests
    expect(result.data.duplexReadDataLength).toBeGreaterThan(0);
    expect(result.data.duplexWriteDataLength).toBe(1);
    expect(result.data.duplexReadCorrect).toBe(true);
    expect(result.data.duplexWriteCorrect).toBe(true);

    // Pause/resume tests
    expect(result.data.pauseWorks).toBe(true);
    expect(result.data.resumeWorks).toBe(true);
    expect(result.data.pausedChunksLength).toBeGreaterThan(0);
  });

  test('support stream module (CJS)', async () => {
    const cjsCode = readFileSync(join(__dirname, 'stream/main-cjs.js'), 'utf8');
    const result = await runtime.execute(cjsCode);

    if (!result.ok) {
      console.log('Stream CJS error:', result.error);
    }

    expect(result.ok).toBe(true);

    // Function availability
    expect(result.data.hasStream).toBe(true);
    expect(result.data.hasReadable).toBe(true);
    expect(result.data.hasWritable).toBe(true);
    expect(result.data.hasTransform).toBe(true);

    // Stream functionality
    expect(result.data.writableDataLength).toBe(1);
    expect(result.data.writableCorrect).toBe(true);
    expect(result.data.canCreateReadable).toBe(true);
    expect(result.data.canCreateWritable).toBe(true);
    expect(result.data.canCreateTransform).toBe(true);

    // node: protocol test
    expect(result.data.nodeProtocolWorks).toBe(true);
  });

  test('support http module (ESM)', async () => {
    const fixture = loadFixture('builtins/http');
    const result = await runtime.execute(fixture.mainFile);

    if (!result.ok) {
      console.log('HTTP ESM error:', result.error);
    }

    expect(result.ok).toBe(true);

    // Module availability
    expect(result.data.hasHttp).toBe(true);
    expect(result.data.hasRequest).toBe(true);
    expect(result.data.hasGet).toBe(true);
    expect(result.data.hasCreateServer).toBe(true);
    expect(result.data.hasStatusCodes).toBe(true);
    expect(result.data.hasMethods).toBe(true);

    // STATUS_CODES tests
    expect(result.data.status200Correct).toBe(true);
    expect(result.data.status404Correct).toBe(true);
    expect(result.data.status500Correct).toBe(true);

    // METHODS tests
    expect(result.data.hasGetMethod).toBe(true);
    expect(result.data.hasPostMethod).toBe(true);
    expect(result.data.hasDeleteMethod).toBe(true);
    expect(result.data.methodsLengthCorrect).toBe(true);

    // GET request tests
    expect(result.data.getRequestCreated).toBe(true);

    // POST request tests
    expect(result.data.requestCreated).toBe(true);
    expect(result.data.requestHasWrite).toBe(true);
    expect(result.data.requestHasEnd).toBe(true);

    // Server test (should fail in browser)
    expect(result.data.serverErrorOccurred).toBe(true);
    expect(result.data.serverErrorIsCorrect).toBe(true);

    // Classes
    expect(result.data.canCreateClientRequest).toBe(true);
    expect(result.data.canCreateIncomingMessage).toBe(true);

    // Request methods
    expect(result.data.canWriteToRequest).toBe(true);
    expect(result.data.canEndRequest).toBe(true);
    expect(result.data.canAbortRequest).toBe(true);
    expect(result.data.canSetTimeout).toBe(true);
  });

  test('support http module (CJS)', async () => {
    const cjsCode = readFileSync(join(__dirname, 'http/main-cjs.js'), 'utf8');
    const result = await runtime.execute(cjsCode);

    if (!result.ok) {
      console.log('HTTP CJS error:', result.error);
    }

    expect(result.ok).toBe(true);

    // Module availability
    expect(result.data.hasHttp).toBe(true);
    expect(result.data.hasRequest).toBe(true);
    expect(result.data.hasGet).toBe(true);
    expect(result.data.hasStatusCodes).toBe(true);

    // STATUS_CODES
    expect(result.data.status200Correct).toBe(true);

    // Request object
    expect(result.data.requestCreated).toBe(true);
    expect(result.data.requestHasWrite).toBe(true);
    expect(result.data.requestHasEnd).toBe(true);

    // node: protocol test
    expect(result.data.nodeProtocolWorks).toBe(true);
  });

  test('support process.stdout and process.stderr (ESM)', async () => {
    const fixture = loadFixture('builtins/process');
    const result = await runtime.execute(fixture.mainFile);

    if (!result.ok) {
      console.log('Process stdout/stderr ESM error:', result.error);
    }

    expect(result.ok).toBe(true);

    // stdout tests
    expect(result.data.stdoutWriteWorks).toBe(true);
    expect(result.data.stdoutIsTTY).toBe(true);
    expect(result.data.stdoutColumns).toBe(true);
    expect(result.data.stdoutRows).toBe(true);
    expect(result.data.stdoutHasColorsFunction).toBe(true);
    expect(result.data.stdoutHasColorsReturnsFalse).toBe(true);

    // stderr tests
    expect(result.data.stderrWriteWorks).toBe(true);
    expect(result.data.stderrIsTTY).toBe(true);
    expect(result.data.stderrColumns).toBe(true);
    expect(result.data.stderrRows).toBe(true);
    expect(result.data.stderrHasColorsFunction).toBe(true);
    expect(result.data.stderrHasColorsReturnsFalse).toBe(true);

    // stdin tests
    expect(result.data.stdinIsTTY).toBe(true);
    expect(result.data.stdinHasRead).toBe(true);
    expect(result.data.stdinHasPause).toBe(true);
    expect(result.data.stdinHasResume).toBe(true);
  });

  test('support process.stdout and process.stderr (CJS)', async () => {
    const cjsCode = readFileSync(join(__dirname, 'process/main-cjs.js'), 'utf8');
    const result = await runtime.execute(cjsCode);

    if (!result.ok) {
      console.log('Process stdout/stderr CJS error:', result.error);
    }

    expect(result.ok).toBe(true);

    // stdout tests
    expect(result.data.stdoutWriteWorks).toBe(true);
    expect(result.data.stdoutIsTTY).toBe(true);
    expect(result.data.stdoutColumns).toBe(true);
    expect(result.data.stdoutRows).toBe(true);
    expect(result.data.stdoutHasColorsFunction).toBe(true);
    expect(result.data.stdoutHasColorsReturnsFalse).toBe(true);

    // stderr tests
    expect(result.data.stderrWriteWorks).toBe(true);
    expect(result.data.stderrIsTTY).toBe(true);
    expect(result.data.stderrColumns).toBe(true);
    expect(result.data.stderrRows).toBe(true);
    expect(result.data.stderrHasColorsFunction).toBe(true);
    expect(result.data.stderrHasColorsReturnsFalse).toBe(true);

    // stdin tests
    expect(result.data.stdinIsTTY).toBe(true);
    expect(result.data.stdinHasRead).toBe(true);
    expect(result.data.stdinHasPause).toBe(true);
    expect(result.data.stdinHasResume).toBe(true);
  });
});
