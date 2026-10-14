/**
 * Arkadium promo art, drawn from the game's own artwork (cats, paws, patch
 * colours and a real level), screenshotted by headless Chrome/Edge into
 * promo/*.png at the exact sizes Arkadium asks for.
 *
 *   npm run promo
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { COATS, mascotSvg, medalSvg, pastel, pawSvg, type Coat } from '../src/render/art';
import data from '../src/game/levels.data.json';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../promo');
const fontDir = resolve(here, '../../../node_modules/@fontsource/nunito/files');
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));

const INK = '#4a3b34';

type Level = { size: number; regions: string[]; solution: number[] };
/** Level 14 (6x6): varied patch shapes that read well when small. */
const LEVEL = (data as { levels: Level[] }).levels[13];

/** A board mid-solve: a few cats placed, faint paws where they rule out. */
function boardSvg(px: number, catRows: number[]): string {
  const { size, regions, solution } = LEVEL;
  const reg = (r: number, c: number) => Number(regions[r][c]);
  const k = 100 / size;
  const cats = catRows.map((r) => ({ r, c: solution[r] }));
  const isCat = (r: number, c: number) => cats.some((p) => p.r === r && p.c === c);
  const ruled = (r: number, c: number) => cats.some((p) =>
    p.r === r || p.c === c || reg(p.r, p.c) === reg(r, c) || (Math.abs(p.r - r) <= 1 && Math.abs(p.c - c) <= 1));
  const s: string[] = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++)
    s.push(`<rect x="${c * k}" y="${r * k}" width="${k + 0.1}" height="${k + 0.1}" fill="${pastel(reg(r, c)).fill}"/>`);
  for (let i = 1; i < size; i++) {
    s.push(`<line x1="${i * k}" y1="0" x2="${i * k}" y2="100" stroke="${INK}" stroke-opacity=".12" stroke-width=".4"/>`);
    s.push(`<line x1="0" y1="${i * k}" x2="100" y2="${i * k}" stroke="${INK}" stroke-opacity=".12" stroke-width=".4"/>`);
  }
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    if (c + 1 < size && reg(r, c) !== reg(r, c + 1))
      s.push(`<line x1="${(c + 1) * k}" y1="${r * k}" x2="${(c + 1) * k}" y2="${(r + 1) * k}" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>`);
    if (r + 1 < size && reg(r, c) !== reg(r + 1, c))
      s.push(`<line x1="${c * k}" y1="${(r + 1) * k}" x2="${(c + 1) * k}" y2="${(r + 1) * k}" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>`);
  }
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    const p = pastel(reg(r, c));
    if (isCat(r, c)) {
      const m = k * 0.84;
      s.push(mascotSvg(m, p.coat).replace('<svg ', `<svg x="${c * k + (k - m) / 2}" y="${r * k + (k - m) / 2}" `));
    } else if (ruled(r, c)) {
      const m = k * 0.48;
      s.push(pawSvg(p.ink, m).replace('<svg ', `<svg x="${c * k + (k - m) / 2}" y="${r * k + (k - m) / 2}" opacity=".35" `));
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2.5 -2.5 105 105" width="${px}" height="${px}">
    <defs><clipPath id="bc"><rect width="100" height="100" rx="5"/></clipPath></defs>
    <rect x="-2.5" y="-2.5" width="105" height="105" rx="7.5" fill="${INK}"/>
    <g clip-path="url(#bc)">${s.join('')}</g></svg>`;
}

const font = (w: number) =>
  `@font-face{font-family:Nunito;font-weight:${w};src:url('${pathToFileURL(`${fontDir}/nunito-latin-${w}-normal.woff2`).href}') format('woff2')}`;

const TINTS = ['#ffd6a5', '#d7c7ff', '#b8ebc8', '#ffc9d9', '#bfe3ff', '#fff0a8'];

/** Soft background paws, seeded so every run gives the same picture. */
function scatter(w: number, h: number, n: number, min: number, max: number, keepOut: (x: number, y: number) => boolean) {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const out: string[] = [];
  for (let tries = 0; out.length < n && tries < n * 40; tries++) {
    const x = rnd() * w, y = rnd() * h, size = Math.round(min + rnd() * (max - min)), rot = Math.round(rnd() * 70 - 35);
    if (keepOut(x, y)) continue;
    out.push(`<i class="sp" style="left:${x | 0}px;top:${y | 0}px;transform:translate(-50%,-50%) rotate(${rot}deg)">${pawSvg(TINTS[out.length % TINTS.length], size)}</i>`);
  }
  return out.join('');
}

function page(w: number, h: number, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${font(700)}${font(800)}${font(900)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${w}px;height:${h}px;overflow:hidden}
body{position:relative;font-family:Nunito,sans-serif;color:${INK};background:
  radial-gradient(circle at 8% 10%,rgba(255,214,165,.8),transparent 45%),
  radial-gradient(circle at 94% 8%,rgba(215,199,255,.75),transparent 42%),
  radial-gradient(circle at 72% 110%,rgba(255,201,217,.8),transparent 50%),
  radial-gradient(circle at 0% 100%,rgba(184,235,200,.6),transparent 40%),#fff8ef}
.sp{position:absolute;opacity:.7;line-height:0}
.a{position:absolute;line-height:0}
.t{position:absolute;line-height:normal}
.logo{position:relative;display:inline-block;font-weight:900;letter-spacing:-.03em;line-height:1;white-space:nowrap}
.logo em{font-style:normal;color:#d9667f}
.logo .lp{position:absolute;line-height:0;transform:rotate(18deg);opacity:.85}
.tag{font-weight:800;color:#8a776c}
.pill{display:inline-flex;align-items:center;gap:.4em;background:#ff9db0;color:#5a2333;font-weight:900;border-radius:999px;box-shadow:0 .25em 0 #e27a91;white-space:nowrap}
.sh{filter:drop-shadow(0 8px 0 rgba(122,96,80,.17))}
</style></head><body>${body}</body></html>`;
}

const logo = (px: number) =>
  `<h1 class="logo" style="font-size:${px}px">Kitty<em>Doku</em><span class="lp" style="top:${-px * 0.2}px;right:${-px * 0.36}px">${pawSvg('#e0687f', Math.round(px * 0.37))}</span></h1>`;
const cat = (size: number, coat: Coat, x: number, y: number, rot = 0) =>
  `<div class="a sh" style="left:${x}px;top:${y}px;transform:rotate(${rot}deg)">${mascotSvg(size, coat)}</div>`;
const board = (px: number, x: number, y: number, rot: number, rows = [0, 2, 4]) =>
  `<div class="a sh" style="left:${x}px;top:${y}px;transform:rotate(${rot}deg)">${boardSvg(px, rows)}</div>`;
const medal = (px: number, x: number, y: number, rot: number) =>
  `<div class="a" style="left:${x}px;top:${y}px;transform:rotate(${rot}deg)">${medalSvg(px)}</div>`;

/** 1080x400: title and pitch on the left, board and cats on the right. */
const promo = () => page(1080, 400, `
  ${scatter(1080, 400, 24, 18, 38, (x, y) => (x > 50 && x < 580 && y > 60 && y < 345) || (x > 590 && x < 1040))}
  <div class="t" style="left:78px;top:92px">
    ${logo(100)}
    <p class="tag" style="font-size:28px;margin:18px 0 28px">A gentle cat logic puzzle</p>
    <span class="pill" style="font-size:22px;padding:12px 24px">${pawSvg('#5a2333', 22)} 100 cosy levels</span>
  </div>
  ${board(292, 650, 52, -4)}
  ${cat(158, COATS.lilac, 880, 214, 8)}
  ${cat(112, COATS.ginger, 590, 262, -10)}
  ${medal(56, 622, 34, -14)}`);

/** 600x600: board with cats on top, title underneath. */
const thumb = () => page(600, 600, `
  ${scatter(600, 600, 16, 18, 34, (x, y) => x > 60 && x < 540 && y > 30 && y < 570)}
  ${board(318, 141, 52, -5)}
  ${cat(168, COATS.lilac, 386, 232, 8)}
  ${cat(118, COATS.ginger, 62, 280, -12)}
  ${medal(60, 110, 30, -14)}
  <div class="t" style="left:0;right:0;top:428px;text-align:center">
    ${logo(92)}
    <p class="tag" style="font-size:26px;margin-top:12px">A gentle cat logic puzzle</p>
  </div>`);

/** 600x270: compact banner, title left, board right. */
const secondary = () => page(600, 270, `
  ${scatter(600, 270, 12, 14, 26, (x, y) => (x > 26 && x < 370 && y > 46 && y < 236) || x > 380)}
  <div class="t" style="left:40px;top:66px">
    ${logo(64)}
    <p class="tag" style="font-size:19px;margin:12px 0 18px">A gentle cat logic puzzle</p>
    <span class="pill" style="font-size:16px;padding:8px 16px">${pawSvg('#5a2333', 16)} 100 cosy levels</span>
  </div>
  ${board(178, 394, 40, -5, [0, 2, 3])}
  ${cat(100, COATS.lilac, 486, 158, 8)}`);

/** 384x216 (16:9) small tile: board left, title right. */
const small = () => page(384, 216, `
  ${scatter(384, 216, 8, 10, 18, (x, y) => x < 380 && y > 14 && y < 206)}
  ${board(150, 18, 33, -5, [0, 2, 3])}
  ${cat(70, COATS.lilac, 124, 128, 8)}
  <div class="t" style="left:178px;right:14px;top:64px;text-align:center">
    ${logo(34)}
    <p class="tag" style="font-size:13.5px;margin:8px 0 12px">A gentle cat logic puzzle</p>
    <span class="pill" style="font-size:12px;padding:6px 12px">${pawSvg('#5a2333', 12)} 100 cosy levels</span>
  </div>`);

/** 280x600 tall tile: title on top, board in the middle, cats at the bottom. */
const tall = () => page(280, 600, `
  ${scatter(280, 600, 12, 14, 26, (x, y) => x > 10 && x < 270 && y > 20 && y < 590 && !(y > 470 && (x < 40 || x > 240)))}
  <div class="t" style="left:0;right:0;top:48px;text-align:center">
    ${logo(54)}
    <p class="tag" style="font-size:16px;margin-top:10px">A gentle cat logic puzzle</p>
  </div>
  ${board(214, 33, 168, -5, [0, 2, 3])}
  ${medal(46, 14, 146, -14)}
  ${cat(120, COATS.lilac, 140, 380, 8)}
  ${cat(92, COATS.ginger, 22, 412, -10)}
  <div class="t" style="left:0;right:0;top:532px;text-align:center">
    <span class="pill" style="font-size:16px;padding:8px 16px">${pawSvg('#5a2333', 16)} 100 cosy levels</span>
  </div>`);

const posters: [string, number, number, () => string][] = [
  ['kittydoku-tile-384x216', 384, 216, small],
  ['kittydoku-tall-280x600', 280, 600, tall],
  ['kittydoku-promo-1080x400', 1080, 400, promo],
  ['kittydoku-thumb-600x600', 600, 600, thumb],
  ['kittydoku-secondary-600x270', 600, 270, secondary],
];

if (!CHROME) throw new Error('Chrome or Edge is needed to render the PNGs.');
mkdirSync(outDir, { recursive: true });
for (const [name, w, h, make] of posters) {
  const html = resolve(outDir, `${name}.html`);
  const png = resolve(outDir, `${name}.png`);
  writeFileSync(html, make());
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--allow-file-access-from-files', '--virtual-time-budget=3000',
    `--window-size=${w},${h}`, `--screenshot=${png}`, pathToFileURL(html).href,
  ], { stdio: 'ignore' });
  console.log(`wrote promo/${name}.png`);
}
