// Tests the art checker with PNG files made in memory. Run: node test-art.mjs
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { alphaOf, checkFile, loadSlots, readPng, suggest } from './tools/art-lib.mjs';

const { spec, slots } = await loadSlots();
const slot = slots[0];

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

const N = spec.master;
const disc = r => (x, y) => (Math.hypot(x - N / 2, y - N / 2) < r ? [200, 60, 60, 255] : [0, 0, 0, 0]);
const check = (buf, name = `${slot.id}.png`, s = slot) => checkFile(name, buf, s, slots, spec);
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

// Names: wrong case is an error, and a typo gets a suggestion.
assert.ok(has(check(makePng(N, N, disc(95)), `${slot.id.toUpperCase()}.png`), 'file name must be exactly'));
const typo = slot.id.slice(0, -1) + 'x';
assert.equal(suggest(typo, slots)?.id, slot.id);
r = checkFile(`${typo}.png`, makePng(N, N, disc(95)), null, slots, spec);
assert.ok(has(r, `Did you mean ${slot.id}.png`), r.errors.join('; '));
assert.ok(has(checkFile('zzzzzzzzzz.png', makePng(N, N, disc(95)), null, slots, spec), 'no slot called'));

// The slot list covers every item and look-alike once.
assert.equal(new Set(slots.map(s => s.id)).size, slots.length, 'slot ids are unique');
assert.ok(slots.length >= 45 && slots.every(s => /^[a-z0-9_-]+$/.test(s.id)));

console.log(`Passed: art checker (${slots.length} slots, size, transparency, edges, weight, names, filters and 16-bit files).`);
