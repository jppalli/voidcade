import { createSeededRandom, shuffle, type RNG } from './rng';
import { countSolutions, findSolutionExcluding, isAdjacent } from './solver';
import type { Position, PuzzleBoard } from './types';

const DIRS4 = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

/**
 * Step 1: a valid solution — N positions, one per row, one per column, none
 * adjacent (including diagonally). Randomized backtracking so different seeds
 * produce different layouts.
 */
function generateSolutionPositions(size: number, rng: RNG): Position[] | null {
  const placed: Position[] = [];
  const colUsed = new Array(size).fill(false);

  function backtrack(row: number): boolean {
    if (row === size) return true;
    for (const col of shuffle(
      Array.from({ length: size }, (_, i) => i),
      rng
    )) {
      if (colUsed[col]) continue;
      const cand: Position = { row, col };
      if (placed.some((p) => isAdjacent(p, cand))) continue;

      colUsed[col] = true;
      placed.push(cand);
      if (backtrack(row + 1)) return true;
      placed.pop();
      colUsed[col] = false;
    }
    return false;
  }

  return backtrack(0) ? placed.slice() : null;
}

/**
 * Uneven target size per region (summing to the whole board). Varied region
 * sizes look far better than N near-identical blobs, and they also constrain
 * the puzzle more, which makes a unique solution much easier to reach —
 * uniform regions leave lots of alternate solutions to grind away.
 */
function pickTargetSizes(size: number, rng: RNG, minRegionSize: number): number[] {
  const floor = Math.max(1, minRegionSize);
  const targets = new Array(size).fill(floor);
  let remaining = size * size - size * floor;
  const pool = remaining;
  const weights = Array.from({ length: size }, () => 0.35 + rng() * rng() * 2.2);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  for (let i = 0; i < size && remaining > 0; i++) {
    const give = Math.min(Math.floor((weights[i] / totalWeight) * pool), remaining);
    targets[i] += give;
    remaining -= give;
  }
  let i = 0;
  while (remaining > 0) {
    targets[i % size]++;
    remaining--;
    i++;
  }
  return targets;
}

/**
 * Step 2: grow regions outward from the solution cells via randomized BFS, so
 * every region contains exactly one solution cell and shapes look organic
 * rather than boxy.
 */
function growRegions(size: number, solution: Position[], rng: RNG, minRegionSize: number): number[][] {
  const regions: number[][] = Array.from({ length: size }, () => new Array(size).fill(-1));
  const frontiers: Position[][] = solution.map((p) => [p]);
  const targets = pickTargetSizes(size, rng, minRegionSize);
  const grown = new Array(size).fill(1);

  solution.forEach((p, idx) => {
    regions[p.row][p.col] = idx;
  });

  let remaining = size * size - solution.length;
  let guard = 0;
  const guardMax = size * size * 200;

  while (remaining > 0 && guard++ < guardMax) {
    let grewAny = false;

    for (const regionIdx of shuffle(
      Array.from({ length: solution.length }, (_, i) => i),
      rng
    )) {
      if (remaining <= 0) break;
      const frontier = frontiers[regionIdx];
      if (frontier.length === 0) continue;
      if (grown[regionIdx] >= targets[regionIdx] && grown.some((g, i) => g < targets[i])) continue;

      const candidates: Position[] = [];
      for (const cell of frontier) {
        for (const { dr, dc } of DIRS4) {
          const nr = cell.row + dr;
          const nc = cell.col + dc;
          if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
          if (regions[nr][nc] !== -1) continue;
          candidates.push({ row: nr, col: nc });
        }
      }
      if (candidates.length === 0) {
        frontiers[regionIdx] = [];
        continue;
      }

      const pick = candidates[Math.floor(rng() * candidates.length)];
      if (regions[pick.row][pick.col] !== -1) continue;

      regions[pick.row][pick.col] = regionIdx;
      frontiers[regionIdx].push(pick);
      grown[regionIdx]++;
      remaining--;
      grewAny = true;
    }

    if (!grewAny) {
      fillLeftoverCells(size, regions);
      remaining = 0;
    }
  }

  return regions;
}

function fillLeftoverCells(size: number, regions: number[][]) {
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (regions[r][c] !== -1) continue;
        for (const { dr, dc } of DIRS4) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
          if (regions[nr][nc] !== -1) {
            regions[r][c] = regions[nr][nc];
            changed = true;
            break;
          }
        }
      }
    }
  }
}

function regionCells(regions: number[][], size: number, regionIdx: number): Position[] {
  const out: Position[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (regions[r][c] === regionIdx) out.push({ row: r, col: c });
    }
  }
  return out;
}

/**
 * A region must be one orthogonally-connected blob — no stray islands of the
 * same colour floating elsewhere on the board. Every mutation during repair is
 * validated against this.
 */
export function isRegionConnected(regions: number[][], size: number, regionIdx: number): boolean {
  const cells = regionCells(regions, size, regionIdx);
  if (cells.length === 0) return false;

  const seen = new Set<number>([cells[0].row * size + cells[0].col]);
  const queue: Position[] = [cells[0]];
  while (queue.length > 0) {
    const cur = queue.pop()!;
    for (const { dr, dc } of DIRS4) {
      const nr = cur.row + dr;
      const nc = cur.col + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      if (regions[nr][nc] !== regionIdx) continue;
      const key = nr * size + nc;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ row: nr, col: nc });
    }
  }
  return seen.size === cells.length;
}

/** True if every region on the board is a single connected blob. */
export function allRegionsConnected(regions: number[][], size: number): boolean {
  for (let i = 0; i < size; i++) {
    if (!isRegionConnected(regions, size, i)) return false;
  }
  return true;
}

/**
 * Moves one cell into `toIdx`, but only if the result keeps both the source
 * and destination regions connected and leaves the source at/above the floor.
 * Returns false (having changed nothing) when the move isn't legal.
 */
function tryMoveCell(
  regions: number[][],
  size: number,
  cell: Position,
  toIdx: number,
  minRegionSize: number
): boolean {
  const from = regions[cell.row][cell.col];
  if (from === toIdx) return false;
  if (regionCells(regions, size, from).length <= Math.max(1, minRegionSize)) return false;

  regions[cell.row][cell.col] = toIdx;
  if (!isRegionConnected(regions, size, from) || !isRegionConnected(regions, size, toIdx)) {
    regions[cell.row][cell.col] = from; // revert
    return false;
  }
  return true;
}

/**
 * Step 3: repair towards uniqueness. Repeatedly find an alternate solution and
 * reassign one of its cells to a neighbouring region so that alternate becomes
 * invalid, never touching a true-solution cell. Targeting the alternate that
 * was actually found converges far faster than random hill-climbing.
 */
function repairToUnique(
  regions: number[][],
  size: number,
  trueSolution: Position[],
  rng: RNG,
  maxSteps: number,
  minRegionSize: number
): boolean {
  const trueSet = new Set(trueSolution.map((p) => p.row * size + p.col));

  for (let step = 0; step < maxSteps; step++) {
    const alt = findSolutionExcluding(regions, size, trueSolution);
    if (!alt) return true; // unique

    const movable = shuffle(
      alt.filter((p) => !trueSet.has(p.row * size + p.col)),
      rng
    );

    // An alternate dies as soon as two of its cells share a region.
    let moved = false;
    for (const cell of movable) {
      for (const { dr, dc } of shuffle(DIRS4, rng)) {
        const nr = cell.row + dr;
        const nc = cell.col + dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        const neighborRegion = regions[nr][nc];
        if (neighborRegion === regions[cell.row][cell.col]) continue;

        const usedByOtherAltCell = alt.some(
          (p) => (p.row !== cell.row || p.col !== cell.col) && regions[p.row][p.col] === neighborRegion
        );
        if (!usedByOtherAltCell) continue;

        if (tryMoveCell(regions, size, cell, neighborRegion, minRegionSize)) {
          moved = true;
          break;
        }
      }
      if (moved) break;
    }

    // No legal move for this layout — let the caller regrow fresh regions
    // rather than breaking connectivity to force progress.
    if (!moved) return false;
  }

  return countSolutions(regions, size, 2) === 1 && allRegionsConnected(regions, size);
}

/**
 * Shrinks up to `count` regions to a single cell — their own solution cell — by
 * donating the rest to adjacent regions. A one-cell region is a gift to the
 * player: its piece position is immediately certain, which gives early levels a
 * guaranteed foothold. Each donation is validated for connectivity and
 * re-checked for uniqueness, and reverted if it breaks either.
 */
function carveSingletonRegions(
  regions: number[][],
  size: number,
  solution: Position[],
  rng: RNG,
  count: number
): void {
  let made = 0;

  for (const regionIdx of shuffle(
    Array.from({ length: size }, (_, i) => i),
    rng
  )) {
    if (made >= count) return;

    const anchor = solution.find((p) => regions[p.row][p.col] === regionIdx);
    if (!anchor) continue;

    let reducedFully = true;
    for (let pass = 0; pass < size * size; pass++) {
      const cells = regionCells(regions, size, regionIdx).filter(
        (p) => p.row !== anchor.row || p.col !== anchor.col
      );
      if (cells.length === 0) break;

      let donated = false;
      for (const cell of shuffle(cells, rng)) {
        for (const { dr, dc } of shuffle(DIRS4, rng)) {
          const nr = cell.row + dr;
          const nc = cell.col + dc;
          if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
          const target = regions[nr][nc];
          if (target === regionIdx) continue;

          const before = regions[cell.row][cell.col];
          // Floor of 1: carving to a single cell is the whole point here.
          if (!tryMoveCell(regions, size, cell, target, 1)) continue;

          // Enlarging the neighbour can introduce new solutions.
          if (countSolutions(regions, size, 2) !== 1) {
            regions[cell.row][cell.col] = before;
            continue;
          }
          donated = true;
          break;
        }
        if (donated) break;
      }

      if (!donated) {
        reducedFully = false;
        break;
      }
    }

    if (reducedFully && regionCells(regions, size, regionIdx).length === 1) made++;
  }
}

export interface GenerateOptions {
  size: number;
  seed: number;
  /** how many regions to try to shrink to a single cell (early-level help) */
  singletonRegions?: number;
  /** floor on region size; use 2+ to prevent accidental free gifts */
  minRegionSize?: number;
  maxSolutionAttempts?: number;
  maxRegionAttempts?: number;
  maxRepairSteps?: number;
}

// Generation is deterministic per options, so results are safe to memoize.
// Large boards can take a few hundred milliseconds to prove unique; caching
// keeps revisiting a level instant.
const cache = new Map<string, PuzzleBoard>();

/**
 * Generates a board with exactly one solution and fully connected regions.
 */
export function generatePuzzle(opts: GenerateOptions): PuzzleBoard {
  const key = `${opts.size}|${opts.seed}|${opts.singletonRegions ?? 0}|${opts.minRegionSize ?? 1}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const board = generateUncached(opts);
  cache.set(key, board);
  return board;
}

function generateUncached(opts: GenerateOptions): PuzzleBoard {
  const { size, seed } = opts;
  const singletons = opts.singletonRegions ?? 0;
  // Carving singletons requires allowing size-1 regions; otherwise honour the floor.
  const minRegionSize = singletons > 0 ? 1 : Math.max(1, opts.minRegionSize ?? 1);
  const maxSolutionAttempts = opts.maxSolutionAttempts ?? 25;
  const maxRegionAttempts = opts.maxRegionAttempts ?? 60;
  const maxRepairSteps = opts.maxRepairSteps ?? 300;

  const rng = createSeededRandom(seed);

  for (let sAttempt = 0; sAttempt < maxSolutionAttempts; sAttempt++) {
    const solution = generateSolutionPositions(size, rng);
    if (!solution) continue;

    for (let rAttempt = 0; rAttempt < maxRegionAttempts; rAttempt++) {
      const regions = growRegions(size, solution, rng, minRegionSize);
      if (!repairToUnique(regions, size, solution, rng, maxRepairSteps, minRegionSize)) continue;

      if (singletons > 0) carveSingletonRegions(regions, size, solution, rng, singletons);

      // Final gate: unique solution AND every region a single connected blob.
      if (countSolutions(regions, size, 2) !== 1) continue;
      if (!allRegionsConnected(regions, size)) continue;

      return { size, regions, solution };
    }
  }

  // Extremely unlikely fallback: plain row-banded regions around a fresh
  // solution. Always valid and unique, just visually plain.
  const fallbackSolution = generateSolutionPositions(size, createSeededRandom(seed + 1)) ?? [];
  return {
    size,
    regions: Array.from({ length: size }, (_, r) => new Array(size).fill(r)),
    solution: fallbackSolution,
  };
}
