import { describe, expect, it } from 'vitest';
import { addDaysToKey, isPlayableDay, monthCells, monthInRange, parseDateKey, shiftMonth } from '../src/game/calendar';
import type { Days, SavedPuzzle } from '../src/game/progress';
import { computeStats, formatTime } from '../src/game/stats';

const solved = (on?: string, ms?: number): SavedPuzzle => ({ placed: [], solved: true, solvedOn: on, ms });
const open: SavedPuzzle = { placed: [], solved: false };
const today = new Date(2026, 5, 15); // 2026-06-15

describe('streaks', () => {
  it('is zero with no history', () => {
    expect(computeStats({}, today)).toMatchObject({ currentStreak: 0, longestStreak: 0, solved: 0 });
  });

  it('counts consecutive days that end today', () => {
    const days: Days = {
      '2026-06-13': { '2': solved('2026-06-13') },
      '2026-06-14': { '4': solved('2026-06-14') },
      '2026-06-15': { '2': solved('2026-06-15') },
    };
    expect(computeStats(days, today)).toMatchObject({ currentStreak: 3, longestStreak: 3 });
  });

  it('stays alive through today when today is not solved yet', () => {
    const days: Days = { '2026-06-13': { '2': solved('2026-06-13') }, '2026-06-14': { '2': solved('2026-06-14') } };
    expect(computeStats(days, today).currentStreak).toBe(2);
  });

  it('ends after a missed day, and remembers the longest run', () => {
    const days: Days = {
      '2026-06-01': { '2': solved('2026-06-01') },
      '2026-06-02': { '2': solved('2026-06-02') },
      '2026-06-03': { '2': solved('2026-06-03') },
      '2026-06-13': { '2': solved('2026-06-13') }, // 06-14 missed
    };
    expect(computeStats(days, today)).toMatchObject({ currentStreak: 0, longestStreak: 3 });
  });

  it('does not count archive solves made on a later day', () => {
    const days: Days = { '2026-06-14': { '2': solved('2026-06-15') }, '2026-06-15': { '2': open } };
    expect(computeStats(days, today)).toMatchObject({ currentStreak: 0, longestStreak: 0, solved: 1 });
  });

  it('counts a solved puzzle with no solve date on its own day', () => {
    expect(computeStats({ '2026-06-15': { '2': solved() } }, today).currentStreak).toBe(1);
  });

  it('works across a month and a year boundary', () => {
    const days: Days = { '2025-12-31': { '2': solved('2025-12-31') }, '2026-01-01': { '2': solved('2026-01-01') } };
    expect(computeStats(days, new Date(2026, 0, 1)).currentStreak).toBe(2);
  });
});

describe('statistics', () => {
  it('counts solved puzzles, complete days and times per size', () => {
    const days: Days = {
      '2026-06-14': { '2': solved('2026-06-14', 20_000), '4': solved('2026-06-14', 60_000), '6': solved('2026-06-14', 300_000) },
      '2026-06-15': { '2': solved('2026-06-15', 40_000), '4': open },
    };
    const s = computeStats(days, today);
    expect(s.solved).toBe(4);
    expect(s.daysComplete).toBe(1);
    expect(s.bySize[2]).toEqual({ solved: 2, bestMs: 20_000, avgMs: 30_000 });
    expect(s.bySize[4]).toEqual({ solved: 1, bestMs: 60_000, avgMs: 60_000 });
    expect(s.bySize[6].solved).toBe(1);
  });

  it('has no times when none were recorded', () => {
    expect(computeStats({ '2026-06-15': { '2': solved('2026-06-15') } }, today).bySize[2]).toEqual({ solved: 1, bestMs: null, avgMs: null });
  });

  it('formats times', () => {
    expect(formatTime(83_000)).toBe('1:23');
    expect(formatTime(5_000)).toBe('0:05');
    expect(formatTime(null)).toBe('\u2013');
  });
});

describe('calendar', () => {
  it('parses real dates only', () => {
    expect(parseDateKey('2026-06-15')?.getDate()).toBe(15);
    expect(parseDateKey('2026-02-30')).toBeNull();
    expect(parseDateKey('junk')).toBeNull();
  });

  it('adds days across month ends', () => {
    expect(addDaysToKey('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDaysToKey('2025-12-31', 1)).toBe('2026-01-01');
  });

  it('allows the start date up to today, nothing outside', () => {
    expect(isPlayableDay(new Date(2026, 0, 1), today)).toBe(true);
    expect(isPlayableDay(new Date(2025, 11, 31), today)).toBe(false);
    expect(isPlayableDay(today, today)).toBe(true);
    expect(isPlayableDay(new Date(2026, 5, 16), today)).toBe(false);
  });

  it('lays a month out in whole weeks, Sunday first', () => {
    const cells = monthCells(2026, 5); // June 2026 starts on a Monday
    expect(cells.length % 7).toBe(0);
    expect(cells.indexOf(1)).toBe(1);
    expect(cells.filter((c) => c !== null)).toHaveLength(30);
  });

  it('shifts months and limits the range', () => {
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
    expect(monthInRange(2026, 0, today)).toBe(true);
    expect(monthInRange(2025, 11, today)).toBe(false);
    expect(monthInRange(2026, 6, today)).toBe(false);
  });
});