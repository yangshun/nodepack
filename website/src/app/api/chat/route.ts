import { convertToModelMessages, streamText } from 'ai';
import type { UIMessage } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

const DEFAULT_ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const DEFAULT_OPENAI_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT =
  "You're an AI assistant used on an in-browser coding environment that runs Nodepack, an in-browser Node.js runtime that adds support for Node.js APIs in the browser. Every project has a main file named `main.js`, aim to modify it first. Strictly use JavaScript (not TypeScript) and ESM for any output code. Note that not all Node.js APIs have been implemented yet, so you may need to ask the user to install additional packages or use alternative approaches. Currently Nodepack has basic support for the `fs`, `path`, `events`, `url` module and does not support networking modules like `http`.";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    messages,
    provider,
    model,
    apiKey: userApiKey,
  }: {
    messages: UIMessage[];
    provider: 'anthropic' | 'openai';
    model: string;
    apiKey?: string | null;
  } = body;

  // Determine which API key to use: user-provided takes precedence
  let effectiveKey: string | undefined;
  if (provider === 'anthropic') {
    effectiveKey = userApiKey || DEFAULT_ANTHROPIC_KEY || undefined;
  } else {
    effectiveKey = userApiKey || DEFAULT_OPENAI_KEY || undefined;
  }

  if (!effectiveKey) {
    return new Response(
      JSON.stringify({
        error: `No API key available for ${provider}. Configure a server-side key or provide your own.`,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const modelInstance =
    provider === 'anthropic'
      ? createAnthropic({ apiKey: effectiveKey })(model)
      : createOpenAI({ apiKey: effectiveKey })(model);

  // Define tool schemas only (no execute functions).
  // Tools execute client-side since they interact with the browser runtime.
  const tools = {
    readFile: {
      description: 'Read the content of a file from the virtual filesystem',
      inputSchema: z.object({
        path: z.string().describe('File path (e.g., "/main.js")'),
      }),
    },
    writeFile: {
      description: 'Write or update a file in the virtual filesystem',
      inputSchema: z.object({
        path: z.string().describe('File path'),
        content: z.string().describe('File content'),
      }),
    },
    listDirectory: {
      description: 'List contents of a directory',
      inputSchema: z.object({
        path: z.string().default('/').describe('Directory path'),
      }),
    },
    executeCode: {
      description: 'Execute JavaScript code using the Nodepack runtime',
      inputSchema: z.object({
        filepath: z.string().describe('Path to the file to execute (e.g., "/main.js")'),
      }),
    },
    installPackage: {
      description: 'Install an npm package',
      inputSchema: z.object({
        packageName: z
          .string()
          .optional()
          .describe('Package name (e.g., "lodash"). If not provided, installs from package.json'),
      }),
    },
    runBashCommand: {
      description:
        'Execute a bash command in the terminal. The command output will appear in the terminal panel.',
      inputSchema: z.object({
        command: z.string().describe('Bash command to execute'),
      }),
    },
  };

  const result = streamText({
    model: modelInstance,
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools,
  });

  return result.toUIMessageStreamResponse();
}
