/// <reference types="vite/client" />

// Add support for Vite's ?worker&url imports
declare module '*?worker&url' {
  const workerUrl: string;
  export default workerUrl;
}
