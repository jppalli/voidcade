import { describe, expect, it } from 'vitest';
import { Progress } from '../src/game/progress';
import { memoryStore, type Store } from '../src/platform/storage';
import { p } from './helpers';

const today = new Date(2026, 5, 15);

describe('progress', () => {
  it('saves and restores a puzzle and the theme', () => {
    const store = memoryStore();
    const a = new Progress(store, today);
    a.set('2026-06-15', 4, { placed: [p('1-2', 0, 0, 0)], solved: false });
    a.setTheme('dark');
    const b = new Progress(store, today);
    expect(b.get('2026-06-15', 4)).toEqual({ placed: [p('1-2', 0, 0, 0)], solved: false });
    expect(b.theme).toBe('dark');
    expect(b.get('2026-06-15', 2)).toBeNull();
  });

  it('ignores corrupt data without throwing', () => {
    for (const bad of ['not json', '{"v":2}', '{"v":1,"days":5}', 'null', '[]']) {
      const store: Store = { read: () => bad, write: () => {} };
      expect(() => new Progress(store, today)).not.toThrow();
      expect(new Progress(store, today).get('2026-06-15', 2)).toBeNull();
    }
  });

  it('drops malformed placements', () => {
    const store: Store = {
      read: () => JSON.stringify({ v: 1, days: { '2026-06-15': { '2': { placed: [{ tile: '1-2', row: 0, col: 0, orientation: 0 }, { tile: 3 }, null], solved: true } } } }),
      write: () => {},
    };
    expect(new Progress(store, today).get('2026-06-15', 2)?.placed).toEqual([p('1-2', 0, 0, 0)]);
  });

  it('keeps history for the archive and statistics, and drops very old days', () => {
    const store = memoryStore();
    const a = new Progress(store, today);
    a.set('2026-01-02', 2, { placed: [], solved: true, solvedOn: '2026-01-02', ms: 1234 });
    a.set('2022-01-01', 2, { placed: [], solved: true });
    const b = new Progress(store, today);
    expect(b.get('2026-01-02', 2)).toEqual({ placed: [], solved: true, solvedOn: '2026-01-02', ms: 1234 });
    expect(b.get('2022-01-01', 2)).toBeNull();
    expect(Object.keys(b.days)).toEqual(['2026-01-02']);
  });

  it('saves sound preferences, on by default', () => {
    const store = memoryStore();
    expect(new Progress(store, today).sound).toEqual({ sfx: true, music: true });
    new Progress(store, today).setSound({ sfx: false, music: true });
    expect(new Progress(store, today).sound).toEqual({ sfx: false, music: true });
  });
});