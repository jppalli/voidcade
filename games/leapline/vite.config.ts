import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative asset paths, so this game works from any subpath (e.g. /games/leapline/)
  server: {
    port: 5191,
    open: false,
  },
  build: {
    // Output lands in the root site's dist/, under this game's own subfolder,
    // so `dist/` at the repo root can be deployed as the whole multi-game site.
    outDir: '../../dist/games/leapline',
    emptyOutDir: true,
  },
});
