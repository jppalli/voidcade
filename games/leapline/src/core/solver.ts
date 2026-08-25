import { neighborsInRange } from './grid';
import type { GivenClue } from './types';

export interface SolveResult {
  /** Number of complete solutions found, capped at `cap` (default 2). */
  count: number;
  /** True if the search hit the node budget before exhausting the space —
   *  the count is then a lower bound, not exact, and must be treated as
   *  "unknown" (never as proof of uniqueness). */
  exhaustedBudget: boolean;
  /** The first complete solution found, if any (solution[v-1] = cell). */
  firstSolution: number[] | null;
}

const DEFAULT_NODE_BUDGET = 400_000;

/**
 * Counts Hamiltonian paths (value 1..maxValue over all cells, each
 * consecutive pair a legal 1-3 orthogonal step) consistent with `givens`,
 * stopping early once `cap` solutions are found (we only ever need to
 * distinguish 0 / 1 / "more than 1").
 *
 * Uses Warnsdorff-style ordering (try the most-constrained next cell
 * first) purely as a search heuristic — it does not change correctness,
 * only how quickly solutions/dead-ends are found.
 */
export function countSolutions(
  size: number,
  givens: GivenClue[],
  cap = 2,
  nodeBudget = DEFAULT_NODE_BUDGET,
): SolveResult {
  const maxValue = size * size;
  const cellToValue = new Map<number, number>();
  const valueToCell = new Map<number, number>();
  for (const g of givens) {
    cellToValue.set(g.cell, g.value);
    valueToCell.set(g.value, g.cell);
  }

  const used = new Array<boolean>(maxValue).fill(false);
  const path = new Array<number>(maxValue).fill(-1);
  let count = 0;
  let nodes = 0;
  let exhaustedBudget = false;
  let firstSolution: number[] | null = null;

  // Precompute each cell's in-range neighbor list once.
  const neighborCache: number[][] = [];
  for (let cell = 0; cell < maxValue; cell++) neighborCache.push(neighborsInRange(cell, size));

  function remainingDegree(cell: number): number {
    let deg = 0;
    for (const n of neighborCache[cell]) if (!used[n]) deg++;
    return deg;
  }

  function search(value: number, currentCell: number): void {
    if (count >= cap || exhaustedBudget) return;
    nodes++;
    if (nodes > nodeBudget) {
      exhaustedBudget = true;
      return;
    }

    if (value === maxValue) {
      count++;
      if (!firstSolution) firstSolution = path.slice();
      return;
    }

    const forcedCell = valueToCell.get(value + 1);
    if (forcedCell !== undefined) {
      // The next value is a given — it must sit at that exact cell, so
      // there's only one branch to try (if it's actually reachable).
      if (used[forcedCell]) return;
      if (!neighborCache[currentCell].includes(forcedCell)) return;
      used[forcedCell] = true;
      path[value] = forcedCell;
      search(value + 1, forcedCell);
      used[forcedCell] = false;
      path[value] = -1;
      return;
    }

    // Otherwise branch over every unused legal neighbor, most-constrained first.
    const candidates = neighborCache[currentCell].filter(n => !used[n] && !cellToValue.has(n));
    candidates.sort((a, b) => remainingDegree(a) - remainingDegree(b));

    for (const next of candidates) {
      used[next] = true;
      path[value] = next;
      search(value + 1, next);
      used[next] = false;
      path[value] = -1;
      if (count >= cap || exhaustedBudget) return;
    }
  }

  const startCell = valueToCell.get(1);
  if (startCell !== undefined) {
    used[startCell] = true;
    path[0] = startCell;
    search(1, startCell);
  } else {
    // No given pins value 1 — try every cell as a starting point.
    for (let cell = 0; cell < maxValue; cell++) {
      if (cellToValue.has(cell) && cellToValue.get(cell) !== 1) continue;
      used[cell] = true;
      path[0] = cell;
      search(1, cell);
      used[cell] = false;
      path[0] = -1;
      if (count >= cap || exhaustedBudget) break;
    }
  }

  return { count, exhaustedBudget, firstSolution };
}

/**
 * True only when the search *provably* found exactly one solution (the
 * node budget was never hit). If the budget was exhausted, the caller
 * must treat uniqueness as unknown and reject the puzzle rather than risk
 * shipping an ambiguous or unsolvable board.
 */
export function isProvablyUnique(size: number, givens: GivenClue[], nodeBudget?: number): boolean {
  const result = countSolutions(size, givens, 2, nodeBudget);
  return !result.exhaustedBudget && result.count === 1;
}
