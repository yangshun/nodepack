# Claude Instructions for Nodepack

This file contains project-specific coding standards, conventions, and architectural decisions for the Nodepack project.

## Project Overview

Nodepack is a browser-based Node.js runtime that allows running Node.js code directly in the browser using QuickJS WASM. It's designed as an educational platform for teaching Node.js programming.

## Code Style & Conventions

### File Naming

- **Use kebab-case** for all file names
  - ✅ `code-editor.tsx`, `status-bar.tsx`, `example-buttons.tsx`
  - ❌ `CodeEditor.tsx`, `StatusBar.tsx`, `ExampleButtons.tsx`

### React Components

- **Use named exports** for React components, not default exports
  - ✅ `export function Header() { ... }`
  - ❌ `export default function Header() { ... }`

- **Component file structure**:
  ```typescript
  // component-name.tsx
  interface ComponentNameProps {
    // props definition
  }

  export function ComponentName({ prop1, prop2 }: ComponentNameProps) {
    // component implementation
  }
  ```

### TypeScript

- Use TypeScript for all new code
- Define interfaces for component props
- Use type imports when importing only types: `import type { ExecutionResult } from '@nodepack/client'`
- Prefer explicit typing over implicit `any`

