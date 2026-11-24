import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { toPuzzle } from '../src/game/daily';
import { verifyPuzzle } from '../src/game/verify';

const file = fileURLToPath(new URL('../src/game/puzzles.data.json', import.meta.url));
const days = JSON.parse(readFileSync(file, 'utf8')) as Parameters<typeof toPuzzle>[0][][];
let bad = 0;
days.forEach((day, d) => {
  if (day.map((p) => p.size).join() !== '2,4,6') {
    console.error(`day ${d}: expected sizes 2,4,6`);
    bad++;
  }
  for (const raw of day) {
    const errors = verifyPuzzle(toPuzzle(raw, `d${d}-${raw.size}`));
    if (errors.length) {
      console.error(`day ${d} size ${raw.size}: ${errors.join('; ')}`);
      bad++;
    }
  }
});
console.log(bad ? `${bad} problem(s)` : `OK: ${days.length} days, ${days.length * 3} puzzles, all unique`);
process.exit(bad ? 1 : 0);