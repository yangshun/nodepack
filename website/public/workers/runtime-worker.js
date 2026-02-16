/**
 * Web Worker Runtime
 * Runs QuickJS in a Web Worker for process isolation
 */
import { expose } from 'comlink';
import { NodepackRuntime } from '@nodepack/runtime';
/**
 * Worker-side runtime wrapper
 * Exposed via Comlink to main thread
 */
class WorkerRuntime {
    runtime;
    isInitialized = false;
    constructor() {
        this.runtime = new NodepackRuntime();
    }
    /**
     * Initialize the QuickJS runtime
     */
    async initialize() {
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
    async execute(code, options) {
        if (!this.isInitialized) {
            throw new Error('Runtime not initialized in worker');
        }
        return this.runtime.execute(code, options);
    }
    /**
     * Terminate the worker
     */
    terminate() {
        console.log('[Worker] Terminating...');
        self.close();
    }
}
// Expose the runtime to the main thread via Comlink
const workerRuntime = new WorkerRuntime();
expose(workerRuntime);
console.log('[Worker] Runtime worker loaded and ready');
//# sourceMappingURL=runtime-worker.js.map