// Checks delivered art against the spec. Run: npm run art:check
//   (no option)   checks art/incoming (new files) and public/art (what the game uses)
//   --incoming    checks only art/incoming
// Exits with 1 if any file has an error, so it can run in a build.
import { DIRS, checkTree, loadSlots } from './art-lib.mjs';

const onlyIncoming = process.argv.includes('--incoming');
const { spec, slots } = await loadSlots();
let errorCount = 0;

function report(title, results) {
  console.log(`\n${title}: ${results.length === 0 ? 'no files' : results.length + ' file' + (results.length === 1 ? '' : 's')}`);
  for (const r of results) {
    if (r.ignored) { console.log(`  skip  ${r.rel}: ${r.ignored}`); continue; }
    if (r.errors.length) { errorCount += r.errors.length; console.log(`  ERROR ${r.rel}`); r.errors.forEach(e => console.log(`          - ${e}`)); }
    else console.log(`  ok    ${r.rel}`);
    r.warnings.forEach(w => console.log(`  warn  ${r.rel}: ${w}`));
  }
}

report('Waiting in art/incoming', checkTree(DIRS.incoming, slots, spec));
if (!onlyIncoming) {
  const delivered = checkTree(DIRS.delivered, slots, spec);
  report('In the game (public/art)', delivered);
  const have = new Set(delivered.filter(r => r.slot && !r.errors.length).map(r => `${r.folder}/${r.slot.id}`));
  console.log(`\nPictures from artists: ${have.size} of ${slots.length}.`);
  const kits = new Map();
  for (const s of slots) {
    const k = kits.get(s.kit) ?? { gate: s.gate, total: 0, done: 0 };
    k.total++;
    if (have.has(`${s.folder}/${s.id}`)) k.done++;
    kits.set(s.kit, k);
  }
  for (const [name, k] of kits) {
    const note = k.gate ? (k.done === k.total ? 'in use' : 'not used until the whole kit is delivered') : 'used one by one';
    console.log(`  ${String(k.done).padStart(2)} of ${String(k.total).padStart(2)}  ${name} (${note})`);
  }
}
console.log(errorCount ? `\n${errorCount} error${errorCount === 1 ? '' : 's'}. Files with errors are not accepted.` : '\nNo errors.');
process.exit(errorCount ? 1 : 0);
