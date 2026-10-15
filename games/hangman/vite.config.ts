import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative asset paths, so this game works from any subpath (e.g. /games/hangman/)
  server: {
    port: 5194,
    open: false,
  },
  build: {
    // Lands in the root site's dist/, under this game's own subfolder.
    outDir: '../../dist/games/hangman',
    emptyOutDir: true,
  },
});
