/**
 * Print one saved level's board, solution and logic grade.
 *
 *   node tools/inspect-level.mjs cat-council-9
 */
import { readFileSync } from 'node:fs';

const id = process.argv[2];
const file = JSON.parse(readFileSync(new URL('../src/game/levels.data.json', import.meta.url), 'utf8'));
const level = file.levels.find((l) => l.id === id);
if (!level) {
  console.log(`No level "${id}". Ids look like sunny-windowsill-0 … lantern-festival-9.`);
  process.exit(1);
}

const { size, regions, solution, grade } = level;
console.log(`${id}: ${size}x${size}, grade ${grade.score} (hardest step: tier ${grade.maxTier})\n`);
console.log('Board (number = patch, * = cat):');
for (let r = 0; r < size; r++) {
  console.log([...regions[r]].map((v, c) => (solution[r] === c ? '*' : v)).join(' '));
}
