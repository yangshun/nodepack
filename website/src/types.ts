export interface FileMap {
  [filename: string]: string;
}

export type RuntimeStatus = 'initializing' | 'ready' | 'running' | 'error';

export interface ExampleDefinition {
  id: string;
  label: string;
  files: FileMap;
  ai?: boolean;
}

export interface FileTreeNode {
  name: string; // Just the filename/folder name
  path: string; // Full path from root (e.g., "src/utils/file.ts")
  isDirectory: boolean; // Whether this is a folder
  children?: FileTreeNode[]; // Child nodes (only for directories)
}
