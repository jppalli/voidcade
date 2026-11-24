import { cellsOf, MAX_PIP } from './dominoes';
import type { Puzzle } from './types';

export interface SolveResult {
  /** Number of solutions found, never more than the limit. */
  count: number;
  /** True when the node budget ran out, so the count may be too low. */
  aborted: boolean;
  nodes: number;
}

/**
 * Counts the ways to place the tray dominoes so the grid is full and every row and column
 * hits its target. Stops at `limit` solutions (2 is enough to prove uniqueness).
 *
 * Cells are filled in row-major order. The first empty cell is always the top-left cell of
 * its domino, so the domino goes right or down, in either pip order.
 */
export function countSolutions(puzzle: Puzzle, limit = 2, maxNodes = Infinity): SolveResult {
  const n = puzzle.size;
  const grid = new Int8Array(n * n).fill(-1);
  const rowSum = new Array<number>(n).fill(0);
  const colSum = new Array<number>(n).fill(0);
  const rowLeft = new Array<number>(n).fill(n);
  const colLeft = new Array<number>(n).fill(n);

  const set = (i: number, v: number) => {
    const r = (i / n) | 0;
    const c = i % n;
    grid[i] = v;
    rowSum[r] += v;
    colSum[c] += v;
    rowLeft[r]--;
    colLeft[c]--;
  };
  const clear = (i: number) => {
    const r = (i / n) | 0;
    const c = i % n;
    const v = grid[i];
    grid[i] = -1;
    rowSum[r] -= v;
    colSum[c] -= v;
    rowLeft[r]++;
    colLeft[c]++;
  };
  const lineOk = (i: number) => {
    const r = (i / n) | 0;
    const c = i % n;
    const rt = puzzle.rowTargets[r];
    const ct = puzzle.colTargets[c];
    return (
      rowSum[r] <= rt &&
      colSum[c] <= ct &&
      rowSum[r] + MAX_PIP * rowLeft[r] >= rt &&
      colSum[c] + MAX_PIP * colLeft[c] >= ct &&
      (rowLeft[r] > 0 || rowSum[r] === rt) &&
      (colLeft[c] > 0 || colSum[c] === ct)
    );
  };

  const byId = new Map(puzzle.tiles.map((t) => [t.id, t]));
  const lockedIds = new Set(puzzle.locked.map((p) => p.tile));
  for (const p of puzzle.locked) {
    const tile = byId.get(p.tile);
    if (!tile) return { count: 0, aborted: false, nodes: 0 };
    for (const c of cellsOf(tile, p)) {
      if (grid[c.row * n + c.col] >= 0) return { count: 0, aborted: false, nodes: 0 };
      set(c.row * n + c.col, c.pip);
    }
  }
  const free = puzzle.tiles.filter((t) => !lockedIds.has(t.id));
  const used = new Array<boolean>(free.length).fill(false);

  let count = 0;
  let nodes = 0;
  let aborted = false;

  const rec = (start: number): void => {
    if (count >= limit || aborted) return;
    if (++nodes > maxNodes) {
      aborted = true;
      return;
    }
    let i = start;
    while (i < n * n && grid[i] >= 0) i++;
    if (i === n * n) {
      count++;
      return;
    }
    const r = (i / n) | 0;
    const c = i % n;
    for (let t = 0; t < free.length; t++) {
      if (used[t]) continue;
      const { a, b } = free[t];
      const orders: [number, number][] = a === b ? [[a, b]] : [[a, b], [b, a]];
      for (const [x, y] of orders) {
        for (const j of [i + 1, i + n]) {
          if (j === i + 1 ? c + 1 >= n || grid[j] >= 0 : r + 1 >= n) continue;
          set(i, x);
          set(j, y);
          if (lineOk(i) && lineOk(j)) {
            used[t] = true;
            rec(i + 1);
            used[t] = false;
          }
          clear(j);
          clear(i);
          if (count >= limit || aborted) return;
        }
      }
    }
  };
  rec(0);
  return { count, aborted, nodes };
}