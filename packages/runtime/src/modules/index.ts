/**
 * Node.js module implementations for QuickJS
 */
export { createFsModule } from './fs-module.js';
export { createPathModule } from './path-module.js';
export { createProcessModule } from './process-module.js';
export { createGlobalModule, addModuleFunction } from './module-helpers.js';
export type { ModuleFactory } from './module-helpers.js';
