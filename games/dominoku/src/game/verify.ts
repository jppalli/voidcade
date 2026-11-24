import { canPlace, createBoard, addPlacement } from './board';
import { MAX_PIP } from './dominoes';
import { countSolutions } from './solver';
import type { Puzzle, Size } from './types';

export const DOMINOES_FOR: Record<Size, number> = { 2: 2, 4: 8, 6: 18 };

/** Returns a list of problems. An empty list means the puzzle is valid and has exactly one solution. */
export function verifyPuzzle(p: Puzzle): string[] {
  const errors: string[] = [];
  const n = p.size;
  if (![2, 4, 6].includes(n)) return [`bad size ${n}`];
  if (p.rowTargets.length !== n || p.colTargets.length !== n) errors.push('target count does not match size');
  if (p.tiles.length !== DOMINOES_FOR[n]) errors.push(`expected ${DOMINOES_FOR[n]} dominoes, got ${p.tiles.length}`);
  if (new Set(p.tiles.map((t) => t.id)).size !== p.tiles.length) errors.push('duplicate dominoes');
  for (const t of p.tiles) {
    if (t.a < 0 || t.b < 0 || t.a > MAX_PIP || t.b > MAX_PIP || t.a > t.b || t.id !== `${t.a}-${t.b}`) errors.push(`bad domino ${t.id}`);
  }
  if (errors.length) return errors;

  let board = createBoard(p);
  board = { ...board, locked: [] };
  for (const l of p.locked) {
    if (!canPlace(board, l)) {
      errors.push(`locked domino ${l.tile} is invalid or overlaps`);
      break;
    }
    board = addPlacement(board, l);
  }
  if (errors.length) return errors;

  const sum = (xs: number[]) => xs.reduce((s, v) => s + v, 0);
  if (sum(p.rowTargets) !== sum(p.colTargets)) errors.push('row and column targets have different totals');

  const result = countSolutions(p, 2, 5_000_000);
  if (result.aborted) errors.push('solver ran out of budget');
  else if (result.count !== 1) errors.push(`expected exactly 1 solution, found ${result.count}`);
  return errors;
}