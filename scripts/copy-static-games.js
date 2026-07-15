// Copies games that have NO build step (plain static HTML/CSS/JS, no
// package.json) straight into dist/games/<name>/, since npm's
// "build --workspaces" only touches games that are actual npm workspaces.
// Add a game's folder name to STATIC_GAMES below when it doesn't need Vite.
import { cpSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const STATIC_GAMES = ['panes'];

// Ensure GitHub Pages never runs Jekyll processing on the generated artifact.
writeFileSync(path.join(ROOT, 'dist', '.nojekyll'), '');

for (const name of STATIC_GAMES) {
  const src = path.join(ROOT, 'games', name);
  const dest = path.join(ROOT, 'dist', 'games', name);
  if (!existsSync(src)) {
    console.warn(`[copy-static-games] skipping "${name}" - ${src} not found`);
    continue;
  }
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
  console.log(`[copy-static-games] copied ${name} -> dist/games/${name}`);
}
