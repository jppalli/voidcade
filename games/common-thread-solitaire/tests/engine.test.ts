/**
 * Equivalence test: the ported engine must behave exactly like the original game's engine.
 * `tests/oracle.mjs` is the original code, verbatim. Both are driven with the same seeds and the
 * same randomly chosen actions, and every result and table state is compared.
 *
 * Run: npm test
 */
// @ts-nocheck - the oracle is untyped original code.
import * as oracle from './oracle.mjs';
import { CONFIG } from '../src/config';
import { CATEGORIES } from '../src/data/categories';
import { JOURNEY_LEVELS, JOURNEY_SEEDS } from '../src/data/journey';
import { Game } from '../src/engine/game';
import { dailyLevel, quickLevel, QUICK_TIERS } from '../src/engine/generator';
import { buildCards, deal, legalActions } from '../src/engine/rules';
import { seededRng, hashString } from '../src/engine/rng';
import { solve } from '../src/engine/solver';

let checks = 0;
let failures = 0;
const json = (v: unknown) => JSON.stringify(v);

function same(actual: unknown, expected: unknown, label: string) {
  checks++;
  if (json(actual) !== json(expected)) {
    failures++;
    if (failures <= 12) {
      console.error(`FAIL ${label}`);
      console.error('  new     :', json(actual).slice(0, 300));
      console.error('  original:', json(expected).slice(0, 300));
    }
  }
}

// 1. Static data
same(CONFIG, oracle.CONFIG, 'CONFIG');
same(CATEGORIES, oracle.CATEGORIES, 'CATEGORIES');
same(JOURNEY_LEVELS, oracle.JOURNEY_LEVELS, 'JOURNEY_LEVELS');
same(JOURNEY_SEEDS, oracle.JOURNEY_SEEDS, 'JOURNEY_SEEDS');
for (const wins of [0, 2, 3, 4, 5, 9, 10, 25]) same(streakTier(wins), oracle.streakTier(wins), `streakTier(${wins})`);
function streakTier(wins: number) {
  return CONFIG.streak.find((s) => wins >= s.wins) ?? null;
}

// 2. Seeded RNG and shuffle
for (const seed of [0, 1, 42, 9020, 4294967295]) {
  const a = seededRng(seed);
  const b = oracle.seededRng(seed);
  same(Array.from({ length: 20 }, a), Array.from({ length: 20 }, b), `rng(${seed})`);
}
same(hashString('common-thread-daily-2026-01-15'), oracle.hashString('common-thread-daily-2026-01-15'), 'hashString');

// 3. Random play, journey levels: both engines must agree on every step
function journeyDef(n: number) {
  const level = JOURNEY_LEVELS[n - 1];
  const seed = JOURNEY_SEEDS[n - 1];
  return { key: `j${n}`, mode: 'journey', title: `Level ${n}`, board: level.board, sets: level.sets, mu: level.mu, seed: seed.seed, par: seed.par, budget: seed.budget };
}

function randomWalk(def: any, walkSeed: number, steps: number, label: string) {
  const mine = new Game(def, 0);
  const orig = new oracle.Game(def, 0);
  same(mine.cards, orig.cards, `${label} cards`);
  same(mine.state, orig.state, `${label} initial deal`);
  const rng = seededRng(walkSeed);

  for (let step = 0; step < steps; step++) {
    const tag = `${label} step ${step}`;
    const a = legalActions(mine.state, mine.cards, true);
    const b = oracle.legalActions(orig.state, orig.cards, true);
    same(a, b, `${tag} legalActions`);
    same(mine.hint(), orig.hint(), `${tag} hint`);
    same(mine.status(), orig.status(), `${tag} status`);

    const roll = rng();
    if (roll < 0.08 && mine.canUndo()) {
      same(mine.undo(), orig.undo(), `${tag} undo`);
    } else if (roll < 0.12) {
      const column = Math.floor(rng() * mine.state.cols.length);
      same(mine.canPlaceWild(column), orig.canPlaceWild(column), `${tag} canPlaceWild`);
      same(mine.placeWild(column), orig.placeWild(column), `${tag} placeWild`);
    } else if (roll < 0.14) {
      mine.addMoves(5);
      orig.addMoves(5);
    } else if (a.length) {
      // Mostly legal actions; sometimes an arbitrary one to exercise rejection reasons.
      const action = rng() < 0.9 ? a[Math.floor(rng() * a.length)] : randomAction(mine, rng);
      same(mine.move(action), orig.move(action), `${tag} move ${json(action)}`);
    } else break;
    same(mine.state, orig.state, `${tag} state`);
    same(mine.history.length, orig.history.length, `${tag} history`);
    same([mine.totalSets, mine.setsLeft], [orig.totalSets, orig.setsLeft], `${tag} sets`);
  }
  same(mine.payout(0.25), orig.payout(0.25), `${label} payout`);
  same(mine.save(), orig.save(), `${label} save`);
}

function randomAction(game: any, rng: () => number) {
  const t = rng();
  if (t < 0.15) return { t: 'draw' };
  if (t < 0.25) return { t: 'recycle' };
  const from = rng() < 0.3 ? { z: 'waste' } : { z: 'col', i: Math.floor(rng() * game.state.cols.length), idx: Math.floor(rng() * 6) };
  const to = rng() < 0.5 ? { z: 'found', i: Math.floor(rng() * game.state.found.length) } : { z: 'col', i: Math.floor(rng() * game.state.cols.length) };
  return { t: 'move', from, to };
}

for (let n = 1; n <= JOURNEY_LEVELS.length; n++) {
  for (let w = 0; w < 6; w++) randomWalk(journeyDef(n), n * 1000 + w, 260, `journey ${n} walk ${w}`);
}

// 4. Solver and level generator
for (let n = 1; n <= JOURNEY_LEVELS.length; n++) {
  const def = journeyDef(n);
  const cards = buildCards(def.sets);
  const table = deal(cards, def.board, def.seed, 1);
  same(solve(table, cards, def.seed, 30), oracle.solve(oracle.deal(oracle.buildCards(def.sets), def.board, def.seed, 1), oracle.buildCards(def.sets), def.seed, 30), `solve journey ${n}`);
}
const dates = ['2026-01-01', '2026-02-14', '2026-03-09', '2026-05-27', '2026-07-04', '2026-09-30', '2026-11-17', '2026-12-31'];
for (const d of dates) same(dailyLevel(d), oracle.dailyLevel(d), `dailyLevel ${d}`);
for (const tier of Object.keys(QUICK_TIERS)) {
  same(QUICK_TIERS[tier], oracle.QUICK_TIERS[tier], `QUICK_TIERS ${tier}`);
  for (const seed of [1, 777, 123456789, 2147483000]) same(quickLevel(tier, seed), oracle.quickLevel(tier, seed), `quickLevel ${tier} ${seed}`);
}

console.log(`${checks} comparisons, ${failures} failures`);
process.exit(failures ? 1 : 0);
