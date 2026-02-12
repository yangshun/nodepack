export interface FileMap {
  [filename: string]: string;
}

export type RuntimeStatus = 'initializing' | 'ready' | 'running' | 'error';

export interface ExampleDefinition {
  id: string;
  label: string;
  code: string;
  files?: FileMap;
}

export interface FileTreeNode {
  name: string; // Just the filename/folder name
  path: string; // Full path from root (e.g., "src/utils/file.ts")
  isDirectory: boolean; // Whether this is a folder
  children?: FileTreeNode[]; // Child nodes (only for directories)
}
