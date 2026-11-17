import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative asset paths, so the game works from any subpath
  server: { port: 5180, open: false },
  build: {
    // Lands in the root site's dist/, under this game's own subfolder.
    outDir: '../../dist/games/common-thread-solitaire',
    emptyOutDir: true,
  },
});

