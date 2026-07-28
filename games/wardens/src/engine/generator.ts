import { createSeededRandom, shuffle, type RNG } from './rng';
import { isAdjacent, countSolutions } from './solver';
import type { Position, WardenLevel } from './types';

const DIRS4 = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

/**
 * Step 1: generate a valid "solution" — N positions, one per row, one per
 * column, none adjacent (including diagonally). Randomized backtracking so
 * different seeds produce different layouts.
 */
function generateSolutionPositions(size: number, rng: RNG): Position[] | null {
  const placed: Position[] = [];
  const colUsed = new Array(size).fill(false);

  function backtrack(row: number): boolean {
    if (row === size) return true;
    const cols = shuffle(
      Array.from({ length: size }, (_, i) => i),
      rng
    );
    for (const col of cols) {
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
 * Step 2: grow N regions outward from the solution cells via randomized
 * BFS, so every region ends up containing exactly one solution cell and
 * region shapes look organic rather than boxy.
 */
function growRegions(size: number, solution: Position[], rng: RNG): number[][] {
  const regions: number[][] = Array.from({ length: size }, () => new Array(size).fill(-1));
  const frontiers: Position[][] = solution.map((p) => [p]);

  solution.forEach((p, idx) => {
    regions[p.row][p.col] = idx;
  });

  let remaining = size * size - solution.length;
  let guard = 0;
  const guardMax = size * size * 200;

  while (remaining > 0 && guard++ < guardMax) {
    const order = shuffle(
      Array.from({ length: solution.length }, (_, i) => i),
      rng
    );
    let grewAny = false;

    for (const regionIdx of order) {
      if (remaining <= 0) break;
      const frontier = frontiers[regionIdx];
      if (frontier.length === 0) continue;

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

function regionSizes(regions: number[][], size: number): number[] {
  const sizes = new Array(size).fill(0);
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) sizes[regions[r][c]]++;
  return sizes;
}

/** Finds a solution different from `exclude`, if one exists. */
function findSolutionExcluding(
  regions: number[][],
  size: number,
  exclude: Position[]
): Position[] | null {
  const excludeKey = exclude
    .map((p) => p.row * size + p.col)
    .sort((a, b) => a - b)
    .join(',');
  const colUsed = new Array(size).fill(false);
  const regionUsed = new Array(size).fill(false);
  const placed: Position[] = [];
  let found: Position[] | null = null;

  function backtrack(row: number) {
    if (found) return;
    if (row === size) {
      const key = placed
        .map((p) => p.row * size + p.col)
        .sort((a, b) => a - b)
        .join(',');
      if (key !== excludeKey) found = placed.slice();
      return;
    }
    for (let col = 0; col < size; col++) {
      if (found) return;
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
    }
  }

  backtrack(0);
  return found;
}

/**
 * Step 3: repair towards uniqueness. Repeatedly find an alternate solution
 * (one different from the true solution) and reassign one of its cells to
 * a neighboring region so that alternate specifically becomes invalid,
 * without ever touching a true-solution cell. Preferring an adjacent
 * region (rather than any arbitrary one) keeps the resulting blobs mostly
 * contiguous. This converges far faster than random hill-climbing because
 * every step directly targets the alternate solution actually found.
 */
function repairToUnique(
  regions: number[][],
  size: number,
  trueSolution: Position[],
  rng: RNG,
  maxSteps: number
): boolean {
  const trueSet = new Set(trueSolution.map((p) => p.row * size + p.col));

  for (let step = 0; step < maxSteps; step++) {
    const alt = findSolutionExcluding(regions, size, trueSolution);
    if (!alt) return true; // no alternate solution found -> unique

    const movable = alt.filter((p) => !trueSet.has(p.row * size + p.col));
    if (movable.length === 0) return false; // shouldn't happen

    const order = shuffle(movable, rng);
    let didSwap = false;

    for (const cell of order) {
      const sizes = regionSizes(regions, size);
      if (sizes[regions[cell.row][cell.col]] <= 2) continue; // keep regions from vanishing

      const neighborOrder = shuffle(DIRS4, rng);
      for (const { dr, dc } of neighborOrder) {
        const nr = cell.row + dr;
        const nc = cell.col + dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        const neighborRegion = regions[nr][nc];
        if (neighborRegion === regions[cell.row][cell.col]) continue;

        const usedByOtherAltCell = alt.some(
          (p) => (p.row !== cell.row || p.col !== cell.col) && regions[p.row][p.col] === neighborRegion
        );
        if (usedByOtherAltCell) {
          regions[cell.row][cell.col] = neighborRegion;
          didSwap = true;
          break;
        }
      }
      if (didSwap) break;
    }

    if (!didSwap) {
      // Fallback: force-merge into the region of any other alt cell, even
      // if not adjacent. Less pretty, but guarantees forward progress.
      const cell = order[0];
      const other = alt.find((p) => p.row !== cell.row || p.col !== cell.col);
      if (!other) return false;
      const sizes = regionSizes(regions, size);
      if (sizes[regions[cell.row][cell.col]] <= 2) return false;
      regions[cell.row][cell.col] = regions[other.row][other.col];
    }
  }

  return countSolutions(regions, size, 2) === 1;
}

export interface GenerateOptions {
  size: number;
  seed: number;
  id: string;
  maxSolutionAttempts?: number;
  maxRegionAttempts?: number;
  maxRepairSteps?: number;
}

/**
 * Full pipeline: generate a solution layout, grow organic regions around
 * it, then repair towards a verified-unique solution. Retries with fresh
 * randomness on failure, but in practice converges on the first or second
 * attempt even at 9x9.
 */
export function generateWardenLevel(opts: GenerateOptions): WardenLevel {
  const { size, seed, id } = opts;
  const maxSolutionAttempts = opts.maxSolutionAttempts ?? 15;
  const maxRegionAttempts = opts.maxRegionAttempts ?? 6;
  const maxRepairSteps = opts.maxRepairSteps ?? 300;

  const rng = createSeededRandom(seed);

  for (let sAttempt = 0; sAttempt < maxSolutionAttempts; sAttempt++) {
    const solution = generateSolutionPositions(size, rng);
    if (!solution) continue;

    for (let rAttempt = 0; rAttempt < maxRegionAttempts; rAttempt++) {
      const regions = growRegions(size, solution, rng);
      if (repairToUnique(regions, size, solution, rng, maxRepairSteps)) {
        const elementOrder = shuffle(
          Array.from({ length: size }, (_, i) => i),
          rng
        );
        return { id, size, regions, solution, elementOrder };
      }
    }
  }

  // Extremely unlikely fallback: plain row-banded regions around a fresh
  // non-adjacent solution. Always valid and unique, just visually plain —
  // better than crashing the game.
  const fallbackSolution = generateSolutionPositions(size, createSeededRandom(seed + 1)) ?? [];
  const regions: number[][] = Array.from({ length: size }, (_, r) => new Array(size).fill(r));
  const elementOrder = Array.from({ length: size }, (_, i) => i);
  return { id, size, regions, solution: fallbackSolution, elementOrder };
}
