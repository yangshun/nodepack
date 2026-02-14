import { tool } from 'ai';
import { z } from 'zod';
import type { Nodepack } from '@nodepack/client';
import type { TerminalHandle } from '../terminal/terminal';

export function createTools(
  nodepack: Nodepack | null,
  onFileUpdate: () => void,
  terminalRef: React.RefObject<TerminalHandle>,
) {
  return {
    readFile: tool({
      description: 'Read the content of a file from the virtual filesystem',
      inputSchema: z.object({
        path: z.string().describe('File path (e.g., "/main.js")'),
      }),
      execute: async ({ path }) => {
        if (!nodepack) throw new Error('Runtime not initialized');
        const fs = nodepack.getFilesystem();
        return fs.readFileSync(path, 'utf8');
      },
    }),

    writeFile: tool({
      description: 'Write or update a file in the virtual filesystem',
      inputSchema: z.object({
        path: z.string().describe('File path'),
        content: z.string().describe('File content'),
      }),
      execute: async ({ path, content }) => {
        if (!nodepack) throw new Error('Runtime not initialized');
        const fs = nodepack.getFilesystem();

        const dir = path.substring(0, path.lastIndexOf('/'));
        if (dir && !fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(path, content);
        onFileUpdate();
        return `File written: ${path}`;
      },
    }),

    listDirectory: tool({
      description: 'List contents of a directory',
      inputSchema: z.object({
        path: z.string().default('/').describe('Directory path'),
      }),
      execute: async ({ path }) => {
        if (!nodepack) throw new Error('Runtime not initialized');
        const fs = nodepack.getFilesystem();
        const entries = fs.readdirSync(path);
        return JSON.stringify(entries, null, 2);
      },
    }),

    executeCode: tool({
      description: 'Execute JavaScript code using the Nodepack runtime',
      inputSchema: z.object({
        filepath: z.string().describe('Path to the file to execute (e.g., "/main.js")'),
      }),
      execute: async ({ filepath }) => {
        if (!nodepack) throw new Error('Runtime not initialized');
        const fs = nodepack.getFilesystem();
        const code = fs.readFileSync(filepath, 'utf8');

        const result = await nodepack.execute(code, {
          filename: filepath,
          onLog: (msg) => {
            terminalRef.current?.writeOutput(msg);
          },
        });

        return JSON.stringify(
          {
            success: result.type === 'success',
            output: result.type === 'success' ? result.value : result.error,
            logs: result.logs,
          },
          null,
          2,
        );
      },
    }),

    installPackage: tool({
      description: 'Install an npm package',
      inputSchema: z.object({
        packageName: z
          .string()
          .optional()
          .describe('Package name (e.g., "lodash"). If not provided, installs from package.json'),
      }),
      execute: async ({ packageName }) => {
        if (!nodepack) throw new Error('Runtime not initialized');

        if (packageName) {
          await nodepack.npm.install(packageName);
          onFileUpdate();
          return `Package installed: ${packageName}`;
        } else {
          const fs = nodepack.getFilesystem();
          const pkgJson = fs.readFileSync('/package.json', 'utf8');
          await nodepack.npm.installFromPackageJson(pkgJson);
          onFileUpdate();
          return 'Packages installed from package.json';
        }
      },
    }),

    runBashCommand: tool({
      description:
        'Execute a bash command in the terminal. The command output will appear in the terminal panel.',
      inputSchema: z.object({
        command: z.string().describe('Bash command to execute'),
      }),
      execute: async ({ command }) => {
        await terminalRef.current?.executeCommand(command);
        return `Command executed: ${command}\nOutput visible in terminal panel.`;
      },
    }),
  };
}
