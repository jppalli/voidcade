import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './', // relative asset paths, so this game works from any subpath (e.g. /games/pipsandpaths/)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    port: 5176,
    open: false,
  },
  build: {
    // Output lands in the root site's dist/, under this game's own subfolder,
    // so `dist/` at the repo root can be deployed as the whole multi-game site.
    outDir: '../../dist/games/pipsandpaths',
    emptyOutDir: true,
    sourcemap: true,
  },
});
