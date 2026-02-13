/**
 * Core Runtime Components
 * QuickJS context setup and code execution
 */

export { setupConsole } from './console-handler.js';
export type { ConsoleSetupOptions } from './console-handler.js';
export { setupVMContext } from './vm-context.js';
export { executeCode } from './code-executor.js';
export type { CodeExecutorContext } from './code-executor.js';
export { createLogger, isLoggingEnabled } from './logger.js';
export type { Logger } from './logger.js';
