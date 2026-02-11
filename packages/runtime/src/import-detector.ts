/**
 * Import Detector
 * Scans code to find npm package imports
 */

/**
 * Detect npm package imports in code
 * Returns list of package names that should be fetched from CDN
 *
 * Examples:
 *   import _ from 'lodash' → ['lodash']
 *   import { format } from 'date-fns' → ['date-fns']
 *   import axios from 'axios' → ['axios']
 *   import './utils.js' → [] (local import, not npm)
 *   import { readFileSync } from 'fs' → [] (builtin, not npm)
 */
export function detectImports(code: string): string[] {
  const imports = new Set<string>();
  const builtinModules = ['fs', 'path', 'process'];

  // Match various import patterns:
  // - import foo from 'pkg'
  // - import { foo } from 'pkg'
  // - import * as foo from 'pkg'
  // - import 'pkg'
  const importRegex = /import\s+(?:[\w{},*\s]+\s+from\s+)?['"]([^'"]+)['"]/g;

  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const moduleName = match[1];

    // Skip if:
    // - Relative path (./foo, ../foo)
    // - Absolute path (/foo)
    // - Builtin module (fs, path, process)
    if (
      moduleName.startsWith('./') ||
      moduleName.startsWith('../') ||
      moduleName.startsWith('/') ||
      builtinModules.includes(moduleName)
    ) {
      continue;
    }

    // Extract base package name (handle scoped packages)
    // Examples:
    //   'lodash' → 'lodash'
    //   'lodash/fp' → 'lodash'
    //   '@babel/core' → '@babel/core'
    //   '@babel/core/lib/foo' → '@babel/core'
    let packageName: string;
    if (moduleName.startsWith('@')) {
      // Scoped package: @scope/name
      const parts = moduleName.split('/');
      packageName = `${parts[0]}/${parts[1]}`;
    } else {
      // Regular package: name or name/subpath
      packageName = moduleName.split('/')[0];
    }

    imports.add(packageName);
  }

  return Array.from(imports);
}
