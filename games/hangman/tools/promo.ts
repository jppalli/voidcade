/**
 * Arkadium promo art for Hangman (see "Promo Assets Requirement List").
 *
 *   promo/Ark/Logo/         transparent PNG logo, 3200px wide (light + dark)
 *   promo/Ark/Decoration/   transparent PNGs of the game's own pieces
 *   promo/Ark/Background/   chalkboard textures, 4000px on the long side
 *   promo/Ark/Reference/    screenshots of the real game (desktop + phone)
 *
 * The art is drawn from the game's own paths (gallows, figures, doodles) and
 * fonts, rendered by headless Chrome/Edge over the DevTools protocol. The
 * screenshots come from the built game, so run `npm run build` first.
 *
 *   npm run promo
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ART } from '../src/ui/doodles';
import { FACES, FIGURE, FRAME, HAPPY, ROPE } from '../src/ui/drawing';

const here = dirname(fileURLToPath(import.meta.url));
const outRoot = resolve(here, '../promo/Ark');
const distDir = resolve(here, '../../../dist/games/hangman');
const fonts = resolve(here, '../../../node_modules/@fontsource');
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));

// The game's palette (styles.css :root).
const BOARD = '#2f4b3c';
const CHALK = '#f4f1e8';
const SOFT = 'rgba(244, 241, 232, 0.8)';
const FAINT = 'rgba(244, 241, 232, 0.32)';
const YELLOW = '#f6e27a';
const GREEN = '#a8e2b0';
const PINK = '#ffadb9';
const INK = '#23302a';
const DUST = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.07 0'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)'/%3E%3C/svg%3E")`;

/** Same chalk edge as the game (index.html #chalk). */
const CHALK_FILTER = `<svg width="0" height="0" style="position:absolute"><defs>
  <filter id="chalk" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feComponentTransfer in="n" result="grain"><feFuncA type="table" tableValues="0.55 1"/></feComponentTransfer>
    <feComposite in="d" in2="grain" operator="in"/>
  </filter></defs></svg>`;

const fontUrl = (p: string) => pathToFileURL(join(fonts, p)).href;
const page = (css: string, body: string, bg = 'transparent') => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: 'Cabin Sketch'; font-weight: 700; src: url(${fontUrl('cabin-sketch/files/cabin-sketch-latin-700-normal.woff2')}) format('woff2'); }
@font-face { font-family: 'Patrick Hand'; font-weight: 400; src: url(${fontUrl('patrick-hand/files/patrick-hand-latin-400-normal.woff2')}) format('woff2'); }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { background: ${bg}; }
body { font-family: 'Patrick Hand', sans-serif; color: ${CHALK}; }
/* Transparent pieces: the art sits in a padded box that is the screenshot. */
#art { display: inline-block; padding: var(--pad, 40px); }
${css}
</style></head><body>${CHALK_FILTER}${body}</body></html>`;

// ================================================================ chrome

type Json = Record<string, unknown>;
class Cdp {
  private id = 0;
  private pending = new Map<number, (v: Json) => void>();
  private waiters: [string, () => void][] = [];
  constructor(private ws: WebSocket) {
    ws.onmessage = (ev) => {
      const m = JSON.parse(String(ev.data));
      if (m.id && this.pending.has(m.id)) {
        if (m.error) console.error('CDP error', m.error);
        this.pending.get(m.id)!(m.result ?? {});
        this.pending.delete(m.id);
      } else if (m.method) {
        this.waiters = this.waiters.filter(([name, fn]) => (name === m.method ? (fn(), false) : true));
      }
    };
  }
  send(method: string, params: Json = {}): Promise<Json> {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((res) => this.pending.set(id, res));
  }
  once(method: string): Promise<void> {
    return new Promise((res) => this.waiters.push([method, res]));
  }
  async goto(url: string) {
    const loaded = this.once('Page.loadEventFired');
    await this.send('Page.navigate', { url });
    await loaded;
    await this.eval('document.fonts.ready.then(() => true)');
  }
  async eval<T = unknown>(expression: string): Promise<T> {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    return (r.result as { value: T }).value;
  }
  viewport(width: number, height: number, deviceScaleFactor = 1, mobile = false) {
    return this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor, mobile });
  }
  transparent(on: boolean) {
    return on
      ? this.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
      : this.send('Emulation.setDefaultBackgroundColorOverride', {});
  }
  async shot(file: string, w: number, h: number) {
    const r = await this.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, Buffer.from(r.data as string, 'base64'));
    console.log('  ' + file.slice(outRoot.length + 1).replace(/\\/g, '/'));
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function launch(): Promise<{ cdp: Cdp; close: () => void }> {
  if (!CHROME) throw new Error('Chrome or Edge is needed to render the assets.');
  const port = 9335;
  const profile = mkdtempSync(join(tmpdir(), 'hm-promo-'));
  const proc = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--hide-scrollbars', '--allow-file-access-from-files', '--mute-audio', '--no-first-run', 'about:blank',
  ], { stdio: 'ignore' });
  let list: { type: string; webSocketDebuggerUrl: string }[] = [];
  for (let i = 0; i < 50 && !list.some((t) => t.type === 'page'); i++) {
    await wait(200);
    try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch { /* not up yet */ }
  }
  const target = list.find((t) => t.type === 'page');
  if (!target) throw new Error('Could not connect to headless Chrome.');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  const cdp = new Cdp(ws);
  await cdp.send('Page.enable');
  return {
    cdp,
    close: () => { ws.close(); proc.kill(); setTimeout(() => rmSync(profile, { recursive: true, force: true }), 800); },
  };
}

/** Serves the built game for the reference screenshots. */
function serveGame(): Promise<{ url: string; close: () => void }> {
  if (!existsSync(join(distDir, 'index.html'))) throw new Error('Run `npm run build` first (no dist/games/hangman).');
  const types: Record<string, string> = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff',
  };
  const server = createServer((req, res) => {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const file = join(distDir, path === '/' ? 'index.html' : path);
    if (!file.startsWith(distDir) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((ok) => server.listen(5196, '127.0.0.1', () =>
    ok({ url: 'http://127.0.0.1:5196/', close: () => server.close() })));
}

const tmp = mkdtempSync(join(tmpdir(), 'hm-art-'));
let pageNo = 0;

/** Render `#art` on a transparent page so the PNG is `width` pixels wide. */
async function piece(cdp: Cdp, html: string, width: number, file: string) {
  const f = join(tmp, `p${pageNo++}.html`);
  writeFileSync(f, html);
  await cdp.transparent(true);
  await cdp.viewport(3000, 2000, 1);
  await cdp.goto(pathToFileURL(f).href);
  const box = await cdp.eval<{ w: number; h: number }>(
    `(() => { const r = document.getElementById('art').getBoundingClientRect(); return { w: Math.ceil(r.width), h: Math.ceil(r.height) }; })()`);
  const dpr = width / box.w;
  await cdp.viewport(box.w, box.h, dpr);
  await wait(150);
  await cdp.shot(file, box.w, box.h);
}

/** Render a full-bleed page (background textures) at an exact size. */
async function flat(cdp: Cdp, html: string, w: number, h: number, file: string) {
  const f = join(tmp, `p${pageNo++}.html`);
  writeFileSync(f, html);
  await cdp.transparent(false);
  await cdp.viewport(w, h, 1);
  await cdp.goto(pathToFileURL(f).href);
  await wait(300);
  await cdp.shot(file, w, h);
}

// ================================================================ pieces

const P = (d: string, stroke: string, width = 5) =>
  `<path d="${d}" stroke="${stroke}" stroke-width="${width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

/** The gallows with the first `parts` figure lines and a face. */
function gallows(parts: number, face: string | null, cssW = 900) {
  const figure = FIGURE.slice(0, parts).map((d) => P(d, CHALK)).join('');
  const f = face ? `<path d="${FACES[face]}" stroke="${CHALK}" stroke-width="3" fill="none" stroke-linecap="round"/>` : '';
  return page('', `<div id="art"><svg viewBox="8 8 168 208" width="${cssW}" height="${Math.round(cssW * 208 / 168)}" style="display:block">
    <g filter="url(#chalk)">${FRAME.map((d) => P(d, SOFT)).join('')}${P(ROPE, CHALK)}${figure}${f}</g></svg></div>`);
}

/** The free stick figure (yellow, arms up, smiling with eyes). */
function happyFigure(cssW = 600) {
  const eyes = HAPPY[HAPPY.length - 1];
  const body = HAPPY.slice(0, -1).map((d) => P(d, YELLOW)).join('');
  return page('', `<div id="art"><svg viewBox="140 84 56 128" width="${cssW}" height="${Math.round(cssW * 128 / 56)}" style="display:block">
    <g filter="url(#chalk)">${body}${P(eyes, YELLOW, 6.5)}</g></svg></div>`);
}

/** The word on the board: tiles with chalk underlines, some letters found. */
function tiles(word: string, shown: string, tile = 120) {
  const t = [...word].map((ch) => `<span class="tile${shown.includes(ch) ? '' : ' blank'}"><span>${shown.includes(ch) ? ch : ''}</span></span>`).join('');
  return page(`
.phrase { display: flex; gap: ${tile * 0.14}px; }
.tile { width: ${tile}px; height: ${tile * 1.25}px; display: flex; align-items: flex-end; justify-content: center;
  font-size: ${tile * 0.95}px; line-height: 1; border-bottom: ${tile * 0.075}px solid ${SOFT}; padding-bottom: ${tile * 0.075}px; }
`, `<div id="art"><div class="phrase">${t}</div></div>`);
}

const KEY_CSS = (k: number) => `
.key { width: ${k}px; height: ${k * 1.12}px; display: inline-flex; align-items: center; justify-content: center; position: relative;
  font-size: ${k * 0.56}px; line-height: 1; color: ${CHALK}; background: rgba(244, 241, 232, 0.05);
  border: ${k * 0.045}px solid ${SOFT}; border-radius: ${k * 0.18}px ${k * 0.22}px ${k * 0.16}px ${k * 0.2}px / ${k * 0.2}px ${k * 0.16}px ${k * 0.22}px ${k * 0.18}px; }
.key.hit { background: rgba(168, 226, 176, 0.2); border-color: ${GREEN}; color: ${GREEN}; }
.key.miss { border-color: ${FAINT}; color: ${FAINT}; }
.key.miss::after { content: ''; position: absolute; left: 18%; right: 18%; top: 50%; height: ${k * 0.05}px;
  background: ${PINK}; transform: rotate(-24deg); border-radius: 2px; opacity: 0.85; }
.kRow { display: flex; justify-content: center; gap: ${k * 0.12}px; }
.kb { display: flex; flex-direction: column; gap: ${k * 0.14}px; }
`;
const keyEl = (ch: string, state = '') => `<span class="key ${state}">${ch}</span>`;
const oneKey = (ch: string, state = '') => page(KEY_CSS(200), `<div id="art" style="--pad:24px">${keyEl(ch, state)}</div>`);
function keyboard() {
  const hit = 'EAT', miss = 'ZQS';
  const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map((r) =>
    `<div class="kRow">${[...r].map((ch) => keyEl(ch, hit.includes(ch) ? 'hit' : miss.includes(ch) ? 'miss' : '')).join('')}</div>`).join('');
  return page(KEY_CSS(120), `<div id="art"><div class="kb">${rows}</div></div>`);
}

const STAR = 'M12 2.5l3.09 6.26 6.91 1-5 4.87 1.18 6.87L12 18.27 5.82 21.5 7 14.63l-5-4.87 6.91-1z';
const star = (fill: string) => `<svg viewBox="1 1.5 22 21" width="600" height="573" style="display:block"><g filter="url(#chalk)"><path d="${STAR}" fill="${fill}"/></g></svg>`;
const oneStar = (fill: string) => page('', `<div id="art">${star(fill)}</div>`);
const threeStars = () => page('#art > div { display: flex; gap: 40px; }', `<div id="art"><div>${star(YELLOW)}${star(YELLOW)}${star(YELLOW)}</div></div>`);

/** Six chalk tally marks (misses still to spare). */
function tallies() {
  const marks = Array.from({ length: 6 }, () => `<i></i>`).join('');
  return page(`#art > div { display: flex; gap: 36px; align-items: center; }
#art i { width: 30px; height: 140px; border-radius: 15px; background: ${CHALK}; transform: rotate(6deg); }`,
  `<div id="art" style="--pad:40px 50px"><div>${marks}</div></div>`);
}

/** In-game buttons: yellow Play, and the Hint button with its badge. */
function buttons(kind: 'play' | 'hint') {
  const css = `
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 24px; font-size: 120px; line-height: 1.1;
  border-radius: 56px 72px 52px 68px / 68px 52px 72px 56px; position: relative; }
.play { min-width: 900px; min-height: 250px; padding: 30px 80px; background: ${YELLOW}; color: ${INK}; border: 10px solid ${YELLOW}; }
.hint { padding: 26px 64px; border: 10px solid ${YELLOW}; color: ${YELLOW}; background: rgba(244, 241, 232, 0.06); }
.hint svg { width: 110px; height: 110px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.badge { position: absolute; top: -40px; right: -40px; width: 100px; height: 100px; border-radius: 50%; display: grid; place-items: center;
  background: ${YELLOW}; color: ${INK}; font-size: 64px; }`;
  const bulb = `<svg viewBox="0 0 24 24"><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.4.3.7.8.7 1.3V16h5.6v-.8c0-.5.3-1 .7-1.3A6 6 0 0 0 12 3Z"/></svg>`;
  const el = kind === 'play'
    ? `<span class="btn play">Play</span>`
    : `<span class="btn hint">${bulb}Hint<b class="badge">3</b></span>`;
  return page(css, `<div id="art" style="--pad:60px">${el}</div>`);
}

/** The felt board eraser that wipes between words. */
function eraser() {
  return page(`
.eraser { width: 1400px; height: 380px; display: flex; flex-direction: column; border-radius: 48px; overflow: hidden; transform: rotate(-4deg); }
.top { flex: 1 1 58%; background: linear-gradient(180deg, #b07b4f, #d39b67 45%, #a8724a); }
.felt { flex: 1 1 42%; border-top: 8px solid rgba(0, 0, 0, 0.25);
  background: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.10) 0 8px, transparent 8px 20px), linear-gradient(180deg, #5d5d63, #7a7a80); }`,
  `<div id="art" style="--pad:80px"><div class="eraser"><div class="top"></div><div class="felt"></div></div></div>`);
}

/** Three sticks of chalk: white, yellow and pink, like the game's colors. */
function chalkSticks() {
  const stick = (c: string, rot: number, dx: number) =>
    `<div class="stick" style="--c:${c}; transform: translateX(${dx}px) rotate(${rot}deg)"></div>`;
  return page(`
#art > div { position: relative; width: 1500px; height: 520px; }
.stick { position: absolute; left: 200px; width: 1000px; height: 150px; border-radius: 70px 40px 40px 70px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--c) 100%, white 30%), var(--c) 55%, color-mix(in srgb, var(--c) 80%, black 18%));
  filter: url(#chalk); }
.stick:nth-child(1) { top: 20px; } .stick:nth-child(2) { top: 190px; } .stick:nth-child(3) { top: 360px; }`,
  `<div id="art"><div>${stick(CHALK, -6, -60)}${stick(YELLOW, 3, 60)}${stick(PINK, -2, 0)}</div></div>`);
}

/** One chalk doodle from the board edges (apple, A+, book...). */
const doodle = (name: string) =>
  page(`#art svg { width: 1000px; height: 1000px; display: block; color: ${CHALK}; overflow: visible; }`,
    `<div id="art">${ART[name]}</div>`);

/** The name in the title's chalk lettering with its yellow underline. */
function logo(color: string, line: string, glow: boolean) {
  return page(`
.logo { position: relative; font-family: 'Cabin Sketch', sans-serif; font-weight: 700; font-size: 420px; line-height: 0.95;
  letter-spacing: 4px; color: ${color}; padding-bottom: 0.18em; white-space: nowrap;
  ${glow ? 'text-shadow: 0 0 24px rgba(244, 241, 232, 0.25);' : ''} }
.line { position: absolute; left: 2%; bottom: 0; width: 96%; height: 0.16em; overflow: visible; }
.line path { fill: none; stroke: ${line}; stroke-width: 18; stroke-linecap: round; vector-effect: non-scaling-stroke; }`,
  `<div id="art" style="--pad:60px 80px"><div class="logo">Hangman<svg class="line" viewBox="0 0 300 16" preserveAspectRatio="none"><path d="M6 10 C 70 4, 150 13, 294 6" filter="url(#chalk)"/></svg></div></div>`);
}

// ================================================================ background

/** Slate-green chalkboard with eraser smudges; `doodles` adds faint sketches
 *  around the edges (kept clear of the middle, where the logo goes). */
function board(w: number, h: number, doodles: boolean) {
  const landscape = w > h;
  // Broad, soft eraser swipes.
  const swipes = Array.from({ length: 7 }, (_, i) => {
    const y = (h * (i + 0.6)) / 7;
    const amp = h * 0.06 * (i % 2 ? 1 : -1);
    return `<path d="M${-w * 0.05} ${y} C ${w * 0.25} ${y + amp}, ${w * 0.6} ${y - amp}, ${w * 1.05} ${y + amp * 0.5}"
      stroke="rgba(255,255,255,${0.018 + (i % 3) * 0.008})" stroke-width="${Math.round(h * 0.09)}" fill="none" stroke-linecap="round"/>`;
  }).join('');
  const names = ['apple', 'aplus', 'book', 'star', 'pencil', 'abc', 'bulb', 'kite', 'atom', 'sum', 'clock', 'question'];
  // Slots around the edge, as fractions of the board.
  const slots = landscape
    ? [[0.06, 0.1], [0.2, 0.07], [0.78, 0.08], [0.91, 0.14], [0.05, 0.42], [0.92, 0.46], [0.07, 0.76], [0.2, 0.86], [0.8, 0.85], [0.93, 0.74], [0.36, 0.9], [0.62, 0.92]]
    : [[0.08, 0.05], [0.8, 0.06], [0.1, 0.24], [0.84, 0.26], [0.06, 0.46], [0.86, 0.5], [0.1, 0.7], [0.82, 0.72], [0.14, 0.9], [0.5, 0.94], [0.8, 0.9], [0.45, 0.03]];
  const size = Math.round(Math.min(w, h) * 0.13);
  const sketches = doodles ? slots.map(([x, y], i) =>
    `<div class="dd" style="left:${x * 100}%; top:${y * 100}%; rotate:${(i % 2 ? 1 : -1) * (4 + (i % 4) * 2)}deg">${ART[names[i % names.length]]}</div>`).join('') : '';
  return page(`
html, body { width: ${w}px; height: ${h}px; overflow: hidden; }
body { position: relative;
  background:
    ${DUST},
    radial-gradient(ellipse at 20% 15%, rgba(255, 255, 255, 0.07), transparent 45%),
    radial-gradient(ellipse at 85% 80%, rgba(255, 255, 255, 0.05), transparent 50%),
    radial-gradient(ellipse at 60% 40%, rgba(255, 255, 255, 0.03), transparent 60%),
    radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0, 0, 0, 0.18)),
    ${BOARD};
  background-size: 440px 440px, auto, auto, auto, auto, auto; }
.swipes { position: absolute; inset: 0; filter: blur(${Math.round(h * 0.02)}px); }
.dd { position: absolute; width: ${size}px; height: ${size}px; translate: -50% -50%; color: ${CHALK}; opacity: 0.13; }
.dd svg { width: 100%; height: 100%; overflow: visible; }`,
  `<svg class="swipes" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${swipes}</svg>${sketches}`, BOARD);
}

// ================================================================ screenshots

async function reference(cdp: Cdp) {
  const game = await serveGame();
  const out = join(outRoot, 'Reference');
  const progress = { version: 1, unlocked: 12, stars: Object.fromEntries([...Array(12).keys()].map((i) => [i, i % 4 === 3 ? 2 : 3])), seenHowTo: true };
  await cdp.transparent(false);
  const setups: [tag: string, w: number, h: number, dpr: number, mobile: boolean, layout: string][] = [
    ['Desktop', 1024, 720, 2, false, 'stage'],
    ['Phone', 390, 844, 3, true, 'fluid'],
  ];
  for (const [tag, w, h, dpr, mobile, layout] of setups) {
    await cdp.viewport(w, h, dpr, mobile);
    const url = `${game.url}?platform=local&layout=${layout}`;
    await cdp.goto(url);
    await cdp.eval(`localStorage.clear(); localStorage.setItem('hangman-progress', ${JSON.stringify(JSON.stringify(progress))}); localStorage.setItem('hangman-endless', '3480'); true`);
    await cdp.goto(url);
    await wait(3200); // title intro
    const px = `${w * dpr}x${h * dpr}`;
    await cdp.shot(join(out, `${tag}_Title_${px}.png`), w, h);

    await cdp.eval(`document.getElementById('btnLevels').click()`);
    await wait(2000);
    await cdp.shot(join(out, `${tag}_Levels_${px}.png`), w, h);
    await cdp.eval(`document.querySelector('[data-nav=title]').click()`);
    await wait(1600);

    // Level 13: a few right and wrong guesses, then the solve.
    await cdp.eval(`document.getElementById('btnPlay').click()`);
    await wait(2400);
    const letters = await cdp.eval<string>(`[...new Set([...document.querySelectorAll('#phrase .tile')].map((t) => t.dataset.ch).filter(Boolean))].join('')`);
    const order = 'EARIOTNSLCUDPMHGBFYWKVXZJQ';
    const right = [...order].filter((c) => letters.includes(c));
    const wrong = [...'ZQXJKVWYBF'].filter((c) => !letters.includes(c)).slice(0, 3);
    const half = Math.max(1, Math.ceil(right.length * 0.5));
    const press = async (c: string) => { await cdp.eval(`document.querySelector('.key[data-k="${c}"]')?.click()`); await wait(420); };
    for (const c of [right[0], wrong[0], right[1], wrong[1], ...right.slice(2, half), wrong[2]].filter(Boolean)) await press(c);
    await wait(1200);
    await cdp.shot(join(out, `${tag}_Gameplay_${px}.png`), w, h);
    // After the free figure draws in (~1.1s), before the eraser wipe (1.4s).
    for (const c of right.slice(half)) await press(c);
    await wait(1150 - 420);
    await cdp.shot(join(out, `${tag}_Solved_${px}.png`), w, h);
  }
  game.close();
}

// ================================================================ main

async function main() {
  rmSync(outRoot, { recursive: true, force: true });
  const { cdp, close } = await launch();
  try {
    console.log('Logo');
    await piece(cdp, logo(CHALK, YELLOW, true), 3200, join(outRoot, 'Logo', 'Hangman_Logo_Chalk_3200w.png'));
    await piece(cdp, logo('#26362e', '#d4a91c', false), 3200, join(outRoot, 'Logo', 'Hangman_Logo_Dark_3200w.png'));

    console.log('Decoration');
    const D = (n: string) => join(outRoot, 'Decoration', n);
    await piece(cdp, gallows(0, null), 2400, D('Gallows_Empty.png'));
    await piece(cdp, gallows(4, 'worried'), 2400, D('Gallows_Worried.png'));
    await piece(cdp, gallows(6, 'sweaty'), 2400, D('Gallows_Full.png'));
    await piece(cdp, happyFigure(), 1400, D('Figure_Free_Happy.png'));
    await piece(cdp, tiles('HANGMAN', 'HNGM'), 3000, D('Word_Tiles_HANGMAN.png'));
    await piece(cdp, tiles('HANGMAN', 'HANGMAN'), 3000, D('Word_Tiles_HANGMAN_Solved.png'));
    await piece(cdp, keyboard(), 3000, D('Keyboard.png'));
    await piece(cdp, oneKey('A'), 800, D('Key_A.png'));
    await piece(cdp, oneKey('E', 'hit'), 800, D('Key_E_Found.png'));
    await piece(cdp, oneKey('Z', 'miss'), 800, D('Key_Z_Missed.png'));
    await piece(cdp, oneStar(YELLOW), 1200, D('Star_Yellow.png'));
    await piece(cdp, oneStar(FAINT), 1200, D('Star_Empty.png'));
    await piece(cdp, threeStars(), 3000, D('Stars_Three.png'));
    await piece(cdp, tallies(), 1600, D('Tally_Marks.png'));
    await piece(cdp, buttons('play'), 2000, D('Button_Play.png'));
    await piece(cdp, buttons('hint'), 1600, D('Button_Hint.png'));
    await piece(cdp, eraser(), 2400, D('Board_Eraser.png'));
    await piece(cdp, chalkSticks(), 2400, D('Chalk_Sticks.png'));
    for (const name of Object.keys(ART)) {
      const file = name.replace(/(^|_)(\w)/g, (_, a: string, b: string) => a + b.toUpperCase());
      await piece(cdp, doodle(name), 1200, D(`Doodle_${file[0].toUpperCase()}${file.slice(1)}.png`));
    }

    console.log('Background');
    const B = (n: string) => join(outRoot, 'Background', n);
    await flat(cdp, board(4000, 2250, false), 4000, 2250, B('Chalkboard_Landscape_4000x2250.png'));
    await flat(cdp, board(2250, 4000, false), 2250, 4000, B('Chalkboard_Portrait_2250x4000.png'));
    await flat(cdp, board(4000, 2250, true), 4000, 2250, B('Chalkboard_Doodles_Landscape_4000x2250.png'));
    await flat(cdp, board(2250, 4000, true), 2250, 4000, B('Chalkboard_Doodles_Portrait_2250x4000.png'));

    console.log('Reference');
    await reference(cdp);
  } finally {
    close();
    rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
