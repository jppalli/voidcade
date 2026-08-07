// Analyzes the existing word corpus (words.js) to find good "bloom" sources:
// words with all-unique letters that have enough sub-words (anagram subsets,
// using only letters the source contains) also present in the corpus to
// support a real find-the-words level. Prints candidates so we can hand-pick
// the final level list — this is an analysis tool, not part of the build.
import { WORDS_BY_LENGTH } from '../js/words.js';

const ALL = Object.values(WORDS_BY_LENGTH).flat();

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

function hasUniqueLetters(word) {
  return new Set(word).size === word.length;
}

const sources = ALL.filter((w) => w.length >= 5 && hasUniqueLetters(w));

const results = [];
for (const source of sources) {
  const superCounts = letterCounts(source);
  const subwords = ALL.filter((w) => {
    if (w === source) return false;
    if (w.length < 3 || w.length >= source.length) return false;
    return isSubsetOf(letterCounts(w), superCounts);
  });
  results.push({ source, subwords, count: subwords.length });
}

results.sort((a, b) => b.count - a.count);

console.log(`Total unique-letter sources (len>=5): ${sources.length}`);
console.log(`Sources with >=4 subwords: ${results.filter((r) => r.count >= 4).length}`);
console.log('');

for (const r of results) {
  if (r.count < 4) continue;
  console.log(`${r.source} (${r.source.length}) [${r.count}]: ${r.subwords.join(', ')}`);
}
