// Builds src/game/daily.data.json — the pool of Daily Challenge boards.
//
// A daily is deliberately not a chapter level. Chapter boards are tuned to a
// difficulty curve; a daily is tuned to be *hard*, on three axes at once:
//
//   FEWEST CLUES   the sparsest number set the search can find and still finish
//   LONGEST CHAIN  depth of deduction, one cross opening the next
//   NEEDS OVERLAP  it must be genuinely unsolvable without the two-clue subset
//                  rule, so it cannot be ground out by crossing off alone
//
// Elimination still has a floor — a daily should be the hardest version of this
// game, not a different one.
//
// The pool is pre-generated and verified here rather than built in the browser:
// the search takes tens of seconds per board, and a puzzle nobody has checked is
// not something to hand a player once a day.
//
//   node tools/daily.mjs             build the default pool
//   node tools/daily.mjs --count 30  build a smaller one
//   node tools/daily.mjs --append    keep existing boards, add more

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { compile, analyse } from "../src/game/puzzle.mjs";
import { makeLevel, rng } from "./generate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "src", "game", "daily.data.json");

const arg = (name, fallback) => {
  const at = process.argv.indexOf(name);
  return at === -1 ? fallback : Number(process.argv[at + 1]);
};
const COUNT = arg("--count", 40);
const SEED = arg("--seed", 771077);
const APPEND = process.argv.includes("--append");

/**
 * Rotates through a few shapes, all bigger than anything in the chapters
 * (which top out at 9x9), so the daily is visibly a step up before a single
 * square is filled.
 */
const SHAPES = [
  { w: 10, h: 9 },
  { w: 9, h: 9 },
  { w: 10, h: 10 },
  { w: 11, h: 9 },
];

// Blanks sit near 62% on purpose. Sweeping showed the real ceiling is ~55-58%
// and it is a property of the puzzle, not of the solver: a clue only ever
// reaches its own 3x3, so a region with no clues near it cannot be pinned by
// any amount of cleverness. Asking for emptier boards just fails the search.
// The difficulty is bought with size, chain length, and the contradiction rule.
const dailySpec = (shape) => ({
  ...shape,
  blank: 0.62,
  rules: { exhaust: true, complete: true, overlap: true, contradiction: true },
  mustNeed: "contradiction",
  minElimination: 0.55,
  minChain: 12,
  clueWeight: 14,
  chainWeight: 45,
  jitter: 2.4,
  blankTolerance: 0.85,
  anneal: 14000,
  tries: 26,
});

const rand = rng(SEED);
const existing = APPEND && existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")).boards : [];
const boards = existing.slice();

const started = Date.now();
for (let i = boards.length; i < COUNT; i++) {
  const shape = SHAPES[i % SHAPES.length];
  const found = makeLevel(dailySpec(shape), rand);
  if (!found) { console.log(`#${i + 1} — no board found, skipping`); continue; }

  const level = found.level;
  const report = analyse(level);
  if (!report.unique) { console.log(`#${i + 1} — not unique, skipping`); continue; }
  if (report.tier < 4) { console.log(`#${i + 1} — easier rules cracked it, skipping`); continue; }

  boards.push({
    id: `daily-${String(boards.length + 1).padStart(3, "0")}`,
    w: level.w, h: level.h,
    sol: level.sol,
    given: level.given.slice().sort((a, b) => a - b),
    nums: level.nums.slice().sort((a, b) => a - b),
    tier: report.tier,
    chain: report.rounds,
  });

  const per = (Date.now() - started) / 1000 / (boards.length - existing.length);
  console.log(
    `  ${boards[boards.length - 1].id}  ${level.w}x${level.h}  ` +
    `blanks ${String(report.empties).padStart(2)}/${report.size} ` +
    `(${String(Math.round(report.empties / report.size * 100)).padStart(2)}%)  ` +
    `numbers ${String(level.nums.length).padStart(2)}  ` +
    `elimination ${String(Math.round(report.elimination * 100)).padStart(3)}%  ` +
    `chain ${String(report.rounds).padStart(2)}  tier ${report.tier}  ` +
    `[${per.toFixed(0)}s/board]` + (found.relaxed ? `  {${found.relaxed}}` : "")
  );
}

const clueLoad = boards.map((b) => b.nums.length / (b.w * b.h));
writeFileSync(OUT, JSON.stringify({ seed: SEED, boards }, null, 1) + "\n");
console.log(
  `\n${boards.length} daily boards -> ${OUT}\n` +
  `mean clue density ${(clueLoad.reduce((a, b) => a + b, 0) / clueLoad.length * 100).toFixed(1)}% of cells, ` +
  `mean chain ${(boards.reduce((s, b) => s + b.chain, 0) / boards.length).toFixed(1)}`
);
