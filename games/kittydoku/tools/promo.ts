/**
 * Arkadium promo assets for KittyDoku.
 *
 * Art is drawn from the game's own artwork (cats, paws, patch colours and a
 * real level). Screenshots are taken from the real built game (run
 * `npm run build` first). Everything is rendered by headless Chrome/Edge over
 * the DevTools protocol, which exports JPEG / WebP / PNG at exact sizes and
 * qualities, into the folder layout Arkadium's ArtShare uses:
 *
 *   promo/Ark/Arena_5/                 1080x400, 600x277, 600x600, screenshots
 *   promo/Ark/Arkadium/Game_Tiles/     tiles, promos, background colour
 *   promo/Ark/Arkadium/PWA/            icon_*.png
 *   promo/Ark/Arkadium/LightBox/       lightboxes, Facebook, Instagram
 *
 * JP2 (Arena 5) and TinyPNG are not done here: use A3DCompressor / tinypng.
 *
 * The brand pack (logo, decorations, backgrounds, reference shots, copy)
 * is a separate tool: `npm run promo:pack` (tools/promo-pack.ts).
 *
 *   npm run build && npm run promo
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { boardSvg, Cdp, font, INK, launch, LEVEL, LEVELS, promoDir, rulesOut, serveGame, SHOT_LEVEL, wait } from './promo-lib';
import { COATS, mascotSvg, medalSvg, pawSvg, type Coat } from '../src/render/art';

const outRoot = join(promoDir, 'Ark');

/** Dark plum from the game's palette, for Arkadium's "Game background
 *  color": white text on it is about 13:1. */
const BG_COLOR = '3b2a40';

// ================================================================ art

const TINTS = ['#ffd6a5', '#d7c7ff', '#b8ebc8', '#ffc9d9', '#bfe3ff', '#fff0a8'];
type Box = [number, number, number, number];

/** Soft background paws, seeded so every run gives the same picture. */
function scatter(w: number, h: number, keep: Box[]): string {
  // Count by the free area only, so paws never pile up around the edges.
  let free = 0;
  for (let i = 0; i < 20; i++) for (let j = 0; j < 20; j++) {
    const x = ((i + 0.5) / 20) * w, y = ((j + 0.5) / 20) * h;
    if (!keep.some(([x0, y0, x1, y1]) => x > x0 && x < x1 && y > y0 && y < y1)) free++;
  }
  const n = Math.round(((w * h) * (free / 400)) / 9000) + 4;
  const min = Math.max(12, Math.min(w, h) * 0.035), max = min * 1.9;
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const out: string[] = [];
  for (let tries = 0; out.length < n && tries < n * 60; tries++) {
    const x = rnd() * w, y = rnd() * h, size = Math.round(min + rnd() * (max - min)), rot = Math.round(rnd() * 70 - 35);
    if (keep.some(([x0, y0, x1, y1]) => x > x0 && x < x1 && y > y0 && y < y1)) continue;
    out.push(`<i class="sp" style="left:${x | 0}px;top:${y | 0}px;transform:translate(-50%,-50%) rotate(${rot}deg)">${pawSvg(TINTS[out.length % TINTS.length], size)}</i>`);
  }
  return out.join('');
}

type CatSpec = [size: number, coat: Coat, x: number, y: number, rot: number];
interface Art {
  w: number; h: number;
  /** Logo size (px) and where the text block sits. */
  logo: number;
  text: { top: number; left?: number; right?: number; center?: boolean };
  tag?: number;
  pill?: number;
  /** Put the pill on its own, centred at this height, instead of under the tagline. */
  pillTop?: number;
  button?: { label: string; size: number };
  board?: { px: number; x: number; y: number; rot: number; rows?: number[] };
  cats?: CatSpec[];
  medal?: [px: number, x: number, y: number, rot: number];
  /** Areas the background paws stay out of. */
  keep?: Box[];
}

function artHtml(a: Art, zoom: number): string {
  const t = a.text;
  const textPos = `top:${t.top}px;` + (t.center ? 'left:0;right:0;text-align:center;' : `left:${t.left ?? 0}px;`) + (t.right !== undefined ? `right:${t.right}px;` : '');
  const L = a.logo;
  const body = `
    ${scatter(a.w, a.h, a.keep ?? [])}
    ${a.board ? `<div class="a sh" style="left:${a.board.x}px;top:${a.board.y}px;transform:rotate(${a.board.rot}deg)">${boardSvg(a.board.px, a.board.rows ?? [0, 2, 3])}</div>` : ''}
    ${a.medal ? `<div class="a" style="left:${a.medal[1]}px;top:${a.medal[2]}px;transform:rotate(${a.medal[3]}deg)">${medalSvg(a.medal[0])}</div>` : ''}
    ${(a.cats ?? []).map(([s, coat, x, y, rot]) => `<div class="a sh" style="left:${x}px;top:${y}px;transform:rotate(${rot}deg)">${mascotSvg(s, coat)}</div>`).join('')}
    <div class="t" style="${textPos}">
      <h1 class="logo" style="font-size:${L}px">Kitty<em>Doku</em><span class="lp" style="top:${-L * 0.2}px;right:${-L * 0.36}px">${pawSvg('#e0687f', Math.round(L * 0.37))}</span></h1>
      ${a.tag ? `<p class="tag" style="font-size:${a.tag}px;margin-top:${Math.round(a.tag * 0.5)}px">A gentle cat logic puzzle</p>` : ''}
      ${a.pill && a.pillTop === undefined ? `<span class="pill" style="font-size:${a.pill}px;padding:${a.pill * 0.5}px ${a.pill}px;margin-top:${Math.round(a.pill * 1.1)}px">${pawSvg('#5a2333', a.pill)} 100 cozy levels</span>` : ''}
      ${a.button ? `<div style="margin-top:${Math.round(a.button.size * 0.8)}px"><span class="btn" style="font-size:${a.button.size}px">${a.button.label}</span></div>` : ''}
    </div>
    ${a.pill && a.pillTop !== undefined ? `<div class="t" style="left:0;right:0;top:${a.pillTop}px;text-align:center"><span class="pill" style="font-size:${a.pill}px;padding:${a.pill * 0.5}px ${a.pill}px">${pawSvg('#5a2333', a.pill)} 100 cozy levels</span></div>` : ''}`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${font(700)}${font(800)}${font(900)}
*{margin:0;padding:0;box-sizing:border-box}
html{zoom:${zoom}}
html,body{width:${a.w}px;height:${a.h}px;overflow:hidden}
body{position:relative;font-family:Nunito,sans-serif;color:${INK};background:
  radial-gradient(circle at 8% 10%,rgba(255,214,165,.8),transparent 45%),
  radial-gradient(circle at 94% 8%,rgba(215,199,255,.75),transparent 42%),
  radial-gradient(circle at 72% 110%,rgba(255,201,217,.8),transparent 50%),
  radial-gradient(circle at 0% 100%,rgba(184,235,200,.6),transparent 40%),#fff8ef}
.sp{position:absolute;opacity:.7;line-height:0}
.a{position:absolute;line-height:0}
.t{position:absolute;line-height:normal}
.logo{position:relative;display:inline-block;font-weight:900;letter-spacing:-.03em;line-height:1;white-space:nowrap;
  text-shadow:0 .045em 0 rgba(255,255,255,.9)}
.logo em{font-style:normal;color:#d9667f}
.logo .lp{position:absolute;line-height:0;transform:rotate(18deg);opacity:.85}
.tag{font-weight:800;color:#8a776c;white-space:nowrap}
.pill{display:inline-flex;align-items:center;gap:.4em;background:#ff9db0;color:#5a2333;font-weight:900;border-radius:999px;box-shadow:0 .25em 0 #e27a91;white-space:nowrap}
.btn{display:inline-block;padding:.42em 1.6em;background:#ff9db0;color:#5a2333;font-weight:900;letter-spacing:.02em;
  border-radius:999px;box-shadow:0 .2em 0 #e27a91,0 .45em .6em rgba(122,96,80,.18);white-space:nowrap}
.sh{filter:drop-shadow(0 8px 0 rgba(122,96,80,.17))}
</style></head><body>${body}</body></html>`;
}

const C = COATS;

// ---- Layouts (design sizes; smaller/x2 exports reuse them scaled) ----

const PROMO_1080: Art = {
  w: 1080, h: 400, logo: 112, text: { left: 66, top: 86 }, tag: 30, pill: 22,
  board: { px: 286, x: 672, y: 56, rot: -4 },
  cats: [[150, C.lilac, 896, 222, 8], [104, C.ginger, 618, 276, -10]],
  medal: [54, 650, 36, -14],
  keep: [[40, 60, 640, 360], [630, 30, 1040, 390]],
};
const RECT_600x277: Art = {
  w: 600, h: 277, logo: 70, text: { left: 30, top: 66 }, tag: 19, pill: 15,
  board: { px: 186, x: 396, y: 40, rot: -5 },
  cats: [[94, C.lilac, 500, 172, 8]],
  keep: [[16, 50, 380, 240], [380, 20, 600, 270]],
};
const SQUARE_600: Art = {
  w: 600, h: 600, logo: 92, text: { center: true, top: 428 }, tag: 26,
  board: { px: 318, x: 141, y: 52, rot: -5, rows: [0, 2, 4] },
  cats: [[168, C.lilac, 386, 232, 8], [118, C.ginger, 62, 280, -12]],
  medal: [60, 110, 30, -14],
  keep: [[60, 30, 540, 570]],
};
/** Small squares (205 / 280): no tagline, the name carries it. */
const SQUARE_280: Art = {
  w: 280, h: 280, logo: 48, text: { left: 26, top: 208 },
  board: { px: 160, x: 60, y: 18, rot: -5 },
  cats: [[80, C.lilac, 184, 102, 8], [60, C.ginger, 14, 124, -12]],
  keep: [[0, 0, 280, 280]],
};
const TILE_384x216: Art = {
  w: 384, h: 216, logo: 40, text: { left: 14, top: 70 }, tag: 13,
  board: { px: 142, x: 236, y: 34, rot: -5 },
  cats: [[68, C.lilac, 322, 142, 8]],
  keep: [[8, 40, 230, 150], [210, 10, 384, 216]],
};
const TALL_280x600: Art = {
  w: 280, h: 600, logo: 56, text: { center: true, top: 46 }, tag: 16, pill: 16, pillTop: 532,
  board: { px: 214, x: 33, y: 168, rot: -5 },
  cats: [[120, C.lilac, 140, 380, 8], [92, C.ginger, 22, 412, -10]],
  medal: [46, 14, 146, -14],
  keep: [[10, 20, 270, 590]],
};
/** 760x312, safe frame 280x300 in the middle: board + name stay inside it. */
const PROMO_760x312: Art = {
  w: 760, h: 312, logo: 54, text: { center: true, top: 196 }, tag: 15,
  board: { px: 166, x: 297, y: 14, rot: -4 },
  cats: [[150, C.lilac, 566, 120, 8], [86, C.calico, 620, 18, 10], [128, C.ginger, 76, 150, -10], [84, C.black, 150, 26, -8]],
  keep: [[230, 0, 530, 312], [60, 10, 250, 300], [540, 10, 740, 300]],
};
/** 1000x312, safe frame 728x300 in the middle. */
const PROMO_1000x312: Art = {
  w: 1000, h: 312, logo: 92, text: { left: 152, top: 76 }, tag: 24, pill: 17,
  board: { px: 232, x: 626, y: 40, rot: -4 },
  cats: [[124, C.lilac, 842, 176, 8], [96, C.ginger, 24, 196, -10]],
  medal: [48, 606, 26, -14],
  keep: [[130, 50, 600, 290], [600, 20, 980, 300]],
};
const LIGHTBOX = (label: string): Art => ({
  w: 700, h: 700, logo: 104, text: { center: true, top: 402 }, button: { label, size: 34 },
  board: { px: 300, x: 196, y: 34, rot: -5 },
  cats: [[164, C.lilac, 450, 214, 8], [126, C.ginger, 90, 248, -12]],
  medal: [60, 172, 16, -14],
  keep: [[60, 10, 640, 690]],
});
/** Mobile lightbox: designed at 700x860, exported at 2x (1400x1720). */
const LIGHTBOX_MOB: Art = {
  w: 700, h: 860, logo: 112, text: { center: true, top: 64 }, tag: 28,
  board: { px: 360, x: 170, y: 262, rot: -5 },
  cats: [[176, C.lilac, 456, 494, 8], [136, C.ginger, 54, 522, -12]],
  medal: [64, 148, 238, -14],
  keep: [[40, 40, 660, 840]],
};
const FACEBOOK: Art = {
  w: 1200, h: 630, logo: 128, text: { left: 70, top: 176 }, tag: 34, pill: 26,
  board: { px: 400, x: 716, y: 92, rot: -4 },
  cats: [[200, C.lilac, 960, 336, 8], [140, C.ginger, 650, 430, -10]],
  medal: [72, 690, 70, -14],
  keep: [[40, 150, 660, 520], [640, 40, 1180, 620]],
};
const INSTAGRAM: Art = {
  w: 1080, h: 1350, logo: 168, text: { center: true, top: 96 }, tag: 44,
  board: { px: 620, x: 230, y: 410, rot: -4, rows: [0, 2, 4] },
  cats: [[290, C.lilac, 700, 820, 8], [220, C.ginger, 86, 880, -10]],
  medal: [96, 196, 372, -14],
  pill: 34, pillTop: 1186,
  keep: [[60, 60, 1020, 1300]],
};

/** App icon: four pastel patches with the board's dark lines, the mascot on top. */
function iconHtml(zoom: number): string {
  const q = ['#ffd6a5', '#d7c7ff', '#b8ebc8', '#ffc9d9'];
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0}html{zoom:${zoom}}html,body{width:512px;height:512px;overflow:hidden}
body{position:relative;background:${INK}}
.q{position:absolute;width:250px;height:250px}
.c{position:absolute;left:76px;top:80px;line-height:0;filter:drop-shadow(0 14px 0 rgba(74,59,52,.28))}
</style></head><body>
  <div class="q" style="left:0;top:0;background:${q[0]}"></div><div class="q" style="right:0;top:0;background:${q[1]}"></div>
  <div class="q" style="left:0;bottom:0;background:${q[2]}"></div><div class="q" style="right:0;bottom:0;background:${q[3]}"></div>
  <div class="c">${mascotSvg(360, C.lilac)}</div>
</body></html>`;
}

// ================================================================ export

const tmp = mkdtempSync(join(tmpdir(), 'kd-art-'));
let page = 0;

/** Render one design at an exact output size (zoomed, or 2x for "_x2"). */
async function renderArt(cdp: Cdp, html: (zoom: number) => string, designW: number, outW: number, outH: number,
  outputs: [file: string, format: 'jpeg' | 'webp' | 'png', quality?: number][]) {
  // Exact 2x exports render the design at device scale 2 (crisper than zoom).
  const x2 = outW === designW * 2;
  const cssW = x2 ? designW : outW;
  const cssH = x2 ? outH / 2 : outH;
  const file = join(tmp, `p${page++}.html`);
  writeFileSync(file, html(x2 ? 1 : outW / designW));
  await cdp.viewport(cssW, cssH, x2 ? 2 : 1);
  await cdp.goto(pathToFileURL(file).href);
  for (const [out, format, q] of outputs) await cdp.shot(out, format, cssW, cssH, q);
}

const art = (a: Art) => (z: number) => artHtml(a, z);
/** Mobile lightbox: the art plus a big button at the bottom. */
const mobLightbox = (label: string) => (z: number) =>
  artHtml(LIGHTBOX_MOB, z).replace('</body>',
    `<div class="t" style="left:0;right:0;top:724px;text-align:center"><span class="btn" style="font-size:40px">${label}</span></div></body>`);

async function main() {
  // Only this tool's folders: the brand pack (promo-pack.ts) lives alongside.
  for (const d of ['Arena_5', 'Arkadium']) rmSync(join(outRoot, d), { recursive: true, force: true });
  const { cdp, close } = await launch();
  const A5 = join(outRoot, 'Arena_5');
  const GT = join(outRoot, 'Arkadium', 'Game_Tiles');
  const PWA = join(outRoot, 'Arkadium', 'PWA');
  const LB = join(outRoot, 'Arkadium', 'LightBox');
  try {
    console.log('Arena 5');
    const a5 = (name: string, a: Art, w: number, h: number) =>
      renderArt(cdp, art(a), a.w, w, h, [[join(A5, `${name}.jpg`), 'jpeg', 70], [join(A5, `${name}.webp`), 'webp', 80]]);
    await a5('1080x400', PROMO_1080, 1080, 400);
    await a5('600x277', RECT_600x277, 600, 277);
    await a5('600x600', SQUARE_600, 600, 600);

    console.log('Game tiles');
    const gt = (name: string, a: Art, w: number, h: number) =>
      renderArt(cdp, art(a), a.w, w, h, [[join(GT, `${name}.jpg`), 'jpeg', 80], [join(GT, `${name}.webp`), 'webp', 80]]);
    await gt('205x205', SQUARE_280, 205, 205);
    await gt('280x280', SQUARE_280, 280, 280);
    await gt('280x280_x2', SQUARE_280, 560, 560);
    await gt('384x216', TILE_384x216, 384, 216);
    await gt('384x216_x2', TILE_384x216, 768, 432);
    await gt('280x600', TALL_280x600, 280, 600);
    await gt('280x600_x2', TALL_280x600, 560, 1200);
    await gt('760x312', PROMO_760x312, 760, 312);
    await gt('1000x312', PROMO_1000x312, 1000, 312);
    writeFileSync(join(GT, 'Game_background_color.txt'), `${BG_COLOR}\n`);
    console.log(`  Game_background_color.txt (${BG_COLOR})`);

    console.log('PWA');
    for (const s of [512, 192, 180, 167, 152, 120, 76])
      await renderArt(cdp, iconHtml, 512, s, s, [[join(PWA, `icon_${s}.png`), 'png']]);

    console.log('LightBox');
    await renderArt(cdp, art(LIGHTBOX('TRY NOW')), 700, 700, 700, [[join(LB, 'Lightbox_Generic_Play_TryNow.webp'), 'webp', 85]]);
    await renderArt(cdp, art(LIGHTBOX('PLAY')), 700, 700, 700, [[join(LB, 'Lightbox_Generic_Play.webp'), 'webp', 85]]);
    await renderArt(cdp, mobLightbox('TRY NOW'), 700, 1400, 1720, [[join(LB, 'Lightbox_Generic_Mob_TryNow.webp'), 'webp', 85]]);
    await renderArt(cdp, mobLightbox('PLAY'), 700, 1400, 1720, [[join(LB, 'Lightbox_Generic_Mob_Play.webp'), 'webp', 85]]);
    await renderArt(cdp, art(FACEBOOK), 1200, 1200, 630, [[join(LB, 'Mkt_Facebook_1200x630.jpg'), 'jpeg', 90]]);
    await renderArt(cdp, art(INSTAGRAM), 1080, 1080, 1350, [[join(LB, 'Mkt_Instagram_1080x1350.jpg'), 'jpeg', 90]]);

    console.log('Arena 5 screenshots');
    await screenshots(cdp, A5);
  } finally {
    close();
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** Three shots of the real game: the map, a level mid-solve, the Purrfect card. */
async function screenshots(cdp: Cdp, dir: string) {
  const game = await serveGame();
  try {
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await cdp.viewport(1024, 768, 1);
    // A player 20 levels in, with every welcome and the tutorial already seen.
    const chapters = [...new Set(LEVELS.map((l) => l.id.replace(/-\d+$/, '')))];
    const results: Record<number, { solved: boolean; clean: boolean }> = {};
    for (let i = 0; i < 20; i++) results[i] = { solved: true, clean: i % 4 !== 3 };
    const progress = { version: 2, unlocked: 20, results, seenTips: LEVELS.map((_, i) => i), seenIntros: ['how-to-play', ...chapters] };
    await cdp.goto(`${game.url}?platform=local`);
    await cdp.eval(`localStorage.clear(); localStorage.setItem('kittydoku-progress-v1', ${JSON.stringify(JSON.stringify(progress))}); true`);

    const save = async (n: number) => {
      await cdp.shot(join(dir, `1024x768_${n}.jpg`), 'jpeg', 1024, 768, 70);
      await cdp.shot(join(dir, `1024x768_${n}.webp`), 'webp', 1024, 768, 80);
      await cdp.shot(join(dir, `300x225_${n}.jpg`), 'jpeg', 1024, 768, 70, 300 / 1024);
      await cdp.shot(join(dir, `300x225_${n}.webp`), 'webp', 1024, 768, 80, 300 / 1024);
    };

    // 1. A level mid-solve: three cats and the paws they rule out.
    await cdp.goto(`${game.url}?platform=local`);
    await wait(600);
    await cdp.eval(`document.getElementById('btnMap').click(); true`);
    await wait(900);
    await cdp.eval(`document.querySelectorAll('.mapNode')[${SHOT_LEVEL}].click(); true`);
    await wait(1200);
    const label = await cdp.eval<string>(`document.getElementById('gameLevelNum').textContent`);
    if (!label.startsWith(`Level ${SHOT_LEVEL + 1} `)) throw new Error(`Opened the wrong level for screenshots: ${label}`);
    const centre = (r: number, c: number) => cdp.eval<{ x: number; y: number }>(
      `(() => { const b = document.querySelector('#board [data-r="${r}"][data-c="${c}"]').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
    const placeCat = async (r: number) => { const p = await centre(r, LEVEL.solution[r]); await cdp.click(p.x, p.y, 2); await wait(450); };
    const first = [0, 2, 4];
    for (const r of first) await placeCat(r);
    const cats = first.map((r) => ({ r, c: LEVEL.solution[r] }));
    let paws = 0;
    for (let r = 0; r < LEVEL.size && paws < 14; r++) for (let c = 0; c < LEVEL.size && paws < 14; c++) {
      if (cats.some((p) => p.r === r && p.c === c) || !rulesOut(cats, r, c) || (r + c) % 3 === 0) continue;
      const p = await centre(r, c); await cdp.click(p.x, p.y); await wait(380); paws++;
    }
    // Move the mouse off the board so no square shows a hover highlight.
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 4, y: 760 });
    await wait(800);
    await save(1);

    // 2. The Purrfect card: finish the board without a slip.
    for (let r = 0; r < LEVEL.size; r++) if (!first.includes(r)) await placeCat(r);
    await wait(4500);
    const won = await cdp.eval<boolean>(`!document.getElementById('winOverlay').classList.contains('hidden')`);
    if (!won) throw new Error('The win card did not appear for the screenshot.');
    await save(2);

    // 3. The Adventure Map.
    await cdp.eval(`document.getElementById('btnWinMap').click(); true`);
    await wait(1500);
    await save(3);
  } finally {
    game.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
