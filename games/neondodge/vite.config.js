import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 5174,
    open: false,
  },
  build: {
    outDir: '../../dist/games/neondodge',
    emptyOutDir: true,
    sourcemap: true,
  },
});
