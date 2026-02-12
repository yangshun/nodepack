/**
 * Import Detector
 * Scans code to find npm package imports (both ES modules and CommonJS)
 */

/**
 * Results from detecting imports in code
 */
export interface DetectedModules {
  /** ES module imports (from import statements) */
  esModules: string[];
  /** CommonJS requires (from require() calls) */
  commonjsModules: string[];
  /** All unique packages combined (for preloading) */
  allPackages: string[];
}

/**
 * Detect npm package imports in code (both ES imports and CommonJS requires)
 * Returns list of package names that should be fetched from CDN
 *
 * Examples:
 *   import _ from 'lodash' → esModules: ['lodash']
 *   const _ = require('lodash') → commonjsModules: ['lodash']
 *   import './utils.js' → [] (local import, not npm)
 *   import { readFileSync } from 'fs' → [] (builtin, not npm)
 */
export function detectImports(code: string): DetectedModules {
  const esModules = detectESImports(code);
  const commonjsModules = detectRequires(code);

  // Combine and deduplicate
  const allPackages = [...new Set([...esModules, ...commonjsModules])];

  return {
    esModules,
    commonjsModules,
    allPackages,
  };
}

/**
 * Detect ES module imports in code
 */
function detectESImports(code: string): string[] {
  const imports = new Set<string>();
  const builtinModules = ['fs', 'path', 'process', 'timers'];

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

/**
 * Detect CommonJS require() calls in code
 */
function detectRequires(code: string): string[] {
  const requires = new Set<string>();
  const builtinModules = ['fs', 'path', 'process', 'timers'];

  // Match require() patterns:
  // - const foo = require('pkg')
  // - require('pkg')
  // - const { foo } = require('pkg')
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  let match;
  while ((match = requireRegex.exec(code)) !== null) {
    const moduleName = match[1];

    // Skip if:
    // - Relative path (./foo, ../foo)
    // - Absolute path (/foo)
    // - Builtin module (fs, path, process, timers)
    if (
      moduleName.startsWith('./') ||
      moduleName.startsWith('../') ||
      moduleName.startsWith('/') ||
      builtinModules.includes(moduleName)
    ) {
      continue;
    }

    // Extract base package name (same logic as ES imports)
    let packageName: string;
    if (moduleName.startsWith('@')) {
      // Scoped package: @scope/name
      const parts = moduleName.split('/');
      packageName = `${parts[0]}/${parts[1]}`;
    } else {
      // Regular package: name or name/subpath
      packageName = moduleName.split('/')[0];
    }

    requires.add(packageName);
  }

  return Array.from(requires);
}
