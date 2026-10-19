/**
 * Writes the Daily Word schedule to src/game/daily.data.json.
 *
 * The schedule is frozen in a file (not worked out from the word list at
 * runtime), so adding or reordering words later never changes a past or
 * future daily word, and every player gets the same word on the same day.
 * Day 1 is the first entry; after the last entry the list starts over.
 *
 * Picks from the middle of the pool (not the very easiest, not the very
 * hardest): one try a day with a streak on the line should feel fair.
 *
 *   npm run make-daily      (only when the list runs low: it rewrites all days)
 */
import { writeFileSync } from 'node:fs';
import { ENDLESS_POOL } from '../src/game/words';

const n = ENDLESS_POOL.length;
const pool = ENDLESS_POOL.slice(Math.floor(n * 0.15), Math.floor(n * 0.9));

// Seeded shuffle: same output every run.
let seed = 20261019;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let i = pool.length - 1; i > 0; i--) {
  const j = Math.floor(rnd() * (i + 1));
  [pool[i], pool[j]] = [pool[j], pool[i]];
}

const file = new URL('../src/game/daily.data.json', import.meta.url);
writeFileSync(file, JSON.stringify(pool.map(({ text, category }) => ({ text, category })), null, 0).replace(/\},\{/g, '},\n{') + '\n');
console.log(`Daily schedule: ${pool.length} days`);
