/**
 * Tarball Extractor
 * Decompresses gzip and extracts tar archives in the browser
 */

import * as pako from 'pako';
import type { ExtractedFile } from './types.js';
import { createLogger } from '../core/logger.js';

export class TarballExtractor {
  private logger = createLogger('[Tarball]');
  /**
   * Extract .tar.gz tarball to file map
   * Returns map of relative paths to content
   */
  async extract(tarballBuffer: ArrayBuffer): Promise<Map<string, ExtractedFile>> {
    this.logger.log(`Extracting tarball (${tarballBuffer.byteLength} bytes)`);

    // Step 1: Decompress gzip
    const gzipped = new Uint8Array(tarballBuffer);
    const tarBuffer = pako.ungzip(gzipped);

    this.logger.log(`Decompressed to ${tarBuffer.byteLength} bytes`);

    // Step 2: Parse tar format
    const files = this.parseTar(tarBuffer);

    this.logger.log(`Extracted ${files.size} files`);

    return files;
  }

  /**
   * Parse tar archive format
   * Tar format: 512-byte headers followed by file content
   */
  private parseTar(buffer: Uint8Array): Map<string, ExtractedFile> {
    const files = new Map<string, ExtractedFile>();
    let offset = 0;

    while (offset < buffer.length) {
      // Read 512-byte header
      const header = buffer.slice(offset, offset + 512);

      // Check if end of archive (all zeros)
      if (this.isZeroBlock(header)) {
        break;
      }

      // Parse header fields
      const fileName = this.readString(header, 0, 100);
      const fileMode = this.readOctal(header, 100, 8);
      const fileSize = this.readOctal(header, 124, 12);
      const fileType = String.fromCharCode(header[156]);

      offset += 512; // Move past header

      // Read file content
      let content: Uint8Array | string;
      if (fileSize > 0) {
        content = buffer.slice(offset, offset + fileSize);
        offset += fileSize;

        // Tar blocks are padded to 512 bytes
        const paddingSize = (512 - (fileSize % 512)) % 512;
        offset += paddingSize;
      } else {
        content = new Uint8Array(0);
      }

      // npm tarballs have "package/" prefix - strip it
      const cleanPath = fileName.replace(/^package\//, '');

      if (cleanPath) {
        files.set(cleanPath, {
          path: cleanPath,
          content: content,
          mode: fileMode,
          type: fileType === '5' ? 'directory' : 'file',
        });
      }
    }

    return files;
  }

  /**
   * Read null-terminated string from buffer
   */
  private readString(buffer: Uint8Array, offset: number, length: number): string {
    const slice = buffer.slice(offset, offset + length);
    const nullIndex = slice.indexOf(0);
    const end = nullIndex === -1 ? length : nullIndex;
    return new TextDecoder().decode(slice.slice(0, end));
  }

  /**
   * Read octal number from buffer (tar uses octal for numbers)
   */
  private readOctal(buffer: Uint8Array, offset: number, length: number): number {
    const str = this.readString(buffer, offset, length).trim();
    return str ? parseInt(str, 8) : 0;
  }

  /**
   * Check if block is all zeros (indicates end of tar)
   */
  private isZeroBlock(block: Uint8Array): boolean {
    return block.every((byte) => byte === 0);
  }
}
