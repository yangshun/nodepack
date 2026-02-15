/**
 * BridgedFilesystem: Adapts memfs (sync) to just-bash IFileSystem (async)
 *
 * This adapter bridges the gap between:
 * - just-bash: expects async IFileSystem interface
 * - memfs: provides synchronous Node.js-compatible fs methods
 *
 * The adapter forwards all operations to the memfs volume instance,
 * wrapping sync operations in Promises for just-bash compatibility.
 */

import type {
  IFileSystem,
  BufferEncoding,
  FsStat,
  MkdirOptions,
  RmOptions,
  CpOptions,
} from 'just-bash';

// These types are defined in just-bash but not re-exported from the main entry point.
interface ReadFileOptions {
  encoding?: BufferEncoding | null;
}

interface WriteFileOptions {
  encoding?: BufferEncoding;
}

interface DirentEntry {
  name: string;
  isFile: boolean;
  isDirectory: boolean;
  isSymbolicLink: boolean;
}
import type { IFs } from 'memfs';
import * as pathModule from 'path-browserify';

export class BridgedFilesystem implements IFileSystem {
  constructor(private memfs: IFs) {
    // Ensure root directory exists
    if (!this.memfs.existsSync('/')) {
      this.memfs.mkdirSync('/', { recursive: true });
    }
  }

  async readFile(path: string, options?: ReadFileOptions | BufferEncoding): Promise<string> {
    try {
      const encoding = typeof options === 'string' ? options : options?.encoding || 'utf8';
      const content = this.memfs.readFileSync(path, encoding as any);
      return content as string;
    } catch (error: any) {
      throw new Error(`readFile failed: ${error.message}`);
    }
  }

  async readFileBuffer(path: string): Promise<Uint8Array> {
    try {
      const content = this.memfs.readFileSync(path);
      if (typeof content === 'string') {
        // Convert string to Uint8Array
        return new TextEncoder().encode(content);
      }
      return new Uint8Array(content);
    } catch (error: any) {
      throw new Error(`readFileBuffer failed: ${error.message}`);
    }
  }

  async writeFile(
    path: string,
    content: string | Uint8Array,
    options?: WriteFileOptions | BufferEncoding,
  ): Promise<void> {
    try {
      // Ensure parent directory exists
      const dir = pathModule.dirname(path);
      if (dir && dir !== '/' && !this.memfs.existsSync(dir)) {
        this.memfs.mkdirSync(dir, { recursive: true });
      }

      const encoding = typeof options === 'string' ? options : options?.encoding;
      this.memfs.writeFileSync(path, content, encoding as any);
    } catch (error: any) {
      throw new Error(`writeFile failed: ${error.message}`);
    }
  }

  async appendFile(
    path: string,
    content: string | Uint8Array,
    options?: WriteFileOptions | BufferEncoding,
  ): Promise<void> {
    try {
      const encoding = typeof options === 'string' ? options : options?.encoding;
      this.memfs.appendFileSync(path, content, encoding as any);
    } catch (error: any) {
      throw new Error(`appendFile failed: ${error.message}`);
    }
  }

  async exists(path: string): Promise<boolean> {
    return this.memfs.existsSync(path);
  }

  async stat(path: string): Promise<FsStat> {
    try {
      const stats = this.memfs.statSync(path);
      return {
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        isSymbolicLink: stats.isSymbolicLink(),
        mode: stats.mode,
        size: stats.size,
        mtime: stats.mtime,
      };
    } catch (error: any) {
      throw new Error(`stat failed: ${error.message}`);
    }
  }

  async mkdir(path: string, options?: MkdirOptions): Promise<void> {
    try {
      this.memfs.mkdirSync(path, { recursive: options?.recursive });
    } catch (error: any) {
      throw new Error(`mkdir failed: ${error.message}`);
    }
  }

  async readdir(path: string): Promise<string[]> {
    try {
      // Handle root directory specially
      if (!this.memfs.existsSync(path)) {
        // If directory doesn't exist, return empty array or create it
        if (path === '/') {
          return [];
        }
        throw new Error(`Directory does not exist: ${path}`);
      }
      const entries = this.memfs.readdirSync(path);
      return entries.map((e) => String(e));
    } catch (error: any) {
      throw new Error(`readdir failed for ${path}: ${error.message}`);
    }
  }

  async readdirWithFileTypes(path: string): Promise<DirentEntry[]> {
    try {
      const entries = this.memfs.readdirSync(path, { withFileTypes: true }) as any[];
      return entries.map((entry) => ({
        name: entry.name,
        isFile: entry.isFile(),
        isDirectory: entry.isDirectory(),
        isSymbolicLink: entry.isSymbolicLink(),
      }));
    } catch (error: any) {
      throw new Error(`readdirWithFileTypes failed: ${error.message}`);
    }
  }

  async rm(path: string, options?: RmOptions): Promise<void> {
    try {
      const stats = this.memfs.statSync(path);
      if (stats.isDirectory()) {
        this.memfs.rmdirSync(path, { recursive: options?.recursive });
      } else {
        this.memfs.unlinkSync(path);
      }
    } catch (error: any) {
      if (!options?.force) {
        throw new Error(`rm failed: ${error.message}`);
      }
    }
  }

  async cp(src: string, dest: string, options?: CpOptions): Promise<void> {
    try {
      const stats = this.memfs.statSync(src);

      if (stats.isDirectory()) {
        if (!options?.recursive) {
          throw new Error('Cannot copy directory without recursive option');
        }

        // Create destination directory
        this.memfs.mkdirSync(dest, { recursive: true });

        // Copy all files recursively
        const entries = this.memfs.readdirSync(src);
        for (const entry of entries) {
          const srcPath = pathModule.join(src, String(entry));
          const destPath = pathModule.join(dest, String(entry));
          await this.cp(srcPath, destPath, options);
        }
      } else {
        // Copy file
        const content = this.memfs.readFileSync(src);
        const destDir = pathModule.dirname(dest);
        if (!this.memfs.existsSync(destDir)) {
          this.memfs.mkdirSync(destDir, { recursive: true });
        }
        this.memfs.writeFileSync(dest, content);
      }
    } catch (error: any) {
      throw new Error(`cp failed: ${error.message}`);
    }
  }

  async mv(src: string, dest: string): Promise<void> {
    try {
      this.memfs.renameSync(src, dest);
    } catch (error: any) {
      throw new Error(`mv failed: ${error.message}`);
    }
  }

  resolvePath(base: string, path: string): string {
    if (pathModule.isAbsolute(path)) {
      return pathModule.normalize(path);
    }
    return pathModule.normalize(pathModule.join(base, path));
  }

  getAllPaths(): string[] {
    const paths: string[] = [];

    const traverse = (dir: string) => {
      try {
        if (!this.memfs.existsSync(dir)) return;

        const entries = this.memfs.readdirSync(dir);
        for (const entry of entries) {
          const fullPath = pathModule.join(dir, String(entry));
          paths.push(fullPath);

          const stats = this.memfs.statSync(fullPath);
          if (stats.isDirectory()) {
            traverse(fullPath);
          }
        }
      } catch (error) {
        // Ignore errors during traversal
      }
    };

    traverse('/');
    return paths;
  }

  async chmod(path: string, mode: number): Promise<void> {
    try {
      this.memfs.chmodSync(path, mode);
    } catch (error: any) {
      throw new Error(`chmod failed: ${error.message}`);
    }
  }

  async symlink(target: string, linkPath: string): Promise<void> {
    try {
      this.memfs.symlinkSync(target, linkPath);
    } catch (error: any) {
      throw new Error(`symlink failed: ${error.message}`);
    }
  }

  async link(existingPath: string, newPath: string): Promise<void> {
    try {
      this.memfs.linkSync(existingPath, newPath);
    } catch (error: any) {
      throw new Error(`link failed: ${error.message}`);
    }
  }

  async readlink(path: string): Promise<string> {
    try {
      return this.memfs.readlinkSync(path) as string;
    } catch (error: any) {
      throw new Error(`readlink failed: ${error.message}`);
    }
  }

  async lstat(path: string): Promise<FsStat> {
    try {
      const stats = this.memfs.lstatSync(path);
      return {
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        isSymbolicLink: stats.isSymbolicLink(),
        mode: stats.mode,
        size: stats.size,
        mtime: stats.mtime,
      };
    } catch (error: any) {
      throw new Error(`lstat failed: ${error.message}`);
    }
  }

  async realpath(path: string): Promise<string> {
    try {
      return this.memfs.realpathSync(path) as string;
    } catch (error: any) {
      throw new Error(`realpath failed: ${error.message}`);
    }
  }

  async utimes(path: string, atime: Date, mtime: Date): Promise<void> {
    try {
      this.memfs.utimesSync(path, atime, mtime);
    } catch (error: any) {
      throw new Error(`utimes failed: ${error.message}`);
    }
  }
}
