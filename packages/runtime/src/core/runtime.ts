/**
 * Nodepack Runtime
 * Main runtime class that orchestrates QuickJS initialization and code execution
 */

import { newQuickJSWASMModuleFromVariant } from 'quickjs-emscripten';
import variant from '@jitl/quickjs-wasmfile-release-sync';
import { vol } from 'memfs';
import type { IFs } from 'memfs';
import type { ExecutionResult, RuntimeOptions } from '../types.js';
import type { TimerTracker } from '../builtins/timers.js';
import { NpmPackageManager } from '../npm/package-manager.js';
import type { InstallOptions } from '../npm/types.js';
import { setupConsole } from './console-handler.js';
import { setupVMContext } from './vm-context.js';
import { executeCode } from './code-executor.js';

export class NodepackRuntime {
  private QuickJS: any;
  private isInitialized = false;
  private filesystem: IFs = vol as any as IFs;
  private consoleLogs: string[] = [];
  private npmPackageManager: NpmPackageManager;

  constructor() {
    this.npmPackageManager = new NpmPackageManager(this.filesystem);
  }

  /**
   * Public API for npm package management
   */
  get npm() {
    return {
      install: (pkg: string, version?: string, options?: InstallOptions) =>
        this.npmPackageManager.install(pkg, version, options),
      installFromPackageJson: (content: string, options?: InstallOptions) =>
        this.npmPackageManager.installFromPackageJson(content, options),
      isInstalled: (pkg: string, version?: string) =>
        this.npmPackageManager.isInstalled(pkg, version),
      clearCache: () => this.npmPackageManager.clearCache(),
    };
  }

  /**
   * Initialize the QuickJS runtime
   * This is expensive and should only be done once
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.QuickJS = await newQuickJSWASMModuleFromVariant(variant);
    this.isInitialized = true;
  }

  /**
   * Execute JavaScript/TypeScript code
   */
  async execute(code: string, options: RuntimeOptions = {}): Promise<ExecutionResult> {
    if (!this.isInitialized) {
      throw new Error('Runtime not initialized. Call initialize() first.');
    }

    // Create runtime and context
    const runtime = this.QuickJS.newRuntime();
    const vm = runtime.newContext();
    const timerTracker: TimerTracker = {
      pendingTimers: new Set(),
    };

    try {
      // Set up console object
      const consoleObj = setupConsole(vm, {
        logStore: this.consoleLogs,
        onLog: options.onLog,
      });
      vm.setProp(vm.global, 'console', consoleObj);
      consoleObj.dispose();

      // Set up VM context with Node.js built-ins and module system
      setupVMContext(vm, runtime, this.filesystem, timerTracker, options);

      // Execute the code
      const result = await executeCode(
        code,
        {
          vm,
          runtime,
          filesystem: this.filesystem,
          timerTracker,
          consoleLogs: this.consoleLogs,
          npmPackageManager: this.npmPackageManager,
        },
        options,
      );

      return result;
    } finally {
      this.consoleLogs = []; // Clear logs after execution
    }
  }

  /**
   * Get all console logs from last execution
   */
  getConsoleLogs(): string[] {
    return [...this.consoleLogs];
  }

  /**
   * Get the virtual filesystem instance
   * Useful for integrating with terminal or other filesystem tools
   */
  getFilesystem() {
    return this.filesystem;
  }
}
