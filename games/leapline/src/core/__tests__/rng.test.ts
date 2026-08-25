import { describe, expect, it } from 'vitest';
import { hashSeed, mulberry32, randInt, rngFromString, shuffled } from '../rng';

describe('rng', () => {
  it('hashSeed is deterministic for the same string', () => {
    expect(hashSeed('leapline-daily-2026-08-21')).toBe(hashSeed('leapline-daily-2026-08-21'));
  });

  it('hashSeed differs for different strings (no trivial collisions in a small sample)', () => {
    const hashes = new Set<number>();
    for (let i = 0; i < 50; i++) hashes.add(hashSeed(`seed-${i}`));
    expect(hashes.size).toBe(50);
  });

  it('mulberry32 produces the same sequence for the same seed', () => {
    const a = mulberry32(1234);
    const b = mulberry32(1234);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('mulberry32 values stay within [0, 1)', () => {
    const rng = mulberry32(99);
    for (let i = 0; i < 500; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('rngFromString is fully deterministic end to end', () => {
    const a = rngFromString('hello-world');
    const b = rngFromString('hello-world');
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });

  it('randInt stays within [0, max)', () => {
    const rng = rngFromString('bounds-check');
    for (let i = 0; i < 300; i++) {
      const v = randInt(rng, 7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
  });

  it('shuffled is a permutation (same elements, same length)', () => {
    const rng = rngFromString('shuffle-check');
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffled(input, rng);
    expect(out).toHaveLength(input.length);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
  });

  it('shuffled does not mutate the input array', () => {
    const rng = rngFromString('no-mutate');
    const input = [1, 2, 3, 4, 5];
    const copy = input.slice();
    shuffled(input, rng);
    expect(input).toEqual(copy);
  });
});
