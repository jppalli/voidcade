import type { Difficulty } from '../core/types';
import { todayDateString } from '../core/daily';

const STATS_KEY = 'leapline-stats-v1';

export interface PuzzleHistoryEntry {
  /** Puzzle seed (so a history entry can be traced back to its exact puzzle). */
  seed: string;
  difficulty: Difficulty;
  size: number;
  timeMs: number;
  mistakes: number;
  hintsUsed: number;
  /** ISO timestamp of completion. */
  completedAt: string;
  isDaily: boolean;
}

export interface PlayerStats {
  totalCompleted: number;
  totalMistakes: number;
  totalHints: number;
  /** Best (lowest) completion time per difficulty, in ms. */
  bestTimeMs: Partial<Record<Difficulty, number>>;
  /** Current consecutive-day daily-puzzle streak. */
  currentStreak: number;
  bestStreak: number;
  /** Date string (YYYY-MM-DD) of the last completed daily puzzle, for streak math. */
  lastDailyDate: string | null;
  /** Most recent completions first, capped to a reasonable length. */
  history: PuzzleHistoryEntry[];
}

const MAX_HISTORY = 100;

function defaultStats(): PlayerStats {
  return {
    totalCompleted: 0,
    totalMistakes: 0,
    totalHints: 0,
    bestTimeMs: {},
    currentStreak: 0,
    bestStreak: 0,
    lastDailyDate: null,
    history: [],
  };
}

export function loadStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return defaultStats();
    const parsed = JSON.parse(raw) as Partial<PlayerStats>;
    return { ...defaultStats(), ...parsed };
  } catch {
    return defaultStats();
  }
}

function persist(stats: PlayerStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch { /* ignore storage errors (private browsing, quota, etc.) */ }
}

/** One day before `dateString`, formatted the same way (YYYY-MM-DD, local time). */
function previousDateString(dateString: string): string {
  const d = new Date(`${dateString}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return todayDateString(d);
}

export interface RecordCompletionInput {
  seed: string;
  difficulty: Difficulty;
  size: number;
  timeMs: number;
  mistakes: number;
  hintsUsed: number;
  isDaily: boolean;
  /** Only meaningful when isDaily is true — the daily's calendar date. */
  dailyDate?: string;
}

/**
 * Records a completed puzzle into persisted stats: running totals, a
 * per-difficulty personal best, streak bookkeeping (daily puzzles only,
 * consecutive-day based), and a capped completion history.
 */
export function recordCompletion(input: RecordCompletionInput): PlayerStats {
  const stats = loadStats();

  stats.totalCompleted++;
  stats.totalMistakes += input.mistakes;
  stats.totalHints += input.hintsUsed;

  const currentBest = stats.bestTimeMs[input.difficulty];
  if (currentBest === undefined || input.timeMs < currentBest) {
    stats.bestTimeMs[input.difficulty] = input.timeMs;
  }

  if (input.isDaily && input.dailyDate) {
    if (stats.lastDailyDate === input.dailyDate) {
      // Already recorded today's daily — don't double-count a streak bump
      // (e.g. replaying a completed daily, or a duplicate event).
    } else if (stats.lastDailyDate === previousDateString(input.dailyDate)) {
      stats.currentStreak += 1;
    } else {
      stats.currentStreak = 1;
    }
    stats.lastDailyDate = input.dailyDate;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
  }

  const entry: PuzzleHistoryEntry = {
    seed: input.seed,
    difficulty: input.difficulty,
    size: input.size,
    timeMs: input.timeMs,
    mistakes: input.mistakes,
    hintsUsed: input.hintsUsed,
    completedAt: new Date().toISOString(),
    isDaily: input.isDaily,
  };
  stats.history = [entry, ...stats.history].slice(0, MAX_HISTORY);

  persist(stats);
  return stats;
}

/**
 * Checks whether an active daily streak has lapsed (no daily completed
 * yesterday or today) purely for display purposes — does not mutate
 * storage, since a lapse is only "real" once the player fails to play
 * today too (checked again the next time they actually complete one).
 */
export function isStreakActive(stats: PlayerStats, today: string = todayDateString()): boolean {
  if (!stats.lastDailyDate || stats.currentStreak === 0) return false;
  return stats.lastDailyDate === today || stats.lastDailyDate === previousDateString(today);
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
