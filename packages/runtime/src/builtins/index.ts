/**
 * Node.js built-in module implementations for QuickJS
 */
export { createFsModule } from './fs.js';
export { createPathModule } from './path.js';
export { createProcessModule } from './process.js';
export { createTimersModule } from './timers.js';
export { createModuleBuiltin } from './module.js';
export { createGlobalModule, addModuleFunction } from './helpers.js';
export type { ModuleFactory } from './helpers.js';
