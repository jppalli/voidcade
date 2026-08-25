import { neighborsInRange } from './grid';
import type { Rng } from './rng';
import { randInt, shuffled } from './rng';

/**
 * Builds a random full Hamiltonian path over every cell of a `size` x `size`
 * board (a legal underlying solution for the puzzle) using randomized
 * Warnsdorff-ordered backtracking: at each step, try unused neighbors in
 * order of fewest remaining options first (breaking ties randomly), which
 * finds long constrained paths far more reliably than plain random DFS and
 * keeps failure/backtrack rates low even as grid size grows.
 *
 * Returns null if no path was found within the node budget (the caller
 * should retry with a fresh Rng draw — this is expected to happen
 * occasionally, especially on larger grids, not a bug).
 */
export function buildRandomHamiltonianPath(
  size: number,
  rng: Rng,
  nodeBudget = 200_000,
): number[] | null {
  const maxValue = size * size;
  const neighborCache: number[][] = [];
  for (let cell = 0; cell < maxValue; cell++) neighborCache.push(neighborsInRange(cell, size));

  const used = new Array<boolean>(maxValue).fill(false);
  const path: number[] = [];
  let nodes = 0;

  function remainingDegree(cell: number): number {
    let deg = 0;
    for (const n of neighborCache[cell]) if (!used[n]) deg++;
    return deg;
  }

  function search(currentCell: number): boolean {
    nodes++;
    if (nodes > nodeBudget) return false;
    path.push(currentCell);
    used[currentCell] = true;

    if (path.length === maxValue) return true;

    const candidates = shuffled(neighborCache[currentCell].filter(n => !used[n]), rng);
    // Warnsdorff: visit the most-constrained neighbor first so we don't
    // strand ourselves in a sparsely-connected corner later.
    candidates.sort((a, b) => remainingDegree(a) - remainingDegree(b));

    for (const next of candidates) {
      if (search(next)) return true;
    }

    path.pop();
    used[currentCell] = false;
    return false;
  }

  const startCell = randInt(rng, maxValue);
  const ok = search(startCell);
  return ok ? path.slice() : null;
}
