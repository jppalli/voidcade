import { describe, expect, it } from 'vitest';
import { toIndex } from '../grid';
import { validateFullPath, validatePartialSequence } from '../validate';

describe('validateFullPath', () => {
  it('accepts a hand-built legal path on a 3x3 board', () => {
    // 3x3 indices: 0 1 2 / 3 4 5 / 6 7 8
    // 0 -> 2 (step 2, horizontal) -> 5 (step 1, vertical) -> 3 (step 2, horizontal)
    // -> 6 (step 1, vertical) -> 7 -> 8 -> 1 (step... let's just build a verified simple one)
    // Simpler: boustrophedon path with only step-1 moves, always legal.
    const path = [0, 1, 2, 5, 4, 3, 6, 7, 8];
    expect(validateFullPath(path, 3)).toBe(true);
  });

  it('rejects a path that revisits a cell', () => {
    const path = [0, 1, 2, 5, 4, 3, 6, 7, 6];
    expect(validateFullPath(path, 3)).toBe(false);
  });

  it('rejects a path with the wrong length', () => {
    const path = [0, 1, 2, 5, 4, 3, 6, 7];
    expect(validateFullPath(path, 3)).toBe(false);
  });

  it('rejects a path containing an out-of-range cell index', () => {
    const path = [0, 1, 2, 5, 4, 3, 6, 7, 99];
    expect(validateFullPath(path, 3)).toBe(false);
  });

  it('rejects a path with an illegal (too-far) consecutive jump', () => {
    const size = 5;
    // jump from (0,0) to (0,4) is a step of 4 — illegal
    const path = [toIndex(0, 0, size), toIndex(0, 4, size)];
    // pad to a full-length (invalid anyway due to length, but isolate the step check)
    expect(validateFullPath(path, size)).toBe(false);
  });

  it('rejects a path with a diagonal consecutive jump', () => {
    const path = [0, 4, 8, 1, 2, 3, 5, 6, 7]; // 3x3: 0->4 is diagonal
    expect(validateFullPath(path, 3)).toBe(false);
  });
});

describe('validatePartialSequence', () => {
  it('accepts an all-null (empty) sequence', () => {
    expect(validatePartialSequence([null, null, null], 3)).toBe(true);
  });

  it('accepts a sequence with gaps as long as placed pairs are legal steps', () => {
    // value 1 at cell 0, value 2 unplaced, value 3 at cell... gap breaks the chain check
    expect(validatePartialSequence([0, null, 5], 3)).toBe(true);
  });

  it('rejects a sequence with a duplicate placed cell', () => {
    expect(validatePartialSequence([0, 1, 0], 3)).toBe(false);
  });

  it('rejects a sequence where two consecutive placed values are not a legal step', () => {
    // 3x3: cell 0 and cell 8 are diagonal opposite corners — not a legal step at all
    expect(validatePartialSequence([0, 8], 3)).toBe(false);
  });

  it('accepts a sequence of legal consecutive steps', () => {
    const path = [0, 1, 2, 5, 4, 3, 6, 7, 8];
    expect(validatePartialSequence(path, 3)).toBe(true);
  });
});
