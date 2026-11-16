// Checks delivered art against the spec. Run: npm run art:check
//   (no option)   checks art/incoming (new files) and public/art/items (what the game uses)
//   --incoming    checks only art/incoming
// Exits with 1 if any file has an error, so it can run in a build.
import { DIRS, checkFolder, loadSlots } from './art-lib.mjs';

const onlyIncoming = process.argv.includes('--incoming');
const { spec, slots } = await loadSlots();
let errorCount = 0;

function report(title, results) {
  console.log(`\n${title}: ${results.length === 0 ? 'no files' : results.length + ' file' + (results.length === 1 ? '' : 's')}`);
  for (const r of results) {
    if (r.ignored) { console.log(`  skip  ${r.name}: ${r.ignored}`); continue; }
    if (r.errors.length) { errorCount += r.errors.length; console.log(`  ERROR ${r.name}`); r.errors.forEach(e => console.log(`          - ${e}`)); }
    else console.log(`  ok    ${r.name}`);
    r.warnings.forEach(w => console.log(`  warn  ${r.name}: ${w}`));
  }
}

report('Waiting in art/incoming', checkFolder(DIRS.incoming, slots, spec));
let have = new Set();
if (!onlyIncoming) {
  const delivered = checkFolder(DIRS.items, slots, spec);
  report('In the game (public/art/items)', delivered);
  have = new Set(delivered.filter(r => r.slot && !r.errors.length).map(r => r.slot.id));
  const missing = slots.filter(s => !have.has(s.id));
  console.log(`\nPictures from artists: ${have.size} of ${slots.length}. The other ${missing.length} use the game's own drawings.`);
}
console.log(errorCount ? `\n${errorCount} error${errorCount === 1 ? '' : 's'}. Files with errors are not accepted.` : '\nNo errors.');
process.exit(errorCount ? 1 : 0);
