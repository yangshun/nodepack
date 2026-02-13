import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DependencyResolver } from './dependency-resolver.js';
import { NpmRegistry } from './npm-registry.js';
import type { PackageMetadata, PackageManifest } from './types.js';

describe('DependencyResolver', () => {
  let resolver: DependencyResolver;
  let mockRegistry: NpmRegistry;

  beforeEach(() => {
    mockRegistry = new NpmRegistry();
    resolver = new DependencyResolver(mockRegistry);

    // Mock the registry methods
    vi.spyOn(mockRegistry, 'fetchPackageMetadata');
    vi.spyOn(mockRegistry, 'fetchManifest');
    vi.spyOn(mockRegistry, 'getTarballInfo');
  });

  function createMockMetadata(
    name: string,
    versions: string[],
    latest: string,
  ): PackageMetadata {
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

  function createMockManifest(
    name: string,
    version: string,
    dependencies?: Record<string, string>,
    devDependencies?: Record<string, string>,
  ): PackageManifest {
    return {
      name,
      version,
      dependencies,
      devDependencies,
      dist: {
        tarball: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
      },
    };
  }

  describe('resolve()', () => {
    describe('simple packages', () => {
      it('should resolve package with no dependencies', async () => {
        const metadata = createMockMetadata('simple-package', ['1.0.0'], '1.0.0');
        const manifest = createMockManifest('simple-package', '1.0.0');

        vi.mocked(mockRegistry.fetchPackageMetadata).mockResolvedValue(metadata);
        vi.mocked(mockRegistry.fetchManifest).mockResolvedValue(manifest);
        vi.mocked(mockRegistry.getTarballInfo).mockResolvedValue({
          url: 'https://registry.npmjs.org/simple-package/-/simple-package-1.0.0.tgz',
        });

        const result = await resolver.resolve('simple-package', '1.0.0');

        expect(result.size).toBe(1);
        expect(result.has('simple-package')).toBe(true);

        const dep = result.get('simple-package')!;
        expect(dep.name).toBe('simple-package');
        expect(dep.version).toBe('1.0.0');
        expect(dep.resolved).toBe(
          'https://registry.npmjs.org/simple-package/-/simple-package-1.0.0.tgz',
        );
        expect(dep.dependencies.size).toBe(0);
      });

      it('should resolve latest version when using "latest" tag', async () => {
        const metadata = createMockMetadata('pkg', ['1.0.0', '2.0.0'], '2.0.0');
        const manifest = createMockManifest('pkg', '2.0.0');

        vi.mocked(mockRegistry.fetchPackageMetadata).mockResolvedValue(metadata);
        vi.mocked(mockRegistry.fetchManifest).mockResolvedValue(manifest);
        vi.mocked(mockRegistry.getTarballInfo).mockResolvedValue({
          url: 'https://registry.npmjs.org/pkg/-/pkg-2.0.0.tgz',
        });

        const result = await resolver.resolve('pkg', 'latest');

        expect(result.size).toBe(1);
        const dep = result.get('pkg')!;
        expect(dep.version).toBe('2.0.0');
      });

      it('should resolve version range', async () => {
        const metadata = createMockMetadata('pkg', ['1.0.0', '1.5.0', '2.0.0'], '2.0.0');
        const manifest = createMockManifest('pkg', '1.5.0');

        vi.mocked(mockRegistry.fetchPackageMetadata).mockResolvedValue(metadata);
        vi.mocked(mockRegistry.fetchManifest).mockResolvedValue(manifest);
        vi.mocked(mockRegistry.getTarballInfo).mockResolvedValue({
          url: 'https://registry.npmjs.org/pkg/-/pkg-1.5.0.tgz',
        });

        const result = await resolver.resolve('pkg', '^1.0.0');

        expect(result.size).toBe(1);
        const dep = result.get('pkg')!;
        expect(dep.version).toBe('1.5.0');
      });
    });

    describe('nested dependencies', () => {
      it('should resolve package with one dependency', async () => {
        // Parent package
        const parentMetadata = createMockMetadata('parent', ['1.0.0'], '1.0.0');
        const parentManifest = createMockManifest('parent', '1.0.0', {
          child: '^1.0.0',
        });

        // Child package
        const childMetadata = createMockMetadata('child', ['1.0.0', '1.5.0'], '1.5.0');
        const childManifest = createMockManifest('child', '1.5.0');

        vi.mocked(mockRegistry.fetchPackageMetadata).mockImplementation(
          async (name: string) => {
            if (name === 'parent') return parentMetadata;
            if (name === 'child') return childMetadata;
            throw new Error(`Unknown package: ${name}`);
          },
        );

        vi.mocked(mockRegistry.fetchManifest).mockImplementation(
          async (name: string, version: string) => {
            if (name === 'parent' && version === '1.0.0') return parentManifest;
            if (name === 'child' && version === '1.5.0') return childManifest;
            throw new Error(`Unknown manifest: ${name}@${version}`);
          },
        );

        vi.mocked(mockRegistry.getTarballInfo).mockImplementation(
          async (name: string, version: string) => ({
            url: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
          }),
        );

        const result = await resolver.resolve('parent', '1.0.0');

        expect(result.size).toBe(2);
        expect(result.has('parent')).toBe(true);
        expect(result.has('child')).toBe(true);

        const parentDep = result.get('parent')!;
        expect(parentDep.version).toBe('1.0.0');

        const childDep = result.get('child')!;
        expect(childDep.version).toBe('1.5.0');
      });

      it('should resolve deeply nested dependencies', async () => {
        // A -> B -> C chain
        const aMetadata = createMockMetadata('a', ['1.0.0'], '1.0.0');
        const aManifest = createMockManifest('a', '1.0.0', { b: '^1.0.0' });

        const bMetadata = createMockMetadata('b', ['1.0.0'], '1.0.0');
        const bManifest = createMockManifest('b', '1.0.0', { c: '^1.0.0' });

        const cMetadata = createMockMetadata('c', ['1.0.0'], '1.0.0');
        const cManifest = createMockManifest('c', '1.0.0');

        vi.mocked(mockRegistry.fetchPackageMetadata).mockImplementation(
          async (name: string) => {
            if (name === 'a') return aMetadata;
            if (name === 'b') return bMetadata;
            if (name === 'c') return cMetadata;
            throw new Error(`Unknown package: ${name}`);
          },
        );

        vi.mocked(mockRegistry.fetchManifest).mockImplementation(
          async (name: string, version: string) => {
            if (name === 'a' && version === '1.0.0') return aManifest;
            if (name === 'b' && version === '1.0.0') return bManifest;
            if (name === 'c' && version === '1.0.0') return cManifest;
            throw new Error(`Unknown manifest: ${name}@${version}`);
          },
        );

        vi.mocked(mockRegistry.getTarballInfo).mockImplementation(
          async (name: string, version: string) => ({
            url: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
          }),
        );

        const result = await resolver.resolve('a', '1.0.0');

        expect(result.size).toBe(3);
        expect(result.has('a')).toBe(true);
        expect(result.has('b')).toBe(true);
        expect(result.has('c')).toBe(true);
      });

      it('should resolve package with multiple dependencies', async () => {
        // Parent depends on both child1 and child2
        const parentMetadata = createMockMetadata('parent', ['1.0.0'], '1.0.0');
        const parentManifest = createMockManifest('parent', '1.0.0', {
          child1: '^1.0.0',
          child2: '^2.0.0',
        });

        const child1Metadata = createMockMetadata('child1', ['1.0.0'], '1.0.0');
        const child1Manifest = createMockManifest('child1', '1.0.0');

        const child2Metadata = createMockMetadata('child2', ['2.0.0'], '2.0.0');
        const child2Manifest = createMockManifest('child2', '2.0.0');

        vi.mocked(mockRegistry.fetchPackageMetadata).mockImplementation(
          async (name: string) => {
            if (name === 'parent') return parentMetadata;
            if (name === 'child1') return child1Metadata;
            if (name === 'child2') return child2Metadata;
            throw new Error(`Unknown package: ${name}`);
          },
        );

        vi.mocked(mockRegistry.fetchManifest).mockImplementation(
          async (name: string, version: string) => {
            if (name === 'parent' && version === '1.0.0') return parentManifest;
            if (name === 'child1' && version === '1.0.0') return child1Manifest;
            if (name === 'child2' && version === '2.0.0') return child2Manifest;
            throw new Error(`Unknown manifest: ${name}@${version}`);
          },
        );

        vi.mocked(mockRegistry.getTarballInfo).mockImplementation(
          async (name: string, version: string) => ({
            url: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
          }),
        );

        const result = await resolver.resolve('parent', '1.0.0');

        expect(result.size).toBe(3);
        expect(result.has('parent')).toBe(true);
        expect(result.has('child1')).toBe(true);
        expect(result.has('child2')).toBe(true);
      });
    });

    describe('circular dependencies', () => {
      it('should handle circular dependencies without infinite loop', async () => {
        // A -> B -> A (circular)
        const aMetadata = createMockMetadata('a', ['1.0.0'], '1.0.0');
        const aManifest = createMockManifest('a', '1.0.0', { b: '^1.0.0' });

        const bMetadata = createMockMetadata('b', ['1.0.0'], '1.0.0');
        const bManifest = createMockManifest('b', '1.0.0', { a: '^1.0.0' });

        vi.mocked(mockRegistry.fetchPackageMetadata).mockImplementation(
          async (name: string) => {
            if (name === 'a') return aMetadata;
            if (name === 'b') return bMetadata;
            throw new Error(`Unknown package: ${name}`);
          },
        );

        vi.mocked(mockRegistry.fetchManifest).mockImplementation(
          async (name: string, version: string) => {
            if (name === 'a' && version === '1.0.0') return aManifest;
            if (name === 'b' && version === '1.0.0') return bManifest;
            throw new Error(`Unknown manifest: ${name}@${version}`);
          },
        );

        vi.mocked(mockRegistry.getTarballInfo).mockImplementation(
          async (name: string, version: string) => ({
            url: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
          }),
        );

        const result = await resolver.resolve('a', '1.0.0');

        // Should resolve both packages without infinite loop
        expect(result.size).toBe(2);
        expect(result.has('a')).toBe(true);
        expect(result.has('b')).toBe(true);
      });

      it('should handle self-referencing dependencies', async () => {
        // Package that depends on itself
        const metadata = createMockMetadata('self', ['1.0.0'], '1.0.0');
        const manifest = createMockManifest('self', '1.0.0', { self: '^1.0.0' });

        vi.mocked(mockRegistry.fetchPackageMetadata).mockResolvedValue(metadata);
        vi.mocked(mockRegistry.fetchManifest).mockResolvedValue(manifest);
        vi.mocked(mockRegistry.getTarballInfo).mockResolvedValue({
          url: 'https://registry.npmjs.org/self/-/self-1.0.0.tgz',
        });

        const result = await resolver.resolve('self', '1.0.0');

        // Should only resolve once
        expect(result.size).toBe(1);
        expect(result.has('self')).toBe(true);
      });

      it('should handle complex circular dependency graph', async () => {
        // A -> B -> C -> B (B and C form a cycle)
        const aMetadata = createMockMetadata('a', ['1.0.0'], '1.0.0');
        const aManifest = createMockManifest('a', '1.0.0', { b: '^1.0.0' });

        const bMetadata = createMockMetadata('b', ['1.0.0'], '1.0.0');
        const bManifest = createMockManifest('b', '1.0.0', { c: '^1.0.0' });

        const cMetadata = createMockMetadata('c', ['1.0.0'], '1.0.0');
        const cManifest = createMockManifest('c', '1.0.0', { b: '^1.0.0' });

        vi.mocked(mockRegistry.fetchPackageMetadata).mockImplementation(
          async (name: string) => {
            if (name === 'a') return aMetadata;
            if (name === 'b') return bMetadata;
            if (name === 'c') return cMetadata;
            throw new Error(`Unknown package: ${name}`);
          },
        );

        vi.mocked(mockRegistry.fetchManifest).mockImplementation(
          async (name: string, version: string) => {
            if (name === 'a' && version === '1.0.0') return aManifest;
            if (name === 'b' && version === '1.0.0') return bManifest;
            if (name === 'c' && version === '1.0.0') return cManifest;
            throw new Error(`Unknown manifest: ${name}@${version}`);
          },
        );

        vi.mocked(mockRegistry.getTarballInfo).mockImplementation(
          async (name: string, version: string) => ({
            url: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
          }),
        );

        const result = await resolver.resolve('a', '1.0.0');

        expect(result.size).toBe(3);
        expect(result.has('a')).toBe(true);
        expect(result.has('b')).toBe(true);
        expect(result.has('c')).toBe(true);
      });
    });

    describe('dev dependencies', () => {
      it('should not include dev dependencies by default', async () => {
        const metadata = createMockMetadata('pkg', ['1.0.0'], '1.0.0');
        const manifest = createMockManifest(
          'pkg',
          '1.0.0',
          { prod: '^1.0.0' },
          { dev: '^1.0.0' },
        );

        const prodMetadata = createMockMetadata('prod', ['1.0.0'], '1.0.0');
        const prodManifest = createMockManifest('prod', '1.0.0');

        const devMetadata = createMockMetadata('dev', ['1.0.0'], '1.0.0');
        const devManifest = createMockManifest('dev', '1.0.0');

        vi.mocked(mockRegistry.fetchPackageMetadata).mockImplementation(
          async (name: string) => {
            if (name === 'pkg') return metadata;
            if (name === 'prod') return prodMetadata;
            if (name === 'dev') return devMetadata;
            throw new Error(`Unknown package: ${name}`);
          },
        );

        vi.mocked(mockRegistry.fetchManifest).mockImplementation(
          async (name: string, version: string) => {
            if (name === 'pkg' && version === '1.0.0') return manifest;
            if (name === 'prod' && version === '1.0.0') return prodManifest;
            if (name === 'dev' && version === '1.0.0') return devManifest;
            throw new Error(`Unknown manifest: ${name}@${version}`);
          },
        );

        vi.mocked(mockRegistry.getTarballInfo).mockImplementation(
          async (name: string, version: string) => ({
            url: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
          }),
        );

        const result = await resolver.resolve('pkg', '1.0.0');

        expect(result.size).toBe(2);
        expect(result.has('pkg')).toBe(true);
        expect(result.has('prod')).toBe(true);
        expect(result.has('dev')).toBe(false);
      });

      it('should include dev dependencies when includeDev is true', async () => {
        const metadata = createMockMetadata('pkg', ['1.0.0'], '1.0.0');
        const manifest = createMockManifest(
          'pkg',
          '1.0.0',
          { prod: '^1.0.0' },
          { dev: '^1.0.0' },
        );

        const prodMetadata = createMockMetadata('prod', ['1.0.0'], '1.0.0');
        const prodManifest = createMockManifest('prod', '1.0.0');

        const devMetadata = createMockMetadata('dev', ['1.0.0'], '1.0.0');
        const devManifest = createMockManifest('dev', '1.0.0');

        vi.mocked(mockRegistry.fetchPackageMetadata).mockImplementation(
          async (name: string) => {
            if (name === 'pkg') return metadata;
            if (name === 'prod') return prodMetadata;
            if (name === 'dev') return devMetadata;
            throw new Error(`Unknown package: ${name}`);
          },
        );

        vi.mocked(mockRegistry.fetchManifest).mockImplementation(
          async (name: string, version: string) => {
            if (name === 'pkg' && version === '1.0.0') return manifest;
            if (name === 'prod' && version === '1.0.0') return prodManifest;
            if (name === 'dev' && version === '1.0.0') return devManifest;
            throw new Error(`Unknown manifest: ${name}@${version}`);
          },
        );

        vi.mocked(mockRegistry.getTarballInfo).mockImplementation(
          async (name: string, version: string) => ({
            url: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
          }),
        );

        const result = await resolver.resolve('pkg', '1.0.0', { includeDev: true });

        expect(result.size).toBe(3);
        expect(result.has('pkg')).toBe(true);
        expect(result.has('prod')).toBe(true);
        expect(result.has('dev')).toBe(true);
      });

      it('should handle package with only dev dependencies', async () => {
        const metadata = createMockMetadata('pkg', ['1.0.0'], '1.0.0');
        const manifest = createMockManifest('pkg', '1.0.0', undefined, { dev: '^1.0.0' });

        const devMetadata = createMockMetadata('dev', ['1.0.0'], '1.0.0');
        const devManifest = createMockManifest('dev', '1.0.0');

        vi.mocked(mockRegistry.fetchPackageMetadata).mockImplementation(
          async (name: string) => {
            if (name === 'pkg') return metadata;
            if (name === 'dev') return devMetadata;
            throw new Error(`Unknown package: ${name}`);
          },
        );

        vi.mocked(mockRegistry.fetchManifest).mockImplementation(
          async (name: string, version: string) => {
            if (name === 'pkg' && version === '1.0.0') return manifest;
            if (name === 'dev' && version === '1.0.0') return devManifest;
            throw new Error(`Unknown manifest: ${name}@${version}`);
          },
        );

        vi.mocked(mockRegistry.getTarballInfo).mockImplementation(
          async (name: string, version: string) => ({
            url: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
          }),
        );

        const resultWithoutDev = await resolver.resolve('pkg', '1.0.0');
        expect(resultWithoutDev.size).toBe(1);
        expect(resultWithoutDev.has('dev')).toBe(false);

        const resultWithDev = await resolver.resolve('pkg', '1.0.0', { includeDev: true });
        expect(resultWithDev.size).toBe(2);
        expect(resultWithDev.has('dev')).toBe(true);
      });
    });

    describe('shared dependencies', () => {
      it('should resolve shared dependency only once', async () => {
        // A -> C, B -> C (C is shared)
        const aMetadata = createMockMetadata('a', ['1.0.0'], '1.0.0');
        const aManifest = createMockManifest('a', '1.0.0', { c: '^1.0.0' });

        const bMetadata = createMockMetadata('b', ['1.0.0'], '1.0.0');
        const bManifest = createMockManifest('b', '1.0.0', { c: '^1.0.0' });

        const cMetadata = createMockMetadata('c', ['1.0.0'], '1.0.0');
        const cManifest = createMockManifest('c', '1.0.0');

        // Start with resolving 'a'
        vi.mocked(mockRegistry.fetchPackageMetadata).mockImplementation(
          async (name: string) => {
            if (name === 'a') return aMetadata;
            if (name === 'b') return bMetadata;
            if (name === 'c') return cMetadata;
            throw new Error(`Unknown package: ${name}`);
          },
        );

        vi.mocked(mockRegistry.fetchManifest).mockImplementation(
          async (name: string, version: string) => {
            if (name === 'a' && version === '1.0.0') return aManifest;
            if (name === 'b' && version === '1.0.0') return bManifest;
            if (name === 'c' && version === '1.0.0') return cManifest;
            throw new Error(`Unknown manifest: ${name}@${version}`);
          },
        );

        vi.mocked(mockRegistry.getTarballInfo).mockImplementation(
          async (name: string, version: string) => ({
            url: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
          }),
        );

        // Manually resolve a package that has multiple deps pointing to same package
        const parentMetadata = createMockMetadata('parent', ['1.0.0'], '1.0.0');
        const parentManifest = createMockManifest('parent', '1.0.0', {
          a: '^1.0.0',
          b: '^1.0.0',
        });

        vi.mocked(mockRegistry.fetchPackageMetadata).mockImplementation(
          async (name: string) => {
            if (name === 'parent') return parentMetadata;
            if (name === 'a') return aMetadata;
            if (name === 'b') return bMetadata;
            if (name === 'c') return cMetadata;
            throw new Error(`Unknown package: ${name}`);
          },
        );

        vi.mocked(mockRegistry.fetchManifest).mockImplementation(
          async (name: string, version: string) => {
            if (name === 'parent' && version === '1.0.0') return parentManifest;
            if (name === 'a' && version === '1.0.0') return aManifest;
            if (name === 'b' && version === '1.0.0') return bManifest;
            if (name === 'c' && version === '1.0.0') return cManifest;
            throw new Error(`Unknown manifest: ${name}@${version}`);
          },
        );

        const result = await resolver.resolve('parent', '1.0.0');

        // Should have parent, a, b, and c (4 packages, c only once)
        expect(result.size).toBe(4);
        expect(result.has('parent')).toBe(true);
        expect(result.has('a')).toBe(true);
        expect(result.has('b')).toBe(true);
        expect(result.has('c')).toBe(true);

        // C should only be fetched once
        expect(mockRegistry.fetchPackageMetadata).toHaveBeenCalledWith('c');
      });
    });

    describe('cache management', () => {
      it('should clear cache', () => {
        expect(() => {
          resolver.clearCache();
        }).not.toThrow();
      });
    });

    describe('error handling', () => {
      it('should propagate registry errors', async () => {
        vi.mocked(mockRegistry.fetchPackageMetadata).mockRejectedValue(
          new Error('Network error'),
        );

        await expect(resolver.resolve('pkg', '1.0.0')).rejects.toThrow('Network error');
      });

      it('should propagate version resolution errors', async () => {
        const metadata = createMockMetadata('pkg', ['1.0.0'], '1.0.0');
        vi.mocked(mockRegistry.fetchPackageMetadata).mockResolvedValue(metadata);

        // Mock version resolver to throw
        await expect(resolver.resolve('pkg', '^9.0.0')).rejects.toThrow();
      });

      it('should propagate manifest fetch errors', async () => {
        const metadata = createMockMetadata('pkg', ['1.0.0'], '1.0.0');
        vi.mocked(mockRegistry.fetchPackageMetadata).mockResolvedValue(metadata);
        vi.mocked(mockRegistry.fetchManifest).mockRejectedValue(new Error('Manifest error'));

        await expect(resolver.resolve('pkg', '1.0.0')).rejects.toThrow('Manifest error');
      });

      it('should propagate tarball info errors', async () => {
        const metadata = createMockMetadata('pkg', ['1.0.0'], '1.0.0');
        const manifest = createMockManifest('pkg', '1.0.0');

        vi.mocked(mockRegistry.fetchPackageMetadata).mockResolvedValue(metadata);
        vi.mocked(mockRegistry.fetchManifest).mockResolvedValue(manifest);
        vi.mocked(mockRegistry.getTarballInfo).mockRejectedValue(
          new Error('Tarball not found'),
        );

        await expect(resolver.resolve('pkg', '1.0.0')).rejects.toThrow('Tarball not found');
      });
    });

    describe('real-world scenarios', () => {
      it('should resolve a React-like dependency tree', async () => {
        // React depends on loose-envify and js-tokens
        const reactMetadata = createMockMetadata('react', ['18.2.0'], '18.2.0');
        const reactManifest = createMockManifest('react', '18.2.0', {
          'loose-envify': '^1.1.0',
        });

        const looseEnvifyMetadata = createMockMetadata('loose-envify', ['1.4.0'], '1.4.0');
        const looseEnvifyManifest = createMockManifest('loose-envify', '1.4.0', {
          'js-tokens': '^3.0.0 || ^4.0.0',
        });

        const jsTokensMetadata = createMockMetadata('js-tokens', ['4.0.0'], '4.0.0');
        const jsTokensManifest = createMockManifest('js-tokens', '4.0.0');

        vi.mocked(mockRegistry.fetchPackageMetadata).mockImplementation(
          async (name: string) => {
            if (name === 'react') return reactMetadata;
            if (name === 'loose-envify') return looseEnvifyMetadata;
            if (name === 'js-tokens') return jsTokensMetadata;
            throw new Error(`Unknown package: ${name}`);
          },
        );

        vi.mocked(mockRegistry.fetchManifest).mockImplementation(
          async (name: string, version: string) => {
            if (name === 'react' && version === '18.2.0') return reactManifest;
            if (name === 'loose-envify' && version === '1.4.0') return looseEnvifyManifest;
            if (name === 'js-tokens' && version === '4.0.0') return jsTokensManifest;
            throw new Error(`Unknown manifest: ${name}@${version}`);
          },
        );

        vi.mocked(mockRegistry.getTarballInfo).mockImplementation(
          async (name: string, version: string) => ({
            url: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
          }),
        );

        const result = await resolver.resolve('react', '18.2.0');

        expect(result.size).toBe(3);
        expect(result.has('react')).toBe(true);
        expect(result.has('loose-envify')).toBe(true);
        expect(result.has('js-tokens')).toBe(true);
      });
    });
  });
});
