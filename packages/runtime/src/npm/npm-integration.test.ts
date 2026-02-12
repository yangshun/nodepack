/**
 * Integration tests for NPM package installation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NodepackRuntime } from '../runtime.js';

describe('NPM Package Installation', () => {
  let runtime: NodepackRuntime;

  beforeEach(async () => {
    runtime = new NodepackRuntime();
    await runtime.initialize();

    // Clear the filesystem between tests
    const fs = runtime.getFilesystem();
    if (fs.existsSync('/node_modules')) {
      fs.rmdirSync('/node_modules', { recursive: true });
    }
  });

  it(
    'should install a simple package (picocolors)',
    async () => {
      // Use picocolors because it's small and has no dependencies
      await runtime.npm.install('picocolors');

      // Verify the package was installed
      expect(runtime.npm.isInstalled('picocolors')).toBe(true);

      // Verify package files exist in virtual filesystem
      const fs = runtime.getFilesystem();
      expect(fs.existsSync('/node_modules/picocolors')).toBe(true);
      expect(fs.existsSync('/node_modules/picocolors/package.json')).toBe(true);
    },
    { timeout: 30000 },
  );

  it(
    'should install specific version',
    async () => {
      // Install a specific version
      await runtime.npm.install('picocolors', '1.0.0');

      expect(runtime.npm.isInstalled('picocolors', '1.0.0')).toBe(true);

      // Verify package was installed with correct version
      const fs = runtime.getFilesystem();
      const packageJsonContent = fs.readFileSync('/node_modules/picocolors/package.json', 'utf8') as string;
      const packageJson = JSON.parse(packageJsonContent);
      expect(packageJson.version).toBe('1.0.0');
    },
    { timeout: 30000 },
  );

  it(
    'should check if package is installed',
    async () => {
      expect(runtime.npm.isInstalled('picocolors')).toBe(false);

      await runtime.npm.install('picocolors');

      expect(runtime.npm.isInstalled('picocolors')).toBe(true);
    },
    { timeout: 30000 },
  );

  it(
    'should install from package.json',
    async () => {
      const packageJson = JSON.stringify({
        dependencies: {
          picocolors: '^1.0.0',
        },
      });

      await runtime.npm.installFromPackageJson(packageJson);

      expect(runtime.npm.isInstalled('picocolors')).toBe(true);

      // Verify version satisfies range
      const fs = runtime.getFilesystem();
      const packageJsonContent = fs.readFileSync('/node_modules/picocolors/package.json', 'utf8') as string;
      const installedPackageJson = JSON.parse(packageJsonContent);
      expect(installedPackageJson.version).toMatch(/^1\./); // Should be 1.x.x
    },
    { timeout: 30000 },
  );
});
