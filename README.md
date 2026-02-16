# Nodepack

Run a Node.js coding environment (with AI coding agent) directly in the browser without server infrastructure.

> ⚠️ NOT a fork of VS Code ⚠️

Try it out: https://nodepack.vercel.app

## Motivations

Traditionally, Node.js is meant to be run on the server. With some clever hacks (e.g. shimming of Node.js APIs, transforming CJS code, using workers to intercept requests), we managed to achieve good support for running basic Node.js apps in the browser, which unlocks many exciting new use cases, such as:

- Interactive playground for server-side JS libraries
- Running AI coding agents in the browser. **Imagine being able to try Claude Code right in your browser!**
- Conducting AI-assisted coding interviews in a cost-effective manner (no need for containers or server-side sandboxes)

Other reasons:

- **Cost**: StackBlitz's WebContainers can run Node.js in the browser, but requires licensing for commercial use, and it's pretty heavy (and for good reason)
- **Learning**: Educational project to understand JavaScript runtimes better
- **Open source**: Can be freely used and modified

## Features

- **JavaScript execution**: Powered by QuickJS WASM engine (safer than `eval()`)
- **Virtual file System**: In-memory filesystem with full CRUD operations, powered by memfs
- **Node.js modules**: Shimmed `assert`, `buffer`, `events`, `fs`, `path`, `process`, `querystring`, `timers`, `url`, and some others. They are mostly working
- **Module system**: ES modules and CommonJS interop
- **npm packages**: Download packages from npm registry
- **Bash environment & terminal**: Bash environment that provides basic commands that operates on the virtual file system, powered by [just bash](https://github.com/vercel-labs/just-bash)
- **Explorer and file tabs**: Multi-file editing as if working on a real project
- **AI coding agent**: AI coding agent that uses tools to read and modify files. You can use it to chat with your code base and fix your bugs
- **Embeddable**: Workspace can be embedded within documentation, playgrounds, etc via `<iframe>`s 

## How it works

1. **QuickJS WASM**: Lightweight JavaScript engine (~1MB) runs user code
2. **memfs**: Virtual in-memory filesystem for file operations
3. **Module injection**: Node.js modules (e.g. `fs`, `path`, `process`, etc) injected as globals during initialization
4. **Transform layer**: Converts ES module and CommonJS syntax to QuickJS-compatible code
5. **Console capture**: Intercepts console.log and sends to UI
6. **Bash**: Intercepts console.log and sends to UI

## Inspiration

- **[StackBlitz WebContainers](https://webcontainers.io)**: Commercial, full Node.js in browser
- **[CodeSandbox Nodebox](https://github.com/codesandbox/nodebox-runtime)**: Not open source, similar approach

## Acknowledgments

- **Fabrice Bellard**: Creator of QuickJS
- **quickjs-emscripten contributors**: Making QuickJS easy to use
- **StackBlitz**: Pioneering WebContainers, OG of running Node.js in the browser
- **CodeSandbox**: Open source Nodebox runtime
