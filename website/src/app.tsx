import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Buffer } from "buffer";
import process from "process";
import { Nodepack } from "@nodepack/client";
import type { ExecutionResult } from "@nodepack/client";

import { ExampleButtons } from "./components/example-buttons";
import { StatusBar } from "./components/status-bar";
import { FileTree } from "./components/file-tree";
import { CodeEditor } from "./components/code-editor";
import { FileTabs } from "./components/file-tabs";
import { Terminal, type TerminalHandle } from "./components/terminal/terminal";
import { examples } from "./examples";
import { FileMap, RuntimeStatus } from "./types";

// Import worker
import nodepackWorkerUrl from "../../packages/worker/dist/runtime-worker.js?worker&url";

// Set up Node.js globals
(globalThis as any).Buffer = Buffer;
(globalThis as any).process = process;

export function App() {
  const [nodepack, setNodepack] = useState<Nodepack | null>(null);
  const [status, setStatus] = useState<RuntimeStatus>("initializing");
  const [isRunning, setIsRunning] = useState(false);
  const [usingWorker, setUsingWorker] = useState(false);
  const handleRunRef = useRef<((filepath: string) => Promise<ExecutionResult>) | null>(null);

  const [session, setSession] = useState<number>(0);
  const [files, setFiles] = useState<FileMap>({});
  const [currentFile, setCurrentFile] = useState("main.js");
  const [currentFileVersion, setCurrentFileVersion] = useState(0);
  const [filesystemVersion, setFilesystemVersion] = useState(0);
  const [openFiles, setOpenFiles] = useState<string[]>(["main.js"]);

  const terminalRef = useRef<TerminalHandle>(null);

  // Derive current file content from filesystem
  const currentFileContent = useMemo(() => {
    if (!nodepack || !currentFile) {
      return "";
    }
    const fs = nodepack.getFilesystem();
    if (!fs) {
      return "";
    }

    try {
      return fs.readFileSync(`/${currentFile}`, "utf8");
    } catch {
      return ""; // File doesn't exist yet
    }
  }, [nodepack, currentFile, currentFileVersion]);

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

        if (cancelled) {
          return;
        }

        const isWorker = runtime.isUsingWorker();
        setNodepack(runtime);
        setUsingWorker(isWorker);
        setStatus("ready");

        // Write welcome message to terminal
        if (terminalRef.current) {
          terminalRef.current.writeOutput("Nodepack initialized successfully!");
          terminalRef.current.writeOutput(
            `🔧 Mode: ${isWorker ? "Web Worker (isolated)" : "Direct runtime"}`,
          );
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

  // Load first example when nodepack becomes available
  useEffect(() => {
    if (!nodepack) {
      return;
    }

    // Load the first example (hello) on initial mount
    handleSelectExample(examples[0].id);
  }, [nodepack]);

  function handleSelectExample(exampleId: string) {
    const example = examples.find((ex) => ex.id === exampleId);
    if (!example) {
      return;
    }

    const newFiles = example.files
      ? { "main.js": example.code, ...example.files }
      : { "main.js": example.code };

    setFiles(newFiles);
    setCurrentFile("main.js");
    setOpenFiles(["main.js"]);
    setSession((s) => s + 1);

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
              const fullPath = path === "/" ? `/${entry}` : `${path}/${entry}`;
              deleteRecursive(fullPath);
            });
            // Only remove directory if it's not root
            if (path !== "/") {
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
        const entries = fs.readdirSync("/");
        entries.forEach((entry: string) => {
          deleteRecursive(`/${entry}`);
        });
      } catch (error) {
        console.warn("Failed to clear filesystem:", error);
      }

      // Then write new files
      Object.entries(newFiles).forEach(([filename, content]) => {
        try {
          const lastSlashIndex = filename.lastIndexOf("/");
          if (lastSlashIndex !== -1) {
            const dirPath = "/" + filename.substring(0, lastSlashIndex);
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
      if ("package.json" in newFiles) {
        handleInstallPackage().catch((error) => {
          if (terminalRef.current) {
            terminalRef.current.writeOutput(`Failed to auto-install packages: ${error.message}`);
          }
        });
      }
    }
  }

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
          setCurrentFile("");
        }
      }

      return newOpenFiles;
    });
  }

  function handleAddFile() {
    const filename = prompt("Enter filename (e.g., utils.js):");
    if (!filename) {
      return;
    }

    // Check filesystem for file existence
    const fs = nodepack?.getFilesystem();
    if (fs && fs.existsSync(`/${filename}`)) {
      alert("File already exists!");
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
        console.error("Failed to write file to filesystem:", error);
      }
    }
  }

  function handleDeleteFile(filename: string) {
    if (filename === "main.js") {
      alert("Cannot delete main.js");
      return;
    }

    if (!confirm(`Delete ${filename}?`)) return;

    const newFiles = { ...files };
    delete newFiles[filename];
    setFiles(newFiles);

    // Remove from openFiles
    setOpenFiles((prev) => prev.filter((f) => f !== filename));

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
          setFilesystemVersion((v) => v + 1);
        }
      } catch (error) {
        console.error("Failed to delete file from filesystem:", error);
      }
    }
  }

  const handleRefresh = useCallback(() => {
    setFilesystemVersion((v) => v + 1);
  }, []);

  function handleCodeChange(code: string) {
    // Write to filesystem
    const fs = nodepack?.getFilesystem();
    if (fs) {
      try {
        fs.writeFileSync(`/${currentFile}`, code);
        // Increment version to trigger re-read of content
        setCurrentFileVersion((v) => v + 1);
      } catch (error) {
        console.error(`Failed to write ${currentFile}:`, error);
      }
    }
  }

  const handleRun = useCallback(
    async (filepath: string) => {
      if (!nodepack || isRunning) {
        throw new Error("Runtime not available");
      }

      setIsRunning(true);
      setStatus("running");

      let result: ExecutionResult | null = null;

      try {
        const fs = nodepack.getFilesystem();
        if (!fs) {
          throw new Error("Filesystem not available");
        }

        // Read file content from filesystem
        const normalizedPath = filepath.startsWith("/") ? filepath : `/${filepath}`;
        const fileContent = fs.readFileSync(normalizedPath, "utf8");

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
              typeof result.error === "object"
                ? JSON.stringify(result.error, null, 2)
                : String(result.error);
            terminalRef.current.writeOutput(`Error: ${errorMsg}`);
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
          terminalRef.current.writeOutput(`Execution failed: ${error.message}`);
        }
        console.error("Execution error:", error);
      } finally {
        setIsRunning(false);
        setStatus("ready");
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

  const handleInstallPackage = useCallback(
    async (packageName?: string) => {
      if (!nodepack) {
        throw new Error("Nodepack not initialized yet");
      }

      const npm = nodepack.npm;
      if (!npm) {
        throw new Error("NPM not available in worker mode");
      }

      const fs = nodepack.getFilesystem();
      if (!fs) {
        throw new Error("Filesystem not available");
      }

      // If no package name provided, install from package.json
      if (!packageName) {
        const packageJsonPath = "/package.json";

        // Check if package.json exists
        if (!fs.existsSync(packageJsonPath)) {
          throw new Error("No package.json found in current directory");
        }

        if (terminalRef.current) {
          terminalRef.current.writeOutput("Installing packages from package.json...");
        }

        // Read package.json
        const packageJsonContent = fs.readFileSync(packageJsonPath, "utf8");

        // Install from package.json
        await npm.installFromPackageJson(packageJsonContent);

        setFilesystemVersion((v) => v + 1);

        if (terminalRef.current) {
          terminalRef.current.writeOutput("Successfully installed all packages");
          terminalRef.current.writeOutput("Check `node_modules` in the files explorer");
          terminalRef.current.writeOutput("");
        }
      } else {
        // Install specific package
        if (terminalRef.current) {
          terminalRef.current.writeOutput(`Installing ${packageName}...`);
        }

        await npm.install(packageName);

        // Add package to package.json if it exists
        const packageJsonPath = "/package.json";
        if (fs.existsSync(packageJsonPath)) {
          try {
            // Get the installed version from the package's package.json
            const installedPackageJsonPath = `/node_modules/${packageName}/package.json`;
            let versionToAdd = "latest";

            if (fs.existsSync(installedPackageJsonPath)) {
              const installedPackageJson = JSON.parse(
                fs.readFileSync(installedPackageJsonPath, "utf8"),
              );
              if (installedPackageJson.version) {
                versionToAdd = `^${installedPackageJson.version}`;
              }
            }

            // Read and update package.json
            const packageJsonContent = fs.readFileSync(packageJsonPath, "utf8");
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
            if (currentFile === "package.json") {
              setCurrentFileVersion((v) => v + 1);
            }

            if (terminalRef.current) {
              terminalRef.current.writeOutput(
                `Added ${packageName}@${versionToAdd} to package.json`,
              );
            }
          } catch (error) {
            console.warn("Failed to update package.json:", error);
            // Don't throw - package is still installed successfully
          }
        }

        setFilesystemVersion((v) => v + 1);

        if (terminalRef.current) {
          terminalRef.current.writeOutput(`Successfully installed ${packageName}`);
          terminalRef.current.writeOutput(
            `Check node_modules/${packageName} in the files explorer`,
          );
          terminalRef.current.writeOutput("");
        }
      }
    },
    [nodepack],
  );

  return (
    <div className="min-h-screen p-3 flex flex-col gap-3 mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ExampleButtons onSelectExample={handleSelectExample} />
        </div>
      </div>
      <div className="flex h-0 grow rounded-lg overflow-hidden border border-dark-border divide-x divide-dark-border">
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
            onInstallPackage={handleInstallPackage}
            installDisabled={!nodepack || usingWorker}
          />
        </div>
        {/* Code Editor */}
        <div className="w-1/2 h-full flex flex-col">
          <FileTabs
            openFiles={openFiles}
            currentFile={currentFile}
            onSelectTab={handleSelectTab}
            onCloseTab={handleCloseTab}
          />
          <div className="flex-1 h-0 grow">
            <CodeEditor
              code={currentFileContent}
              currentFile={currentFile}
              onChange={handleCodeChange}
              onRun={() => handleRun("main.js")}
              isRunning={isRunning}
            />
          </div>
        </div>
        {/* Terminal */}
        <div className="w-1/3 h-full">
          <Terminal
            key={session}
            ref={terminalRef}
            filesystem={nodepack?.getFilesystem() || undefined}
            onExecuteFile={handleExecuteFile}
            onCommandExecuted={handleRefresh}
            onInstallPackage={handleInstallPackage}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <StatusBar
          status={status}
          isRunning={isRunning}
          usingWorker={usingWorker}
          onRun={() => {
            handleRun("main.js");
          }}
        />
      </div>
    </div>
  );
}
