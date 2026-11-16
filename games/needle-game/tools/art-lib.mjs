// Shared by the art tools: reads the slot list from src/artslots.ts and checks files against the spec.
import { buildSync } from 'esbuild';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const FOLDERS = ['items', 'icons', 'props'];
export const DIRS = {
  /** Where artists drop their files, in a folder for each kind: items/, icons/, props/. */
  incoming: path.join(ROOT, 'art', 'incoming'),
  /** Where files go after they have been accepted (a dated folder each time). */
  archive: path.join(ROOT, 'art', 'archive'),
  /** What the game serves, with the same folders. */
  delivered: path.join(ROOT, 'public', 'art'),
  manifest: path.join(ROOT, 'public', 'art', 'manifest.json'),
  brief: path.join(ROOT, 'art', 'ART_BRIEF.md'),
  csv: path.join(ROOT, 'art', 'art-slots.csv'),
  reference: path.join(ROOT, 'art', 'reference'),
  kit: path.join(ROOT, 'art', 'kit'),
};

/** Bundles a few of the game's own source files so the tools can use them. */
export async function bundle(lines, extra = {}) {
  const built = buildSync({
    stdin: { contents: lines.join('\n'), resolveDir: path.join(ROOT, 'src'), loader: 'ts' },
    bundle: true, format: 'esm', write: false, platform: 'neutral', logLevel: 'silent', ...extra,
  });
  return built.outputFiles[0].text;
}

/** The slots and the spec, straight from the game's own source. */
export async function loadSlots() {
  const code = await bundle(["export * from './artslots.ts';"]);
  const G = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
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

/** The slot a file name was probably meant for (inside the same folder), or null. */
export function suggest(base, slots, folder) {
  const low = base.toLowerCase().replace(/[\s.]+/g, '_');
  let best = null, bestD = 3;
  for (const s of slots) {
    if (folder && s.folder !== folder) continue;
    const d = edit(low, s.id);
    if (d < bestD) { best = s; bestD = d; }
  }
  return best;
}

/** Checks the pixels of a PNG against its slot. */
function checkPngPixels(buf, slot, spec, errors, warnings) {
  const png = readPng(buf);
  if (png.error) { errors.push(png.error); return; }
  if (png.w !== slot.w || png.h !== slot.h) errors.push(`size is ${png.w} x ${png.h}, it must be ${slot.w} x ${slot.h}`);
  const a = alphaOf(png);
  if (a.note) { errors.push(a.note); return; }
  if (png.w !== slot.w || png.h !== slot.h) return;
  const { alpha } = a, W = png.w, H = png.h;
  let minX = W, minY = H, maxX = -1, maxY = -1, opaque = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = alpha[y * W + x];
    if (v > 240) opaque++;
    if (v > spec.emptyAlpha) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  if (maxX < 0) { errors.push('the picture is empty (fully transparent)'); return; }
  if (opaque / (W * H) > 0.9) errors.push('the picture looks like it has a solid background. It must be transparent around the object');
  const gaps = { left: minX, top: minY, right: W - 1 - maxX, bottom: H - 1 - maxY };
  const tight = Object.entries(gaps).filter(([, g]) => g < slot.margin).map(([k, g]) => `${k} ${g}px`);
  if (tight.length) errors.push(`the object comes too close to the edge (${tight.join(', ')}). Leave at least ${slot.margin}px of empty space on every side`);
  if (slot.fill) {
    const longest = Math.max((maxX - minX + 1) / W, (maxY - minY + 1) / H);
    if (longest < slot.fill[0]) warnings.push(`the object is small (${Math.round(longest * 100)}% of the file). Aim for ${Math.round(slot.fill[0] * 100)}% to ${Math.round(slot.fill[1] * 100)}%`);
    if (longest > slot.fill[1]) warnings.push(`the object fills ${Math.round(longest * 100)}% of the file, more than ${Math.round(slot.fill[1] * 100)}%`);
  }
}

/** Checks an SVG file against its slot. */
function checkSvg(text, slot, errors, warnings) {
  if (!/<svg[\s>]/i.test(text)) { errors.push('not an SVG file'); return; }
  const vb = text.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (!vb) errors.push(`the SVG has no viewBox. Add viewBox="0 0 ${slot.box[0]} ${slot.box[1]}" (or the same proportions)`);
  else {
    const n = vb[1].trim().split(/[\s,]+/).map(Number);
    if (n.length !== 4 || n.some(Number.isNaN) || n[2] <= 0 || n[3] <= 0) errors.push(`the viewBox "${vb[1]}" is not valid`);
    else if (Math.abs(n[2] / n[3] / (slot.box[0] / slot.box[1]) - 1) > 0.01) errors.push(`the viewBox is ${n[2]} x ${n[3]}, it must have the same proportions as ${slot.box[0]} x ${slot.box[1]}`);
  }
  const bad = text.match(/<script|<foreignObject|<iframe|<audio|<video|javascript:|<!ENTITY|\son[a-z]+\s*=/i);
  if (bad) errors.push(`contains something that is not allowed in a picture (${bad[0].trim()}). Export a plain SVG with only shapes and gradients`);
  if (/(?:xlink:)?href\s*=\s*["']\s*(?:https?:)?\/\//i.test(text) || /url\(\s*["']?\s*https?:/i.test(text)) errors.push('refers to files on the internet. Everything must be inside the file');
  if (/data:image\/(?:png|jpe?g|gif|webp)/i.test(text)) warnings.push('contains an embedded bitmap. It is allowed but makes the file heavy; vector shapes are better');
  if (/<text[\s>]/i.test(text)) warnings.push('contains live text. Convert the text to outlines so fonts do not matter');
  if (/<rect[^>]*width\s*=\s*["']100%["'][^>]*height\s*=\s*["']100%["']/i.test(text)) warnings.push('may contain a background rectangle that covers the whole picture. The background must be transparent');
}

/**
 * Checks one file against its slot. `errors` stop the file from being accepted, `warnings` are
 * worth a look. `slot` is null when the file name matches nothing. `folder` is the folder it is in.
 */
export function checkFile(name, buf, slot, slots, spec, folder) {
  const errors = [], warnings = [];
  const ext = (name.match(/\.([^.]+)$/)?.[1] ?? '').toLowerCase();
  const base = name.replace(/\.[^.]+$/, '');
  if (!slot) {
    const near = suggest(base, slots, folder);
    errors.push(`no ${folder ? folder.replace(/s$/, '') + ' ' : ''}slot called "${base}"${near ? `. Did you mean ${near.id}.${ext || near.formats[0]}?` : ''}`);
    return { errors, warnings };
  }
  if (!slot.formats.includes(ext)) { errors.push(`${ext || 'this'} files are not accepted here. Deliver ${slot.formats.map(f => f.toUpperCase()).join(' or ')}`); return { errors, warnings }; }
  if (name !== `${slot.id}.${ext}`) errors.push(`file name must be exactly ${slot.id}.${ext} (lower case)`);
  if (buf.length > spec.maxBytes) errors.push(`file is ${(buf.length / 1000).toFixed(0)} KB, the most allowed is ${(spec.maxBytes / 1000).toFixed(0)} KB. ${ext === 'png' ? 'Reduce the colours or run it through a PNG optimiser' : 'Simplify the paths or remove hidden layers'}`);
  else if (buf.length > spec.maxBytes * 0.75) warnings.push(`file is ${(buf.length / 1000).toFixed(0)} KB, close to the ${(spec.maxBytes / 1000).toFixed(0)} KB limit`);
  if (ext === 'png') checkPngPixels(buf, slot, spec, errors, warnings);
  else checkSvg(buf.toString('utf8'), slot, errors, warnings);
  return { errors, warnings };
}

/** Lists the files of a folder (not sub-folders), or [] if it does not exist. */
export function listFiles(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isFile() && !d.name.startsWith('.')).map(d => d.name).sort(); } catch { return []; }
}
const listDirs = dir => { try { return fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name); } catch { return []; } };

export const hashOf = buf => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);

/**
 * Checks every file in the folders items/, icons/ and props/ inside `root`. Returns one result
 * per file: { rel, full, folder, name, slot, errors, warnings, buf } (or `ignored` with the reason).
 */
export function checkTree(root, slots, spec) {
  const results = [];
  for (const name of listFiles(root)) results.push({ rel: name, name, full: path.join(root, name), errors: [], warnings: [], ignored: `it is not inside a folder. Put it in ${FOLDERS.map(f => f + '/').join(', ')}` });
  for (const dir of listDirs(root)) {
    if (!FOLDERS.includes(dir)) { results.push({ rel: dir + '/', name: dir, full: path.join(root, dir), errors: [], warnings: [], ignored: `unknown folder. The folders are ${FOLDERS.join(', ')}` }); continue; }
    for (const name of listFiles(path.join(root, dir))) {
      const full = path.join(root, dir, name), rel = `${dir}/${name}`;
      if (!/\.(png|svg)$/i.test(name)) { results.push({ rel, name, full, folder: dir, errors: [], warnings: [], ignored: 'not a PNG or SVG, so it is ignored' }); continue; }
      const buf = fs.readFileSync(full);
      const base = name.replace(/\.[^.]+$/, '');
      const slot = slots.find(s => s.folder === dir && (s.id === base || s.id === base.toLowerCase())) ?? null;
      results.push({ rel, name, full, folder: dir, buf, slot, ...checkFile(name, buf, slot, slots, spec, dir) });
    }
  }
  // Both a PNG and an SVG for the same slot: say so, because only one can be used.
  const seen = new Map();
  for (const r of results) {
    if (!r.slot || r.errors.length) continue;
    const k = `${r.folder}/${r.slot.id}`, first = seen.get(k);
    if (first) for (const x of [first, r]) x.errors.push(`there are two files for this picture (${first.name} and ${r.name}). Deliver only one`);
    else seen.set(k, r);
  }
  return results;
}
