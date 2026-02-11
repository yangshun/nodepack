/**
 * Nodepack Browser Demo
 * Demonstrates running Node.js code in the browser
 */

// Set up Node.js polyfills for browser environment
import { Buffer } from 'buffer';
import process from 'process';

// Make Node.js globals available
(globalThis as any).Buffer = Buffer;
(globalThis as any).process = process;

// Now safe to import Nodepack (which uses memfs internally)
import { Nodepack } from '@nodepack/client';

const statusEl = document.getElementById('status') as HTMLElement;
const runBtn = document.getElementById('runBtn') as HTMLButtonElement;
const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
const outputEl = document.getElementById('output') as HTMLElement;
const codeEditor = document.getElementById('codeEditor') as HTMLTextAreaElement;
const fileListEl = document.getElementById('fileList') as HTMLUListElement;
const addFileBtn = document.getElementById('addFileBtn') as HTMLButtonElement;
const currentFileEl = document.getElementById('currentFile') as HTMLElement;

let nodepack: Nodepack | null = null;
let isRunning = false;

// File management
interface FileMap {
  [filename: string]: string;
}

let files: FileMap = {
  'main.js': `// Welcome to Nodepack!
// This is a browser-based Node.js runtime

console.log('Hello from Node.js in the browser!');
console.log('Current time:', new Date().toISOString());

export default { status: 'ok' };`
};

let currentFile = 'main.js';

// Example scripts
const examples: Record<string, string> = {
  hello: `console.log('Hello from Node.js in the browser!');
console.log('This is a proof of concept');
console.log('Date:', new Date().toISOString());

export default { status: 'success', message: 'Hello World!' };`,

  math: `// Math operations
const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((a, b) => a + b, 0);
const average = sum / numbers.length;

console.log('Numbers:', numbers);
console.log('Sum:', sum);
console.log('Average:', average);
console.log('Squared:', numbers.map(n => n * n));

export default { sum, average };`,

  loops: `// Loops and iteration
for (let i = 0; i < 5; i++) {
  console.log('Iteration:', i);
}

const fruits = ['apple', 'banana', 'orange'];
fruits.forEach((fruit, index) => {
  console.log(\`\${index + 1}. \${fruit}\`);
});

export default fruits;`,

  fs: `// File system operations using ES module imports
import { writeFileSync, readFileSync, mkdirSync, readdirSync } from 'fs';

writeFileSync('/hello.txt', 'Hello from virtual filesystem!');
const content = readFileSync('/hello.txt', 'utf8');

console.log('File content:', content);

// Create a directory and list files
mkdirSync('/data', { recursive: true });
writeFileSync('/data/test.txt', 'Test file');

const files = readdirSync('/');
console.log('Root directory files:', files);

export default { content, files };`,

  modules: `// Using ES module imports
import { join, dirname, basename, extname } from 'path';
import process from 'process';

const fullPath = join('/home', 'user', 'documents', 'file.txt');
const dir = dirname(fullPath);
const file = basename(fullPath);
const ext = extname(fullPath);

console.log('Full path:', fullPath);
console.log('Directory:', dir);
console.log('Filename:', file);
console.log('Extension:', ext);

// Using process module
console.log('Platform:', process.platform);
console.log('Version:', process.version);
console.log('Working dir:', process.cwd());

export default { fullPath, dir, file, ext };`,

  multifile: `// Multi-file project with local module imports! 🎉
// Files /utils.js and /math-helpers.js were created during initialization

// Import from our custom utility module
import { greet, add, multiply, PI, version } from './utils.js';

console.log(greet('World'));
console.log('2 + 3 =', add(2, 3));
console.log('4 × 5 =', multiply(4, 5));
console.log('PI =', PI);
console.log('Utils version:', version);

// Import from another custom module
import { square, cube, factorial } from './math-helpers.js';

console.log('');
console.log('5² =', square(5));
console.log('3³ =', cube(3));
console.log('5! =', factorial(5));

// You can also mix builtin and custom imports
import { existsSync } from 'fs';

console.log('');
console.log('Does /utils.js exist?', existsSync('/utils.js'));
console.log('Does /math-helpers.js exist?', existsSync('/math-helpers.js'));

export default {
  greeting: greet('User'),
  sum: add(10, 20),
  square: square(7),
  version
};`,

  packages: `// NPM packages from jsDelivr CDN! 🎉
import _ from 'lodash';

const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

console.log('Numbers:', numbers);
console.log('Sum:', _.sum(numbers));
console.log('Average:', _.mean(numbers));
console.log('Max:', _.max(numbers));
console.log('Min:', _.min(numbers));

console.log('');
console.log('Doubled:', _.map(numbers, n => n * 2));
console.log('Evens:', _.filter(numbers, n => n % 2 === 0));
console.log('First 3:', _.take(numbers, 3));
console.log('Last 3:', _.takeRight(numbers, 3));

console.log('');
console.log('Unique:', _.uniq([1, 2, 2, 3, 3, 4, 4, 5]));
console.log('Shuffle:', _.shuffle([1, 2, 3, 4, 5]));

export default {
  sum: _.sum(numbers),
  average: _.mean(numbers),
  doubled: _.map(numbers, n => n * 2)
};`,
};

// Initialize Nodepack
async function initNodepack() {
  statusEl.textContent = 'Initializing Nodepack...';
  statusEl.className = 'status';

  try {
    // Boot Nodepack - using direct runtime for now
    // TODO: Worker support needs proper bundling setup
    nodepack = await Nodepack.boot({
      useWorker: false,
    });

    // Pre-populate filesystem with utility modules for multi-file demo
    await nodepack.execute(`
      import { writeFileSync } from 'fs';

      // Create a reusable utility module
      writeFileSync('/utils.js', \`
export function greet(name) {
  return 'Hello, ' + name + '!';
}

export function add(a, b) {
  return a + b;
}

export function multiply(a, b) {
  return a * b;
}

export const PI = 3.14159;
export const version = '1.0.0';
\`);

      // Create a math helper module
      writeFileSync('/math-helpers.js', \`
export function square(x) {
  return x * x;
}

export function cube(x) {
  return x * x * x;
}

export function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
\`);
    `);

    const usingWorker = nodepack.isUsingWorker();

    statusEl.textContent = `✅ Ready (${usingWorker ? 'Web Worker' : 'Direct'})`;
    statusEl.className = 'status ready';
    runBtn.disabled = false;

    addOutput('system', '✅ Nodepack initialized successfully!');
    addOutput('system', `🔧 Mode: ${usingWorker ? 'Web Worker (isolated)' : 'Direct runtime'}`);
    addOutput('system', '🚀 You can now run Node.js code in your browser');
    addOutput('system', '');
    addOutput('system', 'Try the examples or write your own code!');
    addOutput('system', 'Use "export default" to return a value');
    addOutput('system', 'Press Cmd/Ctrl+Enter to run');
  } catch (error: any) {
    statusEl.textContent = '❌ Failed to initialize';
    statusEl.className = 'status error';
    addOutput('stderr', `Failed to initialize: ${error.message}`);
    console.error('Init error:', error);
  }
}

// Render file list
function renderFileList() {
  fileListEl.innerHTML = '';

  Object.keys(files).sort().forEach(filename => {
    const li = document.createElement('li');
    li.className = `file-item ${filename === currentFile ? 'active' : ''}`;

    const nameSpan = document.createElement('span');
    nameSpan.textContent = filename;
    nameSpan.onclick = () => switchFile(filename);

    const deleteBtn = document.createElement('span');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteFile(filename);
    };

    li.appendChild(nameSpan);
    if (filename !== 'main.js') { // Don't allow deleting main.js
      li.appendChild(deleteBtn);
    }

    fileListEl.appendChild(li);
  });
}

// Switch to a different file
function switchFile(filename: string) {
  // Save current file content
  files[currentFile] = codeEditor.value;

  // Switch to new file
  currentFile = filename;
  codeEditor.value = files[filename];
  currentFileEl.textContent = filename;

  renderFileList();
}

// Add new file
function addNewFile() {
  const filename = prompt('Enter filename (e.g., utils.js):');
  if (!filename) return;

  if (files[filename]) {
    alert('File already exists!');
    return;
  }

  files[filename] = `// ${filename}\n\nexport default {};\n`;
  switchFile(filename);
}

// Delete file
function deleteFile(filename: string) {
  if (filename === 'main.js') {
    alert('Cannot delete main.js');
    return;
  }

  if (!confirm(`Delete ${filename}?`)) return;

  delete files[filename];

  // Switch to main.js if we deleted the current file
  if (currentFile === filename) {
    switchFile('main.js');
  } else {
    renderFileList();
  }
}

// Run code
async function runCode() {
  if (!nodepack || isRunning) return;

  // Save current editor content
  files[currentFile] = codeEditor.value;

  isRunning = true;
  runBtn.disabled = true;
  statusEl.textContent = '⚡ Running...';
  statusEl.className = 'status running';

  clearOutput();
  addOutput('system', `▶ Running ${currentFile}...`);
  addOutput('system', '');

  const startTime = performance.now();

  try {
    // If we have multiple files, write them all to the virtual filesystem first
    if (Object.keys(files).length > 1) {
      const fileEntries = Object.entries(files);
      const writeFilesCode = `
        import { writeFileSync, mkdirSync, existsSync } from 'fs';
        import { dirname } from 'path';

        ${fileEntries.map(([filename, content]) => `
          {
            const dir = dirname('/${filename}');
            if (dir !== '/' && !existsSync(dir)) {
              mkdirSync(dir, { recursive: true });
            }
            writeFileSync('/${filename}', ${JSON.stringify(content)});
          }
        `).join('\n')}
      `;

      const writeResult = await nodepack.execute(writeFilesCode);
      if (!writeResult.ok) {
        throw new Error(`Failed to write files: ${writeResult.error}`);
      }
    }

    // Execute the current file
    const result = await nodepack.execute(files[currentFile]);
    const duration = Math.round(performance.now() - startTime);

    if (result.ok) {
      // Display console logs
      if (result.logs && result.logs.length > 0) {
        result.logs.forEach(log => {
          addOutput('stdout', log);
        });
        addOutput('stdout', '');
      }

      addOutput('system', `✅ Execution completed in ${duration}ms`);

      if (result.data !== undefined) {
        addOutput('stdout', '');
        addOutput('stdout', 'Returned value:');
        addOutput('stdout', JSON.stringify(result.data, null, 2));
      }
    } else {
      addOutput('stderr', '');
      addOutput('stderr', '❌ Error:');
      addOutput('stderr', result.error || 'Unknown error');
      console.error('QuickJS error:', result.error);
    }
  } catch (error: any) {
    addOutput('stderr', `❌ Unexpected error: ${error.message}`);
    addOutput('stderr', error.stack || '');
    console.error('Execution error:', error);
  } finally {
    isRunning = false;
    runBtn.disabled = false;
    const usingWorker = nodepack.isUsingWorker();
    statusEl.textContent = `✅ Ready (${usingWorker ? 'Worker' : 'Direct'})`;
    statusEl.className = 'status ready';
  }
}

// Clear output
function clearOutput() {
  outputEl.innerHTML = '';
  outputEl.classList.remove('empty');
}

// Helper to add output
function addOutput(type: 'stdout' | 'stderr' | 'system', message: string) {
  if (outputEl.classList.contains('empty')) {
    outputEl.innerHTML = '';
    outputEl.classList.remove('empty');
  }

  const line = document.createElement('div');
  line.className = `output-line output-${type}`;
  line.textContent = message;
  outputEl.appendChild(line);
  outputEl.scrollTop = outputEl.scrollHeight;
}

// Save current file on editor change
codeEditor.addEventListener('input', () => {
  files[currentFile] = codeEditor.value;
});

// Event listeners
runBtn.addEventListener('click', runCode);

clearBtn.addEventListener('click', () => {
  outputEl.innerHTML = '';
  outputEl.classList.add('empty');
  outputEl.textContent = 'Output cleared.';
});

addFileBtn.addEventListener('click', addNewFile);

// Allow Cmd/Ctrl+Enter to run
codeEditor.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    runCode();
  }
});

// Example buttons - reset to just the example
document.querySelectorAll('[data-example]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const example = (e.target as HTMLElement).getAttribute('data-example');
    if (example && examples[example]) {
      // Special handling for multifile example - include utility files
      if (example === 'multifile') {
        files = {
          'main.js': examples[example],
          'utils.js': `export function greet(name) {
  return 'Hello, ' + name + '!';
}

export function add(a, b) {
  return a + b;
}

export function multiply(a, b) {
  return a * b;
}

export const PI = 3.14159;
export const version = '1.0.0';`,
          'math-helpers.js': `export function square(x) {
  return x * x;
}

export function cube(x) {
  return x * x * x;
}

export function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}`
        };
      } else {
        // Reset files to just main.js with the example
        files = {
          'main.js': examples[example]
        };
      }

      currentFile = 'main.js';
      codeEditor.value = examples[example];
      currentFileEl.textContent = 'main.js';
      renderFileList();
    }
  });
});

// Initialize on load
renderFileList();
initNodepack();
