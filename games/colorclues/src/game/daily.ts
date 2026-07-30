import "./legacy";   // carries pre-rename saves over; must run before the read below
import pool from "./daily.data.json";
import type { Level } from "./types";

/**
 * The Daily Challenge.
 *
 * One board a day, the same board for everyone, chosen from a pre-generated and
 * pre-verified pool. There is no server: the date picks the board, so two people
 * on the same calendar day get the same puzzle without anything being fetched.
 *
 * Daily boards are tier 4 — they need the contradiction rule, which nothing in
 * the chapters does — and they run bigger than any chapter board.
 */

interface PoolBoard {
  id: string;
  w: number;
  h: number;
  sol: string;
  given: number[];
  nums: number[];
  tier: number;
  chain: number;
}

const boards = (pool as { boards: PoolBoard[] }).boards;

export const DAILY_HEARTS = 5;

/** Local calendar day, as YYYY-MM-DD. Local on purpose: the player's day. */
export function todayKey(when = new Date()): string {
  const y = when.getFullYear();
  const m = String(when.getMonth() + 1).padStart(2, "0");
  const d = String(when.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Days since the epoch for a local date — the index the rotation runs on. */
function dayNumber(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function dailyFor(key = todayKey()): Level {
  const board = boards[((dayNumber(key) % boards.length) + boards.length) % boards.length];
  return {
    ...board,
    id: `daily:${key}`,
    index: -1,
    stars: 3,
    hearts: DAILY_HEARTS,
    daily: true,
  } as Level;
}

export function prettyDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });
}

/** Seconds until the next local midnight, for the countdown. */
export function untilTomorrow(now = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(0, Math.round((next.getTime() - now.getTime()) / 1000));
}

/* --------------------------------------------------------------- progress */

const KEY = "colorclues-daily-v1";

export interface DailyRecord {
  seconds: number;
  mistakes: number;
  hints: number;
  /** No mistakes and no hints. */
  clean: boolean;
}

interface DailyStore {
  days: Record<string, DailyRecord>;
}

function read(): DailyStore {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DailyStore) : { days: {} };
  } catch {
    return { days: {} };
  }
}

let store = read();

export const dailyResult = (key: string): DailyRecord | undefined => store.days[key];
export const dailyDone = (key: string) => store.days[key] !== undefined;
export const dailyCount = () => Object.keys(store.days).length;

export function recordDaily(key: string, record: DailyRecord) {
  const previous = store.days[key];
  // Keep the best run of the day: a clean one beats a scrappy one, and after
  // that the faster time wins.
  if (previous) {
    const better = (record.clean && !previous.clean)
      || (record.clean === previous.clean && record.seconds < previous.seconds);
    if (!better) return;
  }
  store = { ...store, days: { ...store.days, [key]: record } };
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* private mode */ }
}

export function resetDaily() {
  store = { days: {} };
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/**
 * Consecutive days completed, counting back from today. Yesterday still counts
 * as alive if today has not been played yet — the streak only breaks once a day
 * has been skipped outright.
 */
export function dailyStreak(from = new Date()): number {
  const day = new Date(from);
  if (!dailyDone(todayKey(day))) day.setDate(day.getDate() - 1);
  let streak = 0;
  for (;;) {
    if (!dailyDone(todayKey(day))) break;
    streak++;
    day.setDate(day.getDate() - 1);
    if (streak > 5000) break;
  }
  return streak;
}

export const poolSize = () => boards.length;
