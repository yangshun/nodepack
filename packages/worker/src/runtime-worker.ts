/**
 * Web Worker Runtime
 * Runs QuickJS in a Web Worker for process isolation
 */

import { expose } from 'comlink';
import { QuickJSRuntime } from '@nodepack/runtime';
import type { ExecutionResult, RuntimeOptions } from '@nodepack/runtime';

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
