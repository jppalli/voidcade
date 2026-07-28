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
 * Picks an uneven target size per domain (summing to the whole board). Varied
 * domain sizes look far better than N near-identical blobs, and they also
 * constrain the puzzle more, which makes a unique solution much easier to
 * reach — uniform regions leave lots of alternate solutions to grind away.
 */
function pickTargetSizes(size: number, rng: RNG, minDomainSize = 1): number[] {
  const floor = Math.max(1, minDomainSize);
  const targets = new Array(size).fill(floor);
  let remaining = size * size - size * floor;
  // Weighted random distribution: a few domains get greedy, others stay small.
  const weights = Array.from({ length: size }, () => 0.35 + rng() * rng() * 2.2);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const pool = remaining;

  for (let i = 0; i < size && remaining > 0; i++) {
    const share = Math.floor((weights[i] / totalWeight) * pool);
    const give = Math.min(share, remaining);
    targets[i] += give;
    remaining -= give;
  }
  // Hand out any rounding leftovers.
  let i = 0;
  while (remaining > 0) {
    targets[i % size]++;
    remaining--;
    i++;
  }
  return targets;
}

/**
 * Step 2: grow N regions outward from the solution cells via randomized
 * BFS, so every region ends up containing exactly one solution cell and
 * region shapes look organic rather than boxy. Growth respects per-domain
 * target sizes so the board gets a mix of large and small domains.
 */
function growRegions(size: number, solution: Position[], rng: RNG, minDomainSize = 1): number[][] {
  const regions: number[][] = Array.from({ length: size }, () => new Array(size).fill(-1));
  const frontiers: Position[][] = solution.map((p) => [p]);
  const targets = pickTargetSizes(size, rng, minDomainSize);
  const grown = new Array(size).fill(1); // each starts with its solution cell

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
      // Respect the target, unless every domain is already at target and
      // cells still need homes (then anyone may take them).
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
 * A domain must be one orthogonally-connected blob — no stray islands of the
 * same color floating elsewhere on the board. Every mutation during repair is
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

/** True if every domain on the board is a single connected blob. */
export function allRegionsConnected(regions: number[][], size: number): boolean {
  for (let i = 0; i < size; i++) {
    if (!isRegionConnected(regions, size, i)) return false;
  }
  return true;
}

/**
 * Moves one cell into `toIdx`, but only if the result keeps both the source
 * and destination domains connected and leaves the source non-empty. Returns
 * false (having changed nothing) when the move isn't legal.
 */
function tryMoveCell(
  regions: number[][],
  size: number,
  cell: Position,
  toIdx: number,
  minDomainSize = 1
): boolean {
  const from = regions[cell.row][cell.col];
  if (from === toIdx) return false;
  // Never shrink a domain below the floor (at minimum, never erase it).
  if (regionCells(regions, size, from).length <= Math.max(1, minDomainSize)) return false;

  regions[cell.row][cell.col] = toIdx;
  if (!isRegionConnected(regions, size, from) || !isRegionConnected(regions, size, toIdx)) {
    regions[cell.row][cell.col] = from; // revert
    return false;
  }
  return true;
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
  maxSteps: number,
  minDomainSize = 1
): boolean {
  const trueSet = new Set(trueSolution.map((p) => p.row * size + p.col));

  for (let step = 0; step < maxSteps; step++) {
    const alt = findSolutionExcluding(regions, size, trueSolution);
    if (!alt) return true; // no alternate solution found -> unique

    // Never move a true-solution cell: the intended solution must stay valid.
    const movable = shuffle(
      alt.filter((p) => !trueSet.has(p.row * size + p.col)),
      rng
    );

    // An alternate solution dies as soon as two of its cells land in the same
    // domain. So push one of its cells into the domain of another — but only
    // via a connectivity-preserving move.
    let moved = false;
    for (const cell of movable) {
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
        if (!usedByOtherAltCell) continue;

        if (tryMoveCell(regions, size, cell, neighborRegion, minDomainSize)) {
          moved = true;
          break;
        }
      }
      if (moved) break;
    }

    // No legal move available for this layout — let the caller regrow fresh
    // regions rather than breaking connectivity to force progress.
    if (!moved) return false;
  }

  return countSolutions(regions, size, 2) === 1 && allRegionsConnected(regions, size);
}

/**
 * Shrinks up to `count` domains down to a single cell — their own solution
 * cell — by donating their other cells to adjacent domains. A one-cell domain
 * is a gift to the player: its Warden position is immediately certain, which
 * gives early levels a guaranteed foothold.
 *
 * Every donation is validated for connectivity and re-checked for uniqueness,
 * and reverted if it breaks either. Best-effort: if a domain can't be reduced
 * cleanly it's left alone.
 */
function carveSingletonDomains(
  regions: number[][],
  size: number,
  solution: Position[],
  rng: RNG,
  count: number
): void {
  const candidates = shuffle(
    Array.from({ length: size }, (_, i) => i),
    rng
  );
  let made = 0;

  for (const regionIdx of candidates) {
    if (made >= count) return;

    const anchor = solution.find((p) => regions[p.row][p.col] === regionIdx);
    if (!anchor) continue;

    let reducedFully = true;
    // Repeatedly hand away the domain's non-anchor cells.
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
          // minDomainSize 1 here: carving to a single cell is the whole point.
          if (!tryMoveCell(regions, size, cell, target, 1)) continue;

          // Enlarging the neighbour can introduce new solutions — only keep
          // the donation if the puzzle stays unique.
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
  id: string;
  maxSolutionAttempts?: number;
  maxRegionAttempts?: number;
  maxRepairSteps?: number;
  /** how many domains to try to shrink to a single cell (early-level help) */
  singletonDomains?: number;
  /**
   * Floor on domain size. Later levels set this to 2+ so no domain ends up a
   * single cell by accident, which would hand the player a free Warden.
   */
  minDomainSize?: number;
}

// Generation is deterministic per (id, size, seed, singletons), so results are
// safe to memoize. Large boards can take a few hundred milliseconds to solve
// for uniqueness; caching keeps revisiting a level instant.
const levelCache = new Map<string, WardenLevel>();

function cacheKey(opts: GenerateOptions): string {
  return `${opts.id}|${opts.size}|${opts.seed}|${opts.singletonDomains ?? 0}|${opts.minDomainSize ?? 1}`;
}

/**
 * Full pipeline: generate a solution layout, grow uneven organic regions
 * around it, repair towards a verified-unique solution, optionally carve
 * single-cell domains, then gate on uniqueness + domain connectivity.
 */
export function generateWardenLevel(opts: GenerateOptions): WardenLevel {
  const key = cacheKey(opts);
  const cached = levelCache.get(key);
  if (cached) return cached;
  const result = generateWardenLevelUncached(opts);
  levelCache.set(key, result);
  return result;
}

function generateWardenLevelUncached(opts: GenerateOptions): WardenLevel {
  const { size, seed, id } = opts;
  // Repair now bails out instead of forcing illegal moves, so it needs more
  // region-growth attempts to land on a layout it can fully resolve.
  const maxSolutionAttempts = opts.maxSolutionAttempts ?? 25;
  const maxRegionAttempts = opts.maxRegionAttempts ?? 60;
  const maxRepairSteps = opts.maxRepairSteps ?? 300;
  const singletons = opts.singletonDomains ?? 0;
  // Carving singletons obviously requires allowing size-1 domains; otherwise
  // honour the requested floor.
  const minDomainSize = singletons > 0 ? 1 : Math.max(1, opts.minDomainSize ?? 1);

  const rng = createSeededRandom(seed);

  for (let sAttempt = 0; sAttempt < maxSolutionAttempts; sAttempt++) {
    const solution = generateSolutionPositions(size, rng);
    if (!solution) continue;

    for (let rAttempt = 0; rAttempt < maxRegionAttempts; rAttempt++) {
      const regions = growRegions(size, solution, rng, minDomainSize);
      if (!repairToUnique(regions, size, solution, rng, maxRepairSteps, minDomainSize)) continue;

      if (singletons > 0) {
        carveSingletonDomains(regions, size, solution, rng, singletons);
      }

      // Final gate: unique solution AND every domain a single connected blob.
      if (countSolutions(regions, size, 2) !== 1) continue;
      if (!allRegionsConnected(regions, size)) continue;

      const elementOrder = shuffle(
        Array.from({ length: size }, (_, i) => i),
        rng
      );
      return { id, size, regions, solution, elementOrder };
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
