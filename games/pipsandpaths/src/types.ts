// --- Types ---

export interface Position {
  x: number;
  y: number;
}

export interface Level {
  id: number;
  grid: number[][];
  startPos: Position;
  mode?: 'daily' | 'infinite' | 'chapter';
}

export interface Stats {
  totalSolved: number;
  dailyStreak: number;
  lastDailyDate: string | null;
  bestInfiniteLevel: number;
  chaptersUnlocked: number;
  completedChapterLevels: number[];
  perfectChapterLevels: number[];
  completedArchiveDates: string[];
  perfectArchiveDates: string[];
}

export type GameState = 'playing' | 'won' | 'menu' | 'chapters' | 'stats' | 'archive' | 'tutorial';
export type GameMode = 'daily' | 'archive' | 'chapter';

export const STORAGE_KEY = 'pips_paths_stats_v1';
export const DAILY_SOLVED_KEY = 'pips_paths_daily_solved';
