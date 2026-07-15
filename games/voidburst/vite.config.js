import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: { port: 5177, open: false },
  build: {
    outDir: '../../dist/games/voidburst',
    emptyOutDir: true,
    sourcemap: true,
  },
});
