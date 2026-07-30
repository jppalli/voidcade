// Core rules for Color Clues. Plain ESM (not TS) on purpose: the Vite app and
// the node scripts in tools/ import this exact file, so the rules the generator
// verifies are literally the rules the game plays by.
//
// THE RULES
//   Every cell of the grid holds one of 3 colors.
//   Some cells are GIVEN (pre-painted, locked). A given may also carry a NUMBER:
//   how many of its 8 neighbours share its color. The player paints the rest.
//   A puzzle ships only if that information forces exactly one coloring.

export const NCOLORS = 3;
export const FULL = 0b111;

export const bit = (c) => 1 << c;
export const has = (mask, c) => (mask & (1 << c)) !== 0;
export const isSingle = (mask) => mask !== 0 && (mask & (mask - 1)) === 0;
export const soleColor = (mask) => (mask === 1 ? 0 : mask === 2 ? 1 : 2);
export const popcount = (mask) => (mask & 1) + ((mask >> 1) & 1) + ((mask >> 2) & 1);

const nbCache = new Map();

/**
 * Neighbour table (8-directional, minesweeper style) for a w x h grid.
 * Memoized: the level search compiles boards tens of thousands of times, and
 * the table only ever depends on the dimensions.
 */
export function neighborTable(w, h) {
  const key = `${w}x${h}`;
  const hit = nbCache.get(key);
  if (hit) return hit;
  const table = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nb = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          nb.push(ny * w + nx);
        }
      }
      table.push(nb);
    }
  }
  nbCache.set(key, table);
  return table;
}

/** "01221..." -> Int8Array of color indexes. */
export function parseSolution(str) {
  const out = new Int8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) - 48;
  return out;
}

export function formatSolution(cells) {
  let s = "";
  for (let i = 0; i < cells.length; i++) s += String(cells[i]);
  return s;
}

/**
 * Everything derived from a level record, in the shape the solver wants.
 * level = { w, h, sol, given: number[], nums: number[] }
 */
export function compile(level) {
  const { w, h } = level;
  const size = w * h;
  const nbs = neighborTable(w, h);
  const sol = parseSolution(level.sol);
  const givenSet = new Set(level.given);
  const clues = level.nums.map((p) => {
    const c = sol[p];
    let n = 0;
    for (const q of nbs[p]) if (sol[q] === c) n++;
    return { p, c, n, nb: nbs[p] };
  });
  return { w, h, size, nbs, sol, givenSet, clues };
}

/** Starting domains: givens are locked to their color, everything else is open. */
export function initialDomains(cx) {
  const dom = new Uint8Array(cx.size).fill(FULL);
  for (const p of cx.givenSet) dom[p] = bit(cx.sol[p]);
  return dom;
}

/**
 * Tier 1 — per-clue counting, exactly like minesweeper but once per color.
 * For a clue (p, c, n): if n neighbours are already c, no other neighbour can
 * be c; if only n neighbours can still be c, all of them are c.
 * Returns false on contradiction.
 */
export function propagate(dom, clues) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const { c, n, nb } of clues) {
      const b = bit(c);
      let fixed = 0, open = 0;
      for (const q of nb) {
        const d = dom[q];
        if (d === b) fixed++;
        else if (d & b) open++;
      }
      if (fixed > n || fixed + open < n) return false;
      if (fixed === n && open > 0) {
        for (const q of nb) if (dom[q] !== b && dom[q] & b) {
          dom[q] &= ~b;
          if (dom[q] === 0) return false;
          changed = true;
        }
      } else if (fixed + open === n && open > 0) {
        for (const q of nb) if (dom[q] !== b && dom[q] & b) { dom[q] = b; changed = true; }
      }
    }
  }
  return true;
}

/**
 * Tier 2 — overlapping clues of the same color. If clue A's neighbourhood is a
 * subset of clue B's, the cells only B sees must hold exactly (nB - nA) of that
 * color, which often settles them outright. This is the "1-2 pattern" of
 * minesweeper, and it keeps the harder levels fair instead of guessy.
 * Returns 1 if it deduced something, 0 if it found nothing, -1 on contradiction.
 */
export function propagateSubsets(dom, clues) {
  let progress = 0;
  for (let i = 0; i < clues.length; i++) {
    for (let j = 0; j < clues.length; j++) {
      if (i === j) continue;
      const A = clues[i], B = clues[j];
      if (A.c !== B.c) continue;
      const b = bit(A.c);
      // Open cells (still undecided for this color) of each clue.
      const openA = A.nb.filter((q) => dom[q] !== b && dom[q] & b);
      if (openA.length === 0) continue;
      const setB = new Set(B.nb);
      if (!openA.every((q) => setB.has(q))) continue;
      const fixedA = A.nb.reduce((k, q) => k + (dom[q] === b ? 1 : 0), 0);
      const fixedB = B.nb.reduce((k, q) => k + (dom[q] === b ? 1 : 0), 0);
      const extra = B.nb.filter((q) => !A.nb.includes(q) && dom[q] !== b && dom[q] & b);
      if (extra.length === 0) continue;
      const needA = A.n - fixedA;      // still to place inside A
      const needB = B.n - fixedB;      // still to place inside B
      const rest = needB - needA;      // must land in B-only cells
      if (rest < 0 || rest > extra.length) return -1;
      if (rest === 0) {
        for (const q of extra) {
          dom[q] &= ~b;
          if (dom[q] === 0) return -1;
          progress = 1;
        }
      } else if (rest === extra.length) {
        for (const q of extra) { dom[q] = b; progress = 1; }
      }
    }
  }
  return progress;
}

const allSingle = (dom) => dom.every(isSingle);

/* ---------------------------------------------------------------------------
 * The traced solver.
 *
 * `propagate` above is the fast one, used inside search. This one is slower and
 * separates the rules, because *which* rule cracks a cell is the whole
 * difference between a fun board and a dull one:
 *
 *   EXHAUST  a clue has found all n of its color, so that color is crossed off
 *            everything else it touches. Produces eliminations only.
 *   SINGLE   two colors are crossed off a square, so it must be the third.
 *            This is the deduction the game is actually about.
 *   COMPLETE a clue still needs n, and exactly n squares can still take it, so
 *            they all get painted. Correct, but it hands over the answer without
 *            the player crossing anything off — cheap, and dull in bulk.
 *   OVERLAP  the same-color subset rule between two clues.
 *
 * Rules run in that order so elimination gets first refusal on every cell, and
 * a board's score reflects how much of it *can* be solved by crossing off.
 * ------------------------------------------------------------------------- */

/** One sweep of EXHAUST. Returns 1 changed, 0 nothing, -1 contradiction. */
function stepExhaust(dom, clues) {
  let changed = 0;
  for (const { c, n, nb } of clues) {
    const b = bit(c);
    let fixed = 0, open = 0;
    for (const q of nb) {
      const d = dom[q];
      if (d === b) fixed++;
      else if (d & b) open++;
    }
    if (fixed > n || fixed + open < n) return -1;
    if (fixed === n && open > 0) {
      for (const q of nb) if (dom[q] !== b && dom[q] & b) {
        dom[q] &= ~b;
        if (dom[q] === 0) return -1;
        changed = 1;
      }
    }
  }
  return changed;
}

/** One sweep of COMPLETE. */
function stepComplete(dom, clues) {
  let changed = 0;
  for (const { c, n, nb } of clues) {
    const b = bit(c);
    let fixed = 0, open = 0;
    for (const q of nb) {
      const d = dom[q];
      if (d === b) fixed++;
      else if (d & b) open++;
    }
    if (fixed > n || fixed + open < n) return -1;
    if (fixed + open === n && open > 0) {
      for (const q of nb) if (dom[q] !== b && dom[q] & b) { dom[q] = b; changed = 1; }
    }
  }
  return changed;
}

/**
 * CONTRADICTION — the hardest fair rule, and the one the Daily is built on.
 * When everything else stalls, take a square with two colors left, assume one,
 * and follow it out. If that assumption breaks the board, the color is
 * impossible and can be crossed off. This is proof, not guessing: the player
 * never has to back a hunch, only to chase one far enough to see it fail.
 *
 * It is deliberately last in the order and limited to two-candidate squares —
 * it is expensive, and a board should only ever need it once the cheap rules
 * have run dry.
 */
function stepContradiction(dom, clues) {
  for (let i = 0; i < dom.length; i++) {
    if (popcount(dom[i]) !== 2) continue;
    for (let c = 0; c < NCOLORS; c++) {
      if (!has(dom[i], c)) continue;
      const trial = Uint8Array.from(dom);
      trial[i] = bit(c);
      if (!settle(trial, clues)) {
        dom[i] &= ~bit(c);
        return dom[i] === 0 ? -1 : 1;
      }
    }
  }
  return 0;
}

/** Run every deterministic rule to a fixpoint. False on contradiction. */
function settle(dom, clues) {
  for (;;) {
    const a = stepExhaust(dom, clues);
    if (a === -1) return false;
    if (a === 1) continue;
    const b = stepComplete(dom, clues);
    if (b === -1) return false;
    if (b === 1) continue;
    const c = propagateSubsets(dom, clues);
    if (c === -1) return false;
    if (c === 1) continue;
    return true;
  }
}

export const ALL_RULES = { exhaust: true, complete: true, overlap: true };
export const WITH_CONTRADICTION = { exhaust: true, complete: true, overlap: true, contradiction: true };
export const ELIMINATION_ONLY = { exhaust: true, complete: false, overlap: false };

/**
 * Solve by deduction, recording how each cell fell.
 * Returns { solved, by, rounds, used } where `by[i]` is "given" | "single" |
 * "complete" | "overlap", `rounds` is how many rule applications deep the chain
 * went, and `used` counts applications of each rule.
 */
export function solveTraced(cx, dom = initialDomains(cx), allow = ALL_RULES) {
  const by = new Array(cx.size).fill(null);
  for (const p of cx.givenSet) by[p] = "given";

  const claim = (rule) => {
    for (let i = 0; i < cx.size; i++) if (by[i] === null && isSingle(dom[i])) by[i] = rule;
  };
  claim("single"); // anything a given already pinned

  const used = { exhaust: 0, complete: 0, overlap: 0, contradiction: 0 };
  let rounds = 0;
  for (;;) {
    if (++rounds > 4000) break;
    if (allow.exhaust) {
      const r = stepExhaust(dom, cx.clues);
      if (r === -1) return { solved: false, by, rounds, used, dom, broken: true };
      // Cells that dropped to one option did so purely by crossing off.
      if (r === 1) { used.exhaust++; claim("single"); continue; }
    }
    if (allow.complete) {
      const r = stepComplete(dom, cx.clues);
      if (r === -1) return { solved: false, by, rounds, used, dom, broken: true };
      if (r === 1) { used.complete++; claim("complete"); continue; }
    }
    if (allow.overlap) {
      const r = propagateSubsets(dom, cx.clues);
      if (r === -1) return { solved: false, by, rounds, used, dom, broken: true };
      if (r === 1) { used.overlap++; claim("overlap"); continue; }
    }
    if (allow.contradiction) {
      const r = stepContradiction(dom, cx.clues);
      if (r === -1) return { solved: false, by, rounds, used, dom, broken: true };
      // A contradiction only ever *removes* a color, so anything it settles was
      // settled by elimination — same as the cheap rules, and it counts as such.
      if (r === 1) { used.contradiction++; claim("single"); continue; }
    }
    break;
  }
  return { solved: allSingle(dom), by, rounds, used, dom, broken: false };
}

/**
 * How much of this board is solved by crossing colors off, rather than by a
 * clue naming them outright. 1.0 means every blank fell to elimination.
 */
export function eliminationRatio(cx, trace) {
  let blanks = 0, byElimination = 0;
  for (let i = 0; i < cx.size; i++) {
    if (cx.givenSet.has(i)) continue;
    blanks++;
    if (trace.by[i] === "single") byElimination++;
  }
  return blanks === 0 ? 0 : byElimination / blanks;
}

/** Kept for callers that only care whether logic gets there. */
export function logicSolve(cx, dom = initialDomains(cx), allowTier2 = true) {
  const trace = solveTraced(cx, dom, { exhaust: true, complete: true, overlap: allowTier2 });
  return { solved: trace.solved, tier: trace.used.overlap > 0 ? 2 : 1, dom };
}

/** Count solutions with backtracking search, stopping at `limit`. */
export function countSolutions(cx, limit = 2, dom = initialDomains(cx)) {
  const work = Uint8Array.from(dom);
  if (!propagate(work, cx.clues)) return 0;
  let found = 0;
  const recurse = (d) => {
    let best = -1, bestSize = 9;
    for (let i = 0; i < d.length; i++) {
      const size = popcount(d[i]);
      if (size > 1 && size < bestSize) { best = i; bestSize = size; }
    }
    if (best === -1) { found++; return; }
    for (let c = 0; c < NCOLORS; c++) {
      if (!has(d[best], c)) continue;
      const next = Uint8Array.from(d);
      next[best] = bit(c);
      if (propagate(next, cx.clues)) recurse(next);
      if (found >= limit) return;
    }
  };
  recurse(work);
  return found;
}

/** One-call health check used by the generator and by npm run verify-levels. */
export function analyse(level) {
  const cx = compile(level);
  const solutions = countSolutions(cx, 2);

  const pure = solveTraced(cx, initialDomains(cx), ELIMINATION_ONLY);
  const basic = solveTraced(cx, initialDomains(cx), { exhaust: true, complete: true });
  const full = solveTraced(cx, initialDomains(cx), ALL_RULES);
  const deep = full.solved ? full : solveTraced(cx, initialDomains(cx), WITH_CONTRADICTION);

  // Report against the leanest rule set that actually finishes the board.
  const trace = pure.solved ? pure : basic.solved ? basic : full.solved ? full : deep;
  const tier = pure.solved ? 1 : basic.solved ? 2 : full.solved ? 3 : deep.solved ? 4 : 0;

  const counts = cx.clues.reduce((h, c) => { h[c.n] = (h[c.n] || 0) + 1; return h; }, {});
  return {
    unique: solutions === 1,
    solutions,
    logical: deep.solved,
    /** 1 elimination, 2 COMPLETE, 3 OVERLAP, 4 CONTRADICTION, 0 needs guessing. */
    tier,
    elimination: eliminationRatio(cx, trace),
    rounds: trace.rounds,
    clueCounts: counts,
    meanClue: cx.clues.length ? cx.clues.reduce((s, c) => s + c.n, 0) / cx.clues.length : 0,
    empties: cx.size - level.given.length,
    size: cx.size,
  };
}
