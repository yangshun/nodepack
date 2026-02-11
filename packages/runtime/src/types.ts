/**
 * Types for Nodepack runtime
 */

export interface FileSystemTree {
  [path: string]: string | Uint8Array | FileSystemTree;
}

export interface ExecutionResult {
  ok: boolean;
  data?: any;
  error?: string;
  logs?: string[];
}

export interface ConsoleOutput {
  type: 'log' | 'error' | 'warn' | 'info';
  args: any[];
  timestamp: number;
}

export interface RuntimeOptions {
  allowFetch?: boolean;
  allowFs?: boolean;
  env?: Record<string, string>;
  timeout?: number;
}

export interface NodeModule {
  exports: any;
  filename: string;
  loaded: boolean;
  children: NodeModule[];
}
