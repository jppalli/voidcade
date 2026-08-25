import { beforeEach, describe, expect, it } from 'vitest';
import { formatTime, loadStats, recordCompletion } from '../stats';

// jsdom-free unit tests exercise localStorage via a minimal in-memory shim,
// since this workspace's vitest environment is 'node' by default for the
// core algorithm tests. We install a tiny shim here scoped to this file.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
});

describe('stats', () => {
  it('loadStats returns sane defaults when nothing is stored', () => {
    const stats = loadStats();
    expect(stats.totalCompleted).toBe(0);
    expect(stats.currentStreak).toBe(0);
    expect(stats.history).toEqual([]);
  });

  it('recordCompletion increments totals and sets a personal best', () => {
    recordCompletion({
      seed: 'seed-1', difficulty: 'easy', size: 5, timeMs: 60_000,
      mistakes: 2, hintsUsed: 1, isDaily: false,
    });
    const stats = loadStats();
    expect(stats.totalCompleted).toBe(1);
    expect(stats.totalMistakes).toBe(2);
    expect(stats.totalHints).toBe(1);
    expect(stats.bestTimeMs.easy).toBe(60_000);
    expect(stats.history).toHaveLength(1);
  });

  it('a faster completion improves the personal best; a slower one does not', () => {
    recordCompletion({ seed: 'a', difficulty: 'medium', size: 6, timeMs: 90_000, mistakes: 0, hintsUsed: 0, isDaily: false });
    recordCompletion({ seed: 'b', difficulty: 'medium', size: 6, timeMs: 60_000, mistakes: 0, hintsUsed: 0, isDaily: false });
    expect(loadStats().bestTimeMs.medium).toBe(60_000);
    recordCompletion({ seed: 'c', difficulty: 'medium', size: 6, timeMs: 120_000, mistakes: 0, hintsUsed: 0, isDaily: false });
    expect(loadStats().bestTimeMs.medium).toBe(60_000); // unchanged — 120s is worse
  });

  it('daily completions on consecutive days extend the streak', () => {
    recordCompletion({ seed: 'd1', difficulty: 'easy', size: 5, timeMs: 1000, mistakes: 0, hintsUsed: 0, isDaily: true, dailyDate: '2026-08-20' });
    recordCompletion({ seed: 'd2', difficulty: 'easy', size: 5, timeMs: 1000, mistakes: 0, hintsUsed: 0, isDaily: true, dailyDate: '2026-08-21' });
    const stats = loadStats();
    expect(stats.currentStreak).toBe(2);
    expect(stats.bestStreak).toBe(2);
  });

  it('skipping a day resets the streak to 1', () => {
    recordCompletion({ seed: 'd1', difficulty: 'easy', size: 5, timeMs: 1000, mistakes: 0, hintsUsed: 0, isDaily: true, dailyDate: '2026-08-18' });
    recordCompletion({ seed: 'd2', difficulty: 'easy', size: 5, timeMs: 1000, mistakes: 0, hintsUsed: 0, isDaily: true, dailyDate: '2026-08-21' });
    expect(loadStats().currentStreak).toBe(1);
  });

  it('completing the same daily twice does not double-count the streak', () => {
    recordCompletion({ seed: 'd1', difficulty: 'easy', size: 5, timeMs: 1000, mistakes: 0, hintsUsed: 0, isDaily: true, dailyDate: '2026-08-21' });
    recordCompletion({ seed: 'd1', difficulty: 'easy', size: 5, timeMs: 900, mistakes: 0, hintsUsed: 0, isDaily: true, dailyDate: '2026-08-21' });
    expect(loadStats().currentStreak).toBe(1);
  });

  it('bestStreak persists even after the current streak resets', () => {
    recordCompletion({ seed: 'd1', difficulty: 'easy', size: 5, timeMs: 1000, mistakes: 0, hintsUsed: 0, isDaily: true, dailyDate: '2026-08-19' });
    recordCompletion({ seed: 'd2', difficulty: 'easy', size: 5, timeMs: 1000, mistakes: 0, hintsUsed: 0, isDaily: true, dailyDate: '2026-08-20' });
    recordCompletion({ seed: 'd3', difficulty: 'easy', size: 5, timeMs: 1000, mistakes: 0, hintsUsed: 0, isDaily: true, dailyDate: '2026-08-21' });
    // gap
    recordCompletion({ seed: 'd4', difficulty: 'easy', size: 5, timeMs: 1000, mistakes: 0, hintsUsed: 0, isDaily: true, dailyDate: '2026-08-25' });
    const stats = loadStats();
    expect(stats.currentStreak).toBe(1);
    expect(stats.bestStreak).toBe(3);
  });

  it('history is capped and most-recent-first', () => {
    for (let i = 0; i < 5; i++) {
      recordCompletion({ seed: `s${i}`, difficulty: 'easy', size: 5, timeMs: 1000, mistakes: 0, hintsUsed: 0, isDaily: false });
    }
    const stats = loadStats();
    expect(stats.history).toHaveLength(5);
    expect(stats.history[0].seed).toBe('s4');
  });

  it('formatTime renders mm:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65_000)).toBe('1:05');
    expect(formatTime(3_600_000)).toBe('60:00');
  });
});
