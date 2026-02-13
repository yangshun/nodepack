import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { NodepackRuntime } from '../runtime';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface FixtureFile {
  path: string;
  content: string;
}

export interface Fixture {
  name: string;
  files: FixtureFile[];
  mainFile: string;
}

function getAllFiles(dir: string, baseDir: string = dir): FixtureFile[] {
  const files: FixtureFile[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else if (stat.isFile() && (entry.endsWith('.js') || entry.endsWith('.json'))) {
      const relativePath = '/' + fullPath.substring(baseDir.length + 1);
      const content = readFileSync(fullPath, 'utf8');
      files.push({ path: relativePath, content });
    }
  }

  return files;
}

/**
 * Loads a fixture by name. Supports subdirectories for organization.
 * @param name - Fixture name or path (e.g., 'basic/simple' or 'interop/complex-interop')
 * @returns Fixture object with all files and main entry point
 */
export function loadFixture(name: string): Fixture {
  const fixturePath = join(__dirname, name);
  const files = getAllFiles(fixturePath);

  // Find main.js as the entry point
  const mainFile = files.find((f) => f.path === '/main.js');
  if (!mainFile) {
    throw new Error(`Fixture ${name} must have a main.js file`);
  }

  return {
    name,
    files,
    mainFile: mainFile.content,
  };
}

export function loadFixtureIntoFilesystem(runtime: NodepackRuntime, fixture: Fixture): void {
  const fs = runtime.getFilesystem();
  for (const file of fixture.files) {
    // Create parent directories if they don't exist
    const parentDir = file.path.substring(0, file.path.lastIndexOf('/'));
    if (parentDir && !fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(file.path, file.content);
  }
}
