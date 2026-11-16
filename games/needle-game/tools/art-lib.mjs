// Shared by the art tools: reads the slot list from src/artslots.ts and checks PNG files against the spec.
import { buildSync } from 'esbuild';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const DIRS = {
  /** Where artists drop their files. */
  incoming: path.join(ROOT, 'art', 'incoming'),
  /** Where files go after they have been accepted (a dated folder each time). */
  archive: path.join(ROOT, 'art', 'archive'),
  /** What the game serves. */
  items: path.join(ROOT, 'public', 'art', 'items'),
  manifest: path.join(ROOT, 'public', 'art', 'manifest.json'),
  sheet: path.join(ROOT, 'art', 'ART_SPEC.md'),
  csv: path.join(ROOT, 'art', 'art-slots.csv'),
};

/** The slots and the spec, straight from the game's own source. */
export async function loadSlots() {
  const built = buildSync({
    stdin: { contents: "export * from './artslots.ts';", resolveDir: path.join(ROOT, 'src'), loader: 'ts' },
    bundle: true, format: 'esm', write: false, platform: 'neutral', logLevel: 'silent',
  });
  const G = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
  return { spec: G.ART_SPEC, slots: G.artSlots() };
}

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/** Reads the header and the compressed data of a PNG. Returns { error } if it is not one. */
export function readPng(buf) {
  if (buf.length < 33 || !buf.subarray(0, 8).equals(SIGNATURE)) return { error: 'not a PNG file (wrong header)' };
  let pos = 8, head = null, trns = null;
  const idat = [];
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    pos += 12 + len;
    if (type === 'IHDR') head = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), depth: data[8], ctype: data[9], interlace: data[12] };
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'tRNS') trns = data;
    else if (type === 'IEND') break;
  }
  if (!head) return { error: 'PNG has no header chunk' };
  return { ...head, trns, data: Buffer.concat(idat) };
}

/**
 * The opacity (0 to 255) of every pixel, row by row. Returns { alpha } or { note } when the
 * picture has no transparency to read, or cannot be read.
 */
export function alphaOf(png) {
  const { w, h, depth, ctype, interlace, trns } = png;
  if (interlace) return { note: 'interlaced PNG: export it again with "interlaced" turned off' };
  const ch = CHANNELS[ctype];
  if (!ch) return { note: `unknown PNG colour type ${ctype}` };
  if (ctype === 3 ? depth !== 8 : depth !== 8 && depth !== 16) return { note: `${depth}-bit ${ctype === 3 ? 'indexed' : ''} PNG: export as 8-bit RGBA` };
  const bpp = (ch * depth) / 8, stride = w * bpp;
  let raw;
  try { raw = zlib.inflateSync(png.data); } catch { return { note: 'the picture data is damaged' }; }
  if (raw.length < (stride + 1) * h) return { note: 'the picture data is too short' };
  const out = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[dst + x - bpp] : 0, b = y ? out[dst - stride + x] : 0, c = x >= bpp && y ? out[dst - stride + x - bpp] : 0;
      let v = raw[src + x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[dst + x] = v & 255;
    }
  }
  const alpha = new Uint8Array(w * h);
  if (ctype === 6 || ctype === 4) {
    const step = depth / 8, at = (ch - 1) * step;
    for (let i = 0; i < w * h; i++) alpha[i] = out[i * bpp + at];
  } else if (ctype === 3) {
    if (!trns) return { note: 'indexed PNG without transparency' };
    for (let i = 0; i < w * h; i++) alpha[i] = out[i] < trns.length ? trns[out[i]] : 255;
  } else return { note: 'the PNG has no transparency (no alpha channel)' };
  return { alpha };
}

const edit = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};

/** The slot a file name was probably meant for, or null. */
export function suggest(base, slots) {
  const low = base.toLowerCase().replace(/[\s.]+/g, '_');
  let best = null, bestD = 3;
  for (const s of slots) {
    const d = edit(low, s.id);
    if (d < bestD) { best = s; bestD = d; }
  }
  return best;
}

/**
 * Checks one file against its slot. `errors` stop the file from being accepted, `warnings` are
 * worth a look. `slot` is null when the file name matches nothing.
 */
export function checkFile(name, buf, slot, slots, spec) {
  const errors = [], warnings = [];
  const base = name.replace(/\.[^.]+$/, '');
  if (!slot) {
    const near = suggest(base, slots);
    errors.push(`no slot called "${base}"${near ? `. Did you mean ${near.id}.png?` : ''}`);
    return { errors, warnings };
  }
  if (name !== `${slot.id}.png`) errors.push(`file name must be exactly ${slot.id}.png (lower case)`);
  if (buf.length > spec.maxBytes) errors.push(`file is ${(buf.length / 1000).toFixed(0)} KB, the most allowed is ${(spec.maxBytes / 1000).toFixed(0)} KB. Reduce the colours or run it through a PNG optimiser`);
  else if (buf.length > spec.maxBytes * 0.75) warnings.push(`file is ${(buf.length / 1000).toFixed(0)} KB, close to the ${(spec.maxBytes / 1000).toFixed(0)} KB limit`);
  const png = readPng(buf);
  if (png.error) { errors.push(png.error); return { errors, warnings }; }
  if (png.w !== spec.master || png.h !== spec.master) errors.push(`size is ${png.w} x ${png.h}, it must be ${spec.master} x ${spec.master}`);
  const a = alphaOf(png);
  if (a.note) { errors.push(a.note); return { errors, warnings }; }
  if (png.w !== spec.master || png.h !== spec.master) return { errors, warnings };
  const { alpha } = a, n = png.w;
  let minX = n, minY = n, maxX = -1, maxY = -1, opaque = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const v = alpha[y * n + x];
    if (v > 240) opaque++;
    if (v > spec.emptyAlpha) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  if (maxX < 0) { errors.push('the picture is empty (fully transparent)'); return { errors, warnings }; }
  if (opaque / (n * n) > 0.9) errors.push('the picture looks like it has a solid background. It must be transparent around the object');
  const gaps = { left: minX, top: minY, right: n - 1 - maxX, bottom: n - 1 - maxY };
  const tight = Object.entries(gaps).filter(([, g]) => g < spec.margin).map(([k, g]) => `${k} ${g}px`);
  if (tight.length) errors.push(`the object comes too close to the edge (${tight.join(', ')}). Leave at least ${spec.margin}px of empty space on every side`);
  const longest = Math.max(maxX - minX + 1, maxY - minY + 1) / n;
  if (longest < spec.fill[0]) warnings.push(`the object is small (${Math.round(longest * 100)}% of the file). It will be hard to see in the hay. Aim for ${Math.round(spec.fill[0] * 100)}% to ${Math.round(spec.fill[1] * 100)}%`);
  if (longest > spec.fill[1]) warnings.push(`the object fills ${Math.round(longest * 100)}% of the file, more than ${Math.round(spec.fill[1] * 100)}%`);
  return { errors, warnings };
}

/** Lists the files of a folder (not sub-folders), or [] if it does not exist. */
export function listFiles(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isFile() && !d.name.startsWith('.')).map(d => d.name).sort(); } catch { return []; }
}

export const hashOf = buf => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);

/** Checks every file in a folder. Returns one result per file. */
export function checkFolder(dir, slots, spec) {
  return listFiles(dir).map(name => {
    const full = path.join(dir, name);
    if (!/\.png$/i.test(name)) return { name, full, errors: [], warnings: [], ignored: 'not a PNG, so it is ignored. Deliver PNG files only' };
    const buf = fs.readFileSync(full);
    const slot = slots.find(s => s.id === name.replace(/\.png$/i, '')) ?? slots.find(s => s.id === name.replace(/\.png$/i, '').toLowerCase()) ?? null;
    return { name, full, buf, slot, ...checkFile(name, buf, slot, slots, spec) };
  });
}
