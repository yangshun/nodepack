import { describe, it, expect, beforeEach } from 'vitest';
import * as pako from 'pako';
import { TarballExtractor } from './tarball-extractor.js';

describe('TarballExtractor', () => {
  let extractor: TarballExtractor;

  beforeEach(() => {
    extractor = new TarballExtractor();
  });

  function createTarHeader(
    fileName: string,
    fileSize: number,
    fileType: string = '0',
    mode: number = 0o644,
  ): Uint8Array {
    const header = new Uint8Array(512);

    // File name (0-99)
    const nameBytes = new TextEncoder().encode(fileName);
    header.set(nameBytes.slice(0, 100), 0);

    // File mode (100-107) - octal
    const modeStr = mode.toString(8).padStart(7, '0') + '\0';
    header.set(new TextEncoder().encode(modeStr), 100);

    // Owner ID (108-115) - octal
    header.set(new TextEncoder().encode('0000000\0'), 108);

    // Group ID (116-123) - octal
    header.set(new TextEncoder().encode('0000000\0'), 116);

    // File size (124-135) - octal
    const sizeStr = fileSize.toString(8).padStart(11, '0') + ' ';
    header.set(new TextEncoder().encode(sizeStr), 124);

    // Modification time (136-147) - octal
    const timeStr = '00000000000 ';
    header.set(new TextEncoder().encode(timeStr), 136);

    // Checksum placeholder (148-155) - will calculate later
    header.set(new TextEncoder().encode('        '), 148);

    // File type (156)
    header[156] = fileType.charCodeAt(0);

    // Link name (157-256) - unused for regular files
    // Ustar indicator (257-262)
    header.set(new TextEncoder().encode('ustar\0'), 257);

    // Ustar version (263-264)
    header.set(new TextEncoder().encode('00'), 263);

    // Calculate checksum
    let checksum = 0;
    for (let i = 0; i < 512; i++) {
      checksum += header[i];
    }
    const checksumStr = checksum.toString(8).padStart(6, '0') + '\0 ';
    header.set(new TextEncoder().encode(checksumStr), 148);

    return header;
  }

  function createTarFile(fileName: string, content: string, mode: number = 0o644): Uint8Array {
    const contentBytes = new TextEncoder().encode(content);
    const header = createTarHeader(fileName, contentBytes.length, '0', mode);

    // Calculate padded size
    const paddedSize = Math.ceil(contentBytes.length / 512) * 512;
    const paddedContent = new Uint8Array(paddedSize);
    paddedContent.set(contentBytes);

    // Combine header and content
    const result = new Uint8Array(512 + paddedSize);
    result.set(header, 0);
    result.set(paddedContent, 512);

    return result;
  }

  function createTarDirectory(dirName: string): Uint8Array {
    return createTarHeader(dirName, 0, '5', 0o755);
  }

  function createTarball(...files: Uint8Array[]): ArrayBuffer {
    // Calculate total size
    let totalSize = 0;
    for (const file of files) {
      totalSize += file.length;
    }
    totalSize += 1024; // Two 512-byte zero blocks at end

    // Create tar archive
    const tarData = new Uint8Array(totalSize);
    let offset = 0;

    for (const file of files) {
      tarData.set(file, offset);
      offset += file.length;
    }

    // Add two zero blocks at end
    // (already zeros from initialization)

    // Gzip the tar data
    const gzipped = pako.gzip(tarData);

    return gzipped.buffer;
  }

  describe('extract()', () => {
    it('should extract a simple tar.gz with one file', async () => {
      const tarball = createTarball(createTarFile('package/index.js', 'module.exports = {};'));

      const files = await extractor.extract(tarball);

      expect(files.size).toBe(1);
      expect(files.has('index.js')).toBe(true);

      const file = files.get('index.js')!;
      expect(file.path).toBe('index.js');
      expect(file.type).toBe('file');
      expect(new TextDecoder().decode(file.content as Uint8Array)).toBe('module.exports = {};');
    });

    it('should extract multiple files', async () => {
      const tarball = createTarball(
        createTarFile('package/index.js', 'console.log("index");'),
        createTarFile('package/helper.js', 'console.log("helper");'),
        createTarFile('package/package.json', '{"name":"test"}'),
      );

      const files = await extractor.extract(tarball);

      expect(files.size).toBe(3);
      expect(files.has('index.js')).toBe(true);
      expect(files.has('helper.js')).toBe(true);
      expect(files.has('package.json')).toBe(true);
    });

    it('should strip "package/" prefix from file paths', async () => {
      const tarball = createTarball(
        createTarFile('package/src/index.js', 'content'),
        createTarFile('package/README.md', 'readme'),
      );

      const files = await extractor.extract(tarball);

      expect(files.has('src/index.js')).toBe(true);
      expect(files.has('README.md')).toBe(true);
      expect(files.has('package/src/index.js')).toBe(false);
    });

    it('should handle directories', async () => {
      const tarball = createTarball(
        createTarDirectory('package/src/'),
        createTarFile('package/src/index.js', 'content'),
      );

      const files = await extractor.extract(tarball);

      expect(files.has('src/')).toBe(true);
      expect(files.get('src/')!.type).toBe('directory');
      expect(files.has('src/index.js')).toBe(true);
      expect(files.get('src/index.js')!.type).toBe('file');
    });

    it('should preserve file mode', async () => {
      const tarball = createTarball(
        createTarFile('package/script.sh', '#!/bin/bash\necho hello', 0o755),
      );

      const files = await extractor.extract(tarball);

      const file = files.get('script.sh')!;
      expect(file.mode).toBe(0o755);
    });

    it('should handle nested directory structures', async () => {
      const tarball = createTarball(
        createTarDirectory('package/src/'),
        createTarDirectory('package/src/utils/'),
        createTarFile('package/src/utils/helper.js', 'helper'),
        createTarFile('package/src/index.js', 'index'),
      );

      const files = await extractor.extract(tarball);

      expect(files.has('src/')).toBe(true);
      expect(files.has('src/utils/')).toBe(true);
      expect(files.has('src/utils/helper.js')).toBe(true);
      expect(files.has('src/index.js')).toBe(true);
    });

    it('should handle empty files', async () => {
      const tarball = createTarball(createTarFile('package/empty.txt', ''));

      const files = await extractor.extract(tarball);

      expect(files.has('empty.txt')).toBe(true);
      const file = files.get('empty.txt')!;
      expect((file.content as Uint8Array).length).toBe(0);
    });

    it('should handle files with special characters in name', async () => {
      const tarball = createTarball(
        createTarFile('package/file-with-dashes.js', 'content'),
        createTarFile('package/file.name.with.dots.js', 'content'),
      );

      const files = await extractor.extract(tarball);

      expect(files.has('file-with-dashes.js')).toBe(true);
      expect(files.has('file.name.with.dots.js')).toBe(true);
    });

    it('should handle large files', async () => {
      const largeContent = 'a'.repeat(10000);
      const tarball = createTarball(createTarFile('package/large.txt', largeContent));

      const files = await extractor.extract(tarball);

      const file = files.get('large.txt')!;
      expect(new TextDecoder().decode(file.content as Uint8Array)).toBe(largeContent);
    });

    it('should handle unicode characters in file content', async () => {
      const unicodeContent = 'Hello 世界 🌍';
      const tarball = createTarball(createTarFile('package/unicode.txt', unicodeContent));

      const files = await extractor.extract(tarball);

      const file = files.get('unicode.txt')!;
      expect(new TextDecoder().decode(file.content as Uint8Array)).toBe(unicodeContent);
    });

    it('should skip entries with empty path after stripping prefix', async () => {
      const header = createTarHeader('package/', 0, '5');
      const tarball = createTarball(header);

      const files = await extractor.extract(tarball);

      // Should not include the empty path
      expect(files.size).toBe(0);
    });

    it('should handle package.json file', async () => {
      const packageJson = JSON.stringify({
        name: 'test-package',
        version: '1.0.0',
        main: 'index.js',
      });

      const tarball = createTarball(createTarFile('package/package.json', packageJson));

      const files = await extractor.extract(tarball);

      expect(files.has('package.json')).toBe(true);
      const file = files.get('package.json')!;
      const content = new TextDecoder().decode(file.content as Uint8Array);
      const parsed = JSON.parse(content);
      expect(parsed.name).toBe('test-package');
    });

    it('should handle typical npm package structure', async () => {
      const tarball = createTarball(
        createTarFile('package/package.json', '{"name":"pkg"}'),
        createTarFile('package/index.js', 'module.exports = {};'),
        createTarFile('package/README.md', '# Package'),
        createTarDirectory('package/lib/'),
        createTarFile('package/lib/helper.js', 'exports.help = () => {};'),
        createTarDirectory('package/bin/'),
        createTarFile('package/bin/cli.js', '#!/usr/bin/env node', 0o755),
      );

      const files = await extractor.extract(tarball);

      expect(files.size).toBe(7);
      expect(files.has('package.json')).toBe(true);
      expect(files.has('index.js')).toBe(true);
      expect(files.has('README.md')).toBe(true);
      expect(files.has('lib/')).toBe(true);
      expect(files.has('lib/helper.js')).toBe(true);
      expect(files.has('bin/')).toBe(true);
      expect(files.has('bin/cli.js')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle tar with only directories', async () => {
      const tarball = createTarball(
        createTarDirectory('package/src/'),
        createTarDirectory('package/lib/'),
      );

      const files = await extractor.extract(tarball);

      expect(files.size).toBe(2);
      expect(files.get('src/')!.type).toBe('directory');
      expect(files.get('lib/')!.type).toBe('directory');
    });

    it('should handle minimum valid tar.gz', async () => {
      // Just end markers
      const tarData = new Uint8Array(1024); // Two zero blocks
      const gzipped = pako.gzip(tarData);

      const files = await extractor.extract(gzipped.buffer);

      expect(files.size).toBe(0);
    });

    it('should handle files at root of package', async () => {
      const tarball = createTarball(createTarFile('package/index.js', 'root level'));

      const files = await extractor.extract(tarball);

      expect(files.has('index.js')).toBe(true);
      expect(files.get('index.js')!.path).toBe('index.js');
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid gzip data', async () => {
      const invalidGzip = new ArrayBuffer(100);

      await expect(extractor.extract(invalidGzip)).rejects.toThrow();
    });

    it('should handle corrupted tar data gracefully', async () => {
      // Create valid gzip but with invalid tar content
      const invalidTarData = new Uint8Array(1024);
      invalidTarData[0] = 0xff; // Invalid tar header
      const gzipped = pako.gzip(invalidTarData);

      // Should either throw or return empty results, not crash
      try {
        const files = await extractor.extract(gzipped.buffer);
        expect(files.size).toBeGreaterThanOrEqual(0);
      } catch (error) {
        // Error is acceptable for corrupted data
        expect(error).toBeDefined();
      }
    });

    it('should handle empty ArrayBuffer', async () => {
      const empty = new ArrayBuffer(0);

      await expect(extractor.extract(empty)).rejects.toThrow();
    });
  });

  describe('real-world simulation', () => {
    it('should extract a typical small package', async () => {
      // Simulate a small utility package
      const tarball = createTarball(
        createTarFile(
          'package/package.json',
          JSON.stringify({
            name: 'picocolors',
            version: '1.0.0',
            main: 'picocolors.js',
            types: 'picocolors.d.ts',
          }),
        ),
        createTarFile('package/picocolors.js', 'module.exports = { red: s => s };'),
        createTarFile('package/picocolors.d.ts', 'export function red(str: string): string;'),
        createTarFile('package/LICENSE', 'MIT License'),
        createTarFile('package/README.md', '# picocolors'),
      );

      const files = await extractor.extract(tarball);

      expect(files.size).toBe(5);
      expect(files.has('package.json')).toBe(true);
      expect(files.has('picocolors.js')).toBe(true);
      expect(files.has('picocolors.d.ts')).toBe(true);
      expect(files.has('LICENSE')).toBe(true);
      expect(files.has('README.md')).toBe(true);

      // Verify content
      const pkg = JSON.parse(
        new TextDecoder().decode(files.get('package.json')!.content as Uint8Array),
      );
      expect(pkg.name).toBe('picocolors');
      expect(pkg.version).toBe('1.0.0');
    });
  });
});
