// npm run verify-levels — every shipped level must have exactly one solution,
// be reachable by deduction at the tier it claims, and carry its weight as a
// *puzzle*: most of it has to fall to crossing colors off rather than to clues
// naming cells outright. Run this after touching levels.data.json by hand.
//
// The elimination floor exists because a whole generation of levels once passed
// every other check here while being 93% clues-name-the-answer, and nothing in
// this file noticed.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { analyse, compile } from "../src/game/puzzle.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const read = (name) => JSON.parse(readFileSync(join(here, "..", "src", "game", name), "utf8"));
const data = read("levels.data.json");
// The hand-written tutorial gets checked to exactly the same standard.
const chapters = [read("tutorial.data.json"), ...data.chapters];

/** How much of a board must fall to elimination, per chapter. */
const ELIMINATION_FLOOR = { learn: 1, spark: 1, drift: 1, undertow: 1, weave: 0.7 };

// learn-1 is the one deliberate exception: it teaches what a number *means*
// ("I need three and only three squares are left") before the game introduces
// crossing off at all, so it is 0% elimination on purpose.
const FLOOR_EXEMPT = new Set(["learn-1"]);

let failures = 0;
let total = 0;
let eliminationSum = 0;

for (const chapter of chapters) {
  console.log(`\n${chapter.name}`);
  for (const level of chapter.levels) {
    total++;
    const problems = [];
    if (level.sol.length !== level.w * level.h) problems.push("solution length != w*h");
    if (/[^012]/.test(level.sol)) problems.push("solution has a color outside 0-2");
    if (level.nums.some((p) => !level.given.includes(p))) problems.push("a number sits on a cell that is not given");

    const report = analyse(level);
    if (!report.unique) problems.push(report.solutions === 0 ? "no solution" : "more than one solution");
    if (!report.logical) problems.push("not solvable by deduction — needs guessing");
    if (report.tier > level.tier) problems.push(`needs tier ${report.tier}, level claims ${level.tier}`);

    const floor = FLOOR_EXEMPT.has(level.id) ? 0 : (ELIMINATION_FLOOR[chapter.id] ?? 0.7);
    if (report.elimination < floor) {
      problems.push(
        `only ${Math.round(report.elimination * 100)}% of it falls to crossing off ` +
        `(floor ${Math.round(floor * 100)}%) — the clues are naming cells instead`
      );
    }
    eliminationSum += report.elimination;

    // The stated solution must actually satisfy its own clues.
    const cx = compile(level);
    for (const { p, c, n, nb } of cx.clues) {
      const actual = nb.reduce((k, q) => k + (cx.sol[q] === c ? 1 : 0), 0);
      if (actual !== n) problems.push(`clue at ${p} disagrees with the solution`);
    }

    // Teaching steps point at specific cells, so a stale index is a silent trap.
    for (const [n, s] of (level.teach ?? []).entries()) {
      const at = `teach step ${n + 1}`;
      if (!s.say) problems.push(`${at} has no text`);
      for (const p of s.spot ?? []) {
        if (p < 0 || p >= level.w * level.h) problems.push(`${at} spotlights cell ${p}, off the board`);
      }
      const need = s.need ?? {};
      for (const p of need.paint ?? []) {
        if (level.given.includes(p)) problems.push(`${at} asks the player to paint ${p}, which is already given`);
      }
      if (need.chord !== undefined && !level.nums.includes(need.chord)) {
        problems.push(`${at} asks for a chord on ${need.chord}, which carries no number`);
      }
    }

    const pct = Math.round((report.empties / report.size) * 100);
    const tag = `  ${level.id.padEnd(12)} ${level.w}x${level.h}  blanks ${String(pct).padStart(2)}%  ` +
      `elimination ${String(Math.round(report.elimination * 100)).padStart(3)}%  ` +
      `chain ${String(report.rounds).padStart(2)}  tier ${report.tier}`;
    if (problems.length) {
      failures++;
      console.log(`${tag}   FAIL`);
      for (const p of problems) console.log(`      - ${p}`);
    } else {
      console.log(`${tag}   ok`);
    }
  }
}

console.log(`\n${total - failures}/${total} levels ok`);
console.log(`mean elimination ratio: ${(eliminationSum / total * 100).toFixed(1)}%`);

/* ------------------------------------------------------------ daily pool */

const daily = read("daily.data.json");
console.log(`\nDaily pool (${daily.boards.length} boards)`);
let dailyFailures = 0;
let chainSum = 0;

for (const board of daily.boards) {
  const problems = [];
  if (board.sol.length !== board.w * board.h) problems.push("solution length != w*h");
  if (board.nums.some((p) => !board.given.includes(p))) problems.push("a number sits on a cell that is not given");

  const report = analyse(board);
  if (!report.unique) problems.push(report.solutions === 0 ? "no solution" : "more than one solution");
  if (!report.logical) problems.push("not solvable by deduction — needs guessing");
  // A daily that an easier rule set cracks is just a chapter board in disguise.
  if (report.tier !== 4) problems.push(`tier ${report.tier}, but a daily must need the contradiction rule`);
  if (report.elimination < 0.55) {
    problems.push(`only ${Math.round(report.elimination * 100)}% falls to crossing off`);
  }
  chainSum += report.rounds;

  if (problems.length) {
    dailyFailures++;
    console.log(`  ${board.id}  FAIL`);
    for (const p of problems) console.log(`      - ${p}`);
  }
}
console.log(
  dailyFailures
    ? `  ${daily.boards.length - dailyFailures}/${daily.boards.length} daily boards ok`
    : `  all ${daily.boards.length} ok — every one needs the contradiction rule, ` +
      `mean chain ${(chainSum / daily.boards.length).toFixed(1)}`
);

if (failures || dailyFailures) process.exit(1);
