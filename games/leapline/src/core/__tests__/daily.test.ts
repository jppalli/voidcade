import { describe, expect, it } from 'vitest';
import { dailyDifficulty, dailySeed, generateDailyPuzzle, todayDateString } from '../daily';
import { countSolutions } from '../solver';
import { validateFullPath } from '../validate';

describe('daily puzzle', () => {
  it('todayDateString formats as YYYY-MM-DD', () => {
    const d = new Date(2026, 7, 21); // August 21 2026 (month is 0-indexed)
    expect(todayDateString(d)).toBe('2026-08-21');
  });

  it('dailySeed is deterministic for a given date string', () => {
    expect(dailySeed('2026-08-21')).toBe(dailySeed('2026-08-21'));
    expect(dailySeed('2026-08-21')).not.toBe(dailySeed('2026-08-22'));
  });

  it('dailyDifficulty is a stable function of the date (deterministic rotation)', () => {
    const a = dailyDifficulty('2026-08-21');
    const b = dailyDifficulty('2026-08-21');
    expect(a).toBe(b);
  });

  it('generateDailyPuzzle produces the same puzzle for the same date every time', () => {
    const p1 = generateDailyPuzzle('2026-08-21');
    const p2 = generateDailyPuzzle('2026-08-21');
    expect(p1.solution).toEqual(p2.solution);
    expect(p1.givens).toEqual(p2.givens);
    expect(p1.difficulty).toBe(p2.difficulty);
  });

  it('generateDailyPuzzle produces a different puzzle for a different date', () => {
    const p1 = generateDailyPuzzle('2026-08-21');
    const p2 = generateDailyPuzzle('2026-08-22');
    expect(p1.solution).not.toEqual(p2.solution);
  });

  it('the generated daily puzzle is structurally valid and provably unique', () => {
    const puzzle = generateDailyPuzzle('2026-08-21');
    expect(validateFullPath(puzzle.solution, puzzle.size)).toBe(true);
    const result = countSolutions(puzzle.size, puzzle.givens, 2);
    expect(result.exhaustedBudget).toBe(false);
    expect(result.count).toBe(1);
  });

  it('spot-checks several dates across a week all generate valid unique puzzles', () => {
    const dates = ['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23'];
    for (const date of dates) {
      const puzzle = generateDailyPuzzle(date);
      expect(validateFullPath(puzzle.solution, puzzle.size)).toBe(true);
      const result = countSolutions(puzzle.size, puzzle.givens, 2);
      expect(result.count).toBe(1);
    }
  }, 30_000);
});
