/**
 * The barn. Every straw you lift out of the hay (plucked, scooped, blown or vacuumed) counts as
 * hay. When a level is won the hay goes into the barn, where it is turned into bales. Bales are
 * not coins: they pay for improvements to the barn, and some of those unlock looks for the game.
 * One bale a day can be sold for a few coins.
 */
import { saved, persist } from './progress';
import { today } from './economy';
import { LOOKS, type Slot } from './cosmetics';

export const BARN = {
  /** Most hay one level can add, so brushing the same level again and again gets nowhere. */
  perLevel: 300,
  /** Hay in one bale. */
  perBale: 100,
  /** Coins for the one bale you may sell each day. */
  saleCoins: 10,
};

export interface Improvement {
  id: string;
  name: string;
  blurb: string;
  bales: number;
  /** A look this improvement unlocks. */
  grants?: { slot: Slot; id: string };
}

export const IMPROVEMENTS: Improvement[] = [
  { id: 'sign', name: 'Painted sign', blurb: 'A hand-painted sign over the door.', bales: 3 },
  { id: 'vane', name: 'Weathervane', blurb: 'A little rooster that turns with the wind.', bales: 5, grants: { slot: 'hay', id: 'wheat' } },
  { id: 'flowers', name: 'Flower boxes', blurb: 'Red geraniums under every window.', bales: 8, grants: { slot: 'frame', id: 'barn' } },
  { id: 'mill', name: 'Little windmill', blurb: 'It creaks in a friendly way.', bales: 12, grants: { slot: 'needle', id: 'brass' } },
  { id: 'bell', name: 'Dinner bell', blurb: 'Rung at sunset for everyone to come in.', bales: 16 },
  { id: 'lantern', name: 'Lantern', blurb: 'A warm light for the evening.', bales: 20 },
];

export const IMPROVEMENT_BY_ID: Record<string, Improvement> = Object.fromEntries(IMPROVEMENTS.map(i => [i.id, i]));

/** Puts the hay of a won level into the barn. Returns how much was added. */
export function addHay(n: number): number {
  const got = Math.max(0, Math.min(BARN.perLevel, Math.floor(n)));
  if (got > 0) {
    saved.barn.hay += got;
    persist();
  }
  return got;
}

/** How many bales the hay in store would make. */
export const balesReady = () => Math.floor(saved.barn.hay / BARN.perBale);

/** Turns all the hay it can into bales. Returns how many were made. */
export function makeBales(): number {
  const k = balesReady();
  if (k <= 0) return 0;
  saved.barn.hay -= k * BARN.perBale;
  saved.barn.bales += k;
  persist();
  return k;
}

export const canSellBale = () => saved.barn.bales > 0 && saved.barn.sold !== today();

/** Sells one bale (once a day). Returns the coins paid, or 0. */
export function sellBale(): number {
  if (!canSellBale()) return 0;
  saved.barn.bales -= 1;
  saved.barn.sold = today();
  saved.coins += BARN.saleCoins;
  persist();
  return BARN.saleCoins;
}

export const isBuilt = (id: string) => saved.barn.built.includes(id);

/** Pays for an improvement with bales, and unlocks the look that comes with it. */
export function build(id: string): boolean {
  const imp = IMPROVEMENT_BY_ID[id];
  if (!imp || isBuilt(id) || saved.barn.bales < imp.bales) return false;
  saved.barn.bales -= imp.bales;
  saved.barn.built.push(id);
  if (imp.grants) {
    const key = imp.grants.slot + ':' + imp.grants.id;
    if (!saved.cosmetics.owned.includes(key)) saved.cosmetics.owned.push(key);
  }
  persist();
  return true;
}

/** The name of the look an improvement unlocks, for the barn list. */
export function grantName(imp: Improvement): string {
  if (!imp.grants) return '';
  const look = LOOKS[imp.grants.slot].find(l => l.id === imp.grants!.id);
  const what = imp.grants.slot === 'hay' ? 'haystack colour' : imp.grants.slot === 'frame' ? 'board frame' : 'needle';
  return look ? `${look.name} ${what}` : '';
}
