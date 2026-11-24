import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ALL_TILES, cellsOf } from '../src/game/dominoes';
import { countSolutions } from '../src/game/solver';
import { verifyPuzzle, DOMINOES_FOR } from '../src/game/verify';
import type { Orientation, Placement, Puzzle, Size } from '../src/game/types';

/**
 * Generates the bundled daily puzzles: three per day (2x2, 4x4, 6x6), from a fixed seed so the
 * output is repeatable. Run: npm run generate-puzzles -- [days]
 *
 * Method: build a full random solution, then unlock its dominoes one at a time, keeping an
 * unlock only if the solver still finds exactly one solution.
 */

const DAYS = Number(process.argv[2] ?? 365);
/** Most locked dominoes a puzzle may need. Raise it if a size cannot be generated. */
const LOCK_BUDGET: Record<Size, number> = { 2: 1, 4: 3, 6: 9 };
const SOLVER_NODES = 400_000;
const MAX_ATTEMPTS = 2000;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Rng = () => number;

function shuffle<T>(xs: T[], rng: Rng): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Random tiling of an n x n grid: list of [firstCell, secondCell] where second is right of or below first. */
function randomTiling(n: number, rng: Rng): [number, number][] {
  const taken = new Array<boolean>(n * n).fill(false);
  const out: [number, number][] = [];
  const rec = (start: number): boolean => {
    let i = start;
    while (i < n * n && taken[i]) i++;
    if (i === n * n) return true;
    const options: number[] = [];
    if ((i % n) + 1 < n && !taken[i + 1]) options.push(i + 1);
    if (Math.floor(i / n) + 1 < n) options.push(i + n);
    if (rng() < 0.5) options.reverse();
    for (const j of options) {
      taken[i] = taken[j] = true;
      out.push([i, j]);
      if (rec(i + 1)) return true;
      out.pop();
      taken[i] = taken[j] = false;
    }
    return false;
  };
  rec(0);
  return out;
}

function makePuzzle(id: string, size: Size, rng: Rng): Puzzle | null {
  const tiling = randomTiling(size, rng);
  const tiles = shuffle(ALL_TILES, rng).slice(0, DOMINOES_FOR[size]).sort((x, y) => (x.id < y.id ? -1 : 1));
  const order = shuffle(tiles, rng); // which tile goes on which domino position

  const solution: Placement[] = tiling.map(([i, j], k) => {
    const flat = j === i + 1;
    const orientation = ((flat ? 0 : 1) + (rng() < 0.5 ? 0 : 2)) as Orientation;
    return { tile: order[k].id, row: Math.floor(i / size), col: i % size, orientation };
  });

  const rowTargets = new Array<number>(size).fill(0);
  const colTargets = new Array<number>(size).fill(0);
  solution.forEach((p) => {
    const tile = tiles.find((t) => t.id === p.tile)!;
    for (const c of cellsOf(tile, p)) {
      rowTargets[c.row] += c.pip;
      colTargets[c.col] += c.pip;
    }
  });

  const build = (locked: Placement[]): Puzzle => ({ id, size, rowTargets, colTargets, tiles, locked });
  const locked = new Set(solution.map((_, k) => k));
  for (const k of shuffle([...locked], rng)) {
    locked.delete(k);
    const r = countSolutions(build(solution.filter((_, j) => locked.has(j))), 2, SOLVER_NODES);
    if (r.aborted || r.count !== 1) locked.add(k);
  }
  if (locked.size > LOCK_BUDGET[size]) return null;
  return build(solution.filter((_, j) => locked.has(j)));
}

/** Tries several candidates and keeps the one that needs the fewest locked dominoes. */
const CANDIDATES = 40;
function generate(day: number, size: Size): Puzzle {
  const rng = mulberry32(day * 97 + size * 7919 + 12345);
  let best: Puzzle | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const puzzle = makePuzzle(`d${day}-${size}`, size, rng);
    if (puzzle && (!best || puzzle.locked.length < best.locked.length)) best = puzzle;
    if (best && (attempt >= CANDIDATES || best.locked.length === 0)) break;
  }
  if (!best) throw new Error(`could not generate a ${size}x${size} puzzle for day ${day} within the lock budget`);
  return best;
}

const sizes: Size[] = [2, 4, 6];
const days: unknown[] = [];
const locks: Record<number, number[]> = { 2: [], 4: [], 6: [] };
const started = Date.now();
for (let d = 0; d < DAYS; d++) {
  const day = sizes.map((size) => {
    const puzzle = generate(d, size);
    const errors = verifyPuzzle(puzzle);
    if (errors.length) throw new Error(`day ${d} size ${size}: ${errors.join('; ')}`);
    locks[size].push(puzzle.locked.length);
    return {
      size,
      rows: puzzle.rowTargets,
      cols: puzzle.colTargets,
      tiles: puzzle.tiles.map((t) => t.id),
      locked: puzzle.locked.map((p) => [p.tile, p.row, p.col, p.orientation]),
    };
  });
  days.push(day);
}

const file = fileURLToPath(new URL('../src/game/puzzles.data.json', import.meta.url));
writeFileSync(file, '[\n' + days.map((d) => JSON.stringify(d)).join(',\n') + '\n]\n', 'utf8');

const stat = (xs: number[]) => {
  const sorted = xs.slice().sort((a, b) => a - b);
  return `min ${sorted[0]}, median ${sorted[Math.floor(sorted.length / 2)]}, max ${sorted[sorted.length - 1]}`;
};
console.log(`Wrote ${days.length} days to ${file} in ${((Date.now() - started) / 1000).toFixed(1)} s`);
for (const s of sizes) console.log(`${s}x${s}: locked dominoes ${stat(locks[s])} (budget ${LOCK_BUDGET[s]})`);