// Packs the built game into ONE self-contained .html file with no external
// requests at all — for publishing somewhere with a strict CSP, or just for
// handing someone a single file they can open.
//
// Vite's output references its JS, CSS and fonts as separate asset URLs, which
// a CSP that blocks external hosts (and any host that isn't serving /assets/)
// will drop silently — you get an unstyled page with no game on it. So
// everything is folded in: CSS and JS inline, fonts as base64 data URIs.
//
// Only the Latin font subsets are kept. Fontsource ships Devanagari, Cyrillic
// and Vietnamese cuts too, which together outweigh the entire rest of the game
// several times over and are never used by an English-only UI.
//
//   npm run bundle    ->  dist/colorclues.html

import { readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "..", "dist");
const assets = join(dist, "assets");
const OUT = join(dist, "colorclues.html");

const kb = (n) => (n / 1024).toFixed(1) + "kB";
const files = readdirSync(assets);
const pick = (ext) => files.find((f) => f.endsWith(ext));

let css = readFileSync(join(assets, pick(".css")), "utf8");
const js = readFileSync(join(assets, pick(".js")), "utf8");
const html = readFileSync(join(dist, "index.html"), "utf8");

/* ------------------------------------------------------------------ fonts */

// Keep the Latin cut of each family/weight; drop every other subset.
const keepSubset = (url) => /-latin-/.test(url) && !/-latin-ext-/.test(url);

let inlined = 0, droppedFaces = 0, fontBytes = 0;
css = css.replace(/@font-face\{[^}]*\}/g, (block) => {
  const urls = [...block.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1].replace(/["']/g, ""));
  const woff2 = urls.find((u) => u.endsWith(".woff2"));
  if (!woff2 || !keepSubset(woff2)) { droppedFaces++; return ""; }

  const name = woff2.split("/").pop();
  const path = join(assets, name);
  const bytes = readFileSync(path);
  fontBytes += bytes.length;
  inlined++;
  const data = `url(data:font/woff2;base64,${bytes.toString("base64")}) format("woff2")`;
  // Replace the whole src list — the woff fallback would be another dead URL.
  return block.replace(/src:[^;}]*/, `src:${data}`);
});

/* ------------------------------------------------------------------ shell */

// The <svg> sprite of icon symbols, lifted straight out of the built page.
const sprite = html.match(/<svg xmlns[\s\S]*?<\/svg>/)?.[0] ?? "";
if (!sprite) throw new Error("icon sprite not found in dist/index.html");

// A stray </script> inside a string literal would close the inline block early.
const safeJs = js.replace(/<\/script>/gi, "<\\/script>");

const page = `<title>Color Clues</title>
<style>
${css}
/* The game owns the whole viewport and commits to its own light palette, so it
   opts out of any surrounding page chrome rather than inheriting it. */
html, body { margin: 0; padding: 0; background: var(--bg); }
</style>

${sprite}

<div id="app"></div>

<script type="module">
${safeJs}
</script>
`;

writeFileSync(OUT, page);

const before = files.reduce((n, f) => n + statSync(join(assets, f)).size, 0);
console.log(`fonts inlined   ${inlined} (Latin only, ${kb(fontBytes)})`);
console.log(`font cuts dropped ${droppedFaces}`);
console.log(`css             ${kb(css.length)}`);
console.log(`js              ${kb(js.length)}`);
console.log(`\n${OUT}`);
console.log(`single file     ${kb(page.length)}   (dist/assets was ${kb(before)} across ${files.length} files)`);

// A single missed reference means a silent failure in the browser, so fail loud.
const leftover = [...page.matchAll(/(?:src|href|url\()\s*["'(]?(\/assets\/[^"')\s]+)/g)].map((m) => m[1]);
if (leftover.length) {
  console.error(`\nFAIL — ${leftover.length} unresolved asset reference(s):`);
  for (const l of [...new Set(leftover)]) console.error("  " + l);
  process.exit(1);
}
console.log("no external references — self-contained");
