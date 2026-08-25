import { describe, expect, it } from 'vitest';
import { toIndex } from '../grid';
import { countSolutions, isProvablyUnique } from '../solver';
import type { GivenClue } from '../types';

describe('countSolutions / isProvablyUnique', () => {
  it('a 2x2 board pinned at all 4 corners has zero solutions (no legal path exists)', () => {
    // 2x2: cells 0,1,2,3. Legal steps need alignment + distance 1-3.
    // Force an impossible arrangement: value1@0, value2@3 (diagonal - illegal step)
    const givens: GivenClue[] = [
      { value: 1, cell: 0 },
      { value: 2, cell: 3 },
    ];
    const result = countSolutions(2, givens, 2);
    expect(result.exhaustedBudget).toBe(false);
    expect(result.count).toBe(0);
    expect(isProvablyUnique(2, givens)).toBe(false);
  });

  it('an empty-givens 2x2 board has multiple valid Hamiltonian paths (ambiguous)', () => {
    const result = countSolutions(2, [], 2);
    expect(result.exhaustedBudget).toBe(false);
    expect(result.count).toBe(2); // capped at 2, but there are indeed >=2
    expect(isProvablyUnique(2, [])).toBe(false);
  });

  it('pinning start and end plus one full row can force a unique 2x2 solution', () => {
    // 2x2 grid: 0 1 / 2 3. Pin the entire path explicitly -> exactly one "solution" trivially.
    const givens: GivenClue[] = [
      { value: 1, cell: 0 },
      { value: 2, cell: 1 },
      { value: 3, cell: 3 },
      { value: 4, cell: 2 },
    ];
    const result = countSolutions(2, givens, 2);
    expect(result.count).toBe(1);
    expect(result.firstSolution).toEqual([0, 1, 3, 2]);
    expect(isProvablyUnique(2, givens)).toBe(true);
  });

  it('an inconsistent given (value 1 not reachable to value 2 in one step) yields zero solutions', () => {
    const size = 5;
    const givens: GivenClue[] = [
      { value: 1, cell: toIndex(0, 0, size) },
      { value: 2, cell: toIndex(4, 4, size) }, // far away and diagonal — impossible in one step
    ];
    const result = countSolutions(size, givens, 2);
    expect(result.count).toBe(0);
  });

  it('a fully unconstrained 3x3 board has multiple solutions', () => {
    const result = countSolutions(3, [], 2);
    expect(result.count).toBe(2); // stops at cap, but confirms >1 exists
  });

  it('respects the solution cap and does not overcount beyond it', () => {
    const result = countSolutions(3, [], 1);
    expect(result.count).toBe(1);
  });

  it('firstSolution (when present) is internally consistent with the givens supplied', () => {
    const givens: GivenClue[] = [
      { value: 1, cell: 0 },
      { value: 2, cell: 1 },
      { value: 3, cell: 3 },
      { value: 4, cell: 2 },
    ];
    const result = countSolutions(2, givens, 1);
    expect(result.firstSolution).not.toBeNull();
    for (const g of givens) {
      expect(result.firstSolution?.[g.value - 1]).toBe(g.cell);
    }
  });
});
