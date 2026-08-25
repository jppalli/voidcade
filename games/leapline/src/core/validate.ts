import { isValidStep } from './grid';

/**
 * Validates that `path` is a complete, legal solution on a `size` x `size`
 * board: every cell visited exactly once, and every consecutive pair of
 * values connected by a legal 1-3 cell orthogonal step.
 */
export function validateFullPath(path: number[], size: number): boolean {
  const maxValue = size * size;
  if (path.length !== maxValue) return false;

  const seen = new Set<number>();
  for (const cell of path) {
    if (cell < 0 || cell >= maxValue) return false;
    if (seen.has(cell)) return false;
    seen.add(cell);
  }
  if (seen.size !== maxValue) return false;

  for (let i = 1; i < path.length; i++) {
    if (!isValidStep(path[i - 1], path[i], size)) return false;
  }
  return true;
}

/**
 * Validates that a partial player sequence (values 1..k, in order, some
 * possibly still unplaced/null) is internally consistent so far: every
 * consecutive pair of *placed* values must be a legal step, and no cell is
 * reused. Used for lightweight move-time validation, distinct from the
 * full-path check run on puzzle completion.
 */
export function validatePartialSequence(cells: Array<number | null>, size: number): boolean {
  const seen = new Set<number>();
  let prev: number | null = null;
  for (const cell of cells) {
    if (cell === null) {
      prev = null; // gap — can't validate the step across an unplaced value
      continue;
    }
    if (seen.has(cell)) return false;
    seen.add(cell);
    if (prev !== null && !isValidStep(prev, cell, size)) return false;
    prev = cell;
  }
  return true;
}
