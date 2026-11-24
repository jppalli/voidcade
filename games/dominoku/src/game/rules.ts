import { cellMap, totals, type Board } from './board';
import type { Puzzle } from './types';

export type LineStatus = 'short' | 'match' | 'over';

export function lineStatus(total: number, target: number): LineStatus {
  if (total < target) return 'short';
  return total === target ? 'match' : 'over';
}

/** The grid is full and every row and column adds up to its target. */
export function isSolved(board: Board, puzzle: Puzzle): boolean {
  if (cellMap(board).some((c) => c === null)) return false;
  const t = totals(board);
  return t.rows.every((v, i) => v === puzzle.rowTargets[i]) && t.cols.every((v, i) => v === puzzle.colTargets[i]);
}