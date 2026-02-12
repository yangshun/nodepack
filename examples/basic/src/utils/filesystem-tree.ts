import type { FileTreeNode } from '../types';

export function buildFileTree(fs: any, rootPath: string = '/'): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];

  try {
    const entries = fs.readdirSync(rootPath);

    for (const entry of entries as string[]) {
      const fullPath = rootPath === '/' ? `/${entry}` : `${rootPath}/${entry}`;

      try {
        const stats = fs.statSync(fullPath);
        const isDirectory = stats.isDirectory();

        // Normalize path: remove leading slash for display
        const normalizedPath = fullPath.startsWith('/')
          ? fullPath.substring(1)
          : fullPath;

        const node: FileTreeNode = {
          name: entry,
          path: normalizedPath,
          isDirectory,
        };

        if (isDirectory) {
          // Recursively build children for directories
          node.children = buildFileTree(fs, fullPath);
        }

        nodes.push(node);
      } catch (statError) {
        console.warn(`Could not stat ${fullPath}:`, statError);
      }
    }

    // Sort: directories first, then files, both alphabetically
    nodes.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (readError) {
    console.warn(`Could not read directory ${rootPath}:`, readError);
  }

  return nodes;
}
