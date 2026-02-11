/**
 * Terminal Component
 *
 * Integrates xterm.js terminal emulator with just-bash shell
 * Provides interactive command-line interface for file operations
 */

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Bash } from "just-bash";
import type { IFs } from "memfs";
import { BridgedFilesystem } from "../terminal/bridged-filesystem";
import { TerminalController } from "../terminal/terminal-controller";
import { bashSecurityConfig } from "../terminal/security-config";
import "xterm/css/xterm.css";

export interface TerminalProps {
  filesystem?: IFs;
  onReady?: () => void;
}

export interface TerminalHandle {
  writeOutput: (message: string) => void;
  clear: () => void;
}

export const Terminal = forwardRef<TerminalHandle, TerminalProps>(
  ({ filesystem, onReady }, ref) => {
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
          background: "#1e1e1e",
          foreground: "#dcdcaa",
          cursor: "#ffffff",
          black: "#000000",
          red: "#cd3131",
          green: "#0dbc79",
          yellow: "#e5e510",
          blue: "#2472c8",
          magenta: "#bc3fbc",
          cyan: "#11a8cd",
          white: "#e5e5e5",
          brightBlack: "#666666",
          brightRed: "#f14c4c",
          brightGreen: "#23d18b",
          brightYellow: "#f5f543",
          brightBlue: "#3b8eea",
          brightMagenta: "#d670d6",
          brightCyan: "#29b8db",
          brightWhite: "#e5e5e5",
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
      });

      // Create terminal controller
      const controller = new TerminalController(term, bash);
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
      window.addEventListener("resize", handleResize);

      // Notify parent that terminal is ready
      if (onReady) {
        onReady();
      }

      // Cleanup
      return () => {
        window.removeEventListener("resize", handleResize);
        term.dispose();
      };
    }, [filesystem, onReady]);

    return (
      <div className="terminal-wrapper panel">
        <div className="panel-header">
          <h2>Terminal</h2>
        </div>
        <div ref={terminalRef} className="terminal-container" />
      </div>
    );
  },
);

Terminal.displayName = "Terminal";
