import { describe, expect, it } from 'vitest';
import { inBounds, isValidStep, manhattan, neighborsInRange, stepDistance, toIndex, toRC } from '../grid';

describe('grid geometry', () => {
  it('toRC / toIndex round-trip', () => {
    const size = 6;
    for (let i = 0; i < size * size; i++) {
      const { r, c } = toRC(i, size);
      expect(toIndex(r, c, size)).toBe(i);
    }
  });

  it('inBounds rejects out-of-range coordinates', () => {
    expect(inBounds(0, 0, 5)).toBe(true);
    expect(inBounds(4, 4, 5)).toBe(true);
    expect(inBounds(-1, 0, 5)).toBe(false);
    expect(inBounds(0, 5, 5)).toBe(false);
    expect(inBounds(5, 0, 5)).toBe(false);
  });

  it('manhattan distance is correct', () => {
    const size = 5;
    const a = toIndex(0, 0, size);
    const b = toIndex(3, 4, size);
    expect(manhattan(a, b, size)).toBe(7);
  });

  describe('stepDistance / isValidStep', () => {
    const size = 7; // wide enough that a step of 3 from the center stays in bounds

    it('accepts horizontal steps of 1, 2, 3', () => {
      const a = toIndex(3, 0, size);
      for (const step of [1, 2, 3]) {
        const b = toIndex(3, step, size);
        expect(stepDistance(a, b, size)).toBe(step);
        expect(isValidStep(a, b, size)).toBe(true);
      }
    });

    it('accepts vertical steps of 1, 2, 3', () => {
      const a = toIndex(0, 2, size);
      for (const step of [1, 2, 3]) {
        const b = toIndex(step, 2, size);
        expect(stepDistance(a, b, size)).toBe(step);
      }
    });

    it('rejects a step of 4 or more (out of range)', () => {
      const a = toIndex(0, 0, size);
      const b = toIndex(0, 4, size);
      expect(stepDistance(a, b, size)).toBeNull();
      expect(isValidStep(a, b, size)).toBe(false);
    });

    it('rejects a zero-distance "step" (same cell)', () => {
      const a = toIndex(3, 3, size);
      expect(stepDistance(a, a, size)).toBeNull();
    });

    it('rejects diagonal moves even at distance 1', () => {
      const a = toIndex(3, 3, size);
      const b = toIndex(4, 4, size);
      expect(stepDistance(a, b, size)).toBeNull();
      expect(isValidStep(a, b, size)).toBe(false);
    });

    it('rejects any move that is not perfectly aligned on a row or column', () => {
      const a = toIndex(3, 0, size);
      const b = toIndex(4, 2, size); // knight-ish, not aligned
      expect(stepDistance(a, b, size)).toBeNull();
    });
  });

  describe('neighborsInRange', () => {
    it('a center cell on a large enough board has 4 directions x 3 steps = 12 neighbors', () => {
      const size = 9;
      const center = toIndex(4, 4, size);
      const neighbors = neighborsInRange(center, size);
      expect(neighbors).toHaveLength(12);
    });

    it('every returned neighbor is a legal step from the origin cell', () => {
      const size = 7;
      const cell = toIndex(3, 3, size);
      for (const n of neighborsInRange(cell, size)) {
        expect(isValidStep(cell, n, size)).toBe(true);
      }
    });

    it('a corner cell on a small board has fewer neighbors (clipped by bounds)', () => {
      const size = 4;
      const corner = toIndex(0, 0, size);
      const neighbors = neighborsInRange(corner, size);
      // From (0,0) on a 4x4 board: right by 1,2,3 and down by 1,2,3 = 6 max.
      expect(neighbors.length).toBeLessThanOrEqual(6);
      expect(neighbors.length).toBeGreaterThan(0);
      for (const n of neighbors) expect(isValidStep(corner, n, size)).toBe(true);
    });

    it('never returns the origin cell itself or duplicates', () => {
      const size = 5;
      const cell = toIndex(2, 2, size);
      const neighbors = neighborsInRange(cell, size);
      expect(neighbors).not.toContain(cell);
      expect(new Set(neighbors).size).toBe(neighbors.length);
    });
  });
});
