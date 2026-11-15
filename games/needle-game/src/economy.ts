import { LOOKS, type Slot } from './cosmetics';
/**
 * Coins, finds and the shop.
 *
 * Every number here is a first guess meant to be tuned by play-testing (and by the simulation in
 * sim-economy.mjs); nothing else in the game hard-codes prices or strengths. Most of the values
 * can also be changed without a new build from the config file (see config.ts).
 *
 * - Coins come from solving a level (the full amount the first time, a share of it on repeats),
 *   from daily gifts, quests and set rewards, and from selling spare finds.
 * - The first copy of every item goes into the collection book; copies after that go in the bag to be sold.
 * - Upgrades are permanent. No charges, no running out.
 * - Battery cells are the one thing that runs out: see CELLS and the daily gift.
 */
import { LEVELS_PER_WORLD } from './levels';
import { saved, persist, STARTER_CELLS } from './progress';
import { ITEM_BY_ID, SETS, itemsOfSet, type SetDef } from './items';

/** Numbers the config file may change. */
export const TUNING = {
  /** Coins for a level the first time: this plus `levelPerWorld` for each world after the first. */
  levelBase: 15,
  levelPerWorld: 5,
  /** A repeat clear pays this share of the first one. */
  repeatPct: 0.35,
  /** Multiplies what the shop pays for spare finds. */
  valueMult: 1,
  /** Rewarded videos for a battery cell, per day. */
  adsPerDay: 3,
};

/** What the shop pays for one spare copy of an item. */
export const itemValue = (id: string) => Math.max(1, Math.round((ITEM_BY_ID[id]?.value ?? 1) * TUNING.valueMult));
/** Coins for solving a level the first time: a little more in each world. */
export const levelCoins = (level: number) => TUNING.levelBase + TUNING.levelPerWorld * Math.floor((level - 1) / LEVELS_PER_WORLD);
/** Coins for solving a level again. */
export const repeatCoins = (level: number) => Math.max(1, Math.round(levelCoins(level) * TUNING.repeatPct));

export interface Tier {
  /** Price of this tier (tier 0 is what everyone starts with). */
  cost: number;
  /** Shown in the shop. */
  text: string;
}
export interface Scoop extends Tier {
  /** How many straws one tap lifts, taking the top ones first. */
  n: number;
  /** How wide the tap reaches, in world units (0: just the straw you tap). */
  r: number;
}
export interface BrushSize extends Tier {
  /** Multiplies the brush radius. */
  mult: number;
}
/** The shovel: a tap lifts more straws at once. */
export const SCOOP: Scoop[] = [
  { cost: 0, n: 1, r: 0, text: 'Lifts one straw per tap' },
  { cost: 40, n: 3, r: 46, text: 'Lifts 3 straws per tap' },
  { cost: 110, n: 6, r: 64, text: 'Lifts 6 straws per tap' },
  { cost: 240, n: 10, r: 84, text: 'Lifts 10 straws per tap' },
  { cost: 480, n: 16, r: 104, text: 'Lifts 16 straws per tap' },
];
/** A wider brush. */
export const BRUSH: BrushSize[] = [
  { cost: 0, mult: 1, text: 'The brush you started with' },
  { cost: 50, mult: 1.2, text: 'A little wider' },
  { cost: 140, mult: 1.45, text: 'Wider' },
  { cost: 320, mult: 1.75, text: 'Much wider' },
];
export interface DetectorTier extends Tier {
  /** How long one charge lasts (ms). */
  ms: number;
  /** How far from the pointer it can sense something (world units). */
  r: number;
}
export interface FanTier extends Tier {
  /** How wide the blast of air is (world units). */
  r: number;
  /** The share of the hay in that circle it lifts, taking the top layers first. The rest stays. */
  peel: number;
}
export interface VacuumTier extends Tier {
  /** How long one charge lasts (ms). */
  ms: number;
  /** How wide the nozzle reaches (world units). */
  r: number;
  /** Straws it lifts per second, top layer first. */
  rate: number;
}
/** The detector: longer charges and a wider sensing circle. */
export const DETECTOR: DetectorTier[] = [
  { cost: 0, ms: 10000, r: 140, text: '10 seconds, small circle' },
  { cost: 60, ms: 13000, r: 165, text: '13 seconds, wider circle' },
  { cost: 150, ms: 16000, r: 190, text: '16 seconds, wide circle' },
  { cost: 320, ms: 20000, r: 215, text: '20 seconds, widest circle' },
];
/** The fan: a wider blast. */
export const FAN: FanTier[] = [
  { cost: 0, r: 130, peel: 0.5, text: 'Lifts the top half, small gust' },
  { cost: 60, r: 160, peel: 0.6, text: 'Lifts the top 60%, bigger gust' },
  { cost: 150, r: 195, peel: 0.7, text: 'Lifts the top 70%, big gust' },
  { cost: 320, r: 230, peel: 0.8, text: 'Lifts the top 80%, huge gust' },
];
/** The vacuum: hold it over the hay and it draws the top layer in. */
export const VACUUM: VacuumTier[] = [
  { cost: 0, ms: 8000, r: 100, rate: 16, text: '8 seconds, narrow nozzle' },
  { cost: 70, ms: 10000, r: 120, rate: 22, text: '10 seconds, wider nozzle' },
  { cost: 170, ms: 12000, r: 140, rate: 30, text: '12 seconds, wide nozzle' },
  { cost: 340, ms: 15000, r: 165, rate: 40, text: '15 seconds, widest nozzle' },
];
export const TRACKS = {
  scoop: { name: 'Shovel', tiers: SCOOP as Tier[] },
  brush: { name: 'Wide brush', tiers: BRUSH as Tier[] },
  detector: { name: 'Detector', tiers: DETECTOR as Tier[] },
  fan: { name: 'Fan', tiers: FAN as Tier[] },
  vacuum: { name: 'Vacuum', tiers: VACUUM as Tier[] },
} as const;
export type Track = keyof typeof TRACKS;

export const scoop = () => SCOOP[Math.min(saved.upgrades.scoop, SCOOP.length - 1)];
export const detector = () => DETECTOR[Math.min(saved.upgrades.detector, DETECTOR.length - 1)];
export const fan = () => FAN[Math.min(saved.upgrades.fan, FAN.length - 1)];
export const vacuum = () => VACUUM[Math.min(saved.upgrades.vacuum, VACUUM.length - 1)];
export const brushMult = () => BRUSH[Math.min(saved.upgrades.brush, BRUSH.length - 1)].mult;
/** The tier a track would buy next, or undefined when it is maxed out. */
export const nextTier = (t: Track) => TRACKS[t].tiers[saved.upgrades[t] + 1];
/** Helper tracks only show once their helper is unlocked. */
const TRACK_HELPER: Partial<Record<Track, number>> = { detector: 0, fan: 1, vacuum: 2 };
export const trackVisible = (t: Track) => {
  const h = TRACK_HELPER[t];
  return h === undefined || saved.cheat || saved.introduced.includes(h);
};
export const canBuy = (t: Track) => {
  const n = nextTier(t);
  return !!n && saved.coins >= n.cost && trackVisible(t);
};
export const anyAffordable = () => (Object.keys(TRACKS) as Track[]).some(canBuy) || canBuyCells();

export function buy(t: Track): boolean {
  const n = nextTier(t);
  if (!n || saved.coins < n.cost) return false;
  saved.coins = saved.coins - n.cost;
  saved.upgrades[t]++;
  persist();
  return true;
}
export const bagCount = () => Object.values(saved.bag).reduce((a, b) => a + b, 0);
export const bagValue = () => Object.entries(saved.bag).reduce((a, [k, n]) => a + itemValue(k) * n, 0);
/** Sells everything in the bag. Returns the coins earned. */
export function sellAll(): number {
  const gain = bagValue();
  saved.coins += gain;
  saved.bag = {};
  persist();
  return gain;
}

/**
 * Puts what a level's finds into the player's hands. The first copy of an item goes into the
 * collection book; copies after that go in the bag. Completing a set pays its reward right away.
 */
export function recordFinds(ids: string[]) {
  const fresh: string[] = [];
  for (const id of ids) {
    const had = saved.collection[id] ?? 0;
    saved.collection[id] = had + 1;
    if (had === 0) fresh.push(id);
    else saved.bag[id] = (saved.bag[id] ?? 0) + 1;
  }
  const done: SetDef[] = [];
  for (const s of SETS) {
    if (saved.setsDone.includes(s.id)) continue;
    if (itemsOfSet(s.id).every(i => (saved.collection[i.id] ?? 0) > 0)) {
      saved.setsDone.push(s.id);
      done.push(s);
    }
  }
  const coins = done.reduce((a, s) => a + s.reward.coins, 0);
  const cells = done.reduce((a, s) => a + s.reward.cells, 0);
  if (coins) saved.coins = saved.coins + coins;
  saved.cells = Math.min(999, saved.cells + cells);
  persist();
  return { fresh, done, coins, cells };
}
/** How many different items are in the collection, and how many exist (seasonal sets only count once they have been started). */
export function collectionProgress() {
  const all = SETS.filter(s => s.world >= 0 || itemsOfSet(s.id).some(i => (saved.collection[i.id] ?? 0) > 0));
  const items = all.flatMap(s => itemsOfSet(s.id));
  return { have: items.filter(i => (saved.collection[i.id] ?? 0) > 0).length, total: items.length };
}

/** True once the first helper has been handed over (its "new helper" card has been shown). Cells are hidden until then. */
export const helpersUnlocked = () => saved.cheat || saved.introduced.includes(0);

/**
 * Battery cells: the energy any helper runs on. They are limited: a few as a starter when the
 * first helper unlocks, one or two in some daily gifts and quests, and packs sold in the shop.
 */
export const CELLS = { starter: STARTER_CELLS, pack: 3, cost: 30 };
export const canBuyCells = () => helpersUnlocked() && saved.coins >= CELLS.cost;
export function buyCells(): boolean {
  if (!canBuyCells()) return false;
  saved.coins = saved.coins - CELLS.cost;
  saved.cells += CELLS.pack;
  persist();
  return true;
}

const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = dateKey;
export const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
};

/** The daily gift cycle. Cells only count once a helper is unlocked. Day seven is the big one. */
export const DAILY: { coins: number; cells: number }[] = [
  { coins: 15, cells: 1 },
  { coins: 20, cells: 0 },
  { coins: 25, cells: 1 },
  { coins: 30, cells: 0 },
  { coins: 35, cells: 1 },
  { coins: 40, cells: 0 },
  { coins: 60, cells: 2 },
];
export const dailyReady = () => saved.daily.last !== today();
/** What the next gift holds. */
export function dailyPlan() {
  const day = saved.daily.day % DAILY.length;
  return { day, coins: DAILY[day].coins, cells: helpersUnlocked() ? DAILY[day].cells : 0 };
}
/** Hands over today's gift and moves the cycle on. */
export function claimDaily() {
  const plan = dailyPlan();
  saved.coins = saved.coins + plan.coins;
  saved.cells = Math.min(999, saved.cells + plan.cells);
  saved.daily = { last: today(), day: (plan.day + 1) % DAILY.length };
  persist();
  return plan;
}

/** The daily haystack's chest: coins grow with the streak of days played, and a cell comes with it (two from day five). */
export const DAILY_HAY = { coins: 30, perStreakDay: 5, maxStreak: 7, cellsFromStreak: 5 };
export const dailyHayDone = () => saved.dailyHay.last === today();
/** The streak the chest pays for if the haystack is cleared today. */
export const dailyHayStreak = () => (saved.dailyHay.last === yesterday() || saved.dailyHay.last === today() ? saved.dailyHay.streak : 0) + (dailyHayDone() ? 0 : 1);
export function dailyHayReward() {
  const s = Math.min(DAILY_HAY.maxStreak, dailyHayStreak());
  return { coins: DAILY_HAY.coins + DAILY_HAY.perStreakDay * (s - 1), cells: helpersUnlocked() ? (s >= DAILY_HAY.cellsFromStreak ? 2 : 1) : 0, streak: dailyHayStreak() };
}
/** Pays the chest and records the day. Returns what was paid, or null if today's was already taken. */
export function claimDailyHay() {
  if (dailyHayDone()) return null;
  const r = dailyHayReward();
  saved.coins = saved.coins + r.coins;
  saved.cells = Math.min(999, saved.cells + r.cells);
  saved.dailyHay = { last: today(), streak: r.streak };
  persist();
  return r;
}

/** Rewarded videos: how many are left today. */
export const adsLeft = () => Math.max(0, TUNING.adsPerDay - (saved.ads.date === today() ? saved.ads.n : 0));
export function recordAd() {
  saved.ads = { date: today(), n: (saved.ads.date === today() ? saved.ads.n : 0) + 1 };
  saved.cells = Math.min(999, saved.cells + 1);
  persist();
}

/** Buys a look with coins. Returns false if it is already owned, unknown or too dear. */
export function buyLook(slot: Slot, id: string): boolean {
  const look = LOOKS[slot].find(l => l.id === id);
  const key = slot + ':' + id;
  if (!look || look.cost <= 0 || saved.cosmetics.owned.includes(key) || saved.coins < look.cost) return false;
  saved.coins = saved.coins - look.cost;
  saved.cosmetics.owned.push(key);
  saved.cosmetics[slot] = id;
  persist();
  return true;
}
export const ownsLook = (slot: Slot, id: string) => {
  const look = LOOKS[slot].find(l => l.id === id);
  return !!look && (look.barn ? saved.cosmetics.owned.includes(slot + ':' + id) : look.cost <= 0 || saved.cosmetics.owned.includes(slot + ':' + id));
};
export function equipLook(slot: Slot, id: string): boolean {
  if (!ownsLook(slot, id)) return false;
  saved.cosmetics[slot] = id;
  persist();
  return true;
}
