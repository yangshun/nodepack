import type { ExampleDefinition } from '../types';

export const nodejsModules: ExampleDefinition = {
  id: 'nodejs-modules',
  label: 'Node.js modules',
  files: {
    'main.js': `// This example demonstrates usage of Node's built-in modules 
// to generate a system report and save it to the filesystem.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';

console.log('=== Node.js built-in modules demo ===');

function sleep(wait) {
  return new Promise(resolve => setTimeout(resolve, wait));
}

async function generateSystemReport() {
  // 1. Get Node-specific OS data
  const systemInfo = {
    hash: createHash('sha256').update(Date.now().toString()).digest('hex'),
    timestamp: new Date().toISOString(),
    platform: os.platform(),
    architecture: os.arch(),
    cpus: os.cpus().length,
    env: process.env.NODE_ENV,
  };

  // 2. Create the report content
  const reportContent = JSON.stringify(systemInfo, null, 2);

  // 3. Use Path and FS to save the file
  const filePath = path.join(process.cwd(), \`\${new Date().toISOString()}.json\`);
  
  try {
    // Ensure the directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // Write the file
    await fs.writeFile(filePath, reportContent, 'utf-8');
    
    console.log('');
    console.log(\`Report saved to: \${filePath}\`);
  } catch (error) {
    console.error('Failed to write report:', error);
  }
}

await generateSystemReport();
console.log('');

// Display the number of reports in the current directory
const files = await fs.readdir(process.cwd());
const reports = files.filter(file => file.endsWith('.json'));
console.log(\`Reports in current directory: \${reports.length}\`);
console.log('');

for (let i = 0; i < reports.length; i++) {
  await sleep(Math.min(500), 1000 / reports.length); // Simulate animation
  console.log(\`  - \${reports[i]}\`);
}

console.log('');
`,
  },
};
