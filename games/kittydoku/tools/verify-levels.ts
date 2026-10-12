/**
 * Verifies every saved KittyDoku level (src/game/levels.data.json):
 *   - exactly one solution, matching the stored one
 *   - solvable by logic alone (no guessing), and still on its target grade
 *   - all colour patches connected, one cat per row/column/patch, none touching
 *   - single-square patches only where the plan asks for them
 *   - no two levels share a board
 * Run with `npm run verify-levels` after regenerating levels.
 */
import { allRegionsConnected, countSolutions, gradePuzzle, isAdjacent, logicalSolution } from '@arcade/queens-core';
import { allLevels, TOTAL_LEVELS } from '../src/game/levels.ts';

let failures = 0;
const seen = new Map<string, string>();
const started = Date.now();

for (const ref of allLevels()) {
  const { board, size } = ref;
  const def = ref.chapter.levels[ref.levelInChapter];
  const problems: string[] = [];

  const solutions = countSolutions(board.regions, size, 3);
  if (solutions !== 1) problems.push(`SOLUTIONS=${solutions}`);
  if (!allRegionsConnected(board.regions, size)) problems.push('DISCONNECTED-PATCH');

  const present = new Set(board.regions.flat());
  if (present.size !== size) problems.push(`PATCHES=${present.size}`);

  const rows = new Set(board.solution.map((p) => p.row));
  const cols = new Set(board.solution.map((p) => p.col));
  const regs = new Set(board.solution.map((p) => board.regions[p.row][p.col]));
  if (rows.size !== size) problems.push('ROW-DUP');
  if (cols.size !== size) problems.push('COL-DUP');
  if (regs.size !== size) problems.push('PATCH-DUP');
  for (let i = 0; i < board.solution.length; i++) {
    for (let j = i + 1; j < board.solution.length; j++) {
      if (isAdjacent(board.solution[i], board.solution[j])) problems.push('CATS-TOUCH');
    }
  }

  const grade = gradePuzzle(board.regions, size);
  if (!grade.solvable) problems.push('NEEDS-GUESSING');
  else if (grade.maxTier !== Math.floor(def.target)) problems.push(`TIER=${grade.maxTier}≠${Math.floor(def.target)}`);
  const logic = logicalSolution(board.regions, size);
  const key = (ps: { row: number; col: number }[]) => ps.map((p) => `${p.row},${p.col}`).sort().join(';');
  if (logic && key(logic) !== key(board.solution)) problems.push('LOGIC≠STORED');

  const counts = new Array(size).fill(0);
  board.regions.forEach((row) => row.forEach((v) => counts[v]++));
  const singles = counts.filter((n) => n === 1).length;
  if (ref.singletons === 0 && singles > 0) problems.push(`UNWANTED-SINGLETONS=${singles}`);
  if (ref.singletons > 0 && singles < ref.singletons) problems.push(`SINGLETONS=${singles}<${ref.singletons}`);

  const boardKey = board.regions.map((r) => r.join('')).join('/');
  if (seen.has(boardKey)) problems.push(`DUPLICATE-OF=${seen.get(boardKey)}`);
  seen.set(boardKey, ref.id);

  if (problems.length) failures++;
  console.log(
    `${(problems.length ? `FAIL ${problems.join(',')}` : 'ok').padEnd(26)} ${String(ref.index + 1).padStart(3)} ${ref.id.padEnd(22)} ` +
      `${size}x${size} target=${def.target.toFixed(1)} grade=${grade.score.toFixed(2)} singles=${singles}/${ref.singletons}`
  );
}

console.log(`\nchecked ${TOTAL_LEVELS} levels · failures=${failures} · ${Date.now() - started}ms`);
if (failures > 0) process.exit(1);
