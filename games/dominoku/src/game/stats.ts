import { addDaysToKey } from './calendar';
import type { Days, SavedPuzzle } from './progress';

export interface SizeStats {
  solved: number;
  bestMs: number | null;
  avgMs: number | null;
}

export interface Stats {
  /** Puzzles solved, archive included. */
  solved: number;
  /** Days on which all three puzzles are solved. */
  daysComplete: number;
  currentStreak: number;
  longestStreak: number;
  bySize: Record<2 | 4 | 6, SizeStats>;
}

const SIZES = [2, 4, 6] as const;

const keyOf = (d: Date) => {
  const p = (v: number) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/**
 * A day counts toward the streak when at least one of its puzzles was solved on that same day.
 * Solving an old puzzle from the archive does not count. The streak stays alive through today
 * even if today is not solved yet, and ends once a whole day is missed.
 */
export function streakDays(days: Days): Set<string> {
  const out = new Set<string>();
  for (const [day, record] of Object.entries(days)) {
    const any = Object.values(record).some((p) => p?.solved && (p.solvedOn ?? day) === day);
    if (any) out.add(day);
  }
  return out;
}

export function computeStats(days: Days, today: Date): Stats {
  const set = streakDays(days);

  let current = 0;
  let cursor = keyOf(today);
  if (!set.has(cursor)) cursor = addDaysToKey(cursor, -1);
  while (set.has(cursor)) {
    current++;
    cursor = addDaysToKey(cursor, -1);
  }

  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of [...set].sort()) {
    run = prev && addDaysToKey(prev, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = day;
  }

  let solved = 0;
  let daysComplete = 0;
  const times: Record<number, number[]> = { 2: [], 4: [], 6: [] };
  const counts: Record<number, number> = { 2: 0, 4: 0, 6: 0 };
  for (const record of Object.values(days)) {
    let all = true;
    for (const size of SIZES) {
      const p: SavedPuzzle | undefined = record[String(size)];
      if (p?.solved) {
        solved++;
        counts[size]++;
        if (p.ms && p.ms > 0) times[size].push(p.ms);
      } else all = false;
    }
    if (all) daysComplete++;
  }

  const bySize = Object.fromEntries(
    SIZES.map((s) => [
      s,
      {
        solved: counts[s],
        bestMs: times[s].length ? Math.min(...times[s]) : null,
        avgMs: times[s].length ? Math.round(times[s].reduce((a, b) => a + b, 0) / times[s].length) : null,
      },
    ]),
  ) as Stats['bySize'];

  return { solved, daysComplete, currentStreak: current, longestStreak: longest, bySize };
}

/** 83000 becomes "1:23". */
export function formatTime(ms: number | null): string {
  if (ms === null) return '\u2013';
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}