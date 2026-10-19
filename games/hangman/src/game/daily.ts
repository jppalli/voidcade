import { getItem, registerMerge, setItem } from '../platform/storage';
import schedule from './daily.data.json';
import type { Entry } from './words';

/**
 * Daily Word: one word for everyone each local calendar day, one try, and a
 * streak of days solved in a row.
 *
 * The day's moves are saved as they happen, so closing the game mid-word and
 * coming back later picks up exactly where it was (no free restarts).
 */

const KEY = 'hangman-daily';
/** Daily #1. */
const EPOCH = Date.UTC(2026, 9, 19);
const DAY_MS = 86_400_000;

/** A move: a guessed letter ("E"), a hint ("*E"), or a second chance ("+"). */
export type Move = string;

export interface DailyState {
  version: 1;
  played: number;
  won: number;
  /** Days solved in a row, as of `lastWon`. */
  streak: number;
  best: number;
  /** Day number of the last solve (0 = never). */
  lastWon: number;
  /** Day number the moves below belong to. */
  day: number;
  moves: Move[];
  result: '' | 'won' | 'lost';
  /** Misses when the day finished (for the result card and share text). */
  misses: number;
}

const fresh = (): DailyState => ({ version: 1, played: 0, won: 0, streak: 0, best: 0, lastWon: 0, day: 0, moves: [], result: '', misses: 0 });

/** Today's number in the schedule (local date), 1 on launch day. */
export function dayNumber(d = new Date()): number {
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.max(1, Math.round((utc - EPOCH) / DAY_MS) + 1);
}

const LIST = schedule as Entry[];
export function dailyEntry(day: number): Entry {
  return LIST[(day - 1) % LIST.length];
}

/** Time until the next local midnight, when a new word is ready. */
export function msUntilNext(now = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}

function parse(raw: string | null): DailyState {
  try {
    const s = JSON.parse(raw ?? '') as DailyState;
    if (s && s.version === 1 && Array.isArray(s.moves)) return { ...fresh(), ...s };
  } catch { /* fresh */ }
  return fresh();
}

/** Device vs cloud: whichever has played further wins (later day, then a
 *  finished result, then more moves), so nobody gets a second try at a day. */
registerMerge(KEY, (a, b) => {
  const x = parse(a), y = parse(b);
  const rank = (s: DailyState) => [s.played, s.day, s.result ? 1 : 0, s.moves.length];
  const rx = rank(x), ry = rank(y);
  for (let i = 0; i < rx.length; i++) if (rx[i] !== ry[i]) return JSON.stringify(rx[i] > ry[i] ? x : y);
  return JSON.stringify(x);
});

/** The saved state, moved on to `today` (yesterday's moves are dropped). */
export function loadDaily(today = dayNumber()): DailyState {
  const s = parse(getItem(KEY));
  return s.day === today ? s : { ...s, day: today, moves: [], result: '', misses: 0 };
}

export function saveDaily(s: DailyState) { setItem(KEY, JSON.stringify(s)); }

/** The streak still counts if the last solve was today or yesterday. */
export function currentStreak(s: DailyState, today = dayNumber()): number {
  return s.lastWon >= today - 1 ? s.streak : 0;
}

/** Close out the day. Safe to call twice (the second call does nothing). */
export function finishDaily(s: DailyState, won: boolean, misses: number): DailyState {
  if (s.result) return s;
  const next: DailyState = { ...s, played: s.played + 1, result: won ? 'won' : 'lost', misses };
  if (won) {
    next.won = s.won + 1;
    next.streak = s.lastWon === s.day - 1 ? s.streak + 1 : 1;
    next.lastWon = s.day;
    next.best = Math.max(s.best, next.streak);
  } else {
    next.streak = 0;
  }
  return next;
}
