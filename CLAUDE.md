# Claude Instructions for Nodepack

This file contains project-specific coding standards, conventions, and architectural decisions for the Nodepack project.

## Project Overview

Nodepack is a browser-based Node.js runtime that allows running Node.js code directly in the browser using QuickJS WASM.

## Code Style & Conventions

### General

- File naming: Use kebab-case for all file names
- Avoid single-character variables
- NEVER ever use emojis 
  
### Text and headings

- Use sentence case for any UI headings, labels, titles, etc.

### React

- Use named exports for all JavaScript/TypeScript files

### JavaScript

- Implement functions as function declarations

### TypeScript

- Use TypeScript for all new code
- Define interfaces for component props
- Use type imports when importing only types: `import type { ExecutionResult } from '@nodepack/client'`
- Prefer explicit typing over implicit `any`
