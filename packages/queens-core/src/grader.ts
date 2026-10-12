import type { Position } from './types';

/**
 * Human-style logic grader for Queens / Star Battle boards.
 *
 * Solves the board the way a person would, always reaching for the simplest
 * deduction available, and records the hardest kind of reasoning it needed:
 *
 *   1 SINGLE      a row, column or patch has only one square left
 *   2 CONFINED    a patch sits inside one row/column (or a row/column's last
 *                 squares all sit in one patch), so the rest of that line or
 *                 patch is ruled out
 *   3 TOUCH       a square would wipe out every remaining option of some row,
 *                 column or patch (by sharing it or touching it), so it can't
 *                 hold a cat
 *   4 SETS        k patches squeezed into the same k rows/columns (or k lines
 *                 into k patches), ruling out everything else there
 *   5 LOOKAHEAD   try a square, follow tiers 1-4, and it breaks something
 *
 * If none of those make progress the puzzle needs guessing and is reported as
 * not logically solvable (`solvable: false`).
 */

export type Tier = 1 | 2 | 3 | 4 | 5;

export interface Grade {
  /** true if the board can be finished with tiers 1-5 alone */
  solvable: boolean;
  /** hardest tier needed (0 if nothing was needed, e.g. a trivial board) */
  maxTier: number;
  /** how many deduction steps used each tier, index 1..5 */
  tierSteps: number[];
  /** single comparable number: maxTier plus a fraction for how often the
   *  harder tiers (3+) had to be used. Higher is harder. */
  score: number;
}

interface Ctx {
  size: number;
  regions: number[][];
  /** units[0..n) rows, [n..2n) cols, [2n..3n) regions — lists of cell ids */
  units: number[][];
  /** unit ids each cell belongs to: [row, col, region] */
  cellUnits: number[][];
}

/** Mutable solving state. */
interface State {
  cand: boolean[];
  placed: boolean[];
  /** unit already has its cat */
  done: boolean[];
}

const id = (size: number, r: number, c: number) => r * size + c;

function buildCtx(regions: number[][], size: number): Ctx {
  const units: number[][] = Array.from({ length: size * 3 }, () => []);
  const cellUnits: number[][] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const i = id(size, r, c);
      const reg = regions[r][c];
      units[r].push(i);
      units[size + c].push(i);
      units[2 * size + reg].push(i);
      cellUnits[i] = [r, size + c, 2 * size + reg];
    }
  }
  return { size, regions, units, cellUnits };
}

function cloneState(s: State): State {
  return { cand: s.cand.slice(), placed: s.placed.slice(), done: s.done.slice() };
}

/** Cells that placing a cat at `i` rules out: its row, column, patch and the
 *  eight touching squares (not including `i` itself). */
function killedBy(ctx: Ctx, i: number): number[] {
  const { size } = ctx;
  const out = new Set<number>();
  for (const u of ctx.cellUnits[i]) for (const j of ctx.units[u]) if (j !== i) out.add(j);
  const r = Math.floor(i / size);
  const c = i % size;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) out.add(id(size, nr, nc));
    }
  }
  return [...out];
}

/** Place a cat; returns false on contradiction. */
function place(ctx: Ctx, s: State, i: number): boolean {
  if (!s.cand[i]) return false;
  s.placed[i] = true;
  s.cand[i] = false;
  for (const u of ctx.cellUnits[i]) {
    if (s.done[u]) return false;
    s.done[u] = true;
  }
  for (const j of killedBy(ctx, i)) {
    if (s.placed[j]) return false;
    s.cand[j] = false;
  }
  return true;
}

const unitCands = (ctx: Ctx, s: State, u: number) => ctx.units[u].filter((j) => s.cand[j]);

/** A unit with no cat and no candidates left means the state is broken. */
function broken(ctx: Ctx, s: State): boolean {
  for (let u = 0; u < ctx.units.length; u++) {
    if (!s.done[u] && !ctx.units[u].some((j) => s.cand[j])) return true;
  }
  return false;
}

const isSolved = (s: State) => s.done.every(Boolean);

function eliminate(s: State, cells: number[]): boolean {
  let changed = false;
  for (const j of cells) {
    if (s.cand[j]) {
      s.cand[j] = false;
      changed = true;
    }
  }
  return changed;
}

// ---------------------------------------------------------------- techniques
// Each returns true if it changed the state (one application only), so the
// main loop can restart from the simplest tier.

function tSingle(ctx: Ctx, s: State): boolean | 'broken' {
  for (let u = 0; u < ctx.units.length; u++) {
    if (s.done[u]) continue;
    const c = unitCands(ctx, s, u);
    if (c.length === 1) return place(ctx, s, c[0]) ? true : 'broken';
  }
  return false;
}

function tConfined(ctx: Ctx, s: State): boolean {
  for (let u = 0; u < ctx.units.length; u++) {
    if (s.done[u]) continue;
    const c = unitCands(ctx, s, u);
    if (c.length === 0) continue;
    // Which other units contain *all* of this unit's candidates?
    for (let k = 0; k < 3; k++) {
      const other = ctx.cellUnits[c[0]][k];
      if (other === u) continue;
      if (!c.every((j) => ctx.cellUnits[j][k] === other)) continue;
      // u's cat must land in `other`, so the rest of `other` is out.
      const rest = ctx.units[other].filter((j) => s.cand[j] && !c.includes(j));
      if (eliminate(s, rest)) return true;
    }
  }
  return false;
}

function tTouch(ctx: Ctx, s: State): boolean {
  for (let i = 0; i < s.cand.length; i++) {
    if (!s.cand[i]) continue;
    const killed = new Set(killedBy(ctx, i));
    for (let u = 0; u < ctx.units.length; u++) {
      if (s.done[u]) continue;
      if (ctx.cellUnits[i].includes(u)) continue; // placing i would satisfy u
      const c = unitCands(ctx, s, u);
      if (c.length > 0 && c.every((j) => killed.has(j))) {
        s.cand[i] = false;
        return true;
      }
    }
  }
  return false;
}

function* combos(arr: number[], k: number, start = 0, acc: number[] = []): Generator<number[]> {
  if (acc.length === k) {
    yield acc.slice();
    return;
  }
  for (let i = start; i < arr.length; i++) {
    acc.push(arr[i]);
    yield* combos(arr, k, i + 1, acc);
    acc.pop();
  }
}

/** k units of one family whose candidates all fall inside k units of another
 *  family: those k "host" units are fully claimed, so anything else in them
 *  is out. Families: 0 rows, 1 cols, 2 regions. */
function tSets(ctx: Ctx, s: State): boolean {
  const { size } = ctx;
  const maxK = Math.min(4, Math.floor(size / 2));
  for (const [fa, fb] of [[2, 0], [2, 1], [0, 2], [1, 2], [0, 1], [1, 0]]) {
    const open = Array.from({ length: size }, (_, i) => fa * size + i).filter((u) => !s.done[u]);
    for (let k = 2; k <= maxK; k++) {
      if (open.length <= k) break;
      for (const group of combos(open, k)) {
        const cells = group.flatMap((u) => unitCands(ctx, s, u));
        if (cells.length === 0) continue;
        const hosts = new Set(cells.map((j) => ctx.cellUnits[j][fb]));
        if (hosts.size !== k) continue;
        const inGroup = new Set(cells);
        const rest: number[] = [];
        for (const h of hosts) for (const j of ctx.units[h]) if (s.cand[j] && !inGroup.has(j)) rest.push(j);
        if (eliminate(s, rest)) return true;
      }
    }
  }
  return false;
}

/** Run tiers 1-4 to a fixpoint. Returns 'broken' on contradiction. */
function propagate(ctx: Ctx, s: State, maxTier: number): 'ok' | 'broken' {
  for (let guard = 0; guard < 10000; guard++) {
    if (broken(ctx, s)) return 'broken';
    if (isSolved(s)) return 'ok';
    const single = tSingle(ctx, s);
    if (single === 'broken') return 'broken';
    if (single) continue;
    if (maxTier >= 2 && tConfined(ctx, s)) continue;
    if (maxTier >= 3 && tTouch(ctx, s)) continue;
    if (maxTier >= 4 && tSets(ctx, s)) continue;
    return 'ok';
  }
  return 'ok';
}

function tLookahead(ctx: Ctx, s: State): boolean {
  for (let i = 0; i < s.cand.length; i++) {
    if (!s.cand[i]) continue;
    const trial = cloneState(s);
    if (!place(ctx, trial, i) || propagate(ctx, trial, 4) === 'broken') {
      s.cand[i] = false;
      return true;
    }
  }
  return false;
}

/** Grade a board. `regions[r][c]` holds region ids 0..size-1. */
export function gradePuzzle(regions: number[][], size: number): Grade {
  const ctx = buildCtx(regions, size);
  const s: State = {
    cand: new Array(size * size).fill(true),
    placed: new Array(size * size).fill(false),
    done: new Array(size * 3).fill(false),
  };
  const tierSteps = [0, 0, 0, 0, 0, 0];
  let maxTier = 0;
  const use = (t: Tier) => {
    tierSteps[t]++;
    if (t > maxTier) maxTier = t;
  };

  let solvable = false;
  for (let guard = 0; guard < 20000; guard++) {
    if (isSolved(s)) {
      solvable = true;
      break;
    }
    if (broken(ctx, s)) break;
    const single = tSingle(ctx, s);
    if (single === 'broken') break;
    if (single) { use(1); continue; }
    if (tConfined(ctx, s)) { use(2); continue; }
    if (tTouch(ctx, s)) { use(3); continue; }
    if (tSets(ctx, s)) { use(4); continue; }
    if (tLookahead(ctx, s)) { use(5); continue; }
    break; // stuck: would need guessing
  }

  const hard = tierSteps[3] + tierSteps[4] * 2 + tierSteps[5] * 3;
  const score = solvable ? maxTier + Math.min(0.95, hard / (size * 3)) : 99;
  return { solvable, maxTier, tierSteps, score: Math.round(score * 100) / 100 };
}

/** The solution the grader reached, for cross-checking (null if stuck). */
export function logicalSolution(regions: number[][], size: number): Position[] | null {
  const ctx = buildCtx(regions, size);
  const s: State = {
    cand: new Array(size * size).fill(true),
    placed: new Array(size * size).fill(false),
    done: new Array(size * 3).fill(false),
  };
  for (let guard = 0; guard < 20000 && !isSolved(s); guard++) {
    if (broken(ctx, s)) return null;
    const single = tSingle(ctx, s);
    if (single === 'broken') return null;
    if (single) continue;
    if (tConfined(ctx, s) || tTouch(ctx, s) || tSets(ctx, s) || tLookahead(ctx, s)) continue;
    return null;
  }
  if (!isSolved(s)) return null;
  const out: Position[] = [];
  s.placed.forEach((p, i) => { if (p) out.push({ row: Math.floor(i / size), col: i % size }); });
  return out.sort((a, b) => a.row - b.row);
}
