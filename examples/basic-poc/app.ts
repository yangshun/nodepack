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

let nodepack: Nodepack | null = null;
let isRunning = false;

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

  fs: `// File system operations using the global fs module
fs.writeFileSync('/hello.txt', 'Hello from virtual filesystem!');
const content = fs.readFileSync('/hello.txt', 'utf8');

console.log('File content:', content);

// Create a directory and list files
fs.mkdirSync('/data', { recursive: true });
fs.writeFileSync('/data/test.txt', 'Test file');

const files = fs.readdirSync('/');
console.log('Root directory files:', files);

export default { content, files };`,

  modules: `// Using path module (available as global)
const fullPath = path.join('/home', 'user', 'documents', 'file.txt');
const dir = path.dirname(fullPath);
const file = path.basename(fullPath);
const ext = path.extname(fullPath);

console.log('Full path:', fullPath);
console.log('Directory:', dir);
console.log('Filename:', file);
console.log('Extension:', ext);

// Using process module
console.log('Platform:', process.platform);
console.log('Version:', process.version);
console.log('Working dir:', process.cwd());

export default { fullPath, dir, file, ext };`,
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

// Run code
async function runCode() {
  if (!nodepack || isRunning) return;

  const code = codeEditor.value.trim();
  if (!code) {
    addOutput('system', 'Please enter some code to run');
    return;
  }

  isRunning = true;
  runBtn.disabled = true;
  statusEl.textContent = '⚡ Running...';
  statusEl.className = 'status running';

  clearOutput();
  addOutput('system', '▶ Running code...');
  addOutput('system', '');

  const startTime = performance.now();

  try {
    const result = await nodepack.execute(code);
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
    }
  } catch (error: any) {
    addOutput('stderr', `❌ Unexpected error: ${error.message}`);
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

// Event listeners
runBtn.addEventListener('click', runCode);

clearBtn.addEventListener('click', () => {
  outputEl.innerHTML = '';
  outputEl.classList.add('empty');
  outputEl.textContent = 'Output cleared.';
});

// Allow Cmd/Ctrl+Enter to run
codeEditor.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    runCode();
  }
});

// Example buttons
document.querySelectorAll('[data-example]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const example = (e.target as HTMLElement).getAttribute('data-example');
    if (example && examples[example]) {
      codeEditor.value = examples[example];
    }
  });
});

// Initialize on load
initNodepack();
