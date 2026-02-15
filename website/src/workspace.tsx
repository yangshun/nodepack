'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Buffer } from 'buffer';
import process from 'process';
import { Nodepack } from '@nodepack/client';
import type { ExecutionResult } from '@nodepack/client';

import { StatusBar } from './components/status-bar';
import { Explorer } from './components/explorer';
import { CodeEditor } from './components/code-editor';
import { FileTabs } from './components/file-tabs';
import { Terminal, type TerminalHandle } from './components/terminal/terminal';
import { AIChat } from './components/ai-chat/ai-chat';
import { Group, Panel, Separator } from 'react-resizable-panels';
import type { FileMap, RuntimeStatus } from './types';

// Worker URL from public directory
const nodepackWorkerUrl = '/workers/runtime-worker.js';
import { RiChatAiLine } from 'react-icons/ri';

// Set up Node.js globals
(globalThis as any).Buffer = Buffer;
(globalThis as any).process = process;

interface WorkspaceProps {
  title?: string;
  initialFiles: FileMap;
}

export function Workspace({ title, initialFiles }: WorkspaceProps) {
  const [nodepack, setNodepack] = useState<Nodepack | null>(null);
  const [status, setStatus] = useState<RuntimeStatus>('initializing');
  const [isRunning, setIsRunning] = useState(false);
  const [usingWorker, setUsingWorker] = useState(false);
  const handleRunRef = useRef<((filepath: string) => Promise<ExecutionResult>) | null>(null);

  const [files, setFiles] = useState<FileMap>(initialFiles);
  const [currentFile, setCurrentFile] = useState('main.js');
  const [currentFileVersion, setCurrentFileVersion] = useState(0);
  const [filesystemVersion, setFilesystemVersion] = useState(0);
  const [openFiles, setOpenFiles] = useState<string[]>(['main.js']);

  // AI Chat config state (messages and input are managed by useChat inside AIChat)
  const [aiChatVisible, setAiChatVisible] = useState(true);
  const [anthropicApiKey, setAnthropicApiKey] = useState<string | null>(
    localStorage.getItem('anthropic_api_key'),
  );
  const [openaiApiKey, setOpenaiApiKey] = useState<string | null>(
    localStorage.getItem('openai_api_key'),
  );
  const [aiProvider, setAiProvider] = useState<'anthropic' | 'openai'>(
    (localStorage.getItem('ai_provider') as 'anthropic' | 'openai') || 'anthropic',
  );
  const [aiModel, setAiModel] = useState<string>(
    localStorage.getItem('ai_model') || 'claude-sonnet-4-5-20250929',
  );

  const terminalRef = useRef<TerminalHandle>(null);

  // Derive current file content from filesystem
  const currentFileContent = useMemo(() => {
    if (!nodepack || !currentFile) {
      return '';
    }
    const fs = nodepack.getFilesystem();
    if (!fs) {
      return '';
    }

    try {
      return fs.readFileSync(`/${currentFile}`, 'utf8');
    } catch {
      return ''; // File doesn't exist yet
    }
  }, [nodepack, currentFile, currentFileVersion]);

  // Initialize Nodepack
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setStatus('initializing');
        if (terminalRef.current) {
          terminalRef.current.writeOutput('Initializing Nodepack...');
        }

        const runtime = await Nodepack.boot({
          useWorker: false, // Use direct mode for terminal filesystem access
          workerUrl: nodepackWorkerUrl,
        });

        if (cancelled) {
          return;
        }

        const isWorker = runtime.isUsingWorker();
        setNodepack(runtime);
        setUsingWorker(isWorker);
        setStatus('ready');

        // Write welcome message to terminal
        if (terminalRef.current) {
          terminalRef.current.writeOutput('Nodepack initialized successfully!');
          terminalRef.current.writeOutput(
            `Mode: ${isWorker ? 'Web worker (isolated)' : 'Direct runtime'}`,
          );
          terminalRef.current.writeOutput('You can now run Node.js code in your browser');
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
    if (!nodepack) {
      return;
    }

    const fs = nodepack.getFilesystem();
    if (!fs) {
      return;
    }

    // Write initial files to filesystem
    Object.entries(initialFiles).forEach(([filename, content]) => {
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
    setCurrentFileVersion((v) => v + 1);

    // Auto-install packages if package.json exists
    if ('package.json' in initialFiles) {
      handleInstallPackage().catch((error) => {
        if (terminalRef.current) {
          terminalRef.current.writeOutput(`Failed to auto-install packages: ${error.message}`);
        }
      });
    }
  }, [nodepack]);

  const handleSelectFile = (filename: string) => {
    setOpenFiles((prev) => {
      if (prev.includes(filename)) {
        return prev;
      }
      return [...prev, filename];
    });
    setCurrentFile(filename);
  };

  function handleSelectTab(filename: string) {
    setCurrentFile(filename);
  }

  function handleCloseTab(filename: string) {
    setOpenFiles((prev) => {
      const newOpenFiles = prev.filter((f) => f !== filename);

      // If closing the active tab, switch to another tab
      if (filename === currentFile) {
        if (newOpenFiles.length > 0) {
          const closedIndex = prev.indexOf(filename);
          const newActiveIndex = closedIndex > 0 ? closedIndex - 1 : 0;
          setCurrentFile(newOpenFiles[newActiveIndex]);
        } else {
          // No files left, clear current file
          setCurrentFile('');
        }
      }

      return newOpenFiles;
    });
  }

  function handleAddFile() {
    const filename = prompt('Enter filename (e.g., utils.js):');
    if (!filename) {
      return;
    }

    // Check filesystem for file existence
    const fs = nodepack?.getFilesystem();
    if (fs && fs.existsSync(`/${filename}`)) {
      alert('File already exists!');
      return;
    }

    const content = `// ${filename}\n\nexport default {};\n`;

    setFiles((prev) => ({ ...prev, [filename]: content }));
    setCurrentFile(filename);

    // Write new file to filesystem
    if (fs) {
      try {
        fs.writeFileSync(`/${filename}`, content);
        setFilesystemVersion((v) => v + 1);
        setCurrentFileVersion((v) => v + 1);
      } catch (error) {
        console.error('Failed to write file to filesystem:', error);
      }
    }
  }

  function handleDeleteFile(filename: string) {
    if (filename === 'main.js') {
      alert('Cannot delete main.js');
      return;
    }

    if (!confirm(`Delete ${filename}?`)) {
      return;
    }

    const newFiles = { ...files };
    delete newFiles[filename];
    setFiles(newFiles);

    // Remove from openFiles
    setOpenFiles((prev) => prev.filter((f) => f !== filename));

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
  }

  const handleRefresh = useCallback(() => {
    setFilesystemVersion((v) => v + 1);
    setCurrentFileVersion((v) => v + 1);
  }, []);

  function handleCodeChange(code: string) {
    // Write to filesystem
    const fs = nodepack?.getFilesystem();
    if (fs) {
      try {
        fs.writeFileSync(`/${currentFile}`, code);
        // Increment version to trigger re-read of content
        setCurrentFileVersion((v) => v + 1);
        // Also increment filesystem version to update FileTree
        setFilesystemVersion((v) => v + 1);
      } catch (error) {
        console.error(`Failed to write ${currentFile}:`, error);
      }
    }
  }

  const handleRun = useCallback(
    async (filepath: string) => {
      if (!nodepack || isRunning) {
        throw new Error('Runtime not available');
      }

      setIsRunning(true);
      setStatus('running');

      let result: ExecutionResult | null = null;

      try {
        const fs = nodepack.getFilesystem();
        if (!fs) {
          throw new Error('Filesystem not available');
        }

        // Read file content from filesystem
        const normalizedPath = filepath.startsWith('/') ? filepath : `/${filepath}`;
        const fileContent = fs.readFileSync(normalizedPath, 'utf8');

        // Execute the file with streaming logs
        result = await nodepack.execute(fileContent, {
          filename: normalizedPath,
          onLog: (message) => {
            // Stream logs to terminal in real-time
            if (terminalRef.current) {
              terminalRef.current.writeOutput(message);
            }
          },
        });

        if (!result.ok) {
          if (terminalRef.current) {
            const errorMsg =
              typeof result.error === 'object'
                ? JSON.stringify(result.error, null, 2)
                : String(result.error);
            terminalRef.current.writeOutput(`Error: ${errorMsg}`);
          }
        }
      } catch (error: any) {
        if (terminalRef.current) {
          terminalRef.current.writeOutput(`Execution failed: ${error.message}`);
        }
        console.error('Execution error:', error);
      } finally {
        setIsRunning(false);
        setStatus('ready');
        // Refresh file explorer after execution
        setFilesystemVersion((v) => v + 1);
      }

      return result!;
    },
    [nodepack, isRunning],
  );

  handleRunRef.current = handleRun;

  const handleExecuteFile = useCallback(
    async (filepath: string) => {
      return await handleRunRef.current!(filepath);
    },
    [nodepack],
  );

  const handleExecuteScript = useCallback(async (scriptName: string) => {
    if (!terminalRef.current) {
      throw new Error('Terminal not available');
    }

    await terminalRef.current.executeCommand(`npm run ${scriptName}`);
  }, []);

  const handleInstallPackage = useCallback(
    async (packageName?: string) => {
      if (!nodepack) {
        throw new Error('Nodepack not initialized yet');
      }

      const npm = nodepack.npm;
      if (!npm) {
        throw new Error('NPM not available in worker mode');
      }

      const fs = nodepack.getFilesystem();
      if (!fs) {
        throw new Error('Filesystem not available');
      }

      // If no package name provided, install from package.json
      if (!packageName) {
        const packageJsonPath = '/package.json';

        // Check if package.json exists
        if (!fs.existsSync(packageJsonPath)) {
          throw new Error('No package.json found in current directory');
        }

        if (terminalRef.current) {
          terminalRef.current.writeOutput('Installing packages from package.json...');
        }

        // Read package.json
        const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');

        // Install from package.json
        await npm.installFromPackageJson(packageJsonContent);

        setFilesystemVersion((v) => v + 1);

        if (terminalRef.current) {
          terminalRef.current.writeOutput('Successfully installed packages into node_modules');
          terminalRef.current.writeOutput('');
        }
      } else {
        // Install specific package
        if (terminalRef.current) {
          terminalRef.current.writeOutput(`Installing ${packageName}...`);
        }

        await npm.install(packageName);

        // Add package to package.json if it exists
        const packageJsonPath = '/package.json';
        if (fs.existsSync(packageJsonPath)) {
          try {
            // Get the installed version from the package's package.json
            const installedPackageJsonPath = `/node_modules/${packageName}/package.json`;
            let versionToAdd = 'latest';

            if (fs.existsSync(installedPackageJsonPath)) {
              const installedPackageJson = JSON.parse(
                fs.readFileSync(installedPackageJsonPath, 'utf8'),
              );
              if (installedPackageJson.version) {
                versionToAdd = `^${installedPackageJson.version}`;
              }
            }

            // Read and update package.json
            const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
            const packageJsonData = JSON.parse(packageJsonContent);

            // Initialize dependencies object if it doesn't exist
            if (!packageJsonData.dependencies) {
              packageJsonData.dependencies = {};
            }

            // Add the package with the installed version
            packageJsonData.dependencies[packageName] = versionToAdd;

            // Write back to package.json
            const updatedPackageJsonContent = JSON.stringify(packageJsonData, null, 2);
            fs.writeFileSync(packageJsonPath, updatedPackageJsonContent);

            // Update editor state if package.json is currently open
            if (currentFile === 'package.json') {
              setCurrentFileVersion((v) => v + 1);
            }

            if (terminalRef.current) {
              terminalRef.current.writeOutput(
                `Added ${packageName}@${versionToAdd} to package.json\r\n`,
              );
            }
          } catch (error) {
            console.warn('Failed to update package.json:', error);
            // Don't throw - package is still installed successfully
          }
        }

        setFilesystemVersion((v) => v + 1);
      }
    },
    [nodepack],
  );

  const apiKey = aiProvider === 'anthropic' ? anthropicApiKey : openaiApiKey;

  return (
    <div className="h-full flex flex-col">
      <div className="h-0 grow rounded-lg overflow-hidden border border-dark-border">
        <Group orientation="horizontal">
          {/* File List */}
          <Panel defaultSize="15%" minSize="10%" maxSize="40%">
            <div className="h-full">
              <Explorer
                title={title}
                filesystem={nodepack?.getFilesystem()}
                currentFile={currentFile}
                version={filesystemVersion}
                onSelectFile={handleSelectFile}
                onDeleteFile={handleDeleteFile}
                onAddFile={handleAddFile}
                onRefresh={handleRefresh}
                onInstallPackage={handleInstallPackage}
                installDisabled={!nodepack || usingWorker}
                onExecuteScript={handleExecuteScript}
              />
            </div>
          </Panel>
          <Separator className="w-2 -mx-1 relative outline-none after:content-[''] after:absolute after:inset-y-0 after:left-1/2 after:-translate-x-1/2 after:w-px after:bg-dark-border active:after:bg-orange-500 after:transition-colors" />
          <Panel defaultSize="50%" minSize="20%">
            <Group defaultValue={20} className="h-full" orientation="vertical">
              {/* Code Editor */}
              <Panel defaultSize="50%" minSize="20%">
                <div className="h-full flex flex-col">
                  <div className="h-10 flex items-center border-b border-dark-border">
                    <div className="flex-1 min-w-0">
                      <FileTabs
                        openFiles={openFiles}
                        currentFile={currentFile}
                        onSelectTab={handleSelectTab}
                        onCloseTab={handleCloseTab}
                      />
                    </div>
                    {!aiChatVisible && (
                      <button
                        onClick={() => setAiChatVisible(true)}
                        className="btn-tertiary mr-2"
                        title="Show AI assistant"
                      >
                        <RiChatAiLine size={18} />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 h-0 grow">
                    <CodeEditor
                      code={currentFileContent}
                      currentFile={currentFile}
                      onChange={handleCodeChange}
                      onRun={() => handleRun('main.js')}
                      isRunning={isRunning}
                    />
                  </div>
                </div>
              </Panel>
              <Separator className="h-2 -my-1 relative outline-none after:content-[''] after:absolute after:inset-x-0 after:top-1/2 after:-translate-y-1/2 after:h-px after:bg-dark-border active:after:bg-orange-500 after:transition-colors" />
              {/* Terminal */}
              <Panel defaultSize="30%" minSize="15%">
                <div className="flex flex-col h-full">
                  <div className="h-0 grow border-b border-dark-border">
                    <Terminal
                      ref={terminalRef}
                      filesystem={nodepack?.getFilesystem() || undefined}
                      onExecuteFile={handleExecuteFile}
                      onCommandExecuted={handleRefresh}
                      onInstallPackage={handleInstallPackage}
                    />
                  </div>
                  <StatusBar
                    status={status}
                    isRunning={isRunning}
                    usingWorker={usingWorker}
                    onRun={() => {
                      handleRun('main.js');
                    }}
                  />
                </div>
              </Panel>
            </Group>
          </Panel>
          {/* AI Chat */}
          {aiChatVisible && (
            <>
              <Separator className="w-2 -mx-1 relative outline-none after:content-[''] after:absolute after:inset-y-0 after:left-1/2 after:-translate-x-1/2 after:w-px after:bg-dark-border active:after:bg-orange-500 after:transition-colors" />
              <Panel defaultSize="20%" minSize="15%" maxSize="40%">
                <div className="h-full">
                  <AIChat
                    nodepack={nodepack}
                    apiKey={apiKey}
                    hasServerKeys={true}
                    provider={aiProvider}
                    model={aiModel}
                    onFileUpdate={handleRefresh}
                    onClose={() => setAiChatVisible(false)}
                    terminalRef={terminalRef}
                  />
                </div>
              </Panel>
            </>
          )}
        </Group>
      </div>
    </div>
  );
}
