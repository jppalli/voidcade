import { describe, expect, it } from 'vitest';
import { buildRandomHamiltonianPath } from '../pathBuilder';
import { rngFromString } from '../rng';
import { validateFullPath } from '../validate';

describe('buildRandomHamiltonianPath', () => {
  it('builds a full legal Hamiltonian path on a 5x5 board', () => {
    const rng = rngFromString('path-test-5');
    const path = buildRandomHamiltonianPath(5, rng);
    expect(path).not.toBeNull();
    expect(path).toHaveLength(25);
    expect(validateFullPath(path!, 5)).toBe(true);
  });

  it('builds a full legal path on grid sizes 2 through 8', () => {
    for (let size = 2; size <= 8; size++) {
      const rng = rngFromString(`path-test-size-${size}`);
      const path = buildRandomHamiltonianPath(size, rng);
      expect(path, `size ${size} should find a path`).not.toBeNull();
      expect(path).toHaveLength(size * size);
      expect(validateFullPath(path!, size)).toBe(true);
    }
  });

  it('is deterministic for the same seed', () => {
    const path1 = buildRandomHamiltonianPath(6, rngFromString('determinism-check'));
    const path2 = buildRandomHamiltonianPath(6, rngFromString('determinism-check'));
    expect(path1).toEqual(path2);
  });

  it('produces different paths for different seeds (not a fixed constant path)', () => {
    const path1 = buildRandomHamiltonianPath(6, rngFromString('seed-a'));
    const path2 = buildRandomHamiltonianPath(6, rngFromString('seed-b'));
    expect(path1).not.toEqual(path2);
  });
});
