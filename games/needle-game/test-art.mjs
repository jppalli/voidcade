// Tests the art checker with PNG files made in memory. Run: node test-art.mjs
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { alphaOf, bundle, checkFile, checkTree, loadSlots, readPng, suggest } from './tools/art-lib.mjs';

const { spec, slots } = await loadSlots();
const slot = slots.find(s => s.kind === 'item');

/** Makes a PNG. `px(x, y)` returns [r, g, b, a]. type 6 is RGBA, type 2 is RGB. `filters` picks a row filter for each row. */
function makePng(w, h, px, { type = 6, depth = 8, mixFilters = false, interlace = 0 } = {}) {
  const ch = type === 6 ? 4 : 3, bpp = ch * (depth / 8), stride = w * bpp;
  const rows = [];
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const line = Buffer.alloc(stride);
    for (let x = 0; x < w; x++) {
      const p = px(x, y);
      for (let c = 0; c < ch; c++) {
        if (depth === 16) { line[(x * ch + c) * 2] = p[c]; line[(x * ch + c) * 2 + 1] = p[c]; } else line[x * ch + c] = p[c];
      }
    }
    const f = mixFilters ? y % 5 : 0, out = Buffer.alloc(stride + 1);
    out[0] = f;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let pred = 0;
      if (f === 1) pred = a; else if (f === 2) pred = b; else if (f === 3) pred = (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[i + 1] = (line[i] - pred) & 255;
    }
    rows.push(out);
    prev = line;
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = depth; ihdr[9] = type; ihdr[12] = interlace;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))]);
}

const N = slot.w;
const disc = r => (x, y) => (Math.hypot(x - N / 2, y - N / 2) < r ? [200, 60, 60, 255] : [0, 0, 0, 0]);
const check = (buf, name = `${slot.id}.png`, s = slot) => checkFile(name, buf, s, slots, spec, s?.folder ?? 'items');
const has = (res, text) => res.errors.some(e => e.includes(text));

// A good file passes.
let r = check(makePng(N, N, disc(95)));
assert.deepEqual(r.errors, [], 'good file: ' + r.errors.join('; '));
assert.deepEqual(r.warnings, []);

// The same picture read with every row filter and in 16 bits gives the same answer.
const reference = alphaOf(readPng(makePng(N, N, disc(95)))).alpha;
assert.deepEqual(alphaOf(readPng(makePng(N, N, disc(95), { mixFilters: true }))).alpha, reference, 'row filters');
assert.deepEqual(check(makePng(N, N, disc(95), { depth: 16, mixFilters: true })).errors, [], '16-bit');

// Wrong size.
r = check(makePng(512, 512, (x, y) => (Math.hypot(x - 256, y - 256) < 190 ? [1, 2, 3, 255] : [0, 0, 0, 0])));
assert.ok(has(r, `must be ${N} x ${N}`));

// No transparency (RGB), an interlaced file, something that is not a PNG, an empty file.
assert.ok(has(check(makePng(N, N, disc(95), { type: 2 })), 'no transparency'));
assert.ok(has(check(makePng(N, N, disc(95), { interlace: 1 })), 'interlaced'));
assert.ok(has(check(Buffer.from('GIF89a not a png at all, just some text to make it long enough')), 'not a PNG'));
assert.ok(has(check(makePng(N, N, () => [0, 0, 0, 0])), 'empty'));

// A solid background, and an object that touches the edge.
assert.ok(has(check(makePng(N, N, () => [240, 240, 240, 255])), 'solid background'));
r = check(makePng(N, N, disc(N / 2 - 3)));
assert.ok(has(r, 'too close to the edge'), 'edge: ' + r.errors.join('; '));

// A small object is a warning, not an error.
r = check(makePng(N, N, disc(40)));
assert.deepEqual(r.errors, []);
assert.ok(r.warnings.some(w => w.includes('small')));

// A file that is too heavy (noise does not compress).
const noise = () => Math.floor(Math.random() * 256);
assert.ok(has(check(makePng(N, N, () => [noise(), noise(), noise(), 255])), 'KB'));

// Names: wrong case is an error, and a typo gets a suggestion inside the same folder.
assert.ok(has(check(makePng(N, N, disc(95)), `${slot.id.toUpperCase()}.png`), 'file name must be exactly'));
const typo = slot.id.slice(0, -1) + 'x';
assert.equal(suggest(typo, slots, 'items')?.id, slot.id);
r = checkFile(`${typo}.png`, makePng(N, N, disc(95)), null, slots, spec, 'items');
assert.ok(has(r, `Did you mean ${slot.id}.png`), r.errors.join('; '));
assert.ok(has(checkFile('zzzzzzzzzz.png', makePng(N, N, disc(95)), null, slots, spec, 'items'), 'no item slot called'));
assert.ok(has(check(makePng(N, N, disc(95)), `${slot.id}.svg`), 'not accepted here'), 'items are PNG only');

// Icons and props accept PNG or SVG, with their own sizes.
const icon = slots.find(s => s.kind === 'icon'), prop = slots.find(s => s.id === 'windmill');
assert.equal(icon.w, 128);
assert.equal(prop.w, 400);
assert.equal(prop.h, 560);
const svg = (vb, body = '<circle cx="32" cy="32" r="24" fill="#c33"/>') => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`);
const checkSlot = (s, name, buf) => checkFile(name, buf, s, slots, spec, s.folder);
assert.deepEqual(checkSlot(icon, `${icon.id}.svg`, svg('0 0 64 64')).errors, []);
assert.deepEqual(checkSlot(icon, `${icon.id}.png`, makePng(128, 128, (x, y) => (Math.hypot(x - 64, y - 64) < 52 ? [200, 60, 60, 255] : [0, 0, 0, 0]))).errors, []);
assert.deepEqual(checkSlot(prop, `${prop.id}.svg`, svg('0 0 100 140')).errors, []);
assert.deepEqual(checkSlot(prop, `${prop.id}.svg`, svg('0 0 200 280')).errors, [], 'same proportions at any scale');
assert.ok(has(checkSlot(prop, `${prop.id}.svg`, svg('0 0 100 100')), 'same proportions'));
assert.ok(has(checkSlot(icon, `${icon.id}.svg`, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>')), 'no viewBox'));
assert.ok(has(checkSlot(icon, `${icon.id}.svg`, svg('0 0 64 64', '<script>alert(1)</script>')), 'not allowed'));
assert.ok(has(checkSlot(icon, `${icon.id}.svg`, svg('0 0 64 64', '<circle r="5" onclick="x()"/>')), 'not allowed'));
assert.ok(has(checkSlot(icon, `${icon.id}.svg`, svg('0 0 64 64', '<image href="https://example.com/a.png"/>')), 'internet'));
assert.ok(checkSlot(icon, `${icon.id}.svg`, svg('0 0 64 64', '<text x="1" y="9">Hi</text>')).warnings.some(w => w.includes('text')));
assert.ok(has(checkSlot(icon, `${icon.id}.png`, makePng(256, 256, disc(100))), 'must be 128 x 128'));

// A folder of files: right folder, wrong folder, a file outside any folder, and two files for one picture.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'art-test-'));
for (const d of ['items', 'icons', 'misc']) fs.mkdirSync(path.join(tmp, d));
fs.writeFileSync(path.join(tmp, 'items', `${slot.id}.png`), makePng(N, N, disc(95)));
fs.writeFileSync(path.join(tmp, 'icons', `${icon.id}.svg`), svg('0 0 64 64'));
fs.writeFileSync(path.join(tmp, 'icons', `${icon.id}.png`), makePng(128, 128, (x, y) => (Math.hypot(x - 64, y - 64) < 52 ? [200, 60, 60, 255] : [0, 0, 0, 0])));
fs.writeFileSync(path.join(tmp, 'icons', 'notes.txt'), 'x');
fs.writeFileSync(path.join(tmp, 'misc', 'a.png'), 'x');
fs.writeFileSync(path.join(tmp, 'loose.png'), 'x');
const tree = checkTree(tmp, slots, spec);
const by = rel => tree.find(t => t.rel === rel);
assert.deepEqual(by(`items/${slot.id}.png`).errors, []);
assert.ok(by(`icons/${icon.id}.svg`).errors.some(e => e.includes('two files')));
assert.ok(by(`icons/${icon.id}.png`).errors.some(e => e.includes('two files')));
assert.ok(by('icons/notes.txt').ignored);
assert.ok(by('misc/').ignored && by('loose.png').ignored);
fs.rmSync(tmp, { recursive: true, force: true });

// The slot list: unique ids in each folder, every icon and prop of the game has one, and the boxes match the game's drawings.
for (const f of ['items', 'icons', 'props']) {
  const ids = slots.filter(s => s.folder === f).map(s => s.id);
  assert.equal(new Set(ids).size, ids.length, `${f}: ids are unique`);
  assert.ok(ids.every(id => /^[a-z0-9_-]+$/.test(id)));
}
assert.ok(slots.filter(s => s.folder === 'items').length >= 45);
assert.equal(slots.filter(s => s.kind === 'icon').length, 13);
assert.equal(slots.filter(s => s.kind === 'prop').length, 20);
const code = await bundle(["import './art.ts';", "import './props.ts';", "export { registeredFallbacks } from './artdom.ts';"]);
const found = (await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))).registeredFallbacks();
for (const s of slots.filter(x => x.folder !== 'items')) {
  const own = found.get(`${s.folder}/${s.id}`);
  assert.ok(own, `the game has a drawing for ${s.folder}/${s.id}`);
  const vb = own.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  assert.deepEqual([vb[2], vb[3]], s.box, `${s.id}: the slot box matches the game's own viewBox`);
}
assert.equal([...found.keys()].filter(k => !slots.some(s => `${s.folder}/${s.id}` === k)).length, 0, 'every drawing registered by the game has a slot');

// The classic look and the new art: what the game uses for each choice.
const domCode = await bundle(["export * from './artdom.ts';", "export * from './artslots.ts';"]);
async function freshDom({ files = {}, search = '', stored = null, version = 2 } = {}) {
  globalThis.window = globalThis;
  globalThis.location = { search };
  const store = new Map(stored ? [['needle-art-mode', stored]] : []);
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v) };
  globalThis.fetch = async () => ({ json: async () => ({ version, files }) });
  const mod = await import('data:text/javascript;base64,' + Buffer.from(domCode + `\n//${Math.random()}`).toString('base64'));
  await mod.loadArtManifest();
  return { mod, store };
}
const allIcons = Object.fromEntries(slots.filter(x => x.folder === 'icons').map(x => [`icons/${x.id}`, { ext: 'svg', v: 'abc123' }]));
const FB = '<svg viewBox="0 0 64 64">fallback</svg>';
let d = await freshDom();
assert.equal(d.mod.pickSvg('icons', 'barn', FB), FB, 'nothing delivered: the game draws its own');
assert.equal(d.mod.newArtAvailable(), false, 'nothing delivered: no switch to show');
assert.equal(d.mod.itemArtUrl('button'), null);
d = await freshDom({ files: allIcons });
assert.ok(d.mod.pickSvg('icons', 'barn', FB).includes('<image href="./art/icons/barn.svg?v=abc123"'), 'the whole kit is delivered: the new icon is used');
assert.ok(d.mod.pickSvg('icons', 'barn', FB).includes('viewBox="0 0 64 64"'), "same box as the game's own");
assert.equal(d.mod.newArtAvailable(), true);
assert.equal(d.mod.artMode(), 'new', 'the new look is the default');
// Classic look: the delivered files are ignored, but the switch is still offered.
d = await freshDom({ files: allIcons, stored: 'classic' });
assert.equal(d.mod.artMode(), 'classic');
assert.equal(d.mod.pickSvg('icons', 'barn', FB), FB);
assert.equal(d.mod.newArtAvailable(), true, 'the switch stays visible in the classic look');
d.mod.setArtMode('new');
assert.equal(d.store.get('needle-art-mode'), 'new', 'the choice is remembered');
assert.equal(d.mod.artMode(), 'new');
// An incomplete kit is not used (and gives no switch) unless ?art=all.
const one = { 'props/windmill': { ext: 'svg', v: 'abc123' } };
d = await freshDom({ files: one });
assert.equal(d.mod.pickSvg('props', 'windmill', FB), FB);
assert.equal(d.mod.newArtAvailable(), false);
d = await freshDom({ files: one, search: '?art=all' });
assert.ok(d.mod.pickSvg('props', 'windmill', FB).includes('<image'));
assert.equal(d.mod.newArtAvailable(), true);
// The address can force either look without changing what is remembered.
d = await freshDom({ files: allIcons, search: '?art=classic' });
assert.equal(d.mod.pickSvg('icons', 'barn', FB), FB);
assert.equal(d.store.has('needle-art-mode'), false);
d = await freshDom({ files: allIcons, stored: 'classic', search: '?art=new' });
assert.ok(d.mod.pickSvg('icons', 'barn', FB).includes('<image'));
// Items are used one by one, in the new look only.
d = await freshDom({ files: { 'items/button': { ext: 'png', v: 'abc123' } } });
assert.equal(d.mod.itemArtUrl('button'), './art/items/button.png?v=abc123');
assert.equal(d.mod.itemArtUrl('spool'), null);
assert.equal(d.mod.newArtAvailable(), true);
d = await freshDom({ files: { 'items/button': { ext: 'png', v: 'abc123' } }, stored: 'classic' });
assert.equal(d.mod.itemArtUrl('button'), null);
// A list in an unknown format is ignored.
d = await freshDom({ files: allIcons, version: 1 });
assert.equal(d.mod.newArtAvailable(), false);

// The Adobe prompt sheet has a line for every slot, and the artboard of every prop matches its viewBox.
const prompts = fs.readFileSync(new URL('./art/ADOBE_PROMPTS.md', import.meta.url), 'utf8');
for (const s of slots) {
  const row = prompts.split('\n').find(line => line.startsWith(`| \`${s.folder}/${s.id}\` |`));
  assert.ok(row, `ADOBE_PROMPTS.md has a prompt for ${s.folder}/${s.id}`);
  if (s.kind === 'prop') assert.ok(row.includes(`| ${s.box[0]} x ${s.box[1]} |`), `${s.id}: the artboard in ADOBE_PROMPTS.md is ${s.box[0]} x ${s.box[1]}`);
}

console.log(`Passed: art checker (${slots.length} slots: items, icons and props; PNG and SVG; size, transparency, edges, weight, names, folders, the game's own drawings, the classic or new look, and the Adobe prompt sheet).`);