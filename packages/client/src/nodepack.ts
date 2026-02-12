/**
 * Nodepack Client API
 * Main entry point for using Nodepack in the browser
 */

import { wrap, Remote } from 'comlink';
import { NodepackRuntime } from '@nodepack/runtime';
import type { ExecutionResult, RuntimeOptions } from '@nodepack/runtime';
import type { NodepackOptions } from './types.js';

/**
 * Worker runtime interface (matches WorkerRuntime in worker package)
 */
interface WorkerRuntimeAPI {
  initialize(): Promise<void>;
  execute(code: string, options?: RuntimeOptions): Promise<ExecutionResult>;
  terminate(): void;
}

/**
 * Main Nodepack client
 * Provides unified API whether using Web Worker or direct runtime
 */
export class Nodepack {
  private runtime: NodepackRuntime | Remote<WorkerRuntimeAPI> | null = null;
  private worker: Worker | null = null;
  private useWorker: boolean;
  private isInitialized = false;

  constructor(private options: NodepackOptions = {}) {
    // Default to using worker in browser environment
    this.useWorker = options.useWorker ?? typeof Worker !== 'undefined';
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
          'Pass workerUrl in options or use useWorker: false for direct runtime.',
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
    this.runtime = new NodepackRuntime();
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

  /**
   * Get the virtual filesystem instance
   * Only available when NOT using worker mode
   * @returns filesystem instance or null if using worker mode
   */
  getFilesystem(): any {
    if (this.useWorker || !this.runtime) {
      console.warn('[Nodepack] Filesystem access not available in worker mode');
      return null;
    }
    return (this.runtime as NodepackRuntime).getFilesystem();
  }
}
