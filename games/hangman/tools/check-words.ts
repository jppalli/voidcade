/**
 * Sanity checks for the word list, and a quick look at level difficulty.
 *
 *   npm run check-words
 */
import { ENDLESS_POOL, LEVELS, WORLDS, difficulty } from '../src/game/words';

let problems = 0;
const fail = (msg: string) => { problems++; console.error('  x ' + msg); };

const all = [...ENDLESS_POOL];
const texts = new Map<string, number>();
for (const e of all) {
  if (!/^[A-Z][A-Z' -]*[A-Z]$/.test(e.text)) fail(`bad characters or edges: "${e.text}"`);
  if (/ {2}/.test(e.text)) fail(`double space: "${e.text}"`);
  if (!e.category.trim()) fail(`no category: "${e.text}"`);
  texts.set(e.text, (texts.get(e.text) ?? 0) + 1);
  const longest = Math.max(...e.text.split(' ').map((w) => w.length));
  if (longest > 13) fail(`word too long for small screens (${longest}): "${e.text}"`);
}
for (const [t, n] of texts) if (n > 1) fail(`duplicate: "${t}"`);

console.log(`Endless pool: ${all.length} entries (${all.filter((e) => e.text.includes(' ')).length} phrases)`);
for (const [wi, w] of WORLDS.entries()) {
  console.log(`\nWorld ${wi + 1}: ${w.name}`);
  for (const l of LEVELS.filter((x) => x.world === wi)) {
    console.log(`  ${String(l.index + 1).padStart(3)}  ${String(difficulty(l.entry.text)).padStart(2)}  ${l.entry.text}  (${l.entry.category})`);
  }
}
if (problems) throw new Error(`${problems} problem(s) in the word list`);
console.log('\nAll good.');
