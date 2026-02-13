/**
 * Logger Utility
 * Provides environment-aware logging that only prints in development mode
 */

/**
 * Logger interface with log, warn, and error methods
 */
export interface Logger {
  /**
   * Log an informational message (only in development)
   */
  log(message: string, ...args: any[]): void;

  /**
   * Log a warning message (only in development)
   */
  warn(message: string, ...args: any[]): void;

  /**
   * Log an error message (only in development)
   */
  error(message: string, ...args: any[]): void;
}

/**
 * Check if logging is currently enabled based on environment
 *
 * @returns true if NODE_ENV is 'development', false otherwise
 *
 * @example
 * if (isLoggingEnabled()) {
 *   // Perform expensive debug computation
 * }
 */
export function isLoggingEnabled(): boolean {
  // Check Node.js environment (for tests)
  if (typeof process !== 'undefined' && process.env) {
    const nodeEnv = process.env.NODE_ENV || 'development';
    return nodeEnv === 'development';
  }

  // Check QuickJS environment (for runtime)
  if (typeof globalThis !== 'undefined' && (globalThis as any).__NODEPACK_ENV__) {
    return (globalThis as any).__NODEPACK_ENV__ === 'development';
  }

  // Default to development (safe default)
  return true;
}

/**
 * Create a logger with a specific prefix
 * The logger automatically suppresses output in production and test environments
 *
 * @param prefix - Prefix to prepend to all log messages (e.g., '[NPM]')
 * @returns Logger instance with log/warn/error methods
 *
 * @example
 * const logger = createLogger('[NPM]');
 * logger.log('Installing package'); // Only logs in development
 * logger.warn('Version conflict detected'); // Only warns in development
 * logger.error('Installation failed'); // Only errors in development
 */
export function createLogger(prefix: string): Logger {
  return {
    log(message: string, ...args: any[]): void {
      if (isLoggingEnabled()) {
        console.log(`${prefix} ${message}`, ...args);
      }
    },

    warn(message: string, ...args: any[]): void {
      if (isLoggingEnabled()) {
        console.warn(`${prefix} ${message}`, ...args);
      }
    },

    error(message: string, ...args: any[]): void {
      if (isLoggingEnabled()) {
        console.error(`${prefix} ${message}`, ...args);
      }
    },
  };
}
