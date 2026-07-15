// Generates Shikaku puzzles: recursively partitions the grid into rectangles
// (the ground-truth solution), drops one clue per rectangle at a random cell,
// then verifies the clue set has a *unique* solution via the solver. Retries
// with fresh partitions/seeds until a valid puzzle is found.

import { hasUniqueSolution } from "./solver.js";

// Minimum area any region (and therefore any clue value) is allowed to have.
// Set to 2 so no clue is ever "1" — a 1-cell region gives away its own
// answer for free, which makes the puzzle trivially easier in that spot.
const MIN_REGION_AREA = 2;

/**
 * Given a fixed cross-dimension `fixed` (the height for a vertical cut, or
 * the width for a horizontal cut) and the free dimension's length `len`,
 * returns the inclusive [minCut, maxCut] range of split offsets (1..len-1)
 * for which BOTH resulting pieces have area >= MIN_REGION_AREA. Returns
 * null if no valid cut exists (i.e. this rect can't be split on this axis
 * without producing an under-sized region).
 */
function validCutRange(fixed, len) {
  const minSide = Math.max(1, Math.ceil(MIN_REGION_AREA / fixed));
  const lo = minSide;
  const hi = len - minSide;
  if (lo > hi) return null;
  return [lo, hi];
}

function splitRect(rect, rng, minArea) {
  const { top, left, bottom, right } = rect;
  const w = right - left + 1;
  const h = bottom - top + 1;
  const area = w * h;

  if (area <= minArea) return [rect];
  // Stop splitting with increasing probability as we approach minArea, for size variety.
  const stopChance = Math.max(0, 0.5 - (area - minArea) * 0.08);
  if (rng() < stopChance) return [rect];

  const vRange = w > 1 ? validCutRange(h, w) : null; // vertical cut needs w>1
  const hRange = h > 1 ? validCutRange(w, h) : null; // horizontal cut needs h>1

  if (!vRange && !hRange) return [rect]; // can't split without an undersized piece

  let splitVertical;
  if (vRange && hRange) splitVertical = rng() < 0.5;
  else splitVertical = !!vRange;

  if (splitVertical) {
    const [lo, hi] = vRange;
    const offset = lo + Math.floor(rng() * (hi - lo + 1));
    const cut = left + offset;
    const a = { top, left, bottom, right: cut - 1 };
    const b = { top, left: cut, bottom, right };
    return [...splitRect(a, rng, minArea), ...splitRect(b, rng, minArea)];
  } else {
    const [lo, hi] = hRange;
    const offset = lo + Math.floor(rng() * (hi - lo + 1));
    const cut = top + offset;
    const a = { top, left, bottom: cut - 1, right };
    const b = { top: cut, left, bottom, right };
    return [...splitRect(a, rng, minArea), ...splitRect(b, rng, minArea)];
  }
}

function partitionGrid(width, height, rng, minArea) {
  const full = { top: 0, left: 0, bottom: height - 1, right: width - 1 };
  return splitRect(full, rng, minArea);
}

function placeClueForRect(rect, rng) {
  const w = rect.right - rect.left + 1;
  const h = rect.bottom - rect.top + 1;
  const row = rect.top + Math.floor(rng() * h);
  const col = rect.left + Math.floor(rng() * w);
  return { row, col, value: w * h };
}

// Larger minimum area -> fewer, bigger regions -> fewer, bigger clue numbers.
// Counterintuitively, that's what makes a Shikaku puzzle HARDER, not easier:
// a clue of 2 can only ever be a 1x2 rectangle (one possible shape), while a
// clue of 8 could be 1x8, 2x4, 4x2, or 8x1 — more shapes to disambiguate
// using neighbouring clues, which is where the actual difficulty comes from.
const DIFFICULTY_MIN_AREA = {
  easy: 4,
  medium: 5,
  hard: 8,
};

export function generatePuzzle({ width, height, rng, difficulty = "medium", maxAttempts = 60 }) {
  const minArea = DIFFICULTY_MIN_AREA[difficulty] ?? 2;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rects = partitionGrid(width, height, rng, minArea);
    if (rects.length < 2) continue;

    const clues = rects.map((r) => placeClueForRect(r, rng));

    // Two clues could accidentally land in the same rectangle only if a rect
    // is 1x1 next to another 1x1 -- guard: ensure one clue per rect index.
    const seenCells = new Set();
    let collision = false;
    for (const c of clues) {
      const key = `${c.row},${c.col}`;
      if (seenCells.has(key)) { collision = true; break; }
      seenCells.add(key);
    }
    if (collision) continue;

    const { unique, solution } = hasUniqueSolution(width, height, clues);
    if (!unique) continue;

    return {
      width,
      height,
      clues,
      solutionRects: solution.map((rect, i) => ({ ...rect, clue: clues[i] })),
    };
  }

  return null;
}
