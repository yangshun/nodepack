import { useState, useEffect, useCallback, useRef } from "react";
import { Buffer } from "buffer";
import process from "process";
import { Nodepack } from "@nodepack/client";
import type { ExecutionResult } from "@nodepack/client";

import { ExampleButtons } from "./components/example-buttons";
import { StatusBar } from "./components/status-bar";
import { FileList } from "./components/file-list";
import { CodeEditor } from "./components/code-editor";
import { Terminal, type TerminalHandle } from "./components/terminal";
import { examples } from "./examples";
import { FileMap, RuntimeStatus } from "./types";

// Import worker
import nodepackWorkerUrl from "../../../packages/worker/dist/runtime-worker.js?worker&url";

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
  const [status, setStatus] = useState<RuntimeStatus>("initializing");
  const [isRunning, setIsRunning] = useState(false);
  const [usingWorker, setUsingWorker] = useState(false);

  const [files, setFiles] = useState<FileMap>({ "main.js": defaultCode });
  const [currentFile, setCurrentFile] = useState("main.js");

  const terminalRef = useRef<TerminalHandle>(null);

  // Sync React files state with memfs filesystem
  const syncFilesystemWithState = useCallback((filesToSync: FileMap) => {
    const fs = nodepack?.getFilesystem();
    if (!fs) {
      console.log('[Sync] Filesystem not available yet');
      return;
    }

    try {
      console.log('[Sync] Syncing files:', Object.keys(filesToSync));

      // Get current files in filesystem
      const existingFiles = new Set<string>();
      try {
        const entries = fs.readdirSync('/');
        entries.forEach((entry: string) => {
          existingFiles.add(entry);
        });
        console.log('[Sync] Existing files in filesystem:', Array.from(existingFiles));
      } catch (error) {
        // Filesystem might not be ready yet
        console.log('[Sync] Could not read filesystem');
        return;
      }

      // Remove files that are no longer in state
      existingFiles.forEach((filename) => {
        if (!filesToSync[filename]) {
          try {
            console.log('[Sync] Removing file:', filename);
            fs.unlinkSync(`/${filename}`);
          } catch (error) {
            console.error(`Failed to delete ${filename}:`, error);
          }
        }
      });

      // Write all files from state to filesystem
      Object.entries(filesToSync).forEach(([filename, content]) => {
        try {
          console.log('[Sync] Writing file:', filename);
          fs.writeFileSync(`/${filename}`, content);
        } catch (error) {
          console.error(`Failed to write ${filename}:`, error);
        }
      });

      console.log('[Sync] Sync complete');
    } catch (error) {
      console.error("Failed to sync filesystem:", error);
    }
  }, [nodepack]);

  // Initialize Nodepack
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setStatus("initializing");
        if (terminalRef.current) {
          terminalRef.current.writeOutput("⏳ Initializing Nodepack...");
        }

        const runtime = await Nodepack.boot({
          useWorker: false, // Use direct mode for terminal filesystem access
          workerUrl: nodepackWorkerUrl,
        });

        if (cancelled) return;

        const isWorker = runtime.isUsingWorker();
        setNodepack(runtime);
        setUsingWorker(isWorker);
        setStatus("ready");

        // Write welcome message to terminal
        if (terminalRef.current) {
          terminalRef.current.writeOutput("✅ Nodepack initialized successfully!");
          terminalRef.current.writeOutput(`🔧 Mode: ${isWorker ? "Web Worker (isolated)" : "Direct runtime"}`);
          terminalRef.current.writeOutput("🚀 You can now run Node.js code in your browser");
          terminalRef.current.writeOutput("");
          terminalRef.current.writeOutput("Try the examples or write your own code!");
        }
      } catch (error: any) {
        if (cancelled) return;
        setStatus("error");
        if (terminalRef.current) {
          terminalRef.current.writeOutput(`Failed to initialize: ${error.message}`);
        }
        console.error("Init error:", error);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  // Sync filesystem when nodepack becomes available (initial sync only)
  useEffect(() => {
    if (nodepack) {
      syncFilesystemWithState(files);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodepack]);

  const handleSelectExample = (exampleId: string) => {
    const example = examples.find((ex) => ex.id === exampleId);
    if (!example) return;

    const newFiles = example.files
      ? { "main.js": example.code, ...example.files }
      : { "main.js": example.code };

    setFiles(newFiles);
    setCurrentFile("main.js");

    // Sync filesystem with new files
    syncFilesystemWithState(newFiles);
  };

  const handleSelectFile = (filename: string) => {
    setCurrentFile(filename);
  };

  const handleAddFile = () => {
    const filename = prompt("Enter filename (e.g., utils.js):");
    if (!filename) return;

    if (files[filename]) {
      alert("File already exists!");
      return;
    }

    const content = `// ${filename}\n\nexport default {};\n`;
    const newFiles = {
      ...files,
      [filename]: content,
    };

    setFiles(newFiles);
    setCurrentFile(filename);

    // Write new file to filesystem
    const fs = nodepack?.getFilesystem();
    if (fs) {
      try {
        fs.writeFileSync(`/${filename}`, content);
      } catch (error) {
        console.error("Failed to write file to filesystem:", error);
      }
    }
  };

  const handleDeleteFile = (filename: string) => {
    if (filename === "main.js") {
      alert("Cannot delete main.js");
      return;
    }

    if (!confirm(`Delete ${filename}?`)) return;

    const newFiles = { ...files };
    delete newFiles[filename];
    setFiles(newFiles);

    if (currentFile === filename) {
      setCurrentFile("main.js");
    }

    // Delete file from filesystem
    const fs = nodepack?.getFilesystem();
    if (fs) {
      try {
        const path = `/${filename}`;
        if (fs.existsSync(path)) {
          fs.unlinkSync(path);
        }
      } catch (error) {
        console.error("Failed to delete file from filesystem:", error);
      }
    }
  };

  const handleCodeChange = (code: string) => {
    setFiles((prev) => ({ ...prev, [currentFile]: code }));
  };

  const handleExecuteFile = useCallback(async (filepath: string) => {
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
  }, [nodepack]);

  const handleRun = useCallback(async () => {
    if (!nodepack || isRunning) {
      return;
    }

    setIsRunning(true);
    setStatus("running");

    const startTime = performance.now();

    try {
      // Write all files except main.js to virtual filesystem
      const otherFiles = Object.entries(files).filter(([name]) => name !== "main.js");

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
        `,
            )
            .join("\n")}
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
        // Display console logs to terminal
        if (result.logs && result.logs.length > 0) {
          result.logs.forEach((log) => {
            if (terminalRef.current) {
              terminalRef.current.writeOutput(log);
            }
          });
          if (terminalRef.current) {
            terminalRef.current.writeOutput("");
          }
        }

        if (terminalRef.current) {
          terminalRef.current.writeOutput(`✅ Execution completed in ${duration}ms`);
        }

        // Display returned value
        if (result.data !== undefined) {
          if (terminalRef.current) {
            terminalRef.current.writeOutput("");
            terminalRef.current.writeOutput("Returned value:");
            terminalRef.current.writeOutput(JSON.stringify(result.data, null, 2));
          }
        }
      } else {
        if (terminalRef.current) {
          terminalRef.current.writeOutput(`❌ Error: ${result.error}`);
        }

        // Display any logs that occurred before the error
        if (result.logs && result.logs.length > 0) {
          if (terminalRef.current) {
            terminalRef.current.writeOutput("");
            terminalRef.current.writeOutput("Output before error:");
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
      console.error("Execution error:", error);
    } finally {
      setIsRunning(false);
      setStatus("ready");
    }
  }, [nodepack, isRunning, files, currentFile]);

  return (
    <div className="min-h-screen p-6">
      <div className="flex flex-col gap-6 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between">
          <ExampleButtons onSelectExample={handleSelectExample} />
          <StatusBar
            status={status}
            isRunning={isRunning}
            usingWorker={usingWorker}
            onRun={handleRun}
          />
        </div>
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
              code={files[currentFile] || ""}
              currentFile={currentFile}
              onChange={handleCodeChange}
              onRun={handleRun}
              isRunning={isRunning}
            />
          </div>
          {/* Terminal */}
          <div className="col-span-5">
            <Terminal
              ref={terminalRef}
              filesystem={nodepack?.getFilesystem() || undefined}
              onExecuteFile={handleExecuteFile}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
