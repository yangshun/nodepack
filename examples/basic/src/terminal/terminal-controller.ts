/**
 * Terminal Controller
 *
 * Handles terminal input/output logic including:
 * - Command line editing (backspace, arrows, etc.)
 * - Command history (up/down arrows)
 * - Command execution via just-bash
 * - Prompt rendering
 */

import type { Terminal } from 'xterm';
import type { Bash } from 'just-bash';

const PROMPT = '$ ';

export class TerminalController {
  private currentLine = '';
  private cursorPosition = 0;
  private history: string[] = [];
  private historyIndex = -1;
  private tempLine = ''; // Temporarily stores current line when browsing history

  constructor(
    private terminal: Terminal,
    private bash: Bash,
    private onCommandExecuted?: () => void,
  ) {}

  /**
   * Initialize the terminal with welcome message and prompt
   */
  initialize(): void {
    this.terminal.writeln('Welcome to Nodepack Terminal');
    this.terminal.writeln('Type "help" to see available commands\r\n');
    this.writePrompt();
  }

  /**
   * Handle user input data from xterm
   */
  async handleData(data: string): Promise<void> {
    const code = data.charCodeAt(0);

    // Enter key (execute command)
    if (code === 13) {
      await this.executeCommand();
      return;
    }

    // Backspace
    if (code === 127) {
      this.handleBackspace();
      return;
    }

    // Ctrl+C (cancel current line)
    if (code === 3) {
      this.cancelLine();
      return;
    }

    // Escape sequences (arrow keys, etc.)
    if (code === 27) {
      this.handleEscapeSequence(data);
      return;
    }

    // Ctrl+L (clear screen)
    if (code === 12) {
      this.terminal.clear();
      this.writePrompt();
      this.terminal.write(this.currentLine);
      return;
    }

    // Regular character input
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      if (char && code >= 32 && code < 127) {
        this.insertChar(char);
      }
    }
  }

  /**
   * Handle escape sequences (arrow keys)
   */
  private handleEscapeSequence(data: string): void {
    // Arrow Up
    if (data === '\x1b[A') {
      this.navigateHistory(1);
      return;
    }

    // Arrow Down
    if (data === '\x1b[B') {
      this.navigateHistory(-1);
      return;
    }

    // Arrow Left
    if (data === '\x1b[D') {
      if (this.cursorPosition > 0) {
        this.cursorPosition--;
        this.terminal.write('\x1b[D');
      }
      return;
    }

    // Arrow Right
    if (data === '\x1b[C') {
      if (this.cursorPosition < this.currentLine.length) {
        this.cursorPosition++;
        this.terminal.write('\x1b[C');
      }
      return;
    }

    // Home key
    if (data === '\x1b[H' || data === '\x1b[1~') {
      while (this.cursorPosition > 0) {
        this.cursorPosition--;
        this.terminal.write('\x1b[D');
      }
      return;
    }

    // End key
    if (data === '\x1b[F' || data === '\x1b[4~') {
      while (this.cursorPosition < this.currentLine.length) {
        this.cursorPosition++;
        this.terminal.write('\x1b[C');
      }
      return;
    }
  }

  /**
   * Insert character at cursor position
   */
  private insertChar(char: string): void {
    if (this.cursorPosition === this.currentLine.length) {
      // Append to end
      this.currentLine += char;
      this.cursorPosition++;
      this.terminal.write(char);
    } else {
      // Insert in middle
      this.currentLine =
        this.currentLine.slice(0, this.cursorPosition) +
        char +
        this.currentLine.slice(this.cursorPosition);
      this.cursorPosition++;
      this.redrawLine();
    }
  }

  /**
   * Handle backspace
   */
  private handleBackspace(): void {
    if (this.cursorPosition === 0) return;

    if (this.cursorPosition === this.currentLine.length) {
      // Delete from end
      this.currentLine = this.currentLine.slice(0, -1);
      this.cursorPosition--;
      this.terminal.write('\b \b');
    } else {
      // Delete from middle
      this.currentLine =
        this.currentLine.slice(0, this.cursorPosition - 1) +
        this.currentLine.slice(this.cursorPosition);
      this.cursorPosition--;
      this.redrawLine();
    }
  }

  /**
   * Cancel current line (Ctrl+C)
   */
  private cancelLine(): void {
    this.terminal.write('^C\r\n');
    this.currentLine = '';
    this.cursorPosition = 0;
    this.writePrompt();
  }

  /**
   * Navigate command history
   */
  private navigateHistory(direction: number): void {
    if (this.history.length === 0) return;

    // Save current line when starting to browse history
    if (this.historyIndex === -1) {
      this.tempLine = this.currentLine;
    }

    // Update history index
    const newIndex = this.historyIndex + direction;
    if (newIndex < -1 || newIndex >= this.history.length) {
      return;
    }

    this.historyIndex = newIndex;

    // Get line from history (or temp line if back to current)
    const newLine =
      this.historyIndex === -1
        ? this.tempLine
        : this.history[this.history.length - 1 - this.historyIndex];

    // Clear current line and write new one
    this.clearLine();
    this.currentLine = newLine;
    this.cursorPosition = newLine.length;
    this.terminal.write(newLine);
  }

  /**
   * Execute the current command
   */
  private async executeCommand(): Promise<void> {
    const command = this.currentLine.trim();

    this.terminal.write('\r\n');

    // Add to history if non-empty
    if (command) {
      this.history.push(command);
      // Limit history size
      if (this.history.length > 100) {
        this.history.shift();
      }
    }

    // Reset state
    this.currentLine = '';
    this.cursorPosition = 0;
    this.historyIndex = -1;
    this.tempLine = '';

    // Execute command if non-empty
    if (command) {
      try {
        const result = await this.bash.exec(command);

        // Write stdout with proper line endings
        if (result.stdout) {
          const output = result.stdout.replace(/\n/g, '\r\n');
          this.terminal.write(output);
          if (!result.stdout.endsWith('\n')) {
            this.terminal.write('\r\n');
          }
        }

        // Write stderr in red with proper line endings
        if (result.stderr) {
          this.terminal.write('\x1b[31m'); // Red color
          const errorOutput = result.stderr.replace(/\n/g, '\r\n');
          this.terminal.write(errorOutput);
          this.terminal.write('\x1b[0m'); // Reset color
          if (!result.stderr.endsWith('\n')) {
            this.terminal.write('\r\n');
          }
        }

        // Show exit code if non-zero
        if (result.exitCode !== 0) {
          this.terminal.write(`\x1b[31m[Exit code: ${result.exitCode}]\x1b[0m\r\n`);
        }
      } catch (error) {
        this.terminal.write(`\x1b[31mError: ${error}\x1b[0m\r\n`);
      }

      // Notify that command was executed
      if (this.onCommandExecuted) {
        this.onCommandExecuted();
      }
    }

    this.writePrompt();
  }

  /**
   * Write prompt to terminal
   */
  private writePrompt(): void {
    this.terminal.write('\x1b[32m' + PROMPT + '\x1b[0m'); // Green prompt
  }

  /**
   * Clear the current line
   */
  private clearLine(): void {
    // Move cursor to start of input
    this.terminal.write('\r');
    this.terminal.write(PROMPT);
    // Clear to end of line
    this.terminal.write('\x1b[K');
  }

  /**
   * Redraw the current line (used when editing in the middle)
   */
  private redrawLine(): void {
    const savedCursor = this.cursorPosition;
    this.clearLine();
    this.terminal.write(this.currentLine);

    // Move cursor back to saved position
    const diff = this.currentLine.length - savedCursor;
    if (diff > 0) {
      this.terminal.write(`\x1b[${diff}D`);
    }
  }

  /**
   * Write external output to terminal (from code execution)
   */
  writeOutput(message: string): void {
    // Clear current input line
    this.clearLine();

    // Write output in blue with proper line endings
    this.terminal.write('\x1b[34m'); // Blue color
    const output = message.replace(/\n/g, '\r\n');
    this.terminal.write(output);
    this.terminal.write('\x1b[0m'); // Reset color
    if (!message.endsWith('\n')) {
      this.terminal.write('\r\n');
    }

    // Redraw prompt and current input
    this.writePrompt();
    if (this.currentLine) {
      this.terminal.write(this.currentLine);
      // Move cursor to correct position
      const diff = this.currentLine.length - this.cursorPosition;
      if (diff > 0) {
        this.terminal.write(`\x1b[${diff}D`);
      }
    }
  }
}
