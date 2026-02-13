/**
 * NPM Package Manager
 * High-level API for installing and managing npm packages
 */

import { NpmRegistry } from './npm-registry.js';
import { TarballExtractor } from './tarball-extractor.js';
import { DependencyResolver } from './dependency-resolver.js';
import type { InstallOptions, PackageCache } from './types.js';
import { createLogger } from '../core/logger.js';

export class NpmPackageManager {
  private filesystem: any;
  private registry: NpmRegistry;
  private extractor: TarballExtractor;
  private resolver: DependencyResolver;
  private cache: PackageCache;
  private logger = createLogger('[NPM]');

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

    this.logger.log(`Installing ${key}`);

    // Resolve dependency tree (this will determine the exact version)
    const resolved = await this.resolver.resolve(packageName, versionRange, options);

    // Check if already installed in filesystem (unless force option)
    const mainPackage = resolved.get(packageName);
    if (!options.force && mainPackage && this.isInstalled(packageName, mainPackage.version)) {
      this.logger.log(`Package ${packageName}@${mainPackage.version} already installed`);
      return;
    }

    // Install all packages in parallel
    const installPromises = Array.from(resolved.values()).map((dep) =>
      this.installPackage(dep.name, dep.version, dep.resolved),
    );

    await Promise.all(installPromises);

    this.logger.log(`Successfully installed ${key} and ${resolved.size - 1} dependencies`);
  }

  /**
   * Install packages from package.json dependencies
   */
  async installFromPackageJson(
    packageJsonContent: string,
    options: InstallOptions = {},
  ): Promise<void> {
    this.logger.log('Installing from package.json');

    const packageJson = JSON.parse(packageJsonContent);
    const deps = packageJson.dependencies || {};
    const devDeps = options.includeDev ? packageJson.devDependencies || {} : {};

    const allDeps = { ...deps, ...devDeps };
    const depCount = Object.keys(allDeps).length;

    if (depCount === 0) {
      this.logger.log('No dependencies to install');
      return;
    }

    this.logger.log(`Found ${depCount} dependencies`);

    // Install all dependencies in parallel
    const installPromises = Object.entries(allDeps).map(([name, version]) =>
      this.install(name, version as string, options),
    );

    await Promise.all(installPromises);

    this.logger.log('All dependencies installed');
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

    this.logger.log(`Installing ${installKey}`);

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

    // Setup bin links after files are written
    this.setupBinLinks(packageName, packageDir);

    // Mark as installed
    this.cache.installed.set(installKey, packageDir);

    this.logger.log(`Installed ${installKey} to ${packageDir}`);
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
   * Setup bin links for a package
   * Creates symlinks in /node_modules/.bin/ for executables defined in package.json bin field
   */
  private setupBinLinks(packageName: string, packageDir: string): void {
    this.logger.log(`Setting up bin links for ${packageName} at ${packageDir}`);

    // Read package.json to get bin field
    const packageJsonPath = `${packageDir}/package.json`;
    if (!this.filesystem.existsSync(packageJsonPath)) {
      this.logger.log(`No package.json found at ${packageJsonPath}`);
      return;
    }

    let packageJson: any;
    try {
      const content = this.filesystem.readFileSync(packageJsonPath, 'utf8');
      packageJson = JSON.parse(content);
      this.logger.log(`Read package.json for ${packageName}, bin field:`, packageJson.bin);
    } catch (e) {
      this.logger.warn(`Failed to read package.json for ${packageName}:`, e);
      return;
    }

    if (!packageJson.bin) {
      this.logger.log(`No bin field in ${packageName}`);
      return; // No bin field, nothing to do
    }

    this.logger.log(`Found bin field in ${packageName}:`, packageJson.bin);

    // Ensure .bin directory exists
    const binDir = '/node_modules/.bin';
    if (!this.filesystem.existsSync(binDir)) {
      this.logger.log(`Creating ${binDir} directory`);
      this.filesystem.mkdirSync(binDir, { recursive: true });
    }

    // Normalize bin field to object format
    const binEntries: Record<string, string> =
      typeof packageJson.bin === 'string'
        ? { [packageName]: packageJson.bin }
        : packageJson.bin;

    this.logger.log(`Normalized bin entries:`, binEntries);

    // Create symlinks for each bin entry
    for (const [cmdName, binPath] of Object.entries(binEntries)) {
      const targetPath = `${packageDir}/${binPath}`;
      const linkPath = `${binDir}/${cmdName}`;

      this.logger.log(`Processing bin entry: ${cmdName} -> ${binPath}`);
      this.logger.log(`Target path: ${targetPath}, Link path: ${linkPath}`);

      // Check if target file exists
      if (!this.filesystem.existsSync(targetPath)) {
        this.logger.warn(`Bin target not found: ${targetPath} for command ${cmdName}`);
        continue;
      }

      this.logger.log(`Target file exists: ${targetPath}`);

      // Remove existing link if it exists
      if (this.filesystem.existsSync(linkPath)) {
        try {
          this.logger.log(`Removing existing link: ${linkPath}`);
          this.filesystem.unlinkSync(linkPath);
        } catch (e) {
          this.logger.warn(`Failed to remove existing bin link: ${linkPath}`, e);
        }
      }

      // Create JavaScript wrapper that requires the actual bin file
      // This works better in browser environment than shell scripts
      try {
        const wrapperScript = `#!/usr/bin/env node\nrequire('${targetPath}');\n`;
        this.filesystem.writeFileSync(linkPath, wrapperScript);
        this.logger.log(`✓ Created bin wrapper: ${cmdName} -> ${targetPath}`);
      } catch (e: any) {
        this.logger.warn(`Failed to create bin wrapper for ${cmdName}: ${e.message}`, e);
      }
    }
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
