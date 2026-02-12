/**
 * Dependency Resolver
 * Recursively resolves dependency trees
 */

import type { PackageManifest, ResolvedDependency, InstallOptions } from './types.js';
import { NpmRegistry } from './npm-registry.js';
import { VersionResolver } from './version-resolver.js';

export class DependencyResolver {
  private registry: NpmRegistry;
  private versionResolver: VersionResolver;
  private resolutionCache = new Map<string, ResolvedDependency>();

  constructor(registry: NpmRegistry) {
    this.registry = registry;
    this.versionResolver = new VersionResolver();
  }

  /**
   * Resolve full dependency tree for a package
   * Returns flat map of all dependencies with their versions
   */
  async resolve(
    packageName: string,
    versionRange: string,
    options: InstallOptions = {},
  ): Promise<Map<string, ResolvedDependency>> {
    console.log(`[Resolver] Resolving dependencies for ${packageName}@${versionRange}`);

    const resolved = new Map<string, ResolvedDependency>();
    const visited = new Set<string>(); // Prevent infinite loops

    await this.resolveRecursive(packageName, versionRange, resolved, visited, options);

    console.log(`[Resolver] Resolved ${resolved.size} total dependencies`);

    return resolved;
  }

  /**
   * Recursively resolve dependencies
   */
  private async resolveRecursive(
    packageName: string,
    versionRange: string,
    resolved: Map<string, ResolvedDependency>,
    visited: Set<string>,
    options: InstallOptions,
  ): Promise<void> {
    // Fetch metadata
    const metadata = await this.registry.fetchPackageMetadata(packageName);

    // Resolve version range to specific version
    const version = this.versionResolver.resolve(versionRange, metadata);
    const key = `${packageName}@${version}`;

    // Skip if already processed
    if (visited.has(key)) {
      return;
    }
    visited.add(key);

    // Get manifest
    const manifest = await this.registry.fetchManifest(packageName, version);

    // Get tarball info
    const tarballInfo = await this.registry.getTarballInfo(packageName, version);

    // Create resolved dependency entry
    const dependency: ResolvedDependency = {
      name: packageName,
      version: version,
      resolved: tarballInfo.url,
      dependencies: new Map(),
    };

    resolved.set(packageName, dependency);

    // Resolve child dependencies
    const deps = manifest.dependencies || {};
    const devDeps = options.includeDev ? manifest.devDependencies || {} : {};
    const allDeps = { ...deps, ...devDeps };

    // Resolve all dependencies in parallel
    const childPromises = Object.entries(allDeps).map(([childName, childVersion]) =>
      this.resolveRecursive(childName, childVersion, resolved, visited, options),
    );

    await Promise.all(childPromises);
  }

  /**
   * Clear resolution cache
   */
  clearCache(): void {
    this.resolutionCache.clear();
  }
}
