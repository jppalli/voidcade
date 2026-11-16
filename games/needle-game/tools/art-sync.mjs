// Accepts the art in art/incoming. Run: npm run art:sync
// Files with no errors are copied to public/art/items and moved to art/archive/<date>/.
// Files with errors stay in art/incoming and are listed. Then public/art/manifest.json is rewritten.
// Add --keep to leave the accepted files in art/incoming.
import fs from 'node:fs';
import path from 'node:path';
import { DIRS, checkFolder, hashOf, loadSlots } from './art-lib.mjs';

const keep = process.argv.includes('--keep');
const { spec, slots } = await loadSlots();
fs.mkdirSync(DIRS.items, { recursive: true });

let accepted = 0, rejected = 0;
const day = new Date().toISOString().slice(0, 10);
for (const r of checkFolder(DIRS.incoming, slots, spec)) {
  if (r.ignored) { console.log(`skip     ${r.name}: ${r.ignored}`); continue; }
  if (r.errors.length) {
    rejected++;
    console.log(`REJECTED ${r.name}`);
    r.errors.forEach(e => console.log(`           - ${e}`));
    continue;
  }
  fs.writeFileSync(path.join(DIRS.items, `${r.slot.id}.png`), r.buf);
  if (!keep) {
    const to = path.join(DIRS.archive, day);
    fs.mkdirSync(to, { recursive: true });
    fs.renameSync(r.full, path.join(to, r.name));
  }
  accepted++;
  console.log(`accepted ${r.name}${r.warnings.length ? ' (' + r.warnings.join('; ') + ')' : ''}`);
}

// The manifest lists every picture in public/art/items that passes the checks.
const manifest = { version: 1, items: {} };
for (const r of checkFolder(DIRS.items, slots, spec)) {
  if (r.ignored || r.errors.length || !r.slot) { if (!r.ignored) console.log(`left out of the manifest: ${r.name}`); continue; }
  manifest.items[r.slot.id] = { v: hashOf(r.buf) };
}
fs.mkdirSync(path.dirname(DIRS.manifest), { recursive: true });
fs.writeFileSync(DIRS.manifest, JSON.stringify(manifest, null, 2) + '\n');
console.log(`\n${accepted} accepted, ${rejected} rejected. ${Object.keys(manifest.items).length} of ${slots.length} slots now have a picture from an artist.`);
process.exit(rejected ? 1 : 0);
