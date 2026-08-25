import { DIFFICULTY_ORDER } from './difficulty';
import { generatePuzzle } from './generator';
import type { Difficulty, Puzzle } from './types';

/** YYYY-MM-DD in the player's local time zone. */
export function todayDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Deterministic seed string for a given calendar date. */
export function dailySeed(dateString: string): string {
  return `leapline-daily-${dateString}`;
}

/**
 * Rotates difficulty across the week so the daily puzzle stays varied
 * (Mon/Tue easy, Wed/Thu medium, Fri/Sat hard, Sun expert) rather than
 * every player solving an identically-tuned board every single day.
 */
export function dailyDifficulty(dateString: string): Difficulty {
  const d = new Date(`${dateString}T00:00:00`);
  const dow = d.getDay(); // 0=Sun..6=Sat
  const rotation: Difficulty[] = [
    'expert', // Sun
    'easy',   // Mon
    'easy',   // Tue
    'medium', // Wed
    'medium', // Thu
    'hard',   // Fri
    'hard',   // Sat
  ];
  return rotation[dow] ?? DIFFICULTY_ORDER[1];
}

/** Generates (deterministically) the daily puzzle for a given date string. */
export function generateDailyPuzzle(dateString: string = todayDateString()): Puzzle {
  const difficulty = dailyDifficulty(dateString);
  return generatePuzzle(dailySeed(dateString), difficulty);
}
