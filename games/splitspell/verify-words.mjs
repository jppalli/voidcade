/**
 * Word list sanity checker. Run: node verify-words.mjs
 * Checks:
 *  1. Every word's actual length matches the bucket it's filed under.
 *  2. No duplicate words within a bucket.
 *  3. Only A-Z letters (no stray punctuation/whitespace).
 */
import { WORDS_BY_LENGTH } from './js/words.js';

let problems = 0;

for (const [lenStr, list] of Object.entries(WORDS_BY_LENGTH)) {
  const expectedLen = Number(lenStr);
  const seen = new Set();

  for (const word of list) {
    if (word.length !== expectedLen) {
      console.log(`WRONG LENGTH: "${word}" is ${word.length} letters, filed under ${expectedLen}`);
      problems++;
    }
    if (!/^[A-Z]+$/.test(word)) {
      console.log(`INVALID CHARS: "${word}"`);
      problems++;
    }
    if (seen.has(word)) {
      console.log(`DUPLICATE in bucket ${expectedLen}: "${word}"`);
      problems++;
    }
    seen.add(word);
  }
}

// Cross-bucket duplicate check (a word appearing in two different length buckets
// shouldn't happen since length determines the bucket, but catches copy-paste errors)
const allWords = new Map();
for (const [lenStr, list] of Object.entries(WORDS_BY_LENGTH)) {
  for (const word of list) {
    if (allWords.has(word) && allWords.get(word) !== lenStr) {
      console.log(`CROSS-BUCKET DUPLICATE: "${word}" in both ${allWords.get(word)} and ${lenStr}`);
      problems++;
    }
    allWords.set(word, lenStr);
  }
}

console.log(`\nTotal words: ${allWords.size}`);
for (const [lenStr, list] of Object.entries(WORDS_BY_LENGTH)) {
  console.log(`  length ${lenStr}: ${list.length} words`);
}
console.log(problems === 0 ? '\n✓ All words valid.' : `\n✗ ${problems} problem(s) found.`);
