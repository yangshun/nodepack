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
