/**
 * CDN Package Fetcher
 * Fetches npm packages from jsDelivr CDN
 */

/**
 * Fetch npm packages from jsDelivr CDN
 * Uses the +esm feature to get bundled ESM modules
 */
export class CDNFetcher {
  private baseUrl = 'https://cdn.jsdelivr.net/npm';

  /**
   * Fetch a single package from CDN
   * @param packageName - Package name (e.g., 'lodash', '@babel/core')
   * @param version - Optional version (e.g., '4.17.21')
   * @returns ES module code as string
   */
  async fetchPackage(packageName: string, version?: string): Promise<string> {
    // Special case: lodash → lodash-es (ES module version)
    if (packageName === 'lodash') {
      packageName = 'lodash-es';
    }

    // jsDelivr with +esm provides bundled ES modules
    const packageSpec = version ? `${packageName}@${version}` : packageName;
    const url = `${this.baseUrl}/${packageSpec}/+esm`;

    console.log(`[CDN] Fetching ${packageName} from ${url}`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch package "${packageName}": ${response.status} ${response.statusText}`
        );
      }

      const code = await response.text();
      console.log(`[CDN] Successfully fetched ${packageName} (${code.length} bytes)`);

      return code;
    } catch (error: any) {
      console.error(`[CDN] Error fetching ${packageName}:`, error);
      throw new Error(`Cannot load package "${packageName}": ${error.message}`);
    }
  }

  /**
   * Fetch multiple packages in parallel
   * @param packages - Array of package names
   * @returns Map of package name to code
   */
  async fetchPackages(packages: string[]): Promise<Map<string, string>> {
    if (packages.length === 0) {
      return new Map();
    }

    console.log(`[CDN] Fetching ${packages.length} package(s):`, packages);

    const results = new Map<string, string>();
    const errors: string[] = [];

    // Fetch all packages in parallel
    const promises = packages.map(async (pkg) => {
      try {
        const code = await this.fetchPackage(pkg);
        results.set(pkg, code);
      } catch (error: any) {
        errors.push(`${pkg}: ${error.message}`);
      }
    });

    await Promise.all(promises);

    // If any packages failed, throw error
    if (errors.length > 0) {
      throw new Error(`Failed to fetch package(s):\n${errors.join('\n')}`);
    }

    console.log(`[CDN] Successfully fetched all ${packages.length} package(s)`);
    return results;
  }
}
