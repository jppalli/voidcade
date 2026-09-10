import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5193,
    open: false,
  },
  build: {
    outDir: '../../dist/games/pampa-turbo',
    emptyOutDir: true,
  },
});
