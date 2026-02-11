/**
 * Client API types
 */

export interface NodepackOptions {
  /**
   * Use Web Worker for isolation (recommended)
   * Default: true in browser, false in Node.js
   */
  useWorker?: boolean;

  /**
   * Worker script URL (if using bundler, this will be set automatically)
   */
  workerUrl?: string;
}

export type { ExecutionResult, RuntimeOptions, FileSystemTree } from '@nodepack/runtime';
