import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: './', // relative asset paths, so this game works from any subpath (e.g. /games/wardens/)
  server: {
    port: 5177,
    open: false,
  },
  build: {
    // Output lands in the root site's dist/, under this game's own subfolder,
    // so `dist/` at the repo root can be deployed as the whole multi-game site.
    outDir: '../../dist/games/wardens',
    emptyOutDir: true,
    sourcemap: true,
  },
});
