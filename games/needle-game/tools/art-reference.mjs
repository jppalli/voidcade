// Writes the game's own pictures to art/reference/ so the art team can see exactly what each slot
// looks like now (size, proportions, style) and redraw it. Run: npm run art:reference
//   art/reference/icons/*.svg, art/reference/props/*.svg   straight from the game's drawings
//   art/reference/items/*.png                               drawn by Chrome at 256 x 256 (skipped if Chrome is not found)
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { DIRS, bundle, loadSlots } from './art-lib.mjs';

const { slots } = await loadSlots();
const out = DIRS.reference;
fs.rmSync(out, { recursive: true, force: true });

// ---- icons and props: SVG text
const code = await bundle(["import './art.ts';", "import './props.ts';", "export { registeredFallbacks } from './artdom.ts';"]);
const G = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const found = G.registeredFallbacks();
let svgCount = 0;
for (const s of slots.filter(x => x.folder !== 'items')) {
  const svg = found.get(`${s.folder}/${s.id}`);
  if (!svg) { console.log(`no drawing found for ${s.folder}/${s.id}`); continue; }
  const file = svg.replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${s.w}" height="${s.h}" `);
  fs.mkdirSync(path.join(out, s.folder), { recursive: true });
  fs.writeFileSync(path.join(out, s.folder, `${s.id}.svg`), file);
  svgCount++;
}
console.log(`Wrote ${svgCount} SVG references (icons and props).`);

// ---- items: PNG drawn in Chrome
const chromePaths = [process.env.CHROME_PATH, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
const chromePath = chromePaths.find(p => fs.existsSync(p));
if (!chromePath) {
  console.log('Chrome was not found, so the item pictures were not written. Set CHROME_PATH and run it again.');
  process.exit(0);
}
const itemCode = await bundle(["import { drawItem } from './itemart.ts';", 'globalThis.drawItemArt = drawItem;'], { format: 'iife', platform: 'browser' });
const items = slots.filter(s => s.folder === 'items');
const port = 9700 + Math.floor(Math.random() * 200);
const userDir = path.join(process.env.TEMP || '/tmp', `art-ref-${port}`);
const chrome = spawn(chromePath, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${userDir}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  let list;
  for (let i = 0; i < 40; i++) { try { list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (list.length) break; } catch { /* not ready yet */ } await sleep(250); }
  const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => (ws.onopen = r));
  let n = 0; const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const run = expression => new Promise(res => { const id = ++n; pending.set(id, res); ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } })); });
  await run(itemCode);
  const size = items[0].w;
  const res = await run(`(() => { const o = {}; for (const id of ${JSON.stringify(items.map(i => i.id))}) { const c = document.createElement('canvas'); c.width = c.height = ${size}; const g = c.getContext('2d'); g.scale(${size} / 64, ${size} / 64); const x = new Proxy(g, { set(t, k, v) { if (!String(k).startsWith('shadow')) t[k] = v; return true; }, get(t, k) { const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; } }); globalThis.drawItemArt(id, x); o[id] = c.toDataURL('image/png').split(',')[1]; } return o; })()`);
  const data = res.result?.result?.value;
  if (!data) throw new Error('Chrome did not return the pictures: ' + JSON.stringify(res.result?.exceptionDetails ?? res).slice(0, 300));
  fs.mkdirSync(path.join(out, 'items'), { recursive: true });
  for (const [id, b64] of Object.entries(data)) fs.writeFileSync(path.join(out, 'items', `${id}.png`), Buffer.from(b64, 'base64'));
  console.log(`Wrote ${Object.keys(data).length} item references (PNG, ${size} x ${size}).`);
  ws.close();
} finally {
  chrome.kill();
}
process.exit(0);
