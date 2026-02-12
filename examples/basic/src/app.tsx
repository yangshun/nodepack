import { useState, useEffect, useCallback, useRef } from 'react';
import { Buffer } from 'buffer';
import process from 'process';
import { Nodepack } from '@nodepack/client';
import type { ExecutionResult } from '@nodepack/client';

import { ExampleButtons } from './components/example-buttons';
import { StatusBar } from './components/status-bar';
import { FileTree } from './components/file-tree';
import { CodeEditor } from './components/code-editor';
import { Terminal, type TerminalHandle } from './components/terminal';
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
  const [currentFileContent, setCurrentFileContent] = useState(defaultCode);
  const [filesystemVersion, setFilesystemVersion] = useState(0);

  const terminalRef = useRef<TerminalHandle>(null);

  // Initialize Nodepack
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setStatus('initializing');
        if (terminalRef.current) {
          terminalRef.current.writeOutput('⏳ Initializing Nodepack...');
        }

        const runtime = await Nodepack.boot({
          useWorker: false, // Use direct mode for terminal filesystem access
          workerUrl: nodepackWorkerUrl,
        });

        if (cancelled) return;

        const isWorker = runtime.isUsingWorker();
        setNodepack(runtime);
        setUsingWorker(isWorker);
        setStatus('ready');

        // Write welcome message to terminal
        if (terminalRef.current) {
          terminalRef.current.writeOutput('✅ Nodepack initialized successfully!');
          terminalRef.current.writeOutput(
            `🔧 Mode: ${isWorker ? 'Web Worker (isolated)' : 'Direct runtime'}`,
          );
          terminalRef.current.writeOutput('🚀 You can now run Node.js code in your browser');
          terminalRef.current.writeOutput('');
          terminalRef.current.writeOutput('Try the examples or write your own code!');
        }
      } catch (error: any) {
        if (cancelled) return;
        setStatus('error');
        if (terminalRef.current) {
          terminalRef.current.writeOutput(`Failed to initialize: ${error.message}`);
        }
        console.error('Init error:', error);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  // Write initial files to filesystem when nodepack becomes available
  useEffect(() => {
    if (!nodepack) return;

    const fs = nodepack.getFilesystem();
    if (!fs) return;

    // Write initial main.js file to filesystem
    try {
      fs.writeFileSync('/main.js', defaultCode);
      setFilesystemVersion((v) => v + 1);
    } catch (error) {
      console.error('Failed to write initial file:', error);
    }
  }, [nodepack]);

  const handleSelectExample = (exampleId: string) => {
    const example = examples.find((ex) => ex.id === exampleId);
    if (!example) return;

    const newFiles = example.files
      ? { 'main.js': example.code, ...example.files }
      : { 'main.js': example.code };

    setFiles(newFiles);
    setCurrentFile('main.js');
    setCurrentFileContent(example.code);

    // Clear terminal when switching examples
    if (terminalRef.current) {
      terminalRef.current.clear();
    }

    // Clear and write files to filesystem
    const fs = nodepack?.getFilesystem();
    if (fs) {
      // First, recursively delete all files and directories
      const deleteRecursive = (path: string) => {
        try {
          const stats = fs.statSync(path);
          if (stats.isDirectory()) {
            const entries = fs.readdirSync(path);
            entries.forEach((entry: string) => {
              const fullPath = path === '/' ? `/${entry}` : `${path}/${entry}`;
              deleteRecursive(fullPath);
            });
            // Only remove directory if it's not root
            if (path !== '/') {
              fs.rmdirSync(path);
            }
          } else {
            fs.unlinkSync(path);
          }
        } catch (error) {
          console.warn(`Failed to delete ${path}:`, error);
        }
      };

      // Delete all files in root
      try {
        const entries = fs.readdirSync('/');
        entries.forEach((entry: string) => {
          deleteRecursive(`/${entry}`);
        });
      } catch (error) {
        console.warn('Failed to clear filesystem:', error);
      }

      // Then write new files
      Object.entries(newFiles).forEach(([filename, content]) => {
        try {
          const lastSlashIndex = filename.lastIndexOf('/');
          if (lastSlashIndex !== -1) {
            const dirPath = '/' + filename.substring(0, lastSlashIndex);
            try {
              fs.mkdirSync(dirPath, { recursive: true });
            } catch (mkdirError) {
              // Directory might already exist
            }
          }
          fs.writeFileSync(`/${filename}`, content);
        } catch (error) {
          console.error(`Failed to write ${filename}:`, error);
        }
      });

      setFilesystemVersion((v) => v + 1);
    }
  };

  // Load file content from filesystem when currentFile changes
  useEffect(() => {
    if (!nodepack || !currentFile) return;

    const fs = nodepack.getFilesystem();
    if (!fs) return;

    try {
      // Try to read from filesystem first
      const content = fs.readFileSync(`/${currentFile}`, 'utf8');
      setCurrentFileContent(content);

      // Also update the files state if it's a user file (not in node_modules)
      if (!currentFile.startsWith('node_modules/')) {
        setFiles((prev) => ({ ...prev, [currentFile]: content }));
      }
    } catch (error) {
      // File doesn't exist in filesystem, use empty content
      console.warn(`Could not read ${currentFile}:`, error);
      setCurrentFileContent('');
    }
  }, [currentFile, nodepack]);

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

    const content = `// ${filename}\n\nexport default {};\n`;
    const newFiles = {
      ...files,
      [filename]: content,
    };

    setFiles(newFiles);
    setCurrentFile(filename);
    setCurrentFileContent(content);

    // Write new file to filesystem
    const fs = nodepack?.getFilesystem();
    if (fs) {
      try {
        fs.writeFileSync(`/${filename}`, content);
        setFilesystemVersion((v) => v + 1);
      } catch (error) {
        console.error('Failed to write file to filesystem:', error);
      }
    }
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

    // Delete file from filesystem
    const fs = nodepack?.getFilesystem();
    if (fs) {
      try {
        const path = `/${filename}`;
        if (fs.existsSync(path)) {
          fs.unlinkSync(path);
          setFilesystemVersion((v) => v + 1);
        }
      } catch (error) {
        console.error('Failed to delete file from filesystem:', error);
      }
    }
  };

  const handleRefresh = useCallback(() => {
    setFilesystemVersion((v) => v + 1);
  }, []);

  const handleCodeChange = (code: string) => {
    // Update current file content state
    setCurrentFileContent(code);

    // Update files state for user files (not node_modules)
    if (!currentFile.startsWith('node_modules/')) {
      setFiles((prev) => ({ ...prev, [currentFile]: code }));
    }

    // Write to filesystem (but don't increment version since file structure hasn't changed)
    const fs = nodepack?.getFilesystem();
    if (fs) {
      try {
        fs.writeFileSync(`/${currentFile}`, code);
      } catch (error) {
        console.error(`Failed to write ${currentFile}:`, error);
      }
    }
  };

  const handleExecuteFile = useCallback(
    async (filepath: string) => {
      if (!nodepack) {
        return {
          ok: false,
          output: '',
          error: 'Runtime not initialized',
        };
      }

      try {
        // Read file content from filesystem
        const fs = nodepack.getFilesystem();
        if (!fs) {
          return {
            ok: false,
            output: '',
            error: 'Filesystem not available',
          };
        }

        const content = fs.readFileSync(filepath, 'utf8');

        // Execute the file content
        const result = await nodepack.execute(content);

        // Format output
        let output = '';
        if (result.logs && result.logs.length > 0) {
          output = result.logs.join('\n') + '\n';
        }

        if (result.ok) {
          return {
            ok: true,
            output,
          };
        } else {
          return {
            ok: false,
            output,
            error: result.error || 'Execution failed',
          };
        }
      } catch (error: any) {
        return {
          ok: false,
          output: '',
          error: error.message,
        };
      }
    },
    [nodepack],
  );

  const handleRun = useCallback(async () => {
    if (!nodepack || isRunning) {
      return;
    }

    setIsRunning(true);
    setStatus('running');

    const startTime = performance.now();

    try {
      // Write all files except main.js to virtual filesystem
      const otherFiles = Object.entries(files).filter(([name]) => name !== 'main.js');

      if (otherFiles.length > 0) {
        const fs = nodepack.getFilesystem();
        if (!fs) {
          throw new Error('Filesystem not available');
        }

        // Write each file, creating parent directories as needed
        otherFiles.forEach(([filename, content]) => {
          const fullPath = `/${filename}`;

          // Create parent directories if needed
          const lastSlashIndex = filename.lastIndexOf('/');
          if (lastSlashIndex !== -1) {
            const dirPath = '/' + filename.substring(0, lastSlashIndex);
            try {
              fs.mkdirSync(dirPath, { recursive: true });
            } catch (err) {
              // Directory might already exist
            }
          }

          // Write the file
          fs.writeFileSync(fullPath, content);
        });
      }

      // Execute the main file with streaming logs
      const result: ExecutionResult = await nodepack.execute(files[currentFile], {
        onLog: (message) => {
          // Stream logs to terminal in real-time
          if (terminalRef.current) {
            terminalRef.current.writeOutput(message);
          }
        },
      });
      const duration = Math.round(performance.now() - startTime);

      if (result.ok) {
        // Add spacing after logs (if any were output)
        if (result.logs && result.logs.length > 0) {
          if (terminalRef.current) {
            terminalRef.current.writeOutput('');
          }
        }

        if (terminalRef.current) {
          terminalRef.current.writeOutput(`✅ Execution completed in ${duration}ms`);
        }

        // Display returned value
        if (result.data !== undefined) {
          if (terminalRef.current) {
            terminalRef.current.writeOutput('');
            terminalRef.current.writeOutput('Returned value:');
            terminalRef.current.writeOutput(JSON.stringify(result.data, null, 2));
          }
        }
      } else {
        if (terminalRef.current) {
          const errorMsg =
            typeof result.error === 'object'
              ? JSON.stringify(result.error, null, 2)
              : String(result.error);
          terminalRef.current.writeOutput(`❌ Error: ${errorMsg}`);
        }

        // Display any logs that occurred before the error
        if (result.logs && result.logs.length > 0) {
          if (terminalRef.current) {
            terminalRef.current.writeOutput('');
            terminalRef.current.writeOutput('Output before error:');
          }
          result.logs.forEach((log) => {
            if (terminalRef.current) {
              terminalRef.current.writeOutput(log);
            }
          });
        }
      }
    } catch (error: any) {
      if (terminalRef.current) {
        terminalRef.current.writeOutput(`❌ Execution failed: ${error.message}`);
      }
      console.error('Execution error:', error);
    } finally {
      setIsRunning(false);
      setStatus('ready');
      // Refresh file explorer after execution
      setFilesystemVersion((v) => v + 1);
    }
  }, [nodepack, isRunning, files, currentFile]);

  const handleInstallPackage = async (packageName: string) => {
    if (!nodepack) {
      alert('Nodepack not initialized yet');
      return;
    }

    const npm = nodepack.npm;
    if (!npm) {
      alert('NPM not available in worker mode');
      return;
    }

    try {
      if (terminalRef.current) {
        terminalRef.current.writeOutput(`📦 Installing ${packageName}...`);
      }

      await npm.install(packageName);

      setFilesystemVersion((v) => v + 1);

      if (terminalRef.current) {
        terminalRef.current.writeOutput(`✅ Successfully installed ${packageName}`);
        terminalRef.current.writeOutput(
          `📁 Check the file tree to see node_modules/${packageName}`,
        );
        terminalRef.current.writeOutput('');
      }
    } catch (error: any) {
      if (terminalRef.current) {
        terminalRef.current.writeOutput(`❌ Failed to install ${packageName}: ${error.message}`);
      }
      console.error('Package installation error:', error);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="flex flex-col gap-6 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ExampleButtons onSelectExample={handleSelectExample} />
            <div className="h-6 w-px bg-gray-600" />
            <div className="flex gap-2">
              <button
                onClick={() => handleInstallPackage('ms')}
                className="btn-secondary"
                disabled={!nodepack || usingWorker}
                title="Install the 'ms' package to see node_modules in the file tree"
              >
                Install ms
              </button>
              <button
                onClick={() => handleInstallPackage('clsx')}
                className="btn-secondary"
                disabled={!nodepack || usingWorker}
                title="Install the 'clsx' package to see node_modules in the file tree"
              >
                Install clsx
              </button>
            </div>
          </div>
          <StatusBar
            status={status}
            isRunning={isRunning}
            usingWorker={usingWorker}
            onRun={handleRun}
          />
        </div>
        <div className="flex h-[600px] rounded-lg overflow-hidden border border-dark-border divide-x divide-dark-border">
          {/* File List */}
          <div className="w-[200px] grow h-full">
            <FileTree
              filesystem={nodepack?.getFilesystem()}
              currentFile={currentFile}
              version={filesystemVersion}
              onSelectFile={handleSelectFile}
              onDeleteFile={handleDeleteFile}
              onAddFile={handleAddFile}
              onRefresh={handleRefresh}
            />
          </div>
          {/* Code Editor */}
          <div className="w-1/2 h-full">
            <CodeEditor
              code={currentFileContent}
              currentFile={currentFile}
              onChange={handleCodeChange}
              onRun={handleRun}
              isRunning={isRunning}
            />
          </div>
          {/* Terminal */}
          <div className="w-1/3 h-full">
            <Terminal
              ref={terminalRef}
              filesystem={nodepack?.getFilesystem() || undefined}
              onExecuteFile={handleExecuteFile}
              onCommandExecuted={handleRefresh}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
