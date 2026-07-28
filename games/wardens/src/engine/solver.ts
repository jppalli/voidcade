import type { Position } from './types';

/** True if two cells are the same or touch (including diagonally). */
export function isAdjacent(a: Position, b: Position): boolean {
  return Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1;
}

/**
 * Counts solutions to a Wardens puzzle, stopping early once `limit` is
 * reached (we only ever need to know "0", "1", or "more than 1").
 *
 * A solution places exactly one warden per row, one per column, one per
 * region, with no two wardens adjacent (including diagonally).
 */
export function countSolutions(
  regions: number[][],
  size: number,
  limit = 2
): number {
  const colUsed = new Array(size).fill(false);
  const regionUsed = new Array(size).fill(false);
  const placed: Position[] = [];
  let count = 0;

  function backtrack(row: number) {
    if (count >= limit) return;
    if (row === size) {
      count++;
      return;
    }
    for (let col = 0; col < size; col++) {
      if (colUsed[col]) continue;
      const region = regions[row][col];
      if (regionUsed[region]) continue;
      const cand: Position = { row, col };
      if (placed.some((p) => isAdjacent(p, cand))) continue;

      colUsed[col] = true;
      regionUsed[region] = true;
      placed.push(cand);

      backtrack(row + 1);

      placed.pop();
      colUsed[col] = false;
      regionUsed[region] = false;

      if (count >= limit) return;
    }
  }

  backtrack(0);
  return count;
}

export function hasUniqueSolution(regions: number[][], size: number): boolean {
  return countSolutions(regions, size, 2) === 1;
}

/**
 * Finds the (assumed unique) solution. Used by generation to sanity check,
 * and can double as a hint source later.
 */
export function findSolution(regions: number[][], size: number): Position[] | null {
  const colUsed = new Array(size).fill(false);
  const regionUsed = new Array(size).fill(false);
  const placed: Position[] = [];

  function backtrack(row: number): Position[] | null {
    if (row === size) return placed.slice();
    for (let col = 0; col < size; col++) {
      if (colUsed[col]) continue;
      const region = regions[row][col];
      if (regionUsed[region]) continue;
      const cand: Position = { row, col };
      if (placed.some((p) => isAdjacent(p, cand))) continue;

      colUsed[col] = true;
      regionUsed[region] = true;
      placed.push(cand);

      const result = backtrack(row + 1);
      if (result) return result;

      placed.pop();
      colUsed[col] = false;
      regionUsed[region] = false;
    }
    return null;
  }

  return backtrack(0);
}

/**
 * Given the current board marks (which cells the player has marked as
 * warden/x/empty), returns cells that are "definitely wrong" — i.e. cells
 * that cannot hold a warden in ANY valid solution consistent with the
 * wardens already placed. Used by the Banish boon and mistake detection.
 *
 * This is intentionally simple: a cell is safe-to-eliminate if placing a
 * warden there directly conflicts (same row/col/region/adjacency) with an
 * already-placed warden. It does not do deep constraint propagation.
 */
export function cellConflictsWithPlaced(
  cell: Position,
  region: number,
  regions: number[][],
  placedWardens: Position[]
): boolean {
  for (const w of placedWardens) {
    if (w.row === cell.row && w.col === cell.col) continue;
    if (w.row === cell.row) return true;
    if (w.col === cell.col) return true;
    if (regions[w.row][w.col] === region) return true;
    if (isAdjacent(w, cell)) return true;
  }
  return false;
}
