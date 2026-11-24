import { describe, expect, it } from 'vitest';
import { cellsOf, parseTile } from '../src/game/dominoes';
import { countSolutions } from '../src/game/solver';
import { p, puzzle, TINY } from './helpers';

/** Slow but obviously correct: try every tiling, tile assignment and pip order on a 2x2 or 4x4 grid. */
function bruteForce(pz: ReturnType<typeof puzzle>): number {
  const n = pz.size;
  const lockedIds = new Set(pz.locked.map((l) => l.tile));
  const free = pz.tiles.filter((t) => !lockedIds.has(t.id));
  const base = new Array<number>(n * n).fill(-1);
  for (const l of pz.locked) for (const c of cellsOf(pz.tiles.find((t) => t.id === l.tile)!, l)) base[c.row * n + c.col] = c.pip;
  let count = 0;
  const go = (grid: number[], used: boolean[]) => {
    const i = grid.indexOf(-1);
    if (i < 0) {
      const rows = new Array<number>(n).fill(0);
      const cols = new Array<number>(n).fill(0);
      grid.forEach((v, k) => {
        rows[Math.floor(k / n)] += v;
        cols[k % n] += v;
      });
      if (rows.every((v, k) => v === pz.rowTargets[k]) && cols.every((v, k) => v === pz.colTargets[k])) count++;
      return;
    }
    free.forEach((t, k) => {
      if (used[k]) return;
      for (const [x, y] of t.a === t.b ? [[t.a, t.b]] : [[t.a, t.b], [t.b, t.a]]) {
        for (const j of [i + 1, i + n]) {
          if (j === i + 1 ? (i % n) + 1 >= n || grid[j] >= 0 : i + n >= n * n) continue;
          const g = grid.slice();
          g[i] = x;
          g[j] = y;
          const u = used.slice();
          u[k] = true;
          go(g, u);
        }
      }
    });
  };
  go(base, new Array<boolean>(free.length).fill(false));
  return count;
}

describe('solver', () => {
  it('finds the one solution of a tiny puzzle', () => {
    expect(countSolutions(TINY, 5).count).toBe(1);
  });

  it('counts two when the puzzle is ambiguous', () => {
    // Row 0 holds 0-1 and row 1 holds 2-3, and either pip order gives column sums of 3 and 3.
    const ambiguous = puzzle(2, ['0-1', '2-3'], [1, 5], [3, 3]);
    expect(bruteForce(ambiguous)).toBeGreaterThan(1);
    expect(countSolutions(ambiguous, 2).count).toBe(2);
  });

  it('returns 0 when there is no solution', () => {
    expect(countSolutions(puzzle(2, ['1-2', '3-4'], [9, 9], [9, 9])).count).toBe(0);
  });

  it('respects locked dominoes', () => {
    const locked = puzzle(2, ['1-2', '3-4'], [3, 7], [4, 6], [p('1-2', 0, 0, 0)]);
    expect(countSolutions(locked).count).toBe(1);
    const wrong = puzzle(2, ['1-2', '3-4'], [3, 7], [4, 6], [p('1-2', 0, 0, 2)]);
    expect(countSolutions(wrong).count).toBe(0);
  });

  it('reports an aborted search', () => {
    const big = puzzle(4, ['0-0', '0-1', '0-2', '0-3', '0-4', '0-5', '0-6', '1-1'], [6, 6, 6, 6], [6, 6, 6, 6]);
    const r = countSolutions(big, 2, 3);
    expect(r.aborted).toBe(true);
  });

  it('agrees with a brute-force count on random small puzzles', () => {
    let seed = 99;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let k = 0; k < 40; k++) {
      const ids = new Set<string>();
      while (ids.size < 2) {
        const a = Math.floor(rnd() * 5);
        const b = Math.floor(rnd() * 5);
        ids.add(a <= b ? `${a}-${b}` : `${b}-${a}`);
      }
      const rows = [Math.floor(rnd() * 9), Math.floor(rnd() * 9)];
      const cols = [Math.floor(rnd() * 9), Math.floor(rnd() * 9)];
      const pz = puzzle(2, [...ids], rows, cols);
      expect(countSolutions(pz, 1000).count).toBe(bruteForce(pz));
    }
    // and on a 4x4 with a few locked dominoes
    const four = puzzle(4, ['0-1', '0-2', '1-3', '2-2', '3-4', '1-1', '0-4', '2-5'], [5, 7, 6, 8], [6, 7, 7, 6], [p('0-1', 0, 0, 0), p('2-2', 2, 0, 1)]);
    expect(countSolutions(four, 100000).count).toBe(bruteForce(four));
    void parseTile;
  });
});