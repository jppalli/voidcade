// Verifies every Wordbloom level: the source word has all-unique letters,
// every required word is a strict subset of the source's letters (so it's
// always traceable on the ring), no required word equals the source, no
// duplicate required words, and every required word appears in the curated
// corpus (so bonus-word detection at runtime treats it consistently).
import { LEVELS, TOTAL_LEVELS } from './js/levels.js';
import { WORDS_BY_LENGTH } from './js/words.js';

const CORPUS = new Set(Object.values(WORDS_BY_LENGTH).flat());

function letterCounts(word) {
  const m = new Map();
  for (const ch of word) m.set(ch, (m.get(ch) || 0) + 1);
  return m;
}

function isSubsetOf(subCounts, superCounts) {
  for (const [ch, n] of subCounts) {
    if ((superCounts.get(ch) || 0) < n) return false;
  }
  return true;
}

let errors = 0;

for (const lvl of LEVELS) {
  const { source, required, letters, index, chapter } = lvl;
  const label = `#${index} (${chapter.name}) "${source}"`;

  if (new Set(source).size !== source.length) {
    console.error(`${label}: source has repeated letters`);
    errors++;
  }

  if (new Set(letters).size !== letters.length || letters.length !== new Set(source).size) {
    console.error(`${label}: ring letters don't match source's unique letters`);
    errors++;
  }
  for (const ch of source) {
    if (!letters.includes(ch)) {
      console.error(`${label}: ring is missing letter ${ch}`);
      errors++;
    }
  }

  const seen = new Set();
  const superCounts = letterCounts(source);
  for (const w of required) {
    if (w === source) {
      console.error(`${label}: required word "${w}" equals the source`);
      errors++;
    }
    if (seen.has(w)) {
      console.error(`${label}: duplicate required word "${w}"`);
      errors++;
    }
    seen.add(w);
    if (w.length < 3) {
      console.error(`${label}: required word "${w}" shorter than 3`);
      errors++;
    }
    if (!isSubsetOf(letterCounts(w), superCounts)) {
      console.error(`${label}: required word "${w}" is not a letter-subset of source`);
      errors++;
    }
    if (!CORPUS.has(w)) {
      console.error(`${label}: required word "${w}" not found in corpus`);
      errors++;
    }
  }
  if (required.length === 0) {
    console.error(`${label}: no required words`);
    errors++;
  }
}

console.log(`Checked ${TOTAL_LEVELS} levels.`);
if (errors > 0) {
  console.error(`${errors} error(s) found.`);
  process.exit(1);
} else {
  console.log('All levels valid.');
}
