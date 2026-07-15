import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './', // relative asset paths, so this game works from any subpath (e.g. /games/stackward/)
  server: {
    port: 5173,
    open: false,
  },
  build: {
    // Output lands in the root site's dist/, under this game's own subfolder,
    // so `dist/` at the repo root can be deployed as the whole multi-game site.
    outDir: '../../dist/games/stackward',
    emptyOutDir: true,
    sourcemap: true,
  },
});
