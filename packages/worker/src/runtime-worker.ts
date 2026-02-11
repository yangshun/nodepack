/**
 * Web Worker Runtime
 * Runs QuickJS in a Web Worker for process isolation
 */

import { expose } from 'comlink';
import { QuickJSRuntime } from '@nodepack/runtime';
import type { ExecutionResult, RuntimeOptions, FileSystemTree } from '@nodepack/runtime';

/**
 * Worker-side runtime wrapper
 * Exposed via Comlink to main thread
 */
class WorkerRuntime {
  private runtime: QuickJSRuntime;
  private isInitialized = false;

  constructor() {
    this.runtime = new QuickJSRuntime();
  }

  /**
   * Initialize the QuickJS runtime
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    await this.runtime.initialize();
    this.isInitialized = true;
    console.log('[Worker] QuickJS runtime initialized');
  }

  /**
   * Execute code in the runtime
   */
  async execute(code: string, options?: RuntimeOptions): Promise<ExecutionResult> {
    if (!this.isInitialized) {
      throw new Error('Runtime not initialized in worker');
    }
    return this.runtime.execute(code, options);
  }

  /**
   * Mount files into virtual filesystem
   */
  mountFiles(files: FileSystemTree): void {
    this.runtime.mountFiles(files);
  }

  /**
   * Write a file
   */
  writeFile(path: string, content: string): void {
    this.runtime.writeFile(path, content);
  }

  /**
   * Read a file
   */
  readFile(path: string, encoding: 'utf8' | 'buffer' = 'utf8'): string | Buffer {
    return this.runtime.readFile(path, encoding);
  }

  /**
   * List directory contents
   */
  readdir(path: string): string[] {
    return this.runtime.readdir(path);
  }

  /**
   * Create directory
   */
  mkdir(path: string, recursive = true): void {
    this.runtime.mkdir(path, recursive);
  }

  /**
   * Check if file exists
   */
  exists(path: string): boolean {
    return this.runtime.exists(path);
  }

  /**
   * Remove file or directory
   */
  remove(path: string, recursive = false): void {
    this.runtime.remove(path, recursive);
  }

  /**
   * Export filesystem as JSON
   */
  exportFileSystem(): Record<string, string> {
    return this.runtime.exportFileSystem();
  }

  /**
   * Clear the filesystem
   */
  clearFileSystem(): void {
    this.runtime.clearFileSystem();
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    console.log('[Worker] Terminating...');
    self.close();
  }
}

// Expose the runtime to the main thread via Comlink
const workerRuntime = new WorkerRuntime();
expose(workerRuntime);

console.log('[Worker] Runtime worker loaded and ready');
