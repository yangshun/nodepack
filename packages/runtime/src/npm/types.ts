/**
 * Types for NPM package management
 */

export interface PackageManifest {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  main?: string;
  module?: string;
  browser?: string | Record<string, string>;
  exports?: Record<string, any>;
  dist?: {
    tarball: string;
    shasum?: string;
    integrity?: string;
  };
}

export interface PackageMetadata {
  name: string;
  versions: Record<string, PackageManifest>;
  'dist-tags': {
    latest: string;
    [tag: string]: string;
  };
}

export interface TarballInfo {
  url: string;
  integrity?: string;
  shasum?: string;
}

export interface ResolvedDependency {
  name: string;
  version: string;
  resolved: string; // tarball URL
  dependencies: Map<string, ResolvedDependency>;
}

export interface InstallOptions {
  includeDev?: boolean;
  force?: boolean; // Re-install even if cached
}

export interface PackageCache {
  manifests: Map<string, PackageMetadata>;
  installed: Map<string, string>; // package@version -> install path
}

export interface ExtractedFile {
  path: string;
  content: Uint8Array | string;
  mode: number;
  type: 'file' | 'directory';
}
