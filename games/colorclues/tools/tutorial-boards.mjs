// Finds replacement boards for the free-solve tutorial levels, using the same
// search as the main generator so they teach the game the real levels play.
// Prints candidates; the chosen ones get pasted into tutorial.data.json by hand,
// because their coach text refers to specific squares.
//
//   node tools/tutorial-boards.mjs

import { compile, analyse, ELIMINATION_ONLY } from "../src/game/puzzle.mjs";
import { makeLevel, rng } from "./generate.mjs";

const WANT = [
  // learn-3 is where crossing off is first done by hand, so it must contain a 0
  // to start from. 4x3 turned out to be too tight for that: pure elimination
  // needs every blank covered by two saturated clues of different colors, and
  // twelve cells cannot supply enough clues to go round.
  { name: "learn-3", w: 4, h: 4, blank: 0.3, tries: 400, needZero: true },
  { name: "learn-4", w: 5, h: 4, blank: 0.45, tries: 400, needZero: true },
];

const base = { jitter: 2.2, blankTolerance: 0.75, anneal: 4000, rules: ELIMINATION_ONLY, minElimination: 1 };

for (const want of WANT) {
  const rand = rng(90210 + want.w * 17 + want.h);
  const corners = [0, want.w - 1, want.w * (want.h - 1), want.w * want.h - 1];
  let best = null;

  for (let round = 0; round < 14; round++) {
    const found = makeLevel({ ...base, ...want }, rand);
    if (!found) continue;
    const cx = compile(found.level);
    // The coach tells the player to start from a 0, so one has to be there.
    const zeros = cx.clues.filter((c) => c.n === 0);
    if (want.needZero && zeros.length === 0) continue;
    const report = analyse(found.level);
    if (!report.unique || report.tier !== 1 || report.elimination < 1) continue;
    // Prefer a 0 in a corner if one turns up — it is the easiest to point at.
    const zeroCorner = zeros.find((c) => corners.includes(c.p));
    const score = found.rounds * 10 - Math.abs(cx.clues.length - 6) * 3 + (zeroCorner ? 12 : 0);
    if (!best || score > best.score) best = { ...found, score, zeroCorner, zeros, report, cx };
  }

  if (!best) { console.log(`${want.name}: nothing found`); continue; }
  const lv = best.level;
  console.log(`\n${want.name}  ${lv.w}x${lv.h}  blanks ${best.blanks}  numbers ${lv.nums.length}  ` +
    `chain ${best.rounds}  elimination ${Math.round(best.report.elimination * 100)}%  tier ${best.report.tier}`);
  console.log(`  zero clues at ${best.zeros.map(z => z.p).join(", ")}` + (best.zeroCorner ? ` (corner: ${best.zeroCorner.p})` : ""));
  console.log("  " + JSON.stringify({
    w: lv.w, h: lv.h, sol: lv.sol,
    given: lv.given.slice().sort((a, b) => a - b),
    nums: lv.nums.slice().sort((a, b) => a - b),
  }));
  const nAt = new Map(best.cx.clues.map((c) => [c.p, c.n]));
  for (let y = 0; y < lv.h; y++) {
    let row = "";
    for (let x = 0; x < lv.w; x++) {
      const i = y * lv.w + x;
      const given = lv.given.includes(i);
      row += (given ? "OIS"[lv.sol[i]] : ".") + (nAt.has(i) ? nAt.get(i) : " ") + "  ";
    }
    console.log("   " + row);
  }
}
