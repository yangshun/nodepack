/**
 * Terminal Component
 *
 * Integrates xterm.js terminal emulator with just-bash shell
 * Provides interactive command-line interface for file operations
 */

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Bash } from 'just-bash';
import type { IFs } from 'memfs';
import { BridgedFilesystem } from '../terminal/bridged-filesystem';
import { TerminalController } from '../terminal/terminal-controller';
import { bashSecurityConfig } from '../terminal/security-config';
import 'xterm/css/xterm.css';

export interface TerminalProps {
  filesystem?: IFs;
  onReady?: () => void;
  onExecuteFile?: (filepath: string) => Promise<{ ok: boolean; output: string; error?: string }>;
  onCommandExecuted?: () => void;
  onInstallPackage?: (packageName?: string) => Promise<void>;
}

export interface TerminalHandle {
  writeOutput: (message: string) => void;
  clear: () => void;
}

export const Terminal = forwardRef<TerminalHandle, TerminalProps>(
  ({ filesystem, onReady, onExecuteFile, onCommandExecuted, onInstallPackage }, ref) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm | null>(null);
    const bashRef = useRef<Bash | null>(null);
    const controllerRef = useRef<TerminalController | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      writeOutput: (message: string) => {
        if (controllerRef.current) {
          controllerRef.current.writeOutput(message);
        }
      },
      clear: () => {
        if (xtermRef.current) {
          xtermRef.current.clear();
        }
      },
    }));

    useEffect(() => {
      if (!terminalRef.current || !filesystem) return;

      // Create xterm instance
      const term = new XTerm({
        cursorBlink: true,
        fontSize: 12,
        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#dcdcaa',
          cursor: '#ffffff',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#e5e5e5',
        },
        allowProposedApi: true,
      });

      // Add addons
      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);

      // Open terminal
      term.open(terminalRef.current);
      fitAddon.fit();

      // Create just-bash instance with bridged filesystem
      const bridgedFs = new BridgedFilesystem(filesystem);
      const bash = new Bash({
        fs: bridgedFs,
        cwd: '/', // Start at root directory
        ...bashSecurityConfig,
        customCommands: [
          {
            name: 'node',
            execute: async (args: string[], context: any) => {
              if (!onExecuteFile) {
                return {
                  stdout: '',
                  stderr: 'Error: node command not available\n',
                  exitCode: 1,
                };
              }

              // Parse arguments
              if (args.length === 0) {
                return {
                  stdout: '',
                  stderr: 'Usage: node <filename>\n',
                  exitCode: 1,
                };
              }

              const filename = args[0];

              // Normalize path
              let filepath = filename;
              if (!filepath.startsWith('/')) {
                filepath = `/${filepath}`;
              }

              // Check if file exists
              try {
                const exists = await context.fs.exists(filepath);
                if (!exists) {
                  return {
                    stdout: '',
                    stderr: `Error: Cannot find module '${filename}'\n`,
                    exitCode: 1,
                  };
                }
              } catch (error) {
                return {
                  stdout: '',
                  stderr: `Error: ${error}\n`,
                  exitCode: 1,
                };
              }

              // Execute the file
              try {
                const result = await onExecuteFile(filepath);

                if (result.ok) {
                  return {
                    stdout: result.output || '',
                    stderr: '',
                    exitCode: 0,
                  };
                } else {
                  return {
                    stdout: result.output || '',
                    stderr: result.error || 'Execution failed\n',
                    exitCode: 1,
                  };
                }
              } catch (error: any) {
                return {
                  stdout: '',
                  stderr: `Error executing file: ${error.message}\n`,
                  exitCode: 1,
                };
              }
            },
          },
          {
            name: 'npm',
            execute: async (args: string[], context: any) => {
              // Parse arguments
              if (args.length === 0) {
                return {
                  stdout: '',
                  stderr:
                    'Usage: npm <command>\n\n' +
                    'Supported commands:\n' +
                    '  install [package]  - Install packages from package.json or specific package\n' +
                    '  run <script>       - Run a package.json script\n' +
                    '  start              - Alias for npm run start\n' +
                    '  test               - Alias for npm run test\n' +
                    '  dev                - Alias for npm run dev\n',
                  exitCode: 1,
                };
              }

              let subcommand = args[0];

              // Handle shortcuts (npm start, npm test, npm dev)
              if (subcommand === 'start' || subcommand === 'test' || subcommand === 'dev') {
                // Transform to "npm run <shortcut>"
                args = ['run', subcommand, ...args.slice(1)];
                subcommand = 'run';
              }

              // Handle install subcommand
              if (subcommand === 'install' || subcommand === 'i') {
                if (!onInstallPackage) {
                  return {
                    stdout: '',
                    stderr: 'Error: npm install command not available\n',
                    exitCode: 1,
                  };
                }

                // Get package name (optional - if not provided, install from package.json)
                const packageName = args.length >= 2 ? args[1] : undefined;

                // Install the package
                try {
                  await onInstallPackage(packageName);
                  return {
                    stdout: '',
                    stderr: '',
                    exitCode: 0,
                  };
                } catch (error: any) {
                  const target = packageName || 'packages from package.json';
                  return {
                    stdout: '',
                    stderr: `Error installing ${target}: ${error.message}\n`,
                    exitCode: 1,
                  };
                }
              }

              // Handle run subcommand
              if (subcommand === 'run') {
                // Validate arguments
                if (args.length < 2) {
                  return {
                    stdout: '',
                    stderr: 'Usage: npm run <script-name>\n',
                    exitCode: 1,
                  };
                }

                const scriptName = args[1];

                // Read package.json
                let packageJson: any;
                try {
                  const packageJsonExists = await context.fs.exists('/package.json');
                  if (!packageJsonExists) {
                    return {
                      stdout: '',
                      stderr: 'Error: No package.json found in current directory\n',
                      exitCode: 1,
                    };
                  }

                  const packageJsonContent = await context.fs.readFile('/package.json', 'utf8');
                  packageJson = JSON.parse(packageJsonContent);
                } catch (error: any) {
                  return {
                    stdout: '',
                    stderr: `Error reading package.json: ${error.message}\n`,
                    exitCode: 1,
                  };
                }

                // Get scripts
                const scripts = packageJson.scripts || {};

                if (!scripts[scriptName]) {
                  const availableScripts = Object.keys(scripts);
                  const suggestion =
                    availableScripts.length > 0
                      ? `\nAvailable scripts:\n${availableScripts.map((s) => `  - ${s}`).join('\n')}\n`
                      : '\nNo scripts defined in package.json\n';

                  return {
                    stdout: '',
                    stderr: `Error: Missing script: "${scriptName}"${suggestion}`,
                    exitCode: 1,
                  };
                }

                const scriptCommand = scripts[scriptName];

                // Execute script using context.exec
                try {
                  // Check if exec is available
                  if (!context.exec) {
                    return {
                      stdout: '',
                      stderr: 'Error: Command execution not available in this context\n',
                      exitCode: 1,
                    };
                  }

                  // Execute the script command through bash
                  const result = await context.exec(scriptCommand);

                  return {
                    stdout: result.stdout || '',
                    stderr: result.stderr || '',
                    exitCode: result.exitCode || 0,
                  };
                } catch (error: any) {
                  return {
                    stdout: '',
                    stderr: `Error executing script "${scriptName}": ${error.message}\n`,
                    exitCode: 1,
                  };
                }
              }

              // Unsupported subcommand
              return {
                stdout: '',
                stderr: `Error: Unsupported npm command '${subcommand}'\nRun 'npm' to see available commands\n`,
                exitCode: 1,
              };
            },
          },
        ],
      });

      // Create terminal controller
      const controller = new TerminalController(term, bash, onCommandExecuted);
      controller.initialize();

      // Handle user input
      term.onData((data) => {
        controller.handleData(data);
      });

      // Store references
      xtermRef.current = term;
      bashRef.current = bash;
      controllerRef.current = controller;
      fitAddonRef.current = fitAddon;

      // Handle window resize
      const handleResize = () => {
        fitAddon.fit();
      };
      window.addEventListener('resize', handleResize);

      // Notify parent that terminal is ready
      if (onReady) {
        onReady();
      }

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        term.dispose();
      };
    }, [filesystem, onReady, onExecuteFile, onCommandExecuted, onInstallPackage]);

    function handleClear() {
      if (xtermRef.current) {
        xtermRef.current.clear();
      }
    }

    return (
      <div className="terminal-wrapper panel">
        <div className="panel-header">
          <button
            onClick={handleClear}
            className="btn-secondary text-xs px-2 py-1"
            title="Clear terminal"
          >
            Clear
          </button>
        </div>
        <div ref={terminalRef} className="terminal-container" />
      </div>
    );
  },
);

Terminal.displayName = 'Terminal';
