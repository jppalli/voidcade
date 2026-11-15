/**
 * What turns up in the hay: the drop rolls.
 *
 * Every time a level is played, each of its bonus slots is rolled again:
 *  1. a rarity, by DROP.weights (common 60, uncommon 28, rare 10, treasure 2);
 *  2. an item of that rarity from the world's set (or, while a seasonal event is on, sometimes from its set).
 * A pity counter guarantees a rare or better find within every DROP.pity finds, so nobody goes dry.
 * The first levels only drop common items. A level never holds the same item twice.
 *
 * Pure functions with a random source passed in, so the tests, the daily haystack (seeded) and the
 * economy simulation can all use them.
 */
import { ITEMS, SETS, isRarePlus, type ItemDef, type Rarity } from './items';

export const DROP = {
  weights: { common: 60, uncommon: 28, rare: 10, treasure: 2 } as Record<Rarity, number>,
  /** After this many finds in a row below rare, the next one is rare or better. */
  pity: 11,
  /** While an event is on, this share of the slots comes from the event's set. */
  eventShare: 0.3,
};

export type Rng = () => number;

const poolOf = (setIds: string[]) => ITEMS.filter(i => setIds.includes(i.set));

/** A random item from `candidates` of the given rarity (falls back to any candidate if there is none). */
function pick(candidates: ItemDef[], rarity: Rarity, rng: Rng): ItemDef {
  const of = candidates.filter(i => i.rarity === rarity);
  const from = of.length ? of : candidates;
  return from[Math.min(from.length - 1, Math.floor(rng() * from.length))];
}

/** A rarity chosen by weight among those that exist in `candidates`. */
function rollRarity(candidates: ItemDef[], rng: Rng, pityDue: boolean): Rarity {
  const present = (Object.keys(DROP.weights) as Rarity[]).filter(r => candidates.some(i => i.rarity === r) && (!pityDue || isRarePlus(r)));
  const list = present.length ? present : (Object.keys(DROP.weights) as Rarity[]);
  const total = list.reduce((a, r) => a + DROP.weights[r], 0);
  let x = rng() * total;
  for (const r of list) {
    x -= DROP.weights[r];
    if (x < 0) return r;
  }
  return list[list.length - 1];
}

export interface RollOptions {
  /** The pity counter going in (finds since the last rare or better). */
  pity: number;
  /** The first few levels only drop common items. */
  easy?: boolean;
  /** The seasonal event that is on, if any. */
  eventSet?: string;
}

/** Rolls the bonus items of one level. */
export function rollItems(slots: number, world: number, rng: Rng, o: RollOptions): string[] {
  const worldSet = SETS.find(s => s.world === world)?.id;
  const base = poolOf(worldSet ? [worldSet] : []);
  const event = o.eventSet ? poolOf([o.eventSet]) : [];
  const chosen: ItemDef[] = [];
  let pity = o.pity;
  for (let k = 0; k < slots; k++) {
    let pool = event.length && rng() < DROP.eventShare ? event : base;
    pool = pool.filter(i => !chosen.includes(i));
    if (!pool.length) pool = base.filter(i => !chosen.includes(i));
    if (!pool.length) break;
    const common = pool.filter(i => i.rarity === 'common');
    if (o.easy && common.length) {
      chosen.push(pick(common, 'common', rng));
      continue;
    }
    const pityDue = pity >= DROP.pity && pool.some(i => isRarePlus(i.rarity));
    const rarity = rollRarity(pool, rng, pityDue);
    const found = pick(pool, rarity, rng);
    chosen.push(found);
    pity = isRarePlus(found.rarity) ? 0 : pity + 1;
  }
  return chosen.map(i => i.id);
}

/** The pity counter after finding `id`. */
export const nextPity = (pity: number, rarity: Rarity) => (isRarePlus(rarity) ? 0 : pity + 1);

/**
 * The daily haystack: three items from anywhere in the game, at least one uncommon or better,
 * and a small chance that one of them is a treasure.
 */
export function rollDaily(rng: Rng): string[] {
  const ids: ItemDef[] = [];
  const all = ITEMS.filter(i => SETS.find(s => s.id === i.set)!.world >= 0);
  const take = (rarities: Rarity[]) => {
    const pool = all.filter(i => rarities.includes(i.rarity) && !ids.includes(i));
    ids.push(pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]);
  };
  take(rng() < 0.12 ? ['treasure'] : ['uncommon', 'rare']);
  take(['common', 'uncommon']);
  take(['common']);
  return ids.map(i => i.id);
}

/** Expected coin value of one slot in a world (for the economy simulation). */
export function expectedValue(world: number): number {
  const set = SETS.find(s => s.world === world);
  if (!set) return 0;
  const items = ITEMS.filter(i => i.set === set.id);
  const total = (Object.keys(DROP.weights) as Rarity[]).reduce((a, r) => a + (items.some(i => i.rarity === r) ? DROP.weights[r] : 0), 0);
  let ev = 0;
  for (const r of Object.keys(DROP.weights) as Rarity[]) {
    const of = items.filter(i => i.rarity === r);
    if (!of.length) continue;
    ev += (DROP.weights[r] / total) * (of.reduce((a, i) => a + i.value, 0) / of.length);
  }
  return ev;
}
