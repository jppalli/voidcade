/**
 * What the player has done, saved in this browser (there is no account or backend).
 *
 * Levels are 1-based. `results[n]` is 1 once level n is solved and 2 when every
 * bonus item was found as well; a level never goes back down. Solving level n
 * opens level n + 1, and a world opens when its first level does.
 */
import { TOTAL_LEVELS } from './levels';

const KEY = 'needle-save';

/** Battery cells given once, when the first helper is unlocked. */
export const STARTER_CELLS = 3;

export interface Save {
  /** The level last started. */
  level: number;
  /** The highest level open to play. */
  unlocked: number;
  results: Record<string, number>;
  sound: boolean;
  /** Indices (0 detector, 1 wind) of helpers whose "new helper" card was shown. */
  introduced: number[];
  /** First-time hints already shown (see FTUE in main.ts). */
  seen: string[];
  /** Coins to spend in the shop (see economy.ts). */
  coins: number;
  /** Bonus items found in the hay and not sold yet, by kind. */
  bag: Record<string, number>;
  /** Tier bought on each upgrade track (0 is what everyone starts with). */
  upgrades: { scoop: number; brush: number; detector: number; fan: number; vacuum: number };
  /** How many of each item has been found, ever. The first copy of an item is kept in the collection book. */
  collection: Record<string, number>;
  /** Finds since the last rare or better one (see drops.ts). */
  pity: number;
  /** Sets whose reward has been paid. */
  setsDone: string[];
  /** The daily haystack: the date it was last cleared and the streak of days in a row. */
  dailyHay: { last: string; streak: number };
  /** Today's quests. */
  quests: { date: string; list: { id: string; goal: number; n: number; claimed: boolean }[] };
  /** Rewarded videos watched today. */
  ads: { date: string; n: number };
  /** Looks bought in the shop, and the ones in use. */
  cosmetics: { owned: string[]; hay: string; frame: string; needle: string };
  /** The barn: hay in store, bales made, improvements built and the date of the last sale. */
  barn: { hay: number; bales: number; built: string[]; sold: string };
  /** Battery cells: from the starter gift, the daily gift and the shop. Any helper can use one; they are never refilled for free. */
  cells: number;
  /** The daily gift: the date (local, YYYY-MM-DD) it was last claimed, and which day of the cycle comes next (0 to 6). */
  daily: { last: string; day: number };
  /** Test mode, switched on by tapping the needle on the title screen 10 times: every level open, coins never run out. */
  cheat: boolean;
}

const clampLevel = (v: unknown) => Math.min(TOTAL_LEVELS, Math.max(1, Math.floor(Number(v)) || 1));

function load(): Save {
  let raw: Record<string, unknown> = {};
  try {
    raw = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch {
    /* unreadable save: start fresh */
  }
  const s: Save = { level: 1, unlocked: 1, results: {}, sound: raw.sound !== false, introduced: [], seen: [], coins: 0, bag: {}, upgrades: { scoop: 0, brush: 0, detector: 0, fan: 0, vacuum: 0 }, cells: 0, daily: { last: '', day: 0 }, collection: {}, pity: 0, setsDone: [], dailyHay: { last: '', streak: 0 }, quests: { date: '', list: [] }, ads: { date: '', n: 0 }, cosmetics: { owned: [], hay: 'plain', frame: 'wood', needle: 'steel' }, barn: { hay: 0, bales: 0, built: [], sold: '' }, cheat: raw.cheat === true };

  if (typeof raw.unlocked === 'number') {
    s.unlocked = clampLevel(raw.unlocked);
    for (const [k, v] of Object.entries((raw.results ?? {}) as Record<string, unknown>)) {
      const n = Number(k);
      if (Number.isInteger(n) && n >= 1 && n <= TOTAL_LEVELS && (v === 1 || v === 2)) s.results[n] = v;
    }
    if (Array.isArray(raw.introduced)) s.introduced = raw.introduced.filter((i): i is number => i === 0 || i === 1 || i === 2);
    if (Array.isArray(raw.seen)) s.seen = raw.seen.filter((x): x is string => typeof x === 'string');
  } else if (raw.level) {
    // An older save only knew the level reached: everything before it counts as solved.
    const reached = clampLevel(raw.level);
    s.unlocked = reached;
    for (let n = 1; n < reached; n++) s.results[n] = 1;
    if (reached > 1) s.seen = ['brush', 'tap', 'pluck', 'bonus'];
  }
  const n = (v: unknown, max = 1e9) => Math.min(max, Math.max(0, Math.floor(Number(v)) || 0));
  s.coins = n(raw.coins);
  for (const [k, v] of Object.entries((raw.bag ?? {}) as Record<string, unknown>)) if (n(v) > 0) s.bag[k] = n(v, 9999);
  const up = (raw.upgrades ?? {}) as Record<string, unknown>;
  s.upgrades = { scoop: n(up.scoop, 4), brush: n(up.brush, 3), detector: n(up.detector, 3), fan: n(up.fan, 3), vacuum: n(up.vacuum, 3) };
  for (const [k, v] of Object.entries((raw.collection ?? {}) as Record<string, unknown>)) if (n(v) > 0) s.collection[k] = n(v, 99999);
  s.pity = n(raw.pity, 999);
  if (Array.isArray(raw.setsDone)) s.setsDone = raw.setsDone.filter((x): x is string => typeof x === 'string');
  const dh = (raw.dailyHay ?? {}) as Record<string, unknown>;
  s.dailyHay = { last: typeof dh.last === 'string' ? dh.last : '', streak: n(dh.streak, 9999) };
  const q = (raw.quests ?? {}) as { date?: unknown; list?: unknown };
  if (typeof q.date === 'string' && Array.isArray(q.list)) {
    s.quests = {
      date: q.date,
      list: q.list
        .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
        .map(e => ({ id: String(e.id), goal: n(e.goal, 9999), n: n(e.n, 9999), claimed: e.claimed === true })),
    };
  }
  const ad = (raw.ads ?? {}) as Record<string, unknown>;
  s.ads = { date: typeof ad.date === 'string' ? ad.date : '', n: n(ad.n, 99) };
  const cz = (raw.cosmetics ?? {}) as Record<string, unknown>;
  s.cosmetics = {
    owned: Array.isArray(cz.owned) ? cz.owned.filter((x): x is string => typeof x === 'string') : [],
    hay: typeof cz.hay === 'string' ? cz.hay : 'plain',
    frame: typeof cz.frame === 'string' ? cz.frame : 'wood',
    needle: typeof cz.needle === 'string' ? cz.needle : 'steel',
  };
  const bn = (raw.barn ?? {}) as Record<string, unknown>;
  s.barn = {
    hay: n(bn.hay, 999999),
    bales: n(bn.bales, 9999),
    built: Array.isArray(bn.built) ? bn.built.filter((x): x is string => typeof x === 'string') : [],
    sold: typeof bn.sold === 'string' ? bn.sold : '',
  };
  // Older saves kept separate charges per helper: they all become cells.
  const old = Array.isArray(raw.stock) ? raw.stock.reduce((a: number, b: unknown) => a + n(b, 999), 0) : 0;
  s.cells = Math.min(999, n(raw.cells, 999) + old);
  const dl = (raw.daily ?? {}) as Record<string, unknown>;
  s.daily = { last: typeof dl.last === 'string' ? dl.last : '', day: n(dl.day, 6) };
  // Saves from before cells were limited: a player who already has a helper starts with a few.
  if (raw.daily === undefined && s.introduced.includes(0) && s.cells === 0) s.cells = STARTER_CELLS;
  s.level = Math.min(s.unlocked, clampLevel(raw.level ?? s.unlocked));
  return s;
}

export const saved: Save = load();

export const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    /* storage unavailable: progress lasts for this visit only */
  }
};

export const isSolved = (n: number) => !!saved.results[n];
export const hasAllBonus = (n: number) => saved.results[n] === 2;
export const solvedCount = () => Object.keys(saved.results).length;
export const allSolved = () => solvedCount() >= TOTAL_LEVELS;

/** The level "Play" continues with: the first one not solved yet. */
export function playTarget(): number {
  for (let n = 1; n <= Math.min(saved.unlocked, TOTAL_LEVELS); n++) if (!isSolved(n)) return n;
  return TOTAL_LEVELS;
}

/** Records a win. `allBonus` is true when the level had bonus items and all were found. */
export function recordWin(n: number, allBonus: boolean) {
  saved.results[n] = Math.max(saved.results[n] ?? 0, allBonus ? 2 : 1);
  saved.unlocked = Math.min(TOTAL_LEVELS, Math.max(saved.unlocked, n + 1));
  persist();
}

export const hasSeen = (id: string) => saved.seen.includes(id);
export function markSeen(...ids: string[]) {
  for (const id of ids) if (!saved.seen.includes(id)) saved.seen.push(id);
  persist();
}

/** Starts over from level 1. The sound setting stays. */
export function resetProgress() {
  saved.level = 1;
  saved.unlocked = 1;
  saved.results = {};
  saved.introduced = [];
  saved.seen = [];
  saved.coins = 0;
  saved.bag = {};
  saved.upgrades = { scoop: 0, brush: 0, detector: 0, fan: 0, vacuum: 0 };
  saved.collection = {};
  saved.pity = 0;
  saved.setsDone = [];
  saved.dailyHay = { last: '', streak: 0 };
  saved.quests = { date: '', list: [] };
  saved.ads = { date: '', n: 0 };
  saved.cosmetics = { owned: [], hay: 'plain', frame: 'wood', needle: 'steel' };
  saved.barn = { hay: 0, bales: 0, built: [], sold: '' };
  saved.cells = 0;
  saved.daily = { last: '', day: 0 };
  saved.cheat = false;
  persist();
}
 
/** Test mode: opens every level and helper, and sets 999 coins, 99 cells and 999 hay. Nothing is unlimited. */
export function enableTestMode() {
  saved.cheat = true;
  saved.unlocked = TOTAL_LEVELS;
  saved.coins = 999;
  saved.cells = 99;
  saved.barn.hay = 999;
  persist();
}
