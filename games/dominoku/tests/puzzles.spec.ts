import { describe, expect, it } from 'vitest';
import data from '../src/game/puzzles.data.json';
import { toPuzzle } from '../src/game/daily';
import { verifyPuzzle } from '../src/game/verify';

describe('bundled puzzles', () => {
  const days = data as Parameters<typeof toPuzzle>[0][][];

  it('has a full year of days', () => {
    expect(days.length).toBeGreaterThanOrEqual(365);
  });

  it('has three puzzles per day in order 2x2, 4x4, 6x6', () => {
    for (const d of days) expect(d.map((x) => x.size)).toEqual([2, 4, 6]);
  });

  it('every puzzle is valid and has exactly one solution', () => {
    const problems: string[] = [];
    days.forEach((day, i) => {
      for (const raw of day) {
        const errors = verifyPuzzle(toPuzzle(raw, `d${i}-${raw.size}`));
        if (errors.length) problems.push(`day ${i} size ${raw.size}: ${errors.join('; ')}`);
      }
    });
    expect(problems).toEqual([]);
  }, 120_000);

  it('rejects a puzzle that has two solutions', () => {
    const errors = verifyPuzzle({
      id: 'x', size: 2, rowTargets: [3, 3], colTargets: [3, 3],
      tiles: [{ id: '0-3', a: 0, b: 3 }, { id: '1-2', a: 1, b: 2 }], locked: [],
    });
    expect(errors.join()).toMatch(/exactly 1 solution/);
  });
});