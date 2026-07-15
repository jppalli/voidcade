import { defineConfig } from 'vite';

// Root landing page only. Each game under games/<name> has its own
// independent vite.config.js and is built separately (see root package.json
// "build" script), landing in dist/games/<name>/.
export default defineConfig({
  root: '.',
  server: {
    port: 5000,
    open: false,
  },
  build: {
    outDir: 'dist',
    // Don't wipe dist/games/* that the workspace builds already placed there.
    emptyOutDir: false,
    sourcemap: true,
  },
});
