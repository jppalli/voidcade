/**
 * KittyDoku brand pack for Arkadium: the same set made for Hangman.
 *
 *   promo/Ark/Logo/         transparent logos, 3200 px wide
 *   promo/Ark/Decoration/   transparent pieces: every cat coat, paws, hearts,
 *                           medal, boards, buttons, the cushion, world props
 *   promo/Ark/Background/   each world's backdrop + the title backdrop,
 *                           4000x2250 and 2250x4000
 *   promo/Ark/Reference/    real-game screenshots, desktop 2048x1440 and
 *                           phone 1170x2532
 *
 * Only these four folders are cleared and rewritten. Arena_5/ and Arkadium/
 * (tools/promo.ts) and KittyDoku_Copy.txt are left alone.
 *
 *   npm run build && npm run promo:pack
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { COATS, deadCatSvg, mascotSvg, medalSvg, pawSvg, type Coat } from '../src/render/art';
import { CHAPTERS } from '../src/game/levels.spec';
import { WORLDS, worldBackground } from '../src/ui/mapScenery';
import { boardSvg, Cdp, font, INK, launch, LEVEL, LEVELS, promoDir, rulesOut, serveGame, SHOT_LEVEL, tempPage, wait } from './promo-lib';

const out = join(promoDir, 'Ark');
const LOGO = join(out, 'Logo');
const DECO = join(out, 'Decoration');
const BG = join(out, 'Background');
const REF = join(out, 'Reference');
const tmp = mkdtempSync(join(tmpdir(), 'kd-pack-'));
let n = 0;

const ROSE = '#ff9db0', ROSE_DEEP = '#e27a91', ON_ROSE = '#5a2333', CARD = '#fffdf9', LINE = '#d8c3b2';
const HEART = 'M12 20.5s-7.5-4.6-7.5-9.6a4.4 4.4 0 0 1 7.5-3.1 4.4 4.4 0 0 1 7.5 3.1c0 5-7.5 9.6-7.5 9.6Z';
const heart = (full: boolean, px: number) =>
  `<svg viewBox="0 0 24 24" width="${px}" height="${px}"><path d="${HEART}" fill="${full ? '#e7908c' : 'none'}" stroke="${full ? '#e7908c' : '#d4bfb7'}" stroke-width="1.8"/></svg>`;
/** The pink cushion the title cat sits on (index.html). */
const cushion = (w: number) => `<svg viewBox="0 0 220 70" width="${w}" height="${(w * 70) / 220}" preserveAspectRatio="none">
  <ellipse cx="110" cy="58" rx="96" ry="9" fill="rgba(122,96,80,0.12)"/>
  <path d="M14 30 Q14 12 40 12 L180 12 Q206 12 206 30 L206 38 Q206 56 180 56 L40 56 Q14 56 14 38 Z" fill="#ffc9d9"/>
  <path d="M22 26 Q24 16 44 16 L176 16 Q196 16 198 26 Q196 22 176 22 L44 22 Q24 22 22 26 Z" fill="#ffe0e8"/>
  <circle cx="110" cy="36" r="3.4" fill="#f0a3b6"/><circle cx="62" cy="36" r="2.6" fill="#f0a3b6" opacity="0.7"/><circle cx="158" cy="36" r="2.6" fill="#f0a3b6" opacity="0.7"/></svg>`;

/** A page whose #art box is the piece: transparent, padded so shadows aren't clipped. */
const page = (body: string, css = '', bg = 'transparent') => `<!doctype html><html><head><meta charset="utf-8"><style>
${font(700)}${font(800)}${font(900)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:${bg};font-family:Nunito,sans-serif;color:${INK}}
#art{display:inline-block;padding:var(--pad,24px);line-height:0}
#art svg{display:block}
.logo{position:relative;display:inline-block;font-weight:900;letter-spacing:-.03em;line-height:1;white-space:nowrap}
.logo em{font-style:normal}
.logo .lp{position:absolute;line-height:0;transform:rotate(18deg);opacity:.85}
.tag{font-weight:800;color:#8a776c;white-space:nowrap;line-height:1.2}
.btn{display:inline-block;padding:.42em 1.6em;font-weight:900;letter-spacing:.02em;border-radius:.9em;white-space:nowrap;line-height:1.3}
.sh{filter:drop-shadow(0 .06em 0 rgba(122,96,80,.17))}
${css}
</style></head><body><div id="art">${body}</div></body></html>`;

/** Render #art as a transparent PNG exactly `outW` pixels wide. */
async function piece(cdp: Cdp, html: string, outW: number, file: string) {
  await cdp.transparent(true);
  await cdp.viewport(3000, 3000, 1);
  await cdp.goto(tempPage(tmp, `p${n++}.html`, html));
  const box = await cdp.eval<{ w: number; h: number }>(
    `(() => { const r = document.getElementById('art').getBoundingClientRect(); return { w: r.width, h: r.height }; })()`);
  // Lay the piece out again at the output size (CSS zoom, device scale 1),
  // so text and curves are drawn natively instead of upscaled.
  const z = outW / box.w;
  const h = Math.round(box.h * z);
  await cdp.eval(`document.documentElement.style.zoom = '${z}'; true`);
  await cdp.viewport(outW, h, 1);
  await wait(80);
  await cdp.shot(file, 'png', outW, h);
}

// ================================================================ logo

const logoHtml = (kitty: string, doku: string, paw: string, opts: { mascot?: boolean; tag?: string } = {}) => {
  const L = 200;
  const word = `<h1 class="logo" style="font-size:${L}px;color:${kitty}">Kitty<em style="color:${doku}">Doku</em><span class="lp" style="top:${-L * 0.2}px;right:${-L * 0.36}px">${pawSvg(paw, Math.round(L * 0.37))}</span></h1>`;
  if (!opts.mascot) return page(`<div style="padding:${L * 0.3}px ${L * 0.45}px ${L * 0.12}px ${L * 0.1}px">${word}</div>`, '#art{--pad:0}');
  return page(`<div style="display:flex;flex-direction:column;align-items:center;padding:20px ${L * 0.45}px 10px">
      <div style="position:relative;width:${L * 2.2}px;height:${L * 2.05}px;line-height:0">
        <div style="position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:center">${cushion(L * 2.2)}</div>
        <div class="sh" style="position:absolute;left:${L * 0.3}px;bottom:${L * 0.45}px;font-size:${L}px">${mascotSvg(L * 1.6, COATS.lilac)}</div>
      </div>
      <div style="margin-top:${L * 0.08}px">${word}</div>
      ${opts.tag ? `<p class="tag" style="font-size:${L * 0.26}px;margin-top:${L * 0.14}px;color:${opts.tag}">A gentle cat logic puzzle</p>` : ''}
    </div>`, '#art{--pad:0}');
};

// ================================================================ decorations

const cat = (coat: Coat) => page(`<div class="sh" style="font-size:600px">${mascotSvg(600, coat)}</div>`, '#art{--pad:20px 10px 50px}');
const solo = (svg: string, pad = '20px') => page(svg, `#art{--pad:${pad}}`);
const propBox = (svg: string) => page(`<div style="width:800px;height:800px">${svg}</div>`, '#art{--pad:10px} #art > div > svg{width:100%;height:100%}');
const button = (label: string, bg: string, edge: string, color: string, border = 'transparent') =>
  page(`<span class="btn" style="font-size:120px;background:${bg};color:${color};border:.05em solid ${border};box-shadow:0 .13em 0 ${edge}">${label}</span>`, '#art{--pad:30px 30px 60px;line-height:normal}');
const board = (rows: number[]) =>
  page(`<div style="filter:drop-shadow(0 22px 0 rgba(122,96,80,.17))">${boardSvg(1600, rows)}</div>`, '#art{--pad:20px 20px 50px}');

// ================================================================ backgrounds

/** The cream title backdrop with its soft colour glows (styles.css body). */
const TITLE_BG = `radial-gradient(circle at 8% 10%,rgba(255,214,165,.8),transparent 45%),
  radial-gradient(circle at 94% 8%,rgba(215,199,255,.75),transparent 42%),
  radial-gradient(circle at 72% 110%,rgba(255,201,217,.8),transparent 50%),
  radial-gradient(circle at 0% 100%,rgba(184,235,200,.6),transparent 40%),#fff8ef`;

/** Backgrounds are laid out at half size and shot at 2x, so the world
 *  patterns come out at the same density they have in the game on a
 *  high-DPI screen. */
async function background(cdp: Cdp, css: string, file: string, w: number, h: number) {
  await cdp.transparent(false);
  const html = `<!doctype html><html><head><style>*{margin:0}html,body{width:${w / 2}px;height:${h / 2}px;overflow:hidden}
body{background:${css.replace(/"/g, "'")}}</style></head><body></body></html>`;
  await cdp.viewport(w / 2, h / 2, 2);
  await cdp.goto(tempPage(tmp, `b${n++}.html`, html));
  await wait(60);
  await cdp.shot(file, 'png', w / 2, h / 2);
}

// ================================================================ reference shots

async function references(cdp: Cdp) {
  const game = await serveGame(5199);
  await cdp.transparent(false);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const chapters = [...new Set(LEVELS.map((l) => l.id.replace(/-\d+$/, '')))];
  // A player 20 levels in, every welcome and tutorial already seen.
  const results: Record<number, { solved: boolean; clean: boolean }> = {};
  for (let i = 0; i < 20; i++) results[i] = { solved: true, clean: i % 4 !== 3 };
  const veteran = { version: 2, unlocked: 20, results, seenTips: LEVELS.map((_, i) => i), seenIntros: ['how-to-play', ...chapters] };
  // A brand-new player who has closed the first How to Play card.
  const fresh = { version: 2, unlocked: 1, results: {}, seenTips: [], seenIntros: ['how-to-play', chapters[0]] };
  const setups = [
    ['Desktop', 1024, 720, 2, false],
    ['Phone', 390, 844, 3, true],
  ] as const;
  try {
    for (const [tag, w, h, dpr, mobile] of setups) {
      const size = `${w * dpr}x${h * dpr}`;
      const save = (name: string) => cdp.shot(join(REF, `${tag}_${name}_${size}.png`), 'png', w, h);
      await cdp.viewport(w, h, dpr, mobile);
      const boot = async (progress: object) => {
        await cdp.goto(`${game.url}?platform=local`);
        await cdp.eval(`localStorage.clear(); localStorage.setItem('kittydoku-progress-v1', ${JSON.stringify(JSON.stringify(progress))}); true`);
        await cdp.goto(`${game.url}?platform=local`);
        await wait(800);
      };

      // Tutorial: level 1's cat explaining the first move.
      await boot(fresh);
      await cdp.eval(`document.getElementById('btnPlay').click(); true`);
      await wait(2600);
      await save('Tutorial');

      // Title and map.
      await boot(veteran);
      await save('Title');
      await cdp.eval(`document.getElementById('btnMap').click(); true`);
      await wait(1500);
      await save('Map');

      // Gameplay: level 14 mid-solve, then the Purrfect card.
      await cdp.eval(`document.querySelectorAll('.mapNode')[${SHOT_LEVEL}].click(); true`);
      await wait(1300);
      const label = await cdp.eval<string>(`document.getElementById('gameLevelNum').textContent`);
      if (!label.startsWith(`Level ${SHOT_LEVEL + 1} `)) throw new Error(`Opened the wrong level: ${label}`);
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
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 2, y: h - 2 });
      await wait(800);
      await save('Gameplay');
      for (let r = 0; r < LEVEL.size; r++) if (!first.includes(r)) await placeCat(r);
      await wait(4500);
      const won = await cdp.eval<boolean>(`!document.getElementById('winOverlay').classList.contains('hidden')`);
      if (!won) throw new Error('The win card did not appear.');
      await save('Solved');
    }
  } finally {
    game.close();
  }
}

// ================================================================ main

const slug = (s: string) => s.replace(/[^A-Za-z0-9]+/g, ' ').trim().split(' ').map((w) => w[0].toUpperCase() + w.slice(1)).join('_');

async function main() {
  for (const d of [LOGO, DECO, BG, REF]) rmSync(d, { recursive: true, force: true });
  const { cdp, close } = await launch(9334);
  try {
    console.log('Logo');
    await piece(cdp, logoHtml(INK, '#d9667f', '#e0687f'), 3200, join(LOGO, 'KittyDoku_Logo_3200w.png'));
    await piece(cdp, logoHtml('#fff8ef', ROSE, ROSE), 3200, join(LOGO, 'KittyDoku_Logo_Light_3200w.png'));
    await piece(cdp, logoHtml(INK, '#d9667f', '#e0687f', { mascot: true }), 3200, join(LOGO, 'KittyDoku_Logo_Mascot_3200w.png'));
    await piece(cdp, logoHtml(INK, '#d9667f', '#e0687f', { mascot: true, tag: '#8a776c' }), 3200, join(LOGO, 'KittyDoku_Logo_Mascot_Tagline_3200w.png'));

    console.log('Decoration');
    for (const coat of Object.values(COATS)) await piece(cdp, cat(coat), 1200, join(DECO, `Cat_${slug(coat.name)}.png`));
    await piece(cdp, solo(`<div style="font-size:600px">${deadCatSvg(600)}</div>`), 1200, join(DECO, 'Cat_Wrong_Spot.png'));
    await piece(cdp, solo(pawSvg('#e0687f', 600)), 800, join(DECO, 'Paw_Pink.png'));
    await piece(cdp, solo(pawSvg(INK, 600)), 800, join(DECO, 'Paw_Ink.png'));
    await piece(cdp, solo(pawSvg('#ffffff', 600)), 800, join(DECO, 'Paw_White.png'));
    await piece(cdp, solo(`<div style="display:flex;gap:60px">${['#ffd6a5', '#d7c7ff', '#b8ebc8', '#ffc9d9', '#bfe3ff', '#fff0a8'].map((c) => pawSvg(c, 300)).join('')}</div>`), 2400, join(DECO, 'Paws_Pastel_Row.png'));
    await piece(cdp, solo(heart(true, 600)), 800, join(DECO, 'Heart_Full.png'));
    await piece(cdp, solo(heart(false, 600)), 800, join(DECO, 'Heart_Empty.png'));
    await piece(cdp, solo(`<div style="display:flex;gap:40px">${[true, true, true].map((f) => heart(f, 400)).join('')}</div>`), 1800, join(DECO, 'Hearts_Three.png'));
    await piece(cdp, solo(medalSvg(600)), 800, join(DECO, 'Medal.png'));
    await piece(cdp, solo(cushion(1400), '20px'), 1600, join(DECO, 'Cushion.png'));
    await piece(cdp, board([0, 2, 3]), 1800, join(DECO, 'Board_Mid_Solve.png'));
    await piece(cdp, board([...Array(LEVEL.size).keys()]), 1800, join(DECO, 'Board_Solved.png'));
    await piece(cdp, button('Play', ROSE, ROSE_DEEP, ON_ROSE), 1600, join(DECO, 'Button_Play.png'));
    await piece(cdp, button('Adventure Map', CARD, LINE, INK, LINE), 1600, join(DECO, 'Button_Adventure_Map.png'));
    for (let i = 0; i < WORLDS.length; i++) {
      const world = slug(CHAPTERS[i]?.name ?? `World ${i + 1}`);
      for (let j = 0; j < WORLDS[i].props.length; j++)
        await piece(cdp, propBox(WORLDS[i].props[j].svg), 1200, join(DECO, 'World_Props', `${world}_${j + 1}.png`));
    }

    console.log('Background');
    for (const [name, css] of [['Title', TITLE_BG], ...WORLDS.map((w, i) => [`World_${String(i + 1).padStart(2, '0')}_${slug(CHAPTERS[i]?.name ?? '')}`, worldBackground(w)])]) {
      await background(cdp, css, join(BG, `${name}_Landscape_4000x2250.png`), 4000, 2250);
      await background(cdp, css, join(BG, `${name}_Portrait_2250x4000.png`), 2250, 4000);
    }

    console.log('Reference');
    await references(cdp);
  } finally {
    close();
    rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
