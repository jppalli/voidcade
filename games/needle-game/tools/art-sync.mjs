// Accepts the art in art/incoming. Run: npm run art:sync
// Files with no errors are copied to public/art/<folder>/ and moved to art/archive/<date>/.
// Files with errors stay in art/incoming and are listed. Then public/art/manifest.json is rewritten.
// Add --keep to leave the accepted files in art/incoming.
import fs from 'node:fs';
import path from 'node:path';
import { DIRS, checkTree, hashOf, loadSlots } from './art-lib.mjs';

const keep = process.argv.includes('--keep');
const { spec, slots } = await loadSlots();

let accepted = 0, rejected = 0;
const day = new Date().toISOString().slice(0, 10);
for (const r of checkTree(DIRS.incoming, slots, spec)) {
  if (r.ignored) { console.log(`skip     ${r.rel}: ${r.ignored}`); continue; }
  if (r.errors.length) {
    rejected++;
    console.log(`REJECTED ${r.rel}`);
    r.errors.forEach(e => console.log(`           - ${e}`));
    continue;
  }
  const dest = path.join(DIRS.delivered, r.folder);
  fs.mkdirSync(dest, { recursive: true });
  // A new file replaces the old one, whichever type it was.
  for (const ext of ['png', 'svg']) fs.rmSync(path.join(dest, `${r.slot.id}.${ext}`), { force: true });
  fs.writeFileSync(path.join(dest, r.name), r.buf);
  if (!keep) {
    const to = path.join(DIRS.archive, day, r.folder);
    fs.mkdirSync(to, { recursive: true });
    fs.renameSync(r.full, path.join(to, r.name));
  }
  accepted++;
  console.log(`accepted ${r.rel}${r.warnings.length ? ' (' + r.warnings.join('; ') + ')' : ''}`);
}

// The manifest lists every picture in public/art that passes the checks.
const manifest = { version: 2, files: {} };
for (const r of checkTree(DIRS.delivered, slots, spec)) {
  if (r.ignored) continue;
  if (r.errors.length || !r.slot) { console.log(`left out of the manifest: ${r.rel}`); continue; }
  manifest.files[`${r.folder}/${r.slot.id}`] = { ext: r.name.split('.').pop().toLowerCase(), v: hashOf(r.buf) };
}
manifest.files = Object.fromEntries(Object.entries(manifest.files).sort(([a], [b]) => a.localeCompare(b)));
fs.mkdirSync(path.dirname(DIRS.manifest), { recursive: true });
fs.writeFileSync(DIRS.manifest, JSON.stringify(manifest, null, 2) + '\n');
console.log(`\n${accepted} accepted, ${rejected} rejected. ${Object.keys(manifest.files).length} of ${slots.length} slots now have a picture from an artist.`);
process.exit(rejected ? 1 : 0);
