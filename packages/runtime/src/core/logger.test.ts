import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, isLoggingEnabled } from './logger.js';

describe('Logger', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('isLoggingEnabled', () => {
    test('return true in development environment', () => {
      process.env.NODE_ENV = 'development';
      expect(isLoggingEnabled()).toBe(true);
    });

    test('return false in test environment', () => {
      process.env.NODE_ENV = 'test';
      expect(isLoggingEnabled()).toBe(false);
    });

    test('return false in production environment', () => {
      process.env.NODE_ENV = 'production';
      expect(isLoggingEnabled()).toBe(false);
    });

    test('return true when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      expect(isLoggingEnabled()).toBe(true);
    });
  });

  describe('createLogger', () => {
    describe('in development mode', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      test('log messages with prefix', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const logger = createLogger('[TEST]');

        logger.log('This is a test message');

        expect(consoleSpy).toHaveBeenCalledWith('[TEST] This is a test message');
        consoleSpy.mockRestore();
      });

      test('log warnings with prefix', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const logger = createLogger('[TEST]');

        logger.warn('This is a warning');

        expect(consoleSpy).toHaveBeenCalledWith('[TEST] This is a warning');
        consoleSpy.mockRestore();
      });

      test('log errors with prefix', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const logger = createLogger('[TEST]');

        logger.error('This is an error');

        expect(consoleSpy).toHaveBeenCalledWith('[TEST] This is an error');
        consoleSpy.mockRestore();
      });

      test('support multiple arguments', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const logger = createLogger('[TEST]');

        logger.log('Message', { data: 'test' }, 123);

        expect(consoleSpy).toHaveBeenCalledWith('[TEST] Message', { data: 'test' }, 123);
        consoleSpy.mockRestore();
      });

      test('support different prefixes', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const npmLogger = createLogger('[NPM]');
        const resolverLogger = createLogger('[Resolver]');

        npmLogger.log('Installing package');
        resolverLogger.log('Resolving dependencies');

        expect(consoleSpy).toHaveBeenNthCalledWith(1, '[NPM] Installing package');
        expect(consoleSpy).toHaveBeenNthCalledWith(2, '[Resolver] Resolving dependencies');
        consoleSpy.mockRestore();
      });
    });

    describe('in test mode', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'test';
      });

      test('suppress log messages', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const logger = createLogger('[TEST]');

        logger.log('This should not appear');

        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      test('suppress warnings', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const logger = createLogger('[TEST]');

        logger.warn('This should not appear');

        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      test('suppress errors', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const logger = createLogger('[TEST]');

        logger.error('This should not appear');

        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    describe('in production mode', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      test('suppress log messages', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const logger = createLogger('[TEST]');

        logger.log('This should not appear');

        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      test('suppress warnings', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const logger = createLogger('[TEST]');

        logger.warn('This should not appear');

        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      test('suppress errors', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const logger = createLogger('[TEST]');

        logger.error('This should not appear');

        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });
  });
});
