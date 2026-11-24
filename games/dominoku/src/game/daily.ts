import data from './puzzles.data.json';
import { parseTile } from './dominoes';
import type { Orientation, Placement, Puzzle, Size } from './types';

interface RawPuzzle {
  size: number;
  rows: number[];
  cols: number[];
  tiles: string[];
  locked: [string, number, number, number][];
}

/** Day 0. The bundled list wraps around when the days run out. */
export const START_DATE = { year: 2026, month: 0, day: 1 };

export const dayCount = (): number => (data as RawPuzzle[][]).length;

export function toPuzzle(raw: RawPuzzle, id: string): Puzzle {
  return {
    id,
    size: raw.size as Size,
    rowTargets: raw.rows,
    colTargets: raw.cols,
    tiles: raw.tiles.map(parseTile),
    locked: raw.locked.map(([tile, row, col, o]): Placement => ({ tile, row, col, orientation: o as Orientation })),
  };
}

/** Whole days since the start date, counted from the player's local calendar date. */
export function dayIndex(date: Date): number {
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const start = Date.UTC(START_DATE.year, START_DATE.month, START_DATE.day);
  return Math.round((today - start) / 86_400_000);
}

export function dateKey(date: Date): string {
  const p = (v: number) => String(v).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** The three puzzles of a day, in order: 2x2, 4x4, 6x6. */
export function puzzlesFor(date: Date): Puzzle[] {
  const days = data as RawPuzzle[][];
  const idx = ((dayIndex(date) % days.length) + days.length) % days.length;
  return days[idx].map((raw) => toPuzzle(raw, `${dateKey(date)}-${raw.size}`));
}