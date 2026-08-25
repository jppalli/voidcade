/**
 * Grid geometry and movement rules shared by the generator, solver and UI.
 * All movement is orthogonal (no diagonals) with a step length of 1, 2 or 3.
 */

export interface RC {
  r: number;
  c: number;
}

export const MIN_STEP = 1;
export const MAX_STEP = 3;

export function toRC(index: number, size: number): RC {
  return { r: Math.floor(index / size), c: index % size };
}

export function toIndex(r: number, c: number, size: number): number {
  return r * size + c;
}

export function inBounds(r: number, c: number, size: number): boolean {
  return r >= 0 && r < size && c >= 0 && c < size;
}

/** Manhattan distance between two cell indices. */
export function manhattan(a: number, b: number, size: number): number {
  const pa = toRC(a, size);
  const pb = toRC(b, size);
  return Math.abs(pa.r - pb.r) + Math.abs(pa.c - pb.c);
}

/**
 * The step "distance" between two cells if they form a legal orthogonal
 * move (same row XOR same column, with a 1-3 cell gap); null otherwise.
 * This is the value used to derive each cell's visual distance clue.
 */
export function stepDistance(a: number, b: number, size: number): number | null {
  const pa = toRC(a, size);
  const pb = toRC(b, size);
  const dr = pa.r - pb.r;
  const dc = pa.c - pb.c;
  if (dr !== 0 && dc !== 0) return null; // diagonal or non-aligned — illegal
  const dist = Math.abs(dr) + Math.abs(dc);
  if (dist < MIN_STEP || dist > MAX_STEP) return null;
  return dist;
}

export function isValidStep(a: number, b: number, size: number): boolean {
  return stepDistance(a, b, size) !== null;
}

/**
 * All cell indices reachable from `cell` by one legal orthogonal step
 * (distance 1, 2 or 3 in exactly one of the four directions).
 */
export function neighborsInRange(cell: number, size: number): number[] {
  const { r, c } = toRC(cell, size);
  const out: number[] = [];
  const dirs: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dr, dc] of dirs) {
    for (let step = MIN_STEP; step <= MAX_STEP; step++) {
      const nr = r + dr * step;
      const nc = c + dc * step;
      if (inBounds(nr, nc, size)) out.push(toIndex(nr, nc, size));
    }
  }
  return out;
}
