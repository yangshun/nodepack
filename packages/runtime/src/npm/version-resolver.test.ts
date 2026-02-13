import { describe, beforeEach, it, expect } from 'vitest';
import { VersionResolver } from './version-resolver.js';
import type { PackageMetadata } from './types.js';

describe('VersionResolver', () => {
  let resolver: VersionResolver;
  let mockMetadata: PackageMetadata;

  beforeEach(() => {
    resolver = new VersionResolver();

    mockMetadata = {
      name: 'test-package',
      'dist-tags': {
        latest: '2.1.0',
        next: '3.0.0-beta.1',
        canary: '3.0.0-canary.5',
      },
      versions: {
        '1.0.0': {
          name: 'test-package',
          version: '1.0.0',
          dist: {
            tarball: 'https://registry.npmjs.org/test-package/-/test-package-1.0.0.tgz',
          },
        },
        '1.5.0': {
          name: 'test-package',
          version: '1.5.0',
          dist: {
            tarball: 'https://registry.npmjs.org/test-package/-/test-package-1.5.0.tgz',
          },
        },
        '2.0.0': {
          name: 'test-package',
          version: '2.0.0',
          dist: {
            tarball: 'https://registry.npmjs.org/test-package/-/test-package-2.0.0.tgz',
          },
        },
        '2.1.0': {
          name: 'test-package',
          version: '2.1.0',
          dist: {
            tarball: 'https://registry.npmjs.org/test-package/-/test-package-2.1.0.tgz',
          },
        },
        '2.2.0': {
          name: 'test-package',
          version: '2.2.0',
          dist: {
            tarball: 'https://registry.npmjs.org/test-package/-/test-package-2.2.0.tgz',
          },
        },
        '3.0.0-beta.1': {
          name: 'test-package',
          version: '3.0.0-beta.1',
          dist: {
            tarball: 'https://registry.npmjs.org/test-package/-/test-package-3.0.0-beta.1.tgz',
          },
        },
        '3.0.0-canary.5': {
          name: 'test-package',
          version: '3.0.0-canary.5',
          dist: {
            tarball: 'https://registry.npmjs.org/test-package/-/test-package-3.0.0-canary.5.tgz',
          },
        },
      },
    } as any;
  });

  describe('resolve()', () => {
    describe('dist-tags', () => {
      it('should resolve "latest" tag', () => {
        const version = resolver.resolve('latest', mockMetadata);
        expect(version).toBe('2.1.0');
      });

      it('should resolve "next" tag', () => {
        const version = resolver.resolve('next', mockMetadata);
        expect(version).toBe('3.0.0-beta.1');
      });

      it('should resolve custom tag', () => {
        const version = resolver.resolve('canary', mockMetadata);
        expect(version).toBe('3.0.0-canary.5');
      });

      it('should prioritize dist-tags over semver ranges', () => {
        // "latest" is a dist-tag, not a semver range
        const version = resolver.resolve('latest', mockMetadata);
        expect(version).toBe('2.1.0');
      });
    });

    describe('exact versions', () => {
      it('should resolve exact version', () => {
        const version = resolver.resolve('2.0.0', mockMetadata);
        expect(version).toBe('2.0.0');
      });

      it('should resolve exact prerelease version', () => {
        const version = resolver.resolve('3.0.0-beta.1', mockMetadata);
        expect(version).toBe('3.0.0-beta.1');
      });

      it('should throw for non-existent exact version', () => {
        expect(() => {
          resolver.resolve('9.9.9', mockMetadata);
        }).toThrow();
      });
    });

    describe('semver ranges', () => {
      it('should resolve caret range (^)', () => {
        const version = resolver.resolve('^2.0.0', mockMetadata);
        expect(version).toBe('2.2.0');
      });

      it('should resolve tilde range (~)', () => {
        const version = resolver.resolve('~2.1.0', mockMetadata);
        expect(version).toBe('2.1.0');
      });

      it('should resolve greater than (>)', () => {
        const version = resolver.resolve('>2.0.0', mockMetadata);
        expect(version).toBe('2.2.0');
      });

      it('should resolve greater than or equal (>=)', () => {
        const version = resolver.resolve('>=2.1.0', mockMetadata);
        expect(version).toBe('2.2.0');
      });

      it('should resolve less than (<)', () => {
        const version = resolver.resolve('<2.0.0', mockMetadata);
        expect(version).toBe('1.5.0');
      });

      it('should resolve less than or equal (<=)', () => {
        const version = resolver.resolve('<=2.0.0', mockMetadata);
        expect(version).toBe('2.0.0');
      });

      it('should resolve range (1.0.0 - 2.0.0)', () => {
        const version = resolver.resolve('1.0.0 - 2.0.0', mockMetadata);
        expect(version).toBe('2.0.0');
      });

      it('should resolve OR range (||)', () => {
        const version = resolver.resolve('1.0.0 || 2.2.0', mockMetadata);
        expect(version).toBe('2.2.0');
      });

      it('should throw for unsatisfiable range', () => {
        expect(() => {
          resolver.resolve('^9.0.0', mockMetadata);
        }).toThrow('No version matching');
      });
    });

    describe('wildcard', () => {
      it('should resolve asterisk (*) to latest', () => {
        const version = resolver.resolve('*', mockMetadata);
        expect(version).toBe('2.1.0');
      });

      it('should resolve empty string to latest', () => {
        const version = resolver.resolve('', mockMetadata);
        expect(version).toBe('2.1.0');
      });
    });

    describe('prerelease versions', () => {
      it('should not include prereleases in stable ranges', () => {
        // Should not match 3.0.0-beta.1 or 3.0.0-canary.5
        // Will throw since no stable 3.x version exists
        expect(() => resolver.resolve('^3.0.0', mockMetadata)).toThrow();
      });

      it('should include prereleases when explicitly requested', () => {
        const version = resolver.resolve('3.0.0-beta.1', mockMetadata);
        expect(version).toBe('3.0.0-beta.1');
      });
    });

    describe('edge cases', () => {
      it('should handle package with only one version', () => {
        const singleVersionMetadata: PackageMetadata = {
          name: 'single-version',
          'dist-tags': {
            latest: '1.0.0',
          },
          versions: {
            '1.0.0': {
              name: 'single-version',
              version: '1.0.0',
              dist: {
                tarball: 'https://registry.npmjs.org/single-version/-/single-version-1.0.0.tgz',
              },
            },
          },
        } as any;

        const version = resolver.resolve('*', singleVersionMetadata);
        expect(version).toBe('1.0.0');
      });

      it('should throw with helpful error message', () => {
        expect(() => {
          resolver.resolve('^9.0.0', mockMetadata);
        }).toThrow('No version matching "^9.0.0"');
        expect(() => {
          resolver.resolve('^9.0.0', mockMetadata);
        }).toThrow('test-package');
      });

      it('should show available versions in error', () => {
        try {
          resolver.resolve('^9.0.0', mockMetadata);
          throw new Error('Should have thrown');
        } catch (error: any) {
          expect(error.message).toContain('Available:');
        }
      });
    });

    describe('major version ranges', () => {
      it('should resolve major version 1.x', () => {
        const version = resolver.resolve('1.x', mockMetadata);
        expect(version).toBe('1.5.0');
      });

      it('should resolve major version 2.x', () => {
        const version = resolver.resolve('2.x', mockMetadata);
        expect(version).toBe('2.2.0');
      });
    });

    describe('version with build metadata', () => {
      it('should handle versions without build metadata', () => {
        const version = resolver.resolve('2.0.0', mockMetadata);
        expect(version).toBe('2.0.0');
      });
    });
  });

  describe('satisfies()', () => {
    it('should return true for exact match', () => {
      const result = resolver.satisfies('2.0.0', '2.0.0');
      expect(result).toBe(true);
    });

    it('should return true for caret range match', () => {
      const result = resolver.satisfies('2.1.0', '^2.0.0');
      expect(result).toBe(true);
    });

    it('should return false for caret range mismatch', () => {
      const result = resolver.satisfies('3.0.0', '^2.0.0');
      expect(result).toBe(false);
    });

    it('should return true for tilde range match', () => {
      const result = resolver.satisfies('2.0.5', '~2.0.0');
      expect(result).toBe(true);
    });

    it('should return false for tilde range mismatch', () => {
      const result = resolver.satisfies('2.1.0', '~2.0.0');
      expect(result).toBe(false);
    });

    it('should return true for greater than match', () => {
      const result = resolver.satisfies('2.1.0', '>2.0.0');
      expect(result).toBe(true);
    });

    it('should return false for greater than mismatch', () => {
      const result = resolver.satisfies('1.9.0', '>2.0.0');
      expect(result).toBe(false);
    });

    it('should return true for wildcard', () => {
      const result = resolver.satisfies('1.2.3', '*');
      expect(result).toBe(true);
    });

    it('should handle prerelease versions', () => {
      const result = resolver.satisfies('3.0.0-beta.1', '3.0.0-beta.1');
      expect(result).toBe(true);
    });

    it('should handle complex ranges', () => {
      const result = resolver.satisfies('2.0.0', '>=1.0.0 <3.0.0');
      expect(result).toBe(true);
    });
  });

  describe('real-world scenarios', () => {
    it('should resolve React-style version range', () => {
      const reactMetadata: PackageMetadata = {
        name: 'react',
        'dist-tags': {
          latest: '18.2.0',
        },
        versions: {
          '17.0.2': {
            name: 'react',
            version: '17.0.2',
            dist: { tarball: 'https://registry.npmjs.org/react/-/react-17.0.2.tgz' },
          },
          '18.0.0': {
            name: 'react',
            version: '18.0.0',
            dist: { tarball: 'https://registry.npmjs.org/react/-/react-18.0.0.tgz' },
          },
          '18.2.0': {
            name: 'react',
            version: '18.2.0',
            dist: { tarball: 'https://registry.npmjs.org/react/-/react-18.2.0.tgz' },
          },
        },
      } as any;

      const version = resolver.resolve('^18.0.0', reactMetadata);
      expect(version).toBe('18.2.0');
    });

    it('should resolve TypeScript-style version range', () => {
      const tsMetadata: PackageMetadata = {
        name: 'typescript',
        'dist-tags': {
          latest: '5.3.3',
        },
        versions: {
          '4.9.5': {
            name: 'typescript',
            version: '4.9.5',
            dist: { tarball: 'https://registry.npmjs.org/typescript/-/typescript-4.9.5.tgz' },
          },
          '5.0.0': {
            name: 'typescript',
            version: '5.0.0',
            dist: { tarball: 'https://registry.npmjs.org/typescript/-/typescript-5.0.0.tgz' },
          },
          '5.3.3': {
            name: 'typescript',
            version: '5.3.3',
            dist: { tarball: 'https://registry.npmjs.org/typescript/-/typescript-5.3.3.tgz' },
          },
        },
      } as any;

      const version = resolver.resolve('~5.3.0', tsMetadata);
      expect(version).toBe('5.3.3');
    });
  });
});
