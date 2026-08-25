/**
 * Small deterministic PRNG (mulberry32) plus a string seed hash, so every
 * puzzle can be reproduced exactly from its seed string — including daily
 * puzzles derived from a date string.
 */

export type Rng = () => number;

/** Hashes an arbitrary string into a 32-bit unsigned int (xfnv1a). */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: fast, small, decent-quality deterministic PRNG. Returns a function producing floats in [0, 1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Builds a deterministic Rng directly from a seed string. */
export function rngFromString(seed: string): Rng {
  return mulberry32(hashSeed(seed));
}

/** Random integer in [0, maxExclusive). */
export function randInt(rng: Rng, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive);
}

/** Returns a new shuffled copy of `arr` (Fisher-Yates) using `rng`. */
export function shuffled<T>(arr: readonly T[], rng: Rng): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
