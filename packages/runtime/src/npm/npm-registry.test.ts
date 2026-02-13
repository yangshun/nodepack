import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { NpmRegistry } from './npm-registry.js';
import type { PackageMetadata, PackageManifest } from './types.js';

describe('NpmRegistry', () => {
  let registry: NpmRegistry;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    registry = new NpmRegistry();

    // Mock global fetch
    fetchMock = vi.fn();
    // @ts-expect-error
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockMetadata(name: string, versions: string[], latest: string): PackageMetadata {
    const versionMap: Record<string, PackageManifest> = {};

    for (const version of versions) {
      versionMap[version] = {
        name,
        version,
        dist: {
          tarball: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
        },
      };
    }

    return {
      name,
      versions: versionMap,
      'dist-tags': {
        latest,
      },
    } as PackageMetadata;
  }

  describe('fetchPackageMetadata()', () => {
    test('fetch package metadata from npm registry', async () => {
      const mockMetadata = createMockMetadata('test-package', ['1.0.0'], '1.0.0');

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      const result = await registry.fetchPackageMetadata('test-package');

      expect(fetchMock).toHaveBeenCalledWith('https://registry.npmjs.org/test-package');
      expect(result).toEqual(mockMetadata);
    });

    test('handle scoped packages', async () => {
      const mockMetadata = createMockMetadata('@scope/package', ['1.0.0'], '1.0.0');

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      const result = await registry.fetchPackageMetadata('@scope/package');

      expect(fetchMock).toHaveBeenCalledWith('https://registry.npmjs.org/@scope%2Fpackage');
      expect(result.name).toBe('@scope/package');
    });

    test('cache package metadata', async () => {
      const mockMetadata = createMockMetadata('cached-package', ['1.0.0'], '1.0.0');

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      // First call
      const result1 = await registry.fetchPackageMetadata('cached-package');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await registry.fetchPackageMetadata('cached-package');
      expect(fetchMock).toHaveBeenCalledTimes(1); // Still only 1 call
      expect(result1).toBe(result2); // Same object reference
    });

    test('throw error when package not found', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(registry.fetchPackageMetadata('nonexistent-package')).rejects.toThrow(
        'Failed to fetch package "nonexistent-package": 404 Not Found',
      );
    });

    test('throw error on network failure', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(registry.fetchPackageMetadata('test-package')).rejects.toThrow(
        'Cannot fetch package "test-package": Network error',
      );
    });

    test('handle package with multiple versions', async () => {
      const mockMetadata = createMockMetadata(
        'multi-version',
        ['1.0.0', '1.5.0', '2.0.0'],
        '2.0.0',
      );

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      const result = await registry.fetchPackageMetadata('multi-version');

      expect(Object.keys(result.versions)).toHaveLength(3);
      expect(result['dist-tags'].latest).toBe('2.0.0');
    });
  });

  describe('fetchManifest()', () => {
    test('fetch manifest for specific version', async () => {
      const mockMetadata = createMockMetadata('test-package', ['1.0.0', '2.0.0'], '2.0.0');

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      const manifest = await registry.fetchManifest('test-package', '1.0.0');

      expect(manifest.name).toBe('test-package');
      expect(manifest.version).toBe('1.0.0');
    });

    test('resolve "latest" tag to actual version', async () => {
      const mockMetadata = createMockMetadata('test-package', ['1.0.0', '2.0.0'], '2.0.0');

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      const manifest = await registry.fetchManifest('test-package', 'latest');

      expect(manifest.version).toBe('2.0.0');
    });

    test('resolve custom dist-tags', async () => {
      const mockMetadata: PackageMetadata = {
        name: 'test-package',
        versions: {
          '1.0.0': {
            name: 'test-package',
            version: '1.0.0',
            dist: { tarball: 'https://registry.npmjs.org/test-package/-/test-package-1.0.0.tgz' },
          },
          '2.0.0-beta': {
            name: 'test-package',
            version: '2.0.0-beta',
            dist: {
              tarball: 'https://registry.npmjs.org/test-package/-/test-package-2.0.0-beta.tgz',
            },
          },
        },
        'dist-tags': {
          latest: '1.0.0',
          beta: '2.0.0-beta',
        },
      } as any;

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      const manifest = await registry.fetchManifest('test-package', 'beta');

      expect(manifest.version).toBe('2.0.0-beta');
    });

    test('throw error when version not found', async () => {
      const mockMetadata = createMockMetadata('test-package', ['1.0.0'], '1.0.0');

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      await expect(registry.fetchManifest('test-package', '9.9.9')).rejects.toThrow(
        'Version 9.9.9 not found for package "test-package"',
      );
    });

    test('include available versions in error message', async () => {
      const mockMetadata = createMockMetadata(
        'test-package',
        ['1.0.0', '1.1.0', '1.2.0', '1.3.0', '1.4.0', '1.5.0'],
        '1.5.0',
      );

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      try {
        await registry.fetchManifest('test-package', '9.9.9');
        throw new Error('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('Available:');
        expect(error.message).toContain('1.0.0');
      }
    });
  });

  describe('getTarballInfo()', () => {
    test('return tarball URL for package version', async () => {
      const mockMetadata = createMockMetadata('test-package', ['1.0.0'], '1.0.0');

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      const tarballInfo = await registry.getTarballInfo('test-package', '1.0.0');

      expect(tarballInfo.url).toBe(
        'https://registry.npmjs.org/test-package/-/test-package-1.0.0.tgz',
      );
    });

    test('include integrity and shasum when available', async () => {
      const mockMetadata: PackageMetadata = {
        name: 'test-package',
        versions: {
          '1.0.0': {
            name: 'test-package',
            version: '1.0.0',
            dist: {
              tarball: 'https://registry.npmjs.org/test-package/-/test-package-1.0.0.tgz',
              integrity: 'sha512-abc123',
              shasum: 'def456',
            },
          },
        },
        'dist-tags': {
          latest: '1.0.0',
        },
      } as any;

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      const tarballInfo = await registry.getTarballInfo('test-package', '1.0.0');

      expect(tarballInfo.url).toBe(
        'https://registry.npmjs.org/test-package/-/test-package-1.0.0.tgz',
      );
      expect(tarballInfo.integrity).toBe('sha512-abc123');
      expect(tarballInfo.shasum).toBe('def456');
    });

    test('throw error when tarball URL missing', async () => {
      const mockMetadata: PackageMetadata = {
        name: 'test-package',
        versions: {
          '1.0.0': {
            name: 'test-package',
            version: '1.0.0',
            // Missing dist field
          },
        },
        'dist-tags': {
          latest: '1.0.0',
        },
      } as any;

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      await expect(registry.getTarballInfo('test-package', '1.0.0')).rejects.toThrow(
        'No tarball URL found for test-package@1.0.0',
      );
    });
  });

  describe('downloadTarball()', () => {
    test('download tarball as ArrayBuffer', async () => {
      const mockBuffer = new ArrayBuffer(1024);

      fetchMock.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => mockBuffer,
      });

      const result = await registry.downloadTarball('https://example.com/package.tgz');

      expect(fetchMock).toHaveBeenCalledWith('https://example.com/package.tgz');
      expect(result).toBe(mockBuffer);
    });

    test('throw error on failed download', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(registry.downloadTarball('https://example.com/missing.tgz')).rejects.toThrow(
        'Failed to download tarball: 404',
      );
    });

    test('throw error on network failure', async () => {
      fetchMock.mockRejectedValue(new Error('Connection timeout'));

      await expect(registry.downloadTarball('https://example.com/package.tgz')).rejects.toThrow(
        'Failed to download tarball: Connection timeout',
      );
    });

    test('handle large tarballs', async () => {
      const largeBuffer = new ArrayBuffer(10 * 1024 * 1024); // 10MB

      fetchMock.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => largeBuffer,
      });

      const result = await registry.downloadTarball('https://example.com/large-package.tgz');

      expect(result.byteLength).toBe(10 * 1024 * 1024);
    });
  });

  describe('clearCache()', () => {
    test('clear cached manifests', async () => {
      const mockMetadata = createMockMetadata('test-package', ['1.0.0'], '1.0.0');

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      // Fetch to populate cache
      await registry.fetchPackageMetadata('test-package');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Clear cache
      registry.clearCache();

      // Fetch again should make new request
      await registry.fetchPackageMetadata('test-package');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    test('not throw when clearing empty cache', () => {
      expect(() => {
        registry.clearCache();
      }).not.toThrow();
    });
  });

  describe('real-world scenarios', () => {
    test('fetch React metadata structure', async () => {
      const reactMetadata: PackageMetadata = {
        name: 'react',
        versions: {
          '17.0.2': {
            name: 'react',
            version: '17.0.2',
            dependencies: {
              'loose-envify': '^1.1.0',
              'object-assign': '^4.1.1',
            },
            dist: {
              tarball: 'https://registry.npmjs.org/react/-/react-17.0.2.tgz',
              integrity: 'sha512-abc',
            },
          },
          '18.2.0': {
            name: 'react',
            version: '18.2.0',
            dependencies: {
              'loose-envify': '^1.1.0',
            },
            dist: {
              tarball: 'https://registry.npmjs.org/react/-/react-18.2.0.tgz',
              integrity: 'sha512-xyz',
            },
          },
        },
        'dist-tags': {
          latest: '18.2.0',
        },
      } as any;

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => reactMetadata,
      });

      const metadata = await registry.fetchPackageMetadata('react');
      const manifest = await registry.fetchManifest('react', 'latest');

      expect(metadata.name).toBe('react');
      expect(manifest.version).toBe('18.2.0');
      expect(manifest.dependencies).toHaveProperty('loose-envify');
    });

    test('handle scoped TypeScript package', async () => {
      const tsMetadata: PackageMetadata = {
        name: '@types/node',
        versions: {
          '20.0.0': {
            name: '@types/node',
            version: '20.0.0',
            dist: {
              tarball: 'https://registry.npmjs.org/@types/node/-/node-20.0.0.tgz',
            },
          },
        },
        'dist-tags': {
          latest: '20.0.0',
        },
      } as any;

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => tsMetadata,
      });

      const result = await registry.fetchPackageMetadata('@types/node');

      expect(fetchMock).toHaveBeenCalledWith('https://registry.npmjs.org/@types%2Fnode');
      expect(result.name).toBe('@types/node');
    });
  });

  describe('edge cases', () => {
    test('handle package with no dist-tags', async () => {
      const mockMetadata: PackageMetadata = {
        name: 'no-tags',
        versions: {
          '1.0.0': {
            name: 'no-tags',
            version: '1.0.0',
            dist: { tarball: 'https://registry.npmjs.org/no-tags/-/no-tags-1.0.0.tgz' },
          },
        },
        'dist-tags': {} as any,
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      const metadata = await registry.fetchPackageMetadata('no-tags');
      expect(metadata.versions).toHaveProperty('1.0.0');
    });

    test('handle package with special characters in name', async () => {
      const mockMetadata = createMockMetadata('package-with-dashes', ['1.0.0'], '1.0.0');

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      const result = await registry.fetchPackageMetadata('package-with-dashes');
      expect(result.name).toBe('package-with-dashes');
    });

    test('handle empty version string', async () => {
      const mockMetadata = createMockMetadata('test-package', ['1.0.0'], '1.0.0');

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockMetadata,
      });

      // Empty string should be treated as actual version, not as tag
      await expect(registry.fetchManifest('test-package', '')).rejects.toThrow();
    });
  });
});
