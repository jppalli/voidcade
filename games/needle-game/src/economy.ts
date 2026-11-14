/**
 * Coins, finds and the shop.
 *
 * Every number here is a first guess meant to be tuned by play-testing; nothing else
 * in the game hard-codes prices or strengths.
 *
 * - Coins come from solving a level for the first time, never per straw cleared
 *   (otherwise the best play would be to clear everything and never look).
 * - Bonus items found in the hay go into the bag and are sold in the shop. They can
 *   be found again on replays.
 * - Upgrades are permanent. No charges, no running out.
 */
import { LEVELS_PER_WORLD, type Treasure } from './levels';
import { saved, persist, TEST_COINS } from './progress';

/** What the shop pays for one of each find. */
export const FIND_VALUE: Record<Treasure, number> = { button: 4, key: 8, feather: 6, spool: 5, horseshoe: 10, acorn: 6 };
/** Coins for solving a level the first time: a little more in each world. */
export const levelCoins = (level: number) => 10 + 3 * Math.floor((level - 1) / LEVELS_PER_WORLD);

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
export const TRACKS = {
  scoop: { name: 'Shovel', tiers: SCOOP as Tier[] },
  brush: { name: 'Wide brush', tiers: BRUSH as Tier[] },
  detector: { name: 'Detector', tiers: DETECTOR as Tier[] },
  fan: { name: 'Fan', tiers: FAN as Tier[] },
} as const;
export type Track = keyof typeof TRACKS;

export const scoop = () => SCOOP[Math.min(saved.upgrades.scoop, SCOOP.length - 1)];
export const detector = () => DETECTOR[Math.min(saved.upgrades.detector, DETECTOR.length - 1)];
export const fan = () => FAN[Math.min(saved.upgrades.fan, FAN.length - 1)];
export const brushMult = () => BRUSH[Math.min(saved.upgrades.brush, BRUSH.length - 1)].mult;
/** The tier a track would buy next, or undefined when it is maxed out. */
export const nextTier = (t: Track) => TRACKS[t].tiers[saved.upgrades[t] + 1];
export const canBuy = (t: Track) => {
  const n = nextTier(t);
  return !!n && saved.coins >= n.cost;
};
export const anyAffordable = () => (Object.keys(TRACKS) as Track[]).some(canBuy) || canBuyCells();

export function buy(t: Track): boolean {
  const n = nextTier(t);
  if (!n || saved.coins < n.cost) return false;
  saved.coins = saved.cheat ? TEST_COINS : saved.coins - n.cost;
  saved.upgrades[t]++;
  persist();
  return true;
}
export const bagCount = () => Object.values(saved.bag).reduce((a, b) => a + b, 0);
export const bagValue = () => (Object.entries(saved.bag) as [Treasure, number][]).reduce((a, [k, n]) => a + (FIND_VALUE[k] ?? 0) * n, 0);
/** Sells everything in the bag. Returns the coins earned. */
export function sellAll(): number {
  const gain = bagValue();
  saved.coins += gain;
  saved.bag = {};
  persist();
  return gain;
}
export function addFind(kind: Treasure) {
  saved.bag[kind] = (saved.bag[kind] ?? 0) + 1;
}

/** Battery cells: the energy any helper runs on. Every level starts with FREE of them; more are sold in packs. */
export const CELLS = { free: 4, pack: 3, cost: 30 } as const;
export const canBuyCells = () => saved.coins >= CELLS.cost;
export function buyCells(): boolean {
  if (!canBuyCells()) return false;
  saved.coins = saved.cheat ? TEST_COINS : saved.coins - CELLS.cost;
  saved.cells += CELLS.pack;
  persist();
  return true;
}
