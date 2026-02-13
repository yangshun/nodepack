import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get package version for CLI
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

export const filename = __filename;
export const dirname = __dirname;
export const version = packageJson.version;
