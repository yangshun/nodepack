/**
 * Version Resolution
 * Resolves semver ranges to specific versions
 */

import * as semver from 'semver';
import type { PackageMetadata } from './types.js';

export class VersionResolver {
  /**
   * Resolve version range to specific version
   * Supports: exact (1.2.3), range (^1.2.0), tag (latest), wildcard (*)
   */
  resolve(versionRange: string, metadata: PackageMetadata): string {
    // Handle dist-tags (e.g., "latest", "next")
    if (metadata['dist-tags'][versionRange]) {
      return metadata['dist-tags'][versionRange];
    }

    // Get all available versions
    const versions = Object.keys(metadata.versions);

    // Handle wildcard
    if (versionRange === '*' || versionRange === '') {
      return metadata['dist-tags'].latest;
    }

    // Try to find a matching version using semver
    const maxSatisfying = semver.maxSatisfying(versions, versionRange);

    if (!maxSatisfying) {
      throw new Error(
        `No version matching "${versionRange}" found for ${metadata.name}. ` +
          `Available: ${versions.slice(0, 5).join(', ')}...`,
      );
    }

    return maxSatisfying;
  }

  /**
   * Check if version satisfies range
   */
  satisfies(version: string, range: string): boolean {
    return semver.satisfies(version, range);
  }
}
