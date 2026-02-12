/**
 * NPM Package Manager
 * High-level API for installing and managing npm packages
 */

import { NpmRegistry } from './npm-registry.js';
import { TarballExtractor } from './tarball-extractor.js';
import { DependencyResolver } from './dependency-resolver.js';
import type { InstallOptions, PackageCache } from './types.js';

export class NpmPackageManager {
  private filesystem: any;
  private registry: NpmRegistry;
  private extractor: TarballExtractor;
  private resolver: DependencyResolver;
  private cache: PackageCache;

  constructor(filesystem: any) {
    this.filesystem = filesystem;
    this.registry = new NpmRegistry();
    this.extractor = new TarballExtractor();
    this.resolver = new DependencyResolver(this.registry);
    this.cache = {
      manifests: new Map(),
      installed: new Map(),
    };
  }

  /**
   * Install a package and its dependencies
   */
  async install(
    packageName: string,
    versionRange = 'latest',
    options: InstallOptions = {},
  ): Promise<void> {
    const key = `${packageName}@${versionRange}`;

    console.log(`[NPM] Installing ${key}`);

    // Resolve dependency tree (this will determine the exact version)
    const resolved = await this.resolver.resolve(packageName, versionRange, options);

    // Check if already installed in filesystem (unless force option)
    const mainPackage = resolved.get(packageName);
    if (!options.force && mainPackage && this.isInstalled(packageName, mainPackage.version)) {
      console.log(`[NPM] Package ${packageName}@${mainPackage.version} already installed`);
      return;
    }

    // Install all packages in parallel
    const installPromises = Array.from(resolved.values()).map((dep) =>
      this.installPackage(dep.name, dep.version, dep.resolved),
    );

    await Promise.all(installPromises);

    console.log(`[NPM] Successfully installed ${key} and ${resolved.size - 1} dependencies`);
  }

  /**
   * Install packages from package.json dependencies
   */
  async installFromPackageJson(
    packageJsonContent: string,
    options: InstallOptions = {},
  ): Promise<void> {
    console.log('[NPM] Installing from package.json');

    const packageJson = JSON.parse(packageJsonContent);
    const deps = packageJson.dependencies || {};
    const devDeps = options.includeDev ? packageJson.devDependencies || {} : {};

    const allDeps = { ...deps, ...devDeps };
    const depCount = Object.keys(allDeps).length;

    if (depCount === 0) {
      console.log('[NPM] No dependencies to install');
      return;
    }

    console.log(`[NPM] Found ${depCount} dependencies`);

    // Install all dependencies in parallel
    const installPromises = Object.entries(allDeps).map(([name, version]) =>
      this.install(name, version as string, options),
    );

    await Promise.all(installPromises);

    console.log('[NPM] All dependencies installed');
  }

  /**
   * Install a single package (download + extract)
   */
  private async installPackage(
    packageName: string,
    version: string,
    tarballUrl: string,
  ): Promise<void> {
    const installKey = `${packageName}@${version}`;

    // Check if already installed in filesystem
    if (this.isInstalled(packageName, version)) {
      return;
    }

    console.log(`[NPM] Installing ${installKey}`);

    // Download tarball
    const tarballBuffer = await this.registry.downloadTarball(tarballUrl);

    // Extract files
    const files = await this.extractor.extract(tarballBuffer);

    // Write to virtual filesystem
    const packageDir = `/node_modules/${packageName}`;

    // Create package directory
    if (!this.filesystem.existsSync(packageDir)) {
      this.filesystem.mkdirSync(packageDir, { recursive: true });
    }

    // Write all files
    for (const [relativePath, file] of files) {
      if (file.type === 'directory') {
        const dirPath = `${packageDir}/${relativePath}`;
        if (!this.filesystem.existsSync(dirPath)) {
          this.filesystem.mkdirSync(dirPath, { recursive: true });
        }
      } else {
        const filePath = `${packageDir}/${relativePath}`;
        const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));

        // Ensure parent directory exists
        if (dirPath && dirPath !== packageDir && !this.filesystem.existsSync(dirPath)) {
          this.filesystem.mkdirSync(dirPath, { recursive: true });
        }

        // Write file
        this.filesystem.writeFileSync(filePath, file.content);
      }
    }

    // Mark as installed
    this.cache.installed.set(installKey, packageDir);

    console.log(`[NPM] Installed ${installKey} to ${packageDir}`);
  }

  /**
   * Check if package is installed
   */
  isInstalled(packageName: string, version?: string): boolean {
    // Check filesystem, not just cache
    // This ensures we detect if files were cleared but cache wasn't
    const packageDir = `/node_modules/${packageName}`;
    const packageJsonPath = `${packageDir}/package.json`;

    // First check if directory exists
    if (!this.filesystem.existsSync(packageJsonPath)) {
      return false;
    }

    // If version is specified, verify it matches
    if (version) {
      try {
        const packageJson = JSON.parse(this.filesystem.readFileSync(packageJsonPath, 'utf8'));
        return packageJson.version === version;
      } catch (e) {
        return false;
      }
    }

    return true;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.registry.clearCache();
    this.resolver.clearCache();
    this.cache.manifests.clear();
    this.cache.installed.clear();
  }
}
