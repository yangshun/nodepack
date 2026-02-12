/**
 * NPM Registry Client
 * Fetches package metadata and tarballs from npm registry
 */

import type { PackageMetadata, PackageManifest, TarballInfo } from './types.js';

export class NpmRegistry {
  private registryUrl = 'https://registry.npmjs.org';
  private manifestCache = new Map<string, PackageMetadata>();

  /**
   * Fetch package metadata from npm registry
   * Caches results to avoid redundant requests
   */
  async fetchPackageMetadata(packageName: string): Promise<PackageMetadata> {
    // Check cache
    if (this.manifestCache.has(packageName)) {
      return this.manifestCache.get(packageName)!;
    }

    // Encode package name for URL (scoped packages need special handling)
    const encodedName = packageName.replace('/', '%2F');
    const url = `${this.registryUrl}/${encodedName}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch package "${packageName}": ${response.status} ${response.statusText}`,
        );
      }

      const metadata = (await response.json()) as PackageMetadata;

      // Cache it
      this.manifestCache.set(packageName, metadata);

      return metadata;
    } catch (error: any) {
      throw new Error(`Cannot fetch package "${packageName}": ${error.message}`);
    }
  }

  /**
   * Get manifest for specific version
   */
  async fetchManifest(packageName: string, version: string): Promise<PackageManifest> {
    const metadata = await this.fetchPackageMetadata(packageName);

    // Resolve version tag (e.g., "latest")
    const resolvedVersion = this.resolveVersionTag(metadata, version);

    const manifest = metadata.versions[resolvedVersion];
    if (!manifest) {
      const available = Object.keys(metadata.versions).slice(0, 5).join(', ');
      throw new Error(
        `Version ${version} not found for package "${packageName}". Available: ${available}...`,
      );
    }

    return manifest;
  }

  /**
   * Get tarball URL for a package version
   */
  async getTarballInfo(packageName: string, version: string): Promise<TarballInfo> {
    const manifest = await this.fetchManifest(packageName, version);

    // dist.tarball contains the download URL
    const tarballUrl = manifest.dist?.tarball;
    if (!tarballUrl) {
      throw new Error(`No tarball URL found for ${packageName}@${version}`);
    }

    return {
      url: tarballUrl,
      integrity: manifest.dist?.integrity,
      shasum: manifest.dist?.shasum,
    };
  }

  /**
   * Download tarball as ArrayBuffer
   */
  async downloadTarball(url: string): Promise<ArrayBuffer> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to download tarball: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();

      return buffer;
    } catch (error: any) {
      throw new Error(`Failed to download tarball: ${error.message}`);
    }
  }

  /**
   * Resolve version tag to actual version number
   */
  private resolveVersionTag(metadata: PackageMetadata, version: string): string {
    // If it's a tag like "latest", resolve it
    if (metadata['dist-tags'][version]) {
      return metadata['dist-tags'][version];
    }

    // Otherwise assume it's a specific version
    return version;
  }

  /**
   * Clear manifest cache (useful for testing)
   */
  clearCache(): void {
    this.manifestCache.clear();
  }
}
