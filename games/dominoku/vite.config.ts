import { defineConfig } from 'vite';
export default defineConfig({
  base: './', // relative asset paths, so this game works from any subpath (e.g. /games/dominoku/)
  server: {
    port: 5196,
    open: false,
  },
  build: {
    // Output lands in the root site's dist/, under this game's own subfolder.
    outDir: '../../dist/games/dominoku',
    emptyOutDir: true,
  },
});