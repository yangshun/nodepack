import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {
      // Map Node.js built-ins to browser polyfills
      buffer: 'buffer/',
      'node:buffer': 'buffer/',
      path: 'path-browserify',
      'node:path': 'path-browserify',
      process: 'process/browser',
      'node:process': 'process/browser',
      events: 'events/',
      'node:events': 'events/',
      stream: 'stream-browserify',
      'node:stream': 'stream-browserify',
      util: 'util/',
      'node:util': 'util/',
      // Mock node:fs since we're using memfs
      'node:fs': 'memfs',
      fs: 'memfs',
      // Map zlib to browserify-zlib for compression
      'node:zlib': 'browserify-zlib',
      zlib: 'browserify-zlib',
      // Mock node:module
      'node:module': 'module',
    },
  },
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  optimizeDeps: {
    exclude: ['@jitl/quickjs-wasmfile-release-sync', 'quickjs-emscripten'],
    include: ['monaco-editor'],
    esbuildOptions: {
      target: 'esnext',
      define: {
        global: 'globalThis',
      },
    },
  },
  cacheDir: 'node_modules/.vite',
  server: {
    port: 3000,
    open: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy: {
      '/proxy/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/anthropic/, ''),
      },
      '/proxy/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/openai/, ''),
      },
    },
    hmr: {
      overlay: true,
      protocol: 'ws',
      host: 'localhost',
    },
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: ['**/node_modules/**', '**/.git/**'],
    },
  },
});
