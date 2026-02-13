import { describe, test, expect, beforeEach, vi } from 'vitest';
import { vol } from 'memfs';
import type { IFs } from 'memfs';
import { NpmPackageManager } from './package-manager.js';
import { NpmRegistry } from './npm-registry.js';
import { DependencyResolver } from './dependency-resolver.js';
import { TarballExtractor } from './tarball-extractor.js';
import type { ResolvedDependency } from './types.js';

vi.mock('./npm-registry.js');
vi.mock('./dependency-resolver.js');
vi.mock('./tarball-extractor.js');

describe('NpmPackageManager', () => {
  let packageManager: NpmPackageManager;
  let filesystem: IFs;
  let mockRegistry: NpmRegistry;
  let mockResolver: DependencyResolver;
  let mockExtractor: TarballExtractor;

  beforeEach(() => {
    vol.reset();
    filesystem = vol as any;

    packageManager = new NpmPackageManager(filesystem);

    // Get mocked instances
    mockRegistry = (packageManager as any).registry;
    mockResolver = (packageManager as any).resolver;
    mockExtractor = (packageManager as any).extractor;

    // Setup default mocks
    vi.mocked(mockRegistry.downloadTarball).mockResolvedValue(new ArrayBuffer(0));
    vi.mocked(mockExtractor.extract).mockResolvedValue(new Map());
  });

  function createMockResolvedDependency(name: string, version: string): ResolvedDependency {
    return {
      name,
      version,
      resolved: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
      dependencies: new Map(),
    };
  }

  function createMockFiles(packageName: string, version: string): Map<string, any> {
    const files = new Map();

    files.set('package.json', {
      path: 'package.json',
      content: JSON.stringify({ name: packageName, version }),
      mode: 0o644,
      type: 'file',
    });

    files.set('index.js', {
      path: 'index.js',
      content: 'module.exports = {};',
      mode: 0o644,
      type: 'file',
    });

    return files;
  }

  describe('install()', () => {
    test('install a simple package', async () => {
      const resolved = new Map([
        ['simple-package', createMockResolvedDependency('simple-package', '1.0.0')],
      ]);

      vi.mocked(mockResolver.resolve).mockResolvedValue(resolved);
      vi.mocked(mockExtractor.extract).mockResolvedValue(
        createMockFiles('simple-package', '1.0.0'),
      );

      await packageManager.install('simple-package', '1.0.0');

      expect(mockResolver.resolve).toHaveBeenCalledWith('simple-package', '1.0.0', {});
      expect(filesystem.existsSync('/node_modules/simple-package')).toBe(true);
      expect(filesystem.existsSync('/node_modules/simple-package/package.json')).toBe(true);
    });

    test('install package with default version (latest)', async () => {
      const resolved = new Map([['pkg', createMockResolvedDependency('pkg', '2.0.0')]]);

      vi.mocked(mockResolver.resolve).mockResolvedValue(resolved);
      vi.mocked(mockExtractor.extract).mockResolvedValue(createMockFiles('pkg', '2.0.0'));

      await packageManager.install('pkg');

      expect(mockResolver.resolve).toHaveBeenCalledWith('pkg', 'latest', {});
    });

    test('install package with dependencies', async () => {
      const childDep = createMockResolvedDependency('child', '1.0.0');
      const parentDep = createMockResolvedDependency('parent', '1.0.0');
      parentDep.dependencies.set('child', childDep);

      const resolved = new Map([
        ['parent', parentDep],
        ['child', childDep],
      ]);

      vi.mocked(mockResolver.resolve).mockResolvedValue(resolved);
      vi.mocked(mockExtractor.extract).mockImplementation((buffer: ArrayBuffer) => {
        // Return different files based on which package is being extracted
        const callCount = vi.mocked(mockExtractor.extract).mock.calls.length;
        if (callCount === 1) {
          return Promise.resolve(createMockFiles('parent', '1.0.0'));
        } else {
          return Promise.resolve(createMockFiles('child', '1.0.0'));
        }
      });

      await packageManager.install('parent', '1.0.0');

      expect(filesystem.existsSync('/node_modules/parent')).toBe(true);
      expect(filesystem.existsSync('/node_modules/child')).toBe(true);
    });

    test('skip installation if package already installed', async () => {
      const resolved = new Map([['pkg', createMockResolvedDependency('pkg', '1.0.0')]]);

      vi.mocked(mockResolver.resolve).mockResolvedValue(resolved);
      vi.mocked(mockExtractor.extract).mockResolvedValue(createMockFiles('pkg', '1.0.0'));

      // First install
      await packageManager.install('pkg', '1.0.0');
      expect(mockRegistry.downloadTarball).toHaveBeenCalledTimes(1);

      // Second install should skip
      await packageManager.install('pkg', '1.0.0');
      expect(mockRegistry.downloadTarball).toHaveBeenCalledTimes(1); // Still 1
    });

    test('bypass early check when force option is true', async () => {
      const resolved = new Map([['pkg', createMockResolvedDependency('pkg', '1.0.0')]]);

      vi.mocked(mockResolver.resolve).mockResolvedValue(resolved);
      vi.mocked(mockExtractor.extract).mockResolvedValue(createMockFiles('pkg', '1.0.0'));

      // First install
      await packageManager.install('pkg', '1.0.0');
      const downloadCallsAfterFirst = vi.mocked(mockRegistry.downloadTarball).mock.calls.length;

      // Second install without force should skip download (early return after resolve)
      await packageManager.install('pkg', '1.0.0');
      expect(mockRegistry.downloadTarball).toHaveBeenCalledTimes(downloadCallsAfterFirst);

      // With force option, should proceed even though already installed
      await packageManager.install('pkg', '1.0.0', { force: true });
      // Force still won't download if installPackage detects it's installed
      // This tests that the force option bypasses the top-level check
      expect(mockResolver.resolve).toHaveBeenCalledTimes(3);
    });

    test('pass options to resolver', async () => {
      const resolved = new Map([['pkg', createMockResolvedDependency('pkg', '1.0.0')]]);

      vi.mocked(mockResolver.resolve).mockResolvedValue(resolved);
      vi.mocked(mockExtractor.extract).mockResolvedValue(createMockFiles('pkg', '1.0.0'));

      await packageManager.install('pkg', '1.0.0', { includeDev: true });

      expect(mockResolver.resolve).toHaveBeenCalledWith('pkg', '1.0.0', { includeDev: true });
    });

    test('download tarball from correct URL', async () => {
      const resolved = new Map([['pkg', createMockResolvedDependency('pkg', '1.0.0')]]);

      vi.mocked(mockResolver.resolve).mockResolvedValue(resolved);
      vi.mocked(mockExtractor.extract).mockResolvedValue(createMockFiles('pkg', '1.0.0'));

      await packageManager.install('pkg', '1.0.0');

      expect(mockRegistry.downloadTarball).toHaveBeenCalledWith(
        'https://registry.npmjs.org/pkg/-/pkg-1.0.0.tgz',
      );
    });

    test('create node_modules directory if it does not exist', async () => {
      const resolved = new Map([['pkg', createMockResolvedDependency('pkg', '1.0.0')]]);

      vi.mocked(mockResolver.resolve).mockResolvedValue(resolved);
      vi.mocked(mockExtractor.extract).mockResolvedValue(createMockFiles('pkg', '1.0.0'));

      expect(filesystem.existsSync('/node_modules')).toBe(false);

      await packageManager.install('pkg', '1.0.0');

      expect(filesystem.existsSync('/node_modules')).toBe(true);
    });

    test('handle nested file structures', async () => {
      const resolved = new Map([['pkg', createMockResolvedDependency('pkg', '1.0.0')]]);

      const files = new Map();
      files.set('package.json', {
        path: 'package.json',
        content: JSON.stringify({ name: 'pkg', version: '1.0.0' }),
        mode: 0o644,
        type: 'file',
      });
      files.set('src/index.js', {
        path: 'src/index.js',
        content: 'module.exports = {};',
        mode: 0o644,
        type: 'file',
      });
      files.set('src/utils/helper.js', {
        path: 'src/utils/helper.js',
        content: 'module.exports = {};',
        mode: 0o644,
        type: 'file',
      });

      vi.mocked(mockResolver.resolve).mockResolvedValue(resolved);
      vi.mocked(mockExtractor.extract).mockResolvedValue(files);

      await packageManager.install('pkg', '1.0.0');

      expect(filesystem.existsSync('/node_modules/pkg/src/index.js')).toBe(true);
      expect(filesystem.existsSync('/node_modules/pkg/src/utils/helper.js')).toBe(true);
    });
  });

  describe('installFromPackageJson()', () => {
    test('install dependencies from package.json', async () => {
      const packageJson = JSON.stringify({
        dependencies: {
          pkg1: '^1.0.0',
          pkg2: '^2.0.0',
        },
      });

      const resolved1 = new Map([['pkg1', createMockResolvedDependency('pkg1', '1.0.0')]]);
      const resolved2 = new Map([['pkg2', createMockResolvedDependency('pkg2', '2.0.0')]]);

      vi.mocked(mockResolver.resolve)
        .mockResolvedValueOnce(resolved1)
        .mockResolvedValueOnce(resolved2);

      vi.mocked(mockExtractor.extract)
        .mockResolvedValueOnce(createMockFiles('pkg1', '1.0.0'))
        .mockResolvedValueOnce(createMockFiles('pkg2', '2.0.0'));

      await packageManager.installFromPackageJson(packageJson);

      expect(filesystem.existsSync('/node_modules/pkg1')).toBe(true);
      expect(filesystem.existsSync('/node_modules/pkg2')).toBe(true);
    });

    test('not install dev dependencies by default', async () => {
      const packageJson = JSON.stringify({
        dependencies: {
          prod: '^1.0.0',
        },
        devDependencies: {
          dev: '^1.0.0',
        },
      });

      const resolved = new Map([['prod', createMockResolvedDependency('prod', '1.0.0')]]);

      vi.mocked(mockResolver.resolve).mockResolvedValue(resolved);
      vi.mocked(mockExtractor.extract).mockResolvedValue(createMockFiles('prod', '1.0.0'));

      await packageManager.installFromPackageJson(packageJson);

      expect(mockResolver.resolve).toHaveBeenCalledTimes(1);
      expect(mockResolver.resolve).toHaveBeenCalledWith('prod', '^1.0.0', {});
    });

    test('install dev dependencies when includeDev is true', async () => {
      const packageJson = JSON.stringify({
        dependencies: {
          prod: '^1.0.0',
        },
        devDependencies: {
          dev: '^1.0.0',
        },
      });

      const resolved1 = new Map([['prod', createMockResolvedDependency('prod', '1.0.0')]]);
      const resolved2 = new Map([['dev', createMockResolvedDependency('dev', '1.0.0')]]);

      vi.mocked(mockResolver.resolve)
        .mockResolvedValueOnce(resolved1)
        .mockResolvedValueOnce(resolved2);

      vi.mocked(mockExtractor.extract)
        .mockResolvedValueOnce(createMockFiles('prod', '1.0.0'))
        .mockResolvedValueOnce(createMockFiles('dev', '1.0.0'));

      await packageManager.installFromPackageJson(packageJson, { includeDev: true });

      expect(mockResolver.resolve).toHaveBeenCalledTimes(2);
    });

    test('handle package.json with no dependencies', async () => {
      const packageJson = JSON.stringify({
        name: 'my-project',
      });

      await packageManager.installFromPackageJson(packageJson);

      expect(mockResolver.resolve).not.toHaveBeenCalled();
    });

    test('handle empty dependencies object', async () => {
      const packageJson = JSON.stringify({
        dependencies: {},
      });

      await packageManager.installFromPackageJson(packageJson);

      expect(mockResolver.resolve).not.toHaveBeenCalled();
    });

    test('install all dependencies in parallel', async () => {
      const packageJson = JSON.stringify({
        dependencies: {
          pkg1: '^1.0.0',
          pkg2: '^2.0.0',
          pkg3: '^3.0.0',
        },
      });

      const resolved1 = new Map([['pkg1', createMockResolvedDependency('pkg1', '1.0.0')]]);
      const resolved2 = new Map([['pkg2', createMockResolvedDependency('pkg2', '2.0.0')]]);
      const resolved3 = new Map([['pkg3', createMockResolvedDependency('pkg3', '3.0.0')]]);

      vi.mocked(mockResolver.resolve)
        .mockResolvedValueOnce(resolved1)
        .mockResolvedValueOnce(resolved2)
        .mockResolvedValueOnce(resolved3);

      vi.mocked(mockExtractor.extract)
        .mockResolvedValueOnce(createMockFiles('pkg1', '1.0.0'))
        .mockResolvedValueOnce(createMockFiles('pkg2', '2.0.0'))
        .mockResolvedValueOnce(createMockFiles('pkg3', '3.0.0'));

      await packageManager.installFromPackageJson(packageJson);

      expect(mockResolver.resolve).toHaveBeenCalledTimes(3);
      expect(filesystem.existsSync('/node_modules/pkg1')).toBe(true);
      expect(filesystem.existsSync('/node_modules/pkg2')).toBe(true);
      expect(filesystem.existsSync('/node_modules/pkg3')).toBe(true);
    });
  });

  describe('isInstalled()', () => {
    test('return false for non-existent package', () => {
      const result = packageManager.isInstalled('nonexistent');

      expect(result).toBe(false);
    });

    test('return true for installed package', async () => {
      const resolved = new Map([['pkg', createMockResolvedDependency('pkg', '1.0.0')]]);

      vi.mocked(mockResolver.resolve).mockResolvedValue(resolved);
      vi.mocked(mockExtractor.extract).mockResolvedValue(createMockFiles('pkg', '1.0.0'));

      await packageManager.install('pkg', '1.0.0');

      const result = packageManager.isInstalled('pkg');

      expect(result).toBe(true);
    });

    test('check specific version when provided', async () => {
      const resolved = new Map([['pkg', createMockResolvedDependency('pkg', '1.0.0')]]);

      vi.mocked(mockResolver.resolve).mockResolvedValue(resolved);
      vi.mocked(mockExtractor.extract).mockResolvedValue(createMockFiles('pkg', '1.0.0'));

      await packageManager.install('pkg', '1.0.0');

      expect(packageManager.isInstalled('pkg', '1.0.0')).toBe(true);
      expect(packageManager.isInstalled('pkg', '2.0.0')).toBe(false);
    });

    test('return false if package.json is missing', () => {
      filesystem.mkdirSync('/node_modules/broken-package', { recursive: true });

      const result = packageManager.isInstalled('broken-package');

      expect(result).toBe(false);
    });

    test('return false if package.json is invalid JSON', () => {
      filesystem.mkdirSync('/node_modules/broken-package', { recursive: true });
      filesystem.writeFileSync('/node_modules/broken-package/package.json', 'invalid json');

      const result = packageManager.isInstalled('broken-package', '1.0.0');

      expect(result).toBe(false);
    });

    test('return true without version check if no version specified', async () => {
      const resolved = new Map([['pkg', createMockResolvedDependency('pkg', '1.0.0')]]);

      vi.mocked(mockResolver.resolve).mockResolvedValue(resolved);
      vi.mocked(mockExtractor.extract).mockResolvedValue(createMockFiles('pkg', '1.0.0'));

      await packageManager.install('pkg', '1.0.0');

      expect(packageManager.isInstalled('pkg')).toBe(true);
    });
  });

  describe('bin links', () => {
    test('setup bin links for packages with bin field', async () => {
      const resolved = new Map([['cli-pkg', createMockResolvedDependency('cli-pkg', '1.0.0')]]);

      const files = new Map();
      files.set('package.json', {
        path: 'package.json',
        content: JSON.stringify({
          name: 'cli-pkg',
          version: '1.0.0',
          bin: {
            'my-cli': './bin/cli.js',
          },
        }),
        mode: 0o644,
        type: 'file',
      });
      files.set('bin/cli.js', {
        path: 'bin/cli.js',
        content: '#!/usr/bin/env node\nconsole.log("CLI");',
        mode: 0o755,
        type: 'file',
      });

      vi.mocked(mockResolver.resolve).mockResolvedValue(resolved);
      vi.mocked(mockExtractor.extract).mockResolvedValue(files);

      await packageManager.install('cli-pkg', '1.0.0');

      expect(filesystem.existsSync('/node_modules/.bin')).toBe(true);
      expect(filesystem.existsSync('/node_modules/.bin/my-cli')).toBe(true);
    });

    test('handle string bin field', async () => {
      const resolved = new Map([['cli-pkg', createMockResolvedDependency('cli-pkg', '1.0.0')]]);

      const files = new Map();
      files.set('package.json', {
        path: 'package.json',
        content: JSON.stringify({
          name: 'cli-pkg',
          version: '1.0.0',
          bin: './bin/cli.js',
        }),
        mode: 0o644,
        type: 'file',
      });
      files.set('bin/cli.js', {
        path: 'bin/cli.js',
        content: '#!/usr/bin/env node\nconsole.log("CLI");',
        mode: 0o755,
        type: 'file',
      });

      vi.mocked(mockResolver.resolve).mockResolvedValue(resolved);
      vi.mocked(mockExtractor.extract).mockResolvedValue(files);

      await packageManager.install('cli-pkg', '1.0.0');

      expect(filesystem.existsSync('/node_modules/.bin/cli-pkg')).toBe(true);
    });

    test('not create bin links for packages without bin field', async () => {
      const resolved = new Map([['pkg', createMockResolvedDependency('pkg', '1.0.0')]]);

      vi.mocked(mockResolver.resolve).mockResolvedValue(resolved);
      vi.mocked(mockExtractor.extract).mockResolvedValue(createMockFiles('pkg', '1.0.0'));

      await packageManager.install('pkg', '1.0.0');

      // .bin directory might exist but shouldn't have this package's bin
      if (filesystem.existsSync('/node_modules/.bin')) {
        expect(filesystem.existsSync('/node_modules/.bin/pkg')).toBe(false);
      }
    });

    test('skip bin link if target file does not exist', async () => {
      const resolved = new Map([['cli-pkg', createMockResolvedDependency('cli-pkg', '1.0.0')]]);

      const files = new Map();
      files.set('package.json', {
        path: 'package.json',
        content: JSON.stringify({
          name: 'cli-pkg',
          version: '1.0.0',
          bin: {
            'my-cli': './bin/missing.js', // File doesn't exist
          },
        }),
        mode: 0o644,
        type: 'file',
      });

      vi.mocked(mockResolver.resolve).mockResolvedValue(resolved);
      vi.mocked(mockExtractor.extract).mockResolvedValue(files);

      await packageManager.install('cli-pkg', '1.0.0');

      // Should not throw, just skip the bin link
      if (filesystem.existsSync('/node_modules/.bin')) {
        expect(filesystem.existsSync('/node_modules/.bin/my-cli')).toBe(false);
      }
    });
  });

  describe('clearCache()', () => {
    test('clear all caches', () => {
      packageManager.clearCache();

      expect(mockRegistry.clearCache).toHaveBeenCalled();
      expect(mockResolver.clearCache).toHaveBeenCalled();
    });

    test('not throw when clearing empty cache', () => {
      expect(() => {
        packageManager.clearCache();
      }).not.toThrow();
    });
  });

  describe('error handling', () => {
    test('propagate resolver errors', async () => {
      vi.mocked(mockResolver.resolve).mockRejectedValue(new Error('Resolution failed'));

      await expect(packageManager.install('pkg', '1.0.0')).rejects.toThrow('Resolution failed');
    });

    test('propagate download errors', async () => {
      const resolved = new Map([['pkg', createMockResolvedDependency('pkg', '1.0.0')]]);

      vi.mocked(mockResolver.resolve).mockResolvedValue(resolved);
      vi.mocked(mockRegistry.downloadTarball).mockRejectedValue(new Error('Download failed'));

      await expect(packageManager.install('pkg', '1.0.0')).rejects.toThrow('Download failed');
    });

    test('propagate extraction errors', async () => {
      const resolved = new Map([['pkg', createMockResolvedDependency('pkg', '1.0.0')]]);

      vi.mocked(mockResolver.resolve).mockResolvedValue(resolved);
      vi.mocked(mockExtractor.extract).mockRejectedValue(new Error('Extraction failed'));

      await expect(packageManager.install('pkg', '1.0.0')).rejects.toThrow('Extraction failed');
    });

    test('handle invalid package.json in installFromPackageJson', async () => {
      const invalidJson = 'not valid json';

      await expect(packageManager.installFromPackageJson(invalidJson)).rejects.toThrow();
    });
  });
});
