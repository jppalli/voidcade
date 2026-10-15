// Temporary layout check across embed sizes: flags overlaps and anything off-screen.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';

const dist = resolve('../../dist/games/hangman');
mkdirSync('_shots', { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]); const f = join(dist, p === '/' ? 'index.html' : p);
  if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[extname(f)] ?? 'application/octet-stream' }); res.end(readFileSync(f));
}).listen(5198);
const proc = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=9334', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'hm-'))}`, '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let list = [];
for (let i = 0; i < 50 && !list.some((t) => t.type === 'page'); i++) { await wait(200); try { list = await (await fetch('http://127.0.0.1:9334/json/list')).json(); } catch {} }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); const waiters = [];
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id) { pend.get(m.id)?.(m.result ?? m); pend.delete(m.id); } else { if (m.method === 'Runtime.exceptionThrown') console.log('EXC', JSON.stringify(m.params.exceptionDetails).slice(0, 300)); for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i][0] === m.method) { waiters[i][1](m); waiters.splice(i, 1); } } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const once = (m) => new Promise((r) => waiters.push([m, r]));
const ev = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value;
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join('_shots', name + '.png'), Buffer.from(r.data, 'base64')); };
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });

// Pairs of game parts that must not overlap, and must sit inside the frame.
const CHECK = `(() => {
  const q = (s) => document.querySelector(s);
  const parts = { bar: q('#screen-game .topBar'), draw: q('svg.drawing'), category: q('.category'), phrase: q('#phrase'), status: q('.statusRow'), coach: q('#coachLine'), keys: q('#keyboard') };
  const R = {}; for (const [k, el] of Object.entries(parts)) if (el && el.offsetParent !== null) R[k] = el.getBoundingClientRect();
  const out = [];
  const ks = Object.keys(R);
  for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
    const a = R[ks[i]], b = R[ks[j]];
    const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (ox > 2 && oy > 2) out.push(ks[i] + '/' + ks[j] + ' overlap ' + Math.round(ox) + 'x' + Math.round(oy));
  }
  for (const k of ks) { const r = R[k]; if (r.top < -1 || r.left < -1 || r.bottom > innerHeight + 1 || r.right > innerWidth + 1) out.push(k + ' off-screen'); }
  if (R.draw && R.draw.height < 70) out.push('drawing too small (' + Math.round(R.draw.height) + 'px)');
  const key = q('.key').getBoundingClientRect();
  return { problems: out, key: Math.round(key.width) + 'x' + Math.round(key.height), draw: R.draw ? Math.round(R.draw.height) : 0, tile: getComputedStyle(q('#phrase')).getPropertyValue('--tile') };
})()`;
const TITLE = `(() => { const s = document.querySelector('.titleStage').getBoundingClientRect(); return (s.top >= -1 && s.bottom <= innerHeight + 1) ? 'ok' : 'title cut off ' + Math.round(s.top) + '..' + Math.round(s.bottom); })()`;
const MODAL = `(() => { const m = document.querySelector('#loseOverlay .modal').getBoundingClientRect(); return (m.top >= 0 && m.bottom <= innerHeight) ? 'ok' : 'card cut off'; })()`;

const sizes = [[706, 525, 'sandbox'], [640, 480], [800, 600], [900, 500], [1200, 480], [1024, 640], [1280, 720], [768, 1024], [420, 820], [375, 560], [360, 640]];
let bad = 0;
for (const [w, h, name] of sizes) {
  const tag = name ?? `${w}x${h}`;
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  let l = once('Page.loadEventFired'); await send('Page.navigate', { url: 'http://127.0.0.1:5198/?platform=local' }); await l;
  await ev(`localStorage.setItem('hangman-progress', JSON.stringify({version:1,unlocked:58,stars:{},seenHowTo:true})); true`);
  l = once('Page.loadEventFired'); await send('Page.reload'); await l; await wait(900);
  const title = await ev(TITLE);
  if (tag === 'sandbox') await shot(`${tag}-title`);
  // Level 1 (short word + the first-time tip) and level 58 (long proverb).
  const results = [];
  for (const lvl of [0, 57]) {
    await ev(`document.getElementById('btnLevels').click(); true`); await wait(500);
    await ev(`document.querySelectorAll('.levelBtn')[${lvl}].click(); true`); await wait(800);
    if (lvl === 0) await ev(`localStorage.removeItem('x'); true`);
    for (const k of 'EAO') { await ev(`document.querySelector('.key[data-k="${k}"]:not(:disabled)')?.click(); true`); await wait(80); }
    await wait(300);
    const r = await ev(CHECK);
    results.push(r);
    if (tag === 'sandbox') await shot(`${tag}-level${lvl + 1}`);
    await ev(`document.getElementById('btnGameBack').click(); true`); await wait(400);
    await ev(`document.querySelector('[data-nav="title"]').click(); true`); await wait(400);
  }
  // A lose card at this size.
  await ev(`document.getElementById('btnLevels').click(); true`); await wait(500);
  await ev(`document.querySelectorAll('.levelBtn')[1].click(); true`); await wait(800);
  for (const k of 'QZXJVWK') { await ev(`document.querySelector('.key[data-k="${k}"]:not(:disabled)')?.click(); true`); await wait(60); }
  await wait(1400);
  const modal = await ev(MODAL);
  if (tag === 'sandbox') await shot(`${tag}-lose`);
  const problems = [...results.flatMap((r) => r.problems), ...(title === 'ok' ? [] : [title]), ...(modal === 'ok' ? [] : [modal])];
  if (problems.length) bad++;
  console.log(`${tag.padEnd(9)} key ${results[0].key.padEnd(6)} drawing ${String(results[0].draw).padStart(3)}px  tile ${results[0].tile}/${results[1].tile}  ${problems.length ? 'PROBLEMS: ' + problems.join('; ') : 'ok'}`);
}
console.log(bad ? `${bad} size(s) with problems` : 'all sizes ok');
ws.close(); proc.kill(); server.close();
