/**
 * Browser polyfills
 * This file MUST be loaded before any other modules
 */

import { Buffer } from 'buffer';

// Make Buffer available globally for memfs and other Node.js compatibility
(globalThis as any).Buffer = Buffer;

console.log('[Polyfills] Buffer polyfill loaded');
