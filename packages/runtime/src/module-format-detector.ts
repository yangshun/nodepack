/**
 * Module Format Detector
 * Detects whether code is ES Module or CommonJS
 */

export type ModuleFormat = 'esm' | 'cjs';

/**
 * Detect if code is ES Module or CommonJS based on syntax patterns
 *
 * @param code - JavaScript code to analyze
 * @returns 'esm' for ES modules, 'cjs' for CommonJS
 *
 * @example
 * detectModuleFormat('import fs from "fs"') // 'esm'
 * detectModuleFormat('const fs = require("fs")') // 'cjs'
 * detectModuleFormat('module.exports = {}') // 'cjs'
 */
export function detectModuleFormat(code: string): ModuleFormat {
  // Check for ES module indicators
  const hasESImport = /^\s*import\s+/m.test(code);
  const hasESExport = /^\s*export\s+/m.test(code);

  // Check for CommonJS indicators
  const hasRequire = /require\s*\(/.test(code);
  const hasModuleExports = /module\.exports\s*=/.test(code);
  const hasExportsAssignment = /exports\.\w+\s*=/.test(code);

  // Decision logic: Prioritize ES modules for backward compatibility

  // Strong ES module signal: has export statement
  if (hasESExport) {
    return 'esm';
  }

  // Has import but no CommonJS exports -> ES module
  if (hasESImport && !hasModuleExports && !hasExportsAssignment) {
    return 'esm';
  }

  // Strong CommonJS signal: module.exports or exports.x
  if (hasModuleExports || hasExportsAssignment) {
    return 'cjs';
  }

  // Only has require (no exports) -> treat as CommonJS
  if (hasRequire) {
    return 'cjs';
  }

  // Default to ES module (backward compatibility)
  return 'esm';
}
