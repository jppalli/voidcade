// Builds src/game/levels.data.json.
//
// WHAT MAKES A GOOD BOARD HERE
//
// There are two ways a cell can fall. Either a clue names it outright ("I still
// need 3 of my color and only 3 squares can take it, so all three are mine"), or
// the player crosses colors off it from two different clues until one is left.
// The second is the game; the first is a board solving itself in front of you.
//
// The first generator optimised for neither, and produced boards that were ~93%
// the dull kind. The cause was upstream of the carving: it grew the hidden
// coloring in *blobs*, so cells sat surrounded by their own color and clue
// numbers ran high (mean 3.15 of a possible 8). A high number is a naming
// machine. A 0 can only ever cross things off.
//
// So this generator works the other way round:
//
//   1. ANNEAL the hidden coloring to push same-color neighbours apart, which
//      drags the whole clue distribution down towards 0s, 1s and 2s.
//   2. CARVE biggest-number-first, so the clues that survive are the ones that
//      eliminate rather than name.
//   3. SCORE every candidate with the traced solver and keep the best, refusing
//      any board that falls below the chapter's elimination floor.
//
//   node tools/generate.mjs            regenerate every chapter
//   node tools/generate.mjs --seed 7   a different puzzle set

import { writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import {
  NCOLORS, compile, initialDomains, solveTraced, eliminationRatio, analyse,
  neighborTable, formatSolution, ELIMINATION_ONLY,
} from "../src/game/puzzle.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "src", "game", "levels.data.json");

const argSeed = Number(process.argv[process.argv.indexOf("--seed") + 1]) || 20260729;

/** mulberry32 — small, seeded, good enough for level layout. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const shuffled = (arr, rand) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* ------------------------------------------------------- the hidden coloring */

// Counts of 0, 1 and 2 are all welcome — a 2 that has found both its neighbours
// eliminates just as hard as a 0, and the arithmetic is what makes the board
// worth reading. Past 2 it gets expensive fast, because that is where clues
// start naming cells outright instead of crossing them off.
//
// (Pressing all the way down to 0s and 1s was the first attempt, and it flipped
// the problem rather than fixing it: mean clue 0.6, numbers as decoration.)
//
// Three colors on a king's-move grid cannot avoid clumping entirely — every 2x2
// block must repeat a color — so this is a pressure, not a rule.
// Tuned by sweeping curves against the clue mix that actually survives carving
// (see the __PENALTY hook below). Charging for a count of 2 looked harmless and
// was not: it produced boards that were 83% ones, every clue reading the same.
// Leaving 0, 1 and 2 all free lands at roughly 21% / 59% / 20%.
const PENALTY = [0, 0, 0, 3.5, 9, 16, 25, 36, 49];
// globalThis hooks let tools/ scripts sweep these curves without a full run.
const penalty = (k) => (globalThis.__PENALTY ?? PENALTY)[k];

/**
 * Anneal a coloring towards low same-color neighbour counts. The result is a
 * board whose clues are mostly 0s, 1s and 2s, which is what makes crossing-off
 * the natural way to solve it.
 */
export function shapedSolution(w, h, rand, steps) {
  const nbs = neighborTable(w, h);
  const size = w * h;
  const cells = new Int8Array(size);
  for (let i = 0; i < size; i++) cells[i] = Math.floor(rand() * NCOLORS);

  const sameCount = (i) => {
    let k = 0;
    const c = cells[i];
    for (const q of nbs[i]) if (cells[q] === c) k++;
    return k;
  };
  // Recoloring a cell only disturbs itself and its neighbours.
  const localCost = (i) => {
    let cost = penalty(sameCount(i));
    for (const q of nbs[i]) cost += penalty(sameCount(q));
    return cost;
  };

  let temp = 1.4;
  for (let step = 0; step < steps; step++) {
    const i = Math.floor(rand() * size);
    const old = cells[i];
    const next = (old + 1 + Math.floor(rand() * (NCOLORS - 1))) % NCOLORS;
    const before = localCost(i);
    cells[i] = next;
    const delta = localCost(i) - before;
    // Uphill moves are allowed early, so it does not freeze into the first
    // local minimum — and a little residual clumping keeps the clues varied.
    if (delta > 0 && rand() > Math.exp(-delta / temp)) cells[i] = old;
    temp = Math.max(0.05, temp * 0.9992);
  }
  return cells;
}

/* --------------------------------------------------------------- the carving */

const solvableWith = (level, rules) =>
  solveTraced(compile(level), initialDomains(compile(level)), rules).solved;

/**
 * Peel the board back to a puzzle.
 *
 * Both passes work biggest-clue-first. That ordering is the whole trick: the
 * high numbers are the ones that name cells outright, so letting them go first
 * leaves a board held together by 0s and 1s — clues that can only cross off.
 */
export function carve(sol, w, h, spec, rand) {
  const size = w * h;
  const all = [...Array(size).keys()];
  const level = { w, h, sol: formatSolution(sol), given: all.slice(), nums: all.slice() };

  const nOf = new Map(compile(level).clues.map((c) => [c.p, c.n]));
  // Sort by clue number descending, with enough jitter that repeated runs on the
  // same coloring explore genuinely different boards.
  const byBiggest = (list) => list.slice().sort((a, b) =>
    (nOf.get(b) - nOf.get(a)) + (rand() - 0.5) * spec.jitter);

  // How much a surviving clue is worth keeping.
  //   2        the best clue in the game: two neighbours have to be established
  //            before it says anything, and then it eliminates hard.
  //   1        good, and the backbone of most boards.
  //   0        strong, but cheap — one double-tap and it has spent itself, so a
  //            board made mostly of zeros plays itself. Still needed as an
  //            opening move, so this sits below 1 and 2 rather than at the floor.
  //   3+       these are the ones that name cells outright. Shed them first.
  const KEEP = globalThis.__KEEP ?? [1.4, 2.2, 3.4, 0.8];
  const keepValue = (n) => KEEP[n] ?? 0.2;
  const byLeastValuable = (list) => list.slice().sort((a, b) =>
    (keepValue(nOf.get(a)) - keepValue(nOf.get(b))) + (rand() - 0.5) * spec.jitter * 0.5);

  const wantBlank = Math.round(size * spec.blank);
  let blanks = 0;
  for (const p of byBiggest(all)) {
    if (blanks >= wantBlank) break;
    const trial = {
      ...level,
      given: level.given.filter((q) => q !== p),
      nums: level.nums.filter((q) => q !== p),
    };
    if (solvableWith(trial, spec.rules)) { level.given = trial.given; level.nums = trial.nums; blanks++; }
  }
  if (blanks < wantBlank * spec.blankTolerance) return null;

  for (const p of byLeastValuable(level.nums)) {
    const trial = { ...level, nums: level.nums.filter((q) => q !== p) };
    if (solvableWith(trial, spec.rules)) level.nums = trial.nums;
  }
  return level;
}

/* ---------------------------------------------------------------- the search */

export function scoreLevel(level, spec) {
  const cx = compile(level);
  const trace = solveTraced(cx, initialDomains(cx), spec.rules);
  if (!trace.solved) return null;
  const elimination = eliminationRatio(cx, trace);
  if (elimination < spec.minElimination) return null;
  if (trace.rounds < (spec.minChain ?? 0)) return null;

  // A chapter can demand that a board genuinely *needs* a harder rule, rather
  // than merely being allowed to use it — otherwise the search happily returns
  // boards the easier rules already crack, and the last chapter never bites.
  if (spec.mustNeed === "complete" && solveTraced(cx, initialDomains(cx), PURE).solved) return null;
  if (spec.mustNeed === "overlap" && solveTraced(cx, initialDomains(cx), WITH_NAMING).solved) return null;
  if (spec.mustNeed === "contradiction" && solveTraced(cx, initialDomains(cx), WITH_OVERLAP).solved) return null;

  const size = level.w * level.h;
  const blanks = size - level.given.length;
  const meanClue = cx.clues.length
    ? cx.clues.reduce((s, c) => s + c.n, 0) / cx.clues.length : 0;
  const zeroFraction = cx.clues.length
    ? cx.clues.filter((c) => c.n === 0).length / cx.clues.length : 0;

  return {
    level, elimination, rounds: trace.rounds, blanks, meanClue, zeroFraction,
    // Elimination first by a wide margin. Then chain depth, which is the real
    // difficulty knob once the blank count stops being able to rise. Then a
    // readable spread of clue numbers instead of a board that is all zeros.
    score: elimination * 1000
      + Math.min(trace.rounds, 40) * (spec.chainWeight ?? 9)
      - Math.max(0, zeroFraction - 0.35) * 400
      - Math.max(0, 0.08 - zeroFraction) * 400
      - Math.abs(meanClue - 1.05) * 45
      - Math.abs(blanks - size * spec.blank) * 12
      - level.nums.length * (spec.clueWeight ?? 1.2),
  };
}

/**
 * Search for the best board matching a spec. If the hard floors turn out to be
 * unreachable for this size — pure elimination puts a real ceiling on how empty
 * a board can get — the constraints are relaxed a step at a time rather than
 * failing, and the relaxation is reported so the tuning stays honest.
 */
export function makeLevel(spec, rand) {
  const passes = [
    { spec, note: "" },
    { spec: { ...spec, minChain: Math.max(0, (spec.minChain ?? 0) - 2) }, note: "shorter chain" },
    { spec: { ...spec, minChain: 0 }, note: "chain floor dropped" },
    { spec: { ...spec, minChain: 0, blank: spec.blank - 0.06 }, note: "fewer blanks" },
  ];
  for (const pass of passes) {
    let best = null;
    for (let attempt = 0; attempt < pass.spec.tries; attempt++) {
      const sol = shapedSolution(pass.spec.w, pass.spec.h, rand, pass.spec.anneal);
      const level = carve(sol, pass.spec.w, pass.spec.h, pass.spec, rand);
      if (!level) continue;
      const scored = scoreLevel(level, pass.spec);
      if (!scored) continue;
      if (!best || scored.score > best.score) best = scored;
    }
    if (best) return { ...best, relaxed: pass.note };
  }
  return null;
}

/* --------------------------------------------------------------- the content */

const PURE = ELIMINATION_ONLY;                                  // crossing off only
const WITH_NAMING = { exhaust: true, complete: true };           // clues may name cells
const WITH_OVERLAP = { exhaust: true, complete: true, overlap: true };

const base = { jitter: 2.2, blankTolerance: 0.78, anneal: 9000 };

// Pure elimination puts a ceiling on how much of a board can be blanked — the
// clues have to carry all the work. So past the early chapters the difficulty
// comes from chain depth (minChain) rather than from ever-emptier boards.
const CHAPTERS = [
  {
    id: "spark", name: "First Light", icon: "i-ch-spark",
    blurb: "Cross off what it cannot be. The rest follows.",
    specs: [
      { ...base, w: 5, h: 5, blank: 0.34, rules: PURE, minElimination: 1, tries: 60 },
      { ...base, w: 5, h: 5, blank: 0.40, rules: PURE, minElimination: 1, tries: 60 },
      { ...base, w: 5, h: 5, blank: 0.46, rules: PURE, minElimination: 1, tries: 60 },
      { ...base, w: 6, h: 5, blank: 0.44, rules: PURE, minElimination: 1, tries: 55 },
      { ...base, w: 6, h: 5, blank: 0.50, rules: PURE, minElimination: 1, tries: 55, minChain: 6 },
      { ...base, w: 6, h: 5, blank: 0.54, rules: PURE, minElimination: 1, tries: 55, minChain: 6 },
    ],
  },
  {
    id: "drift", name: "Crosswinds", icon: "i-ch-drift",
    blurb: "Bigger boards, and fewer numbers to lean on.",
    specs: [
      { ...base, w: 6, h: 6, blank: 0.50, rules: PURE, minElimination: 1, tries: 45, minChain: 6 },
      { ...base, w: 6, h: 6, blank: 0.55, rules: PURE, minElimination: 1, tries: 45, minChain: 7 },
      { ...base, w: 7, h: 6, blank: 0.54, rules: PURE, minElimination: 1, tries: 40, minChain: 7 },
      { ...base, w: 7, h: 6, blank: 0.58, rules: PURE, minElimination: 1, tries: 40, minChain: 7 },
      { ...base, w: 7, h: 6, blank: 0.60, rules: PURE, minElimination: 1, tries: 40, minChain: 8 },
      { ...base, w: 7, h: 7, blank: 0.58, rules: PURE, minElimination: 1, tries: 35, minChain: 8 },
    ],
  },
  {
    id: "undertow", name: "Undertow", icon: "i-ch-undertow",
    blurb: "Long chains. Each cross opens the next.",
    // Chain floors here are set to what boards this size can actually reach —
    // asking for more just pushed every level down the relaxation ladder, and
    // the chapter ended up no deeper than Crosswinds. Depth is bought with
    // chainWeight in the score instead.
    specs: [
      { ...base, w: 7, h: 7, blank: 0.60, rules: PURE, minElimination: 1, tries: 40, minChain: 8, chainWeight: 26 },
      { ...base, w: 7, h: 7, blank: 0.62, rules: PURE, minElimination: 1, tries: 40, minChain: 8, chainWeight: 26 },
      { ...base, w: 8, h: 7, blank: 0.60, rules: PURE, minElimination: 1, tries: 36, minChain: 9, chainWeight: 26 },
      { ...base, w: 8, h: 7, blank: 0.62, rules: PURE, minElimination: 1, tries: 36, minChain: 9, chainWeight: 26 },
      { ...base, w: 8, h: 8, blank: 0.60, rules: PURE, minElimination: 1, tries: 32, minChain: 10, chainWeight: 26 },
      { ...base, w: 8, h: 8, blank: 0.62, rules: PURE, minElimination: 1, tries: 32, minChain: 10, chainWeight: 26 },
    ],
  },
  {
    id: "weave", name: "The Weave", icon: "i-ch-weave",
    blurb: "Now the numbers start talking to each other.",
    specs: [
      { ...base, w: 8, h: 8, blank: 0.66, rules: WITH_NAMING, minElimination: 0.85, tries: 28, chainWeight: 26, mustNeed: "complete" },
      { ...base, w: 8, h: 8, blank: 0.70, rules: WITH_NAMING, minElimination: 0.85, tries: 28, chainWeight: 26, mustNeed: "complete" },
      { ...base, w: 9, h: 8, blank: 0.68, rules: WITH_NAMING, minElimination: 0.82, tries: 28, chainWeight: 26, mustNeed: "complete" },
      { ...base, w: 9, h: 8, blank: 0.70, rules: WITH_OVERLAP, minElimination: 0.78, tries: 44, chainWeight: 26, mustNeed: "overlap" },
      { ...base, w: 9, h: 8, blank: 0.72, rules: WITH_OVERLAP, minElimination: 0.75, tries: 44, chainWeight: 26, mustNeed: "overlap" },
      { ...base, w: 9, h: 9, blank: 0.72, rules: WITH_OVERLAP, minElimination: 0.72, tries: 40, chainWeight: 26, mustNeed: "overlap" },
    ],
  },
];

function stars(report) {
  const load = report.empties / report.size;
  if (report.tier >= 3 || load >= 0.72) return 3;
  if (report.tier >= 2 || load >= 0.55) return 2;
  return 1;
}

// Only build the level set when run directly — tools/tutorial-boards.mjs
// imports the search functions above and must not trigger a full regeneration.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

function main() {

const rand = rng(argSeed);
const chapters = [];
let index = 0;
let elimTotal = 0, levelCount = 0;

for (const chapter of CHAPTERS) {
  const levels = [];
  console.log(`\n${chapter.name}`);
  chapter.specs.forEach((spec, i) => {
    const found = makeLevel(spec, rand);
    if (!found) throw new Error(`could not build ${chapter.id} #${i + 1} to spec`);
    const level = found.level;
    const report = analyse(level);
    if (!report.unique) throw new Error(`${chapter.id} #${i + 1} is not unique`);

    levels.push({
      id: `${chapter.id}-${i + 1}`,
      index: index++,
      w: level.w, h: level.h,
      sol: level.sol,
      given: level.given.sort((a, b) => a - b),
      nums: level.nums.sort((a, b) => a - b),
      tier: report.tier,
      stars: stars(report),
    });
    elimTotal += report.elimination;
    levelCount++;

    const pct = Math.round((report.empties / report.size) * 100);
    console.log(
      `  ${chapter.id}-${i + 1}  ${level.w}x${level.h}  ` +
      `blanks ${String(report.empties).padStart(2)}/${report.size} (${String(pct).padStart(2)}%)  ` +
      `numbers ${String(level.nums.length).padStart(2)}  ` +
      `clue avg ${report.meanClue.toFixed(1)} zeros ${String(Math.round(found.zeroFraction * 100)).padStart(2)}%  ` +
      `elimination ${String(Math.round(report.elimination * 100)).padStart(3)}%  ` +
      `chain ${String(report.rounds).padStart(2)}  tier ${report.tier}` +
      (found.relaxed ? `  [${found.relaxed}]` : "")
    );
  });
  chapters.push({ id: chapter.id, name: chapter.name, icon: chapter.icon, blurb: chapter.blurb, levels });
}

writeFileSync(OUT, JSON.stringify({ seed: argSeed, chapters }, null, 1) + "\n");
console.log(`\nmean elimination ratio: ${(elimTotal / levelCount * 100).toFixed(1)}%`);
console.log(`wrote ${levelCount} levels -> ${OUT}`);
}
