/**
 * Sanity checks for the word list, and a quick look at level difficulty.
 *
 *   npm run check-words
 */
import { ENDLESS_POOL, LEVELS, WORDS_PER_LEVEL, WORLDS, difficulty } from '../src/game/words';

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
  if (e.text.split(' ').length > 6) fail(`phrase longer than 6 words: "${e.text}"`);
}
for (const [t, n] of texts) if (n > 1) fail(`duplicate: "${t}"`);

// Every level word and spare must be unique across all levels.
const levelTexts = new Map<string, string>();
for (const l of LEVELS) {
  if (l.topic.words.length !== WORDS_PER_LEVEL) fail(`level ${l.index + 1} (${l.topic.name}) has ${l.topic.words.length} words`);
  if (l.topic.spares.length < 2) fail(`level ${l.index + 1} (${l.topic.name}) needs at least 2 spares`);
  for (const w of [...l.topic.words, ...l.topic.spares]) {
    const other = levelTexts.get(w.text);
    if (other) fail(`"${w.text}" is in both ${other} and ${l.topic.name}`);
    levelTexts.set(w.text, l.topic.name);
  }
}

console.log(`Endless pool: ${all.length} entries (${all.filter((e) => e.text.includes(' ')).length} phrases)`);
for (const [wi, w] of WORLDS.entries()) {
  console.log(`\nWorld ${wi + 1}: ${w.name}`);
  for (const l of LEVELS.filter((x) => x.world === wi)) {
    const words = l.topic.words.map((x) => `${x.text}(${difficulty(x.text)})`).join(' ');
    console.log(`  ${String(l.index + 1).padStart(3)}  ${l.topic.name.padEnd(11)} ${words}`);
  }
}
if (problems) throw new Error(`${problems} problem(s) in the word list`);
console.log('\nAll good.');
