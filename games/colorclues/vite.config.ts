import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative asset paths so the game works under /games/colorclues/
  server: {
    port: 5189,
    open: false,
  },
  build: {
    outDir: '../../dist/games/colorclues',
    emptyOutDir: true,
  },
});
