/**
 * Shared plumbing for the promo renderers (promo.ts, promo-pack.ts):
 * headless Chrome/Edge over the DevTools protocol, and a tiny static server
 * for the built game (dist/games/kittydoku).
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mascotSvg, pastel, pawSvg } from '../src/render/art';
import data from '../src/game/levels.data.json';

const here = dirname(fileURLToPath(import.meta.url));
/** games/kittydoku/promo */
export const promoDir = resolve(here, '../promo');
export const distDir = resolve(here, '../../../dist/games/kittydoku');
export const fontDir = resolve(here, '../../../node_modules/@fontsource/nunito/files');
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));

export const INK = '#4a3b34';

// ---- the real levels, and a board drawn mid-solve from one of them ----

export type Level = { id: string; size: number; regions: string[]; solution: number[] };
export const LEVELS = (data as { levels: Level[] }).levels;
/** Level 14 (6x6): varied patch shapes that read well when small. */
export const SHOT_LEVEL = 13;
export const LEVEL = LEVELS[SHOT_LEVEL];
export const reg = (r: number, c: number) => Number(LEVEL.regions[r][c]);
export const rulesOut = (cats: { r: number; c: number }[], r: number, c: number) =>
  cats.some((p) => p.r === r || p.c === c || reg(p.r, p.c) === reg(r, c) ||
    (Math.abs(p.r - r) <= 1 && Math.abs(p.c - c) <= 1));

/** The board mid-solve: a few cats placed, faint paws where they rule out. */
export function boardSvg(px: number, catRows: number[]): string {
  const { size, solution } = LEVEL;
  const k = 100 / size;
  const cats = catRows.map((r) => ({ r, c: solution[r] }));
  const isCat = (r: number, c: number) => cats.some((p) => p.r === r && p.c === c);
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
    } else if (rulesOut(cats, r, c)) {
      const m = k * 0.48;
      s.push(pawSvg(p.ink, m).replace('<svg ', `<svg x="${c * k + (k - m) / 2}" y="${r * k + (k - m) / 2}" opacity=".35" `));
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2.5 -2.5 105 105" width="${px}" height="${px}">
    <defs><clipPath id="bc"><rect width="100" height="100" rx="5"/></clipPath></defs>
    <rect x="-2.5" y="-2.5" width="105" height="105" rx="7.5" fill="${INK}"/>
    <g clip-path="url(#bc)">${s.join('')}</g></svg>`;
}


/** Nunito @font-face for one weight, from the installed @fontsource files. */
export const font = (w: number) =>
  `@font-face{font-family:Nunito;font-weight:${w};src:url('${pathToFileURL(`${fontDir}/nunito-latin-${w}-normal.woff2`).href}') format('woff2')}`;

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Json = Record<string, unknown>;
export class Cdp {
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
  async viewport(width: number, height: number, deviceScaleFactor = 1, mobile = false) {
    // Mouse input stays on (no touch emulation) so scripted taps work the same.
    await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor, mobile });
  }
  async shot(file: string, format: 'jpeg' | 'webp' | 'png', w: number, h: number, quality?: number, scale = 1) {
    const r = await this.send('Page.captureScreenshot', {
      format, ...(quality !== undefined ? { quality } : {}),
      clip: { x: 0, y: 0, width: w, height: h, scale },
    });
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, Buffer.from(r.data as string, 'base64'));
    console.log('  ' + relative(promoDir, file).replace(/\\/g, '/'));
  }
  async click(x: number, y: number, count = 1) {
    for (let i = 1; i <= count; i++) {
      await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: i });
      await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: i });
    }
  }
  /** Transparent page background, for PNG pieces with alpha. */
  transparent(on: boolean) {
    return this.send('Emulation.setDefaultBackgroundColorOverride', on ? { color: { r: 0, g: 0, b: 0, a: 0 } } : {});
  }
}

export async function launch(port = 9333): Promise<{ cdp: Cdp; close: () => void }> {
  if (!CHROME) throw new Error('Chrome or Edge is needed to render the assets.');
  const profile = mkdtempSync(join(tmpdir(), 'kd-promo-'));
  const proc = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--hide-scrollbars', '--allow-file-access-from-files', '--mute-audio', '--no-first-run', 'about:blank',
  ], { stdio: 'ignore' });
  let list: { type: string; webSocketDebuggerUrl: string }[] = [];
  for (let i = 0; i < 50 && !list.some((t) => t.type === 'page'); i++) {
    await wait(200);
    try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch { /* not up yet */ }
  }
  const page = list.find((t) => t.type === 'page');
  if (!page) throw new Error('Could not connect to headless Chrome.');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  const cdp = new Cdp(ws);
  await cdp.send('Page.enable');
  return {
    cdp,
    close: () => { ws.close(); proc.kill(); setTimeout(() => rmSync(profile, { recursive: true, force: true }), 800); },
  };
}

/** Serves the built game (dist/games/kittydoku) for the screenshots. */
export function serveGame(port = 5197): Promise<{ url: string; close: () => void }> {
  if (!existsSync(join(distDir, 'index.html'))) throw new Error('Run `npm run build` first (no dist/games/kittydoku).');
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
  return new Promise((ok) => server.listen(port, '127.0.0.1', () =>
    ok({ url: `http://127.0.0.1:${port}/`, close: () => server.close() })));
}

/** Writes an HTML page to a temp file and returns its file:// URL. */
export function tempPage(dir: string, name: string, html: string): string {
  const file = join(dir, name);
  writeFileSync(file, html);
  return pathToFileURL(file).href;
}
