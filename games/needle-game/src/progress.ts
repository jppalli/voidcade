/**
 * What the player has done, saved in this browser (there is no account or backend).
 *
 * Levels are 1-based. `results[n]` is 1 once level n is solved and 2 when every
 * bonus item was found as well; a level never goes back down. Solving level n
 * opens level n + 1, and a world opens when its first level does.
 */
import { TOTAL_LEVELS } from './levels';

const KEY = 'needle-save';

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
  upgrades: { scoop: number; brush: number; detector: number; fan: number };
  /** Battery cells bought in the shop. Any helper can use one; they are spent after the free cells every level starts with. */
  cells: number;
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
  const s: Save = { level: 1, unlocked: 1, results: {}, sound: raw.sound !== false, introduced: [], seen: [], coins: 0, bag: {}, upgrades: { scoop: 0, brush: 0, detector: 0, fan: 0 }, cells: 0, cheat: raw.cheat === true };

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
  s.upgrades = { scoop: n(up.scoop, 4), brush: n(up.brush, 3), detector: n(up.detector, 3), fan: n(up.fan, 3) };
  // Older saves kept separate charges per helper: they all become cells.
  const old = Array.isArray(raw.stock) ? raw.stock.reduce((a: number, b: unknown) => a + n(b, 999), 0) : 0;
  s.cells = Math.min(999, n(raw.cells, 999) + old);
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
  saved.upgrades = { scoop: 0, brush: 0, detector: 0, fan: 0 };
  saved.cells = 0;
  saved.cheat = false;
  persist();
}
 
/** Test mode: opens every level and fills the purse. While it is on, buying costs nothing. */
export const TEST_COINS = 999999;
export function enableTestMode() {
  saved.cheat = true;
  saved.unlocked = TOTAL_LEVELS;
  saved.coins = TEST_COINS;
  persist();
}
