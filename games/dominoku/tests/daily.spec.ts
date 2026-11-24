import { describe, expect, it } from 'vitest';
import { dateKey, dayCount, dayIndex, puzzlesFor, START_DATE } from '../src/game/daily';

describe('daily', () => {
  it('gives three puzzles in order 2x2, 4x4, 6x6', () => {
    expect(puzzlesFor(new Date(2026, 5, 15)).map((x) => x.size)).toEqual([2, 4, 6]);
  });

  it('gives the same puzzles for the same local date, whatever the time of day', () => {
    const a = puzzlesFor(new Date(2026, 5, 15, 0, 0, 1));
    const b = puzzlesFor(new Date(2026, 5, 15, 23, 59, 59));
    expect(a).toEqual(b);
  });

  it('changes at local midnight', () => {
    expect(dayIndex(new Date(2026, 5, 16, 0, 0, 0))).toBe(dayIndex(new Date(2026, 5, 15, 23, 59, 59)) + 1);
    expect(puzzlesFor(new Date(2026, 5, 15))[2]).not.toEqual(puzzlesFor(new Date(2026, 5, 16))[2]);
  });

  it('starts at day 0 and wraps when the list ends', () => {
    expect(dayIndex(new Date(START_DATE.year, START_DATE.month, START_DATE.day))).toBe(0);
    const first = puzzlesFor(new Date(START_DATE.year, START_DATE.month, START_DATE.day));
    const wrapped = puzzlesFor(new Date(START_DATE.year, START_DATE.month, START_DATE.day + dayCount()));
    expect(wrapped.map((x) => x.rowTargets)).toEqual(first.map((x) => x.rowTargets));
  });

  it('works for dates before the start date', () => {
    expect(puzzlesFor(new Date(2020, 0, 1))).toHaveLength(3);
  });

  it('formats the date key', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});