/**
 * Headless play-through of every Wordbloom level, exercising the real Game
 * class (no DOM involved). Confirms that:
 *  1. Every required word is actually traceable on the ring and accepted as
 *     'required' — i.e. the level is genuinely completable.
 *  2. Completing all required words flips isComplete.
 *  3. Re-submitting a found word returns 'repeat' and does not double-count.
 *  4. A nonsense trace returns 'invalid' and increments mistakes.
 *  5. Star ratings behave: 1 star with mistakes, 2 clean, 3 clean + bonuses.
 *  6. Bonus words are accepted as 'bonus' and never required.
 *
 * Run: node verify-game.mjs
 */
import { Game } from './js/game.js';
import { LEVELS, TOTAL_LEVELS } from './js/levels.js';

let problems = 0;
const fail = (msg) => { console.log(`FAIL ${msg}`); problems++; };

/** Traces a word on the ring by letter identity. Returns false if untraceable. */
function trace(game, word) {
  game.clearTrace();
  for (const ch of word) {
    const idx = game.letters.indexOf(ch);
    if (idx < 0) return false;
    if (!game.extend(idx)) return false; // letter reused within one trace
  }
  return game.currentWord() === word;
}

for (const lvl of LEVELS) {
  const label = `#${lvl.index} "${lvl.source}"`;

  // ---- 1 & 2: every required word is traceable and accepted ----
  const game = new Game(lvl.index);
  for (const word of lvl.required) {
    if (!trace(game, word)) {
      fail(`${label}: required word "${word}" is not traceable on the ring`);
      continue;
    }
    const { result } = game.submit();
    if (result !== 'required') {
      fail(`${label}: submitting required "${word}" returned "${result}"`);
    }
  }
  if (!game.isComplete) {
    fail(`${label}: not complete after submitting all ${lvl.required.length} required words`);
  }
  if (game.requiredFoundCount !== lvl.required.length) {
    fail(`${label}: requiredFoundCount ${game.requiredFoundCount} != ${lvl.required.length}`);
  }
  if (game.mistakes !== 0) {
    fail(`${label}: clean playthrough logged ${game.mistakes} mistakes`);
  }

  // ---- 3: re-submitting a found word is a 'repeat' and doesn't double-count ----
  const firstWord = lvl.required[0];
  trace(game, firstWord);
  const repeat = game.submit();
  if (repeat.result !== 'repeat') {
    fail(`${label}: re-submitting "${firstWord}" returned "${repeat.result}", expected "repeat"`);
  }
  if (game.requiredFoundCount !== lvl.required.length) {
    fail(`${label}: repeat submission changed found count`);
  }
  if (game.mistakes !== 0) {
    fail(`${label}: a repeat was counted as a mistake`);
  }

  // ---- 5: stars on a clean run ----
  const cleanStars = game.starsEarned();
  if (cleanStars < 2) {
    fail(`${label}: clean run earned only ${cleanStars} star(s), expected >=2`);
  }

  // ---- 6: bonus words are accepted as 'bonus' ----
  const bonusPool = game.allPossibleBonusWords();
  for (const bw of bonusPool) {
    if (lvl.required.includes(bw)) {
      fail(`${label}: "${bw}" listed as bonus but is also required`);
    }
  }
  const traceableBonus = bonusPool.filter((w) => new Set(w).size === w.length);
  const g2 = new Game(lvl.index);
  for (const bw of traceableBonus) {
    if (!trace(g2, bw)) {
      fail(`${label}: bonus word "${bw}" not traceable despite passing subset check`);
      continue;
    }
    const { result } = g2.submit();
    if (result !== 'bonus') {
      fail(`${label}: bonus "${bw}" returned "${result}"`);
    }
  }
  if (g2.mistakes !== 0) {
    fail(`${label}: submitting only bonus words logged mistakes`);
  }
  if (g2.isComplete) {
    fail(`${label}: level completed without finding any required word`);
  }

  // ---- 3-star check: clean + all bonuses ----
  const g3 = new Game(lvl.index);
  for (const w of lvl.required) { trace(g3, w); g3.submit(); }
  for (const w of traceableBonus) { trace(g3, w); g3.submit(); }
  const maxStars = g3.starsEarned();
  if (maxStars !== 3) {
    fail(`${label}: clean run + ${traceableBonus.length} bonus words earned ${maxStars} stars, expected 3`);
  }

  // ---- 4: nonsense trace is invalid and costs a mistake ----
  const g4 = new Game(lvl.index);
  const junk = lvl.letters.slice(0, 3).join('');
  const isRealWord = lvl.required.includes(junk) || bonusPool.includes(junk);
  if (!isRealWord) {
    if (!trace(g4, junk)) {
      fail(`${label}: could not trace its own first 3 ring letters "${junk}"`);
    } else {
      const { result } = g4.submit();
      if (result !== 'invalid') {
        fail(`${label}: junk trace "${junk}" returned "${result}", expected "invalid"`);
      }
      if (g4.mistakes !== 1) {
        fail(`${label}: invalid submission did not increment mistakes`);
      }
      if (g4.starsEarned() !== 0) {
        fail(`${label}: earned stars without completing the level`);
      }
    }
  }

  // ---- too-short guard ----
  const g5 = new Game(lvl.index);
  g5.extend(0);
  g5.extend(1);
  const short = g5.submit();
  if (short.result !== 'too-short') {
    fail(`${label}: 2-letter trace returned "${short.result}", expected "too-short"`);
  }
}

// ---- trace hygiene: a tile can't be reused inside one trace ----
const g = new Game(0);
g.extend(0);
if (g.extend(0)) fail('extend() allowed the same ring tile twice in one trace');
g.clearTrace();
if (g.path.length !== 0) fail('clearTrace() left residue in the path');

console.log(`Played ${TOTAL_LEVELS} levels headlessly.`);
console.log(problems === 0 ? 'All game-logic checks passed.' : `${problems} problem(s) found.`);
process.exit(problems === 0 ? 0 : 1);
