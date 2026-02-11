/**
 * Nodepack Client API
 * Main entry point for using Nodepack in the browser
 */

import { wrap, Remote } from 'comlink';
import { QuickJSRuntime } from '@nodepack/runtime';
import type { ExecutionResult, RuntimeOptions, FileSystemTree } from '@nodepack/runtime';
import type { NodepackOptions } from './types.js';

/**
 * Worker runtime interface (matches WorkerRuntime in worker package)
 */
interface WorkerRuntimeAPI {
  initialize(): Promise<void>;
  execute(code: string, options?: RuntimeOptions): Promise<ExecutionResult>;
  mountFiles(files: FileSystemTree): void;
  writeFile(path: string, content: string): void;
  readFile(path: string, encoding?: 'utf8' | 'buffer'): string | Buffer;
  readdir(path: string): string[];
  mkdir(path: string, recursive?: boolean): void;
  exists(path: string): boolean;
  remove(path: string, recursive?: boolean): void;
  exportFileSystem(): Record<string, string>;
  clearFileSystem(): void;
  terminate(): void;
}

/**
 * Main Nodepack client
 * Provides unified API whether using Web Worker or direct runtime
 */
export class Nodepack {
  private runtime: QuickJSRuntime | Remote<WorkerRuntimeAPI> | null = null;
  private worker: Worker | null = null;
  private useWorker: boolean;
  private isInitialized = false;

  constructor(private options: NodepackOptions = {}) {
    // Default to using worker in browser environment
    this.useWorker = options.useWorker ?? (typeof Worker !== 'undefined');
  }

  /**
   * Boot the Nodepack runtime
   * Call this once before using the instance
   */
  static async boot(options?: NodepackOptions): Promise<Nodepack> {
    const instance = new Nodepack(options);
    await instance.initialize();
    return instance;
  }

  /**
   * Initialize the runtime (worker or direct)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.useWorker) {
      await this.initializeWorker();
    } else {
      await this.initializeDirect();
    }

    this.isInitialized = true;
  }

  /**
   * Initialize with Web Worker
   */
  private async initializeWorker(): Promise<void> {
    if (!this.options.workerUrl) {
      throw new Error(
        'Worker URL is required when useWorker is true. ' +
        'Pass workerUrl in options or use useWorker: false for direct runtime.'
      );
    }

    this.worker = new Worker(this.options.workerUrl, { type: 'module' });

    // Wrap worker with Comlink
    this.runtime = wrap<WorkerRuntimeAPI>(this.worker);

    // Initialize the worker runtime
    await this.runtime.initialize();

    console.log('[Nodepack] Initialized with Web Worker');
  }

  /**
   * Initialize with direct runtime (no worker)
   */
  private async initializeDirect(): Promise<void> {
    this.runtime = new QuickJSRuntime();
    await this.runtime.initialize();
    console.log('[Nodepack] Initialized with direct runtime');
  }

  /**
   * Execute JavaScript/TypeScript code
   */
  async execute(code: string, options?: RuntimeOptions): Promise<ExecutionResult> {
    if (!this.runtime) {
      throw new Error('Runtime not initialized. Call boot() first.');
    }
    return this.runtime.execute(code, options);
  }

  /**
   * Mount files into the virtual filesystem
   */
  mountFiles(files: FileSystemTree): void {
    if (!this.runtime) {
      throw new Error('Runtime not initialized');
    }
    this.runtime.mountFiles(files);
  }

  /**
   * File system API
   */
  get fs() {
    const runtime = this.runtime;
    if (!runtime) {
      throw new Error('Runtime not initialized');
    }

    return {
      writeFile: (path: string, content: string) => runtime.writeFile(path, content),
      readFile: (path: string, encoding: 'utf8' | 'buffer' = 'utf8') =>
        runtime.readFile(path, encoding),
      readdir: (path: string) => runtime.readdir(path),
      mkdir: (path: string, recursive = true) => runtime.mkdir(path, recursive),
      exists: (path: string) => runtime.exists(path),
      remove: (path: string, recursive = false) => runtime.remove(path, recursive),
      export: () => runtime.exportFileSystem(),
      clear: () => runtime.clearFileSystem(),
    };
  }

  /**
   * Spawn a process (alias for execute, more Node.js-like)
   */
  async spawn(command: string, args: string[] = [], options?: RuntimeOptions): Promise<ExecutionResult> {
    // For now, just execute the file
    // In future, this could handle actual process spawning
    const code = await this.fs.readFile(command, 'utf8') as string;
    return this.execute(code, options);
  }

  /**
   * Terminate the runtime and cleanup
   */
  async teardown(): Promise<void> {
    if (this.worker && this.runtime) {
      // Terminate worker
      if ('terminate' in this.runtime) {
        this.runtime.terminate();
      }
      this.worker.terminate();
      this.worker = null;
    }

    this.runtime = null;
    this.isInitialized = false;
    console.log('[Nodepack] Runtime terminated');
  }

  /**
   * Check if running in worker mode
   */
  isUsingWorker(): boolean {
    return this.useWorker && this.worker !== null;
  }
}
