/**
 * Verifies every KittyDoku level: exactly one solution, all colour patches
 * orthogonally connected, and single-cell patches only where the design asks
 * for them. Run with `npm run verify-levels` after changing level data.
 */
import { allRegionsConnected, countSolutions, generatePuzzle, isAdjacent } from '@arcade/queens-core';
import { allLevels, TOTAL_LEVELS } from '../src/game/levels.ts';

function regionSizes(regions: number[][], size: number): number[] {
  const counts = new Array(size).fill(0);
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) counts[regions[r][c]]++;
  return counts;
}

let failures = 0;
let slowest = 0;
const started = Date.now();

for (const ref of allLevels()) {
  const t0 = Date.now();
  const board = generatePuzzle({
    size: ref.size,
    seed: ref.seed,
    singletonRegions: ref.singletons,
    minRegionSize: ref.minRegionSize,
  });
  const ms = Date.now() - t0;
  slowest = Math.max(slowest, ms);

  const problems: string[] = [];

  const solutions = countSolutions(board.regions, ref.size, 3);
  if (solutions !== 1) problems.push(`SOLUTIONS=${solutions}`);
  if (!allRegionsConnected(board.regions, ref.size)) problems.push('DISCONNECTED-PATCH');

  const present = new Set<number>();
  board.regions.forEach((row) => row.forEach((v) => present.add(v)));
  if (present.size !== ref.size) problems.push(`PATCHES=${present.size}`);

  const rows = new Set(board.solution.map((p) => p.row));
  const cols = new Set(board.solution.map((p) => p.col));
  const regs = new Set(board.solution.map((p) => board.regions[p.row][p.col]));
  if (rows.size !== ref.size) problems.push('ROW-DUP');
  if (cols.size !== ref.size) problems.push('COL-DUP');
  if (regs.size !== ref.size) problems.push('PATCH-DUP');

  for (let i = 0; i < board.solution.length; i++) {
    for (let j = i + 1; j < board.solution.length; j++) {
      if (isAdjacent(board.solution[i], board.solution[j])) problems.push('CATS-TOUCH');
    }
  }

  const sizes = regionSizes(board.regions, ref.size);
  const singles = sizes.filter((s) => s === 1).length;
  // Levels asking for none must not get a free cat by accident.
  if (ref.singletons === 0 && singles > 0) problems.push(`UNWANTED-SINGLETONS=${singles}`);

  const status = problems.length ? `FAIL ${problems.join(',')}` : 'ok';
  if (problems.length) failures++;

  console.log(
    `${status.padEnd(28)} ${ref.id.padEnd(22)} ${ref.size}x${ref.size} ` +
      `singles=${singles}/${ref.singletons} patches=[${sizes.join(',')}] ${ms}ms`
  );
}

console.log(
  `\nchecked ${TOTAL_LEVELS} levels · failures=${failures} · ` +
    `total=${Date.now() - started}ms · slowest level=${slowest}ms`
);

// Non-zero exit so this can gate a build. Declared locally rather than pulling
// in @types/node just for one call.
declare const process: { exit(code: number): never };
if (failures > 0) process.exit(1);
