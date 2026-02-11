import { useState, useEffect, useCallback } from 'react';
import { Buffer } from 'buffer';
import process from 'process';
import { Nodepack } from '@nodepack/client';
import type { ExecutionResult } from '@nodepack/client';

import { ExampleButtons } from './components/example-buttons';
import { StatusBar } from './components/status-bar';
import { FileList } from './components/file-list';
import { CodeEditor } from './components/code-editor';
import { ConsoleOutput } from './components/console-output';
import { examples } from './examples';
import { FileMap, RuntimeStatus } from './types';

// Import worker
import nodepackWorkerUrl from '../../../packages/worker/dist/runtime-worker.js?worker&url';

// Set up Node.js globals
(globalThis as any).Buffer = Buffer;
(globalThis as any).process = process;

const defaultCode = `// Welcome to Nodepack!
// This is a browser-based Node.js runtime

console.log('Hello from Node.js in the browser!');
console.log('Current time:', new Date().toISOString());

export default { status: 'ok' };`;

export function App() {
  const [nodepack, setNodepack] = useState<Nodepack | null>(null);
  const [status, setStatus] = useState<RuntimeStatus>('initializing');
  const [isRunning, setIsRunning] = useState(false);
  const [usingWorker, setUsingWorker] = useState(false);

  const [files, setFiles] = useState<FileMap>({ 'main.js': defaultCode });
  const [currentFile, setCurrentFile] = useState('main.js');
  const [logs, setLogs] = useState<string[]>([]);

  // Initialize Nodepack
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setStatus('initializing');
        addLog('system', '⏳ Initializing Nodepack...');

        const runtime = await Nodepack.boot({
          useWorker: true,
          workerUrl: nodepackWorkerUrl,
        });

        if (cancelled) return;

        // Pre-populate filesystem with utility modules
        await runtime.execute(`
          import { writeFileSync } from 'fs';

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

        const isWorker = runtime.isUsingWorker();
        setNodepack(runtime);
        setUsingWorker(isWorker);
        setStatus('ready');

        clearLogs();
        addLog('system', '✅ Nodepack initialized successfully!');
        addLog('system', `🔧 Mode: ${isWorker ? 'Web Worker (isolated)' : 'Direct runtime'}`);
        addLog('system', '🚀 You can now run Node.js code in your browser');
        addLog('system', '');
        addLog('system', 'Try the examples or write your own code!');
      } catch (error: any) {
        if (cancelled) return;
        setStatus('error');
        addLog('error', `Failed to initialize: ${error.message}`);
        console.error('Init error:', error);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  const addLog = (type: 'stdout' | 'error' | 'system', message: string) => {
    setLogs((prev) => [...prev, message]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const handleSelectExample = (exampleId: string) => {
    const example = examples.find((ex) => ex.id === exampleId);
    if (!example) return;

    if (example.files) {
      setFiles({ 'main.js': example.code, ...example.files });
    } else {
      setFiles({ 'main.js': example.code });
    }
    setCurrentFile('main.js');
  };

  const handleSelectFile = (filename: string) => {
    setCurrentFile(filename);
  };

  const handleAddFile = () => {
    const filename = prompt('Enter filename (e.g., utils.js):');
    if (!filename) return;

    if (files[filename]) {
      alert('File already exists!');
      return;
    }

    setFiles((prev) => ({
      ...prev,
      [filename]: `// ${filename}\n\nexport default {};\n`,
    }));
    setCurrentFile(filename);
  };

  const handleDeleteFile = (filename: string) => {
    if (filename === 'main.js') {
      alert('Cannot delete main.js');
      return;
    }

    if (!confirm(`Delete ${filename}?`)) return;

    const newFiles = { ...files };
    delete newFiles[filename];
    setFiles(newFiles);

    if (currentFile === filename) {
      setCurrentFile('main.js');
    }
  };

  const handleCodeChange = (code: string) => {
    setFiles((prev) => ({ ...prev, [currentFile]: code }));
  };

  const handleRun = useCallback(async () => {
    if (!nodepack || isRunning) {
      return;
    }

    setIsRunning(true);
    setStatus('running');
    clearLogs();

    const startTime = performance.now();

    try {
      // Write all files except main.js to virtual filesystem
      const otherFiles = Object.entries(files).filter(([name]) => name !== 'main.js');

      if (otherFiles.length > 0) {
        const writeFilesCode = `
          import { writeFileSync, mkdirSync, existsSync } from 'fs';
          import { dirname } from 'path';

          ${otherFiles
            .map(
              ([filename, content]) => `
          {
            const dir = dirname('/${filename}');
            if (dir !== '/' && !existsSync(dir)) {
              mkdirSync(dir, { recursive: true });
            }
            writeFileSync('/${filename}', ${JSON.stringify(content)});
          }
        `
            )
            .join('\n')}
        `;

        const writeResult = await nodepack.execute(writeFilesCode);
        if (!writeResult.ok) {
          throw new Error(`Failed to write files: ${writeResult.error}`);
        }
      }

      // Execute the main file
      const result: ExecutionResult = await nodepack.execute(files[currentFile]);
      const duration = Math.round(performance.now() - startTime);

      if (result.ok) {
        // Display console logs
        if (result.logs && result.logs.length > 0) {
          result.logs.forEach((log) => addLog('stdout', log));
          addLog('stdout', '');
        }

        addLog('system', `✅ Execution completed in ${duration}ms`);

        // Display returned value
        if (result.data !== undefined) {
          addLog('system', '');
          addLog('system', 'Returned value:');
          addLog('stdout', JSON.stringify(result.data, null, 2));
        }
      } else {
        addLog('error', `❌ Error: ${result.error}`);

        // Display any logs that occurred before the error
        if (result.logs && result.logs.length > 0) {
          addLog('system', '');
          addLog('system', 'Output before error:');
          result.logs.forEach((log) => addLog('stdout', log));
        }
      }
    } catch (error: any) {
      addLog('error', `❌ Execution failed: ${error.message}`);
      console.error('Execution error:', error);
    } finally {
      setIsRunning(false);
      setStatus('ready');
    }
  }, [nodepack, isRunning, files, currentFile]);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-[1400px] mx-auto">
        <ExampleButtons onSelectExample={handleSelectExample} />
        <StatusBar
          status={status}
          isRunning={isRunning}
          usingWorker={usingWorker}
          onRun={handleRun}
        />
        <div className="grid grid-cols-12 gap-6 mb-6 h-[600px]">
          {/* File List */}
          <div className="col-span-2">
            <FileList
              files={files}
              currentFile={currentFile}
              onSelectFile={handleSelectFile}
              onDeleteFile={handleDeleteFile}
              onAddFile={handleAddFile}
            />
          </div>
          {/* Code Editor */}
          <div className="col-span-5">
            <CodeEditor
              code={files[currentFile] || ''}
              currentFile={currentFile}
              onChange={handleCodeChange}
              onRun={handleRun}
              isRunning={isRunning}
            />
          </div>
          {/* Console Output */}
          <div className="col-span-5">
            <ConsoleOutput logs={logs} onClear={clearLogs} />
          </div>
        </div>
      </div>
    </div>
  );
}
