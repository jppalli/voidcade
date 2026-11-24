import { describe, expect, it } from 'vitest';
import { ALL_TILES, cellsOf, nextOrientation, parseTile } from '../src/game/dominoes';

describe('dominoes', () => {
  it('has the 28 double-six tiles', () => {
    expect(ALL_TILES).toHaveLength(28);
    expect(new Set(ALL_TILES.map((t) => t.id)).size).toBe(28);
  });

  it('shows pips in the right cells for all four orientations', () => {
    const t = parseTile('2-5');
    const at = (o: 0 | 1 | 2 | 3) => cellsOf(t, { row: 1, col: 1, orientation: o });
    expect(at(0)).toEqual([{ row: 1, col: 1, pip: 2 }, { row: 1, col: 2, pip: 5 }]);
    expect(at(1)).toEqual([{ row: 1, col: 1, pip: 2 }, { row: 2, col: 1, pip: 5 }]);
    expect(at(2)).toEqual([{ row: 1, col: 1, pip: 5 }, { row: 1, col: 2, pip: 2 }]);
    expect(at(3)).toEqual([{ row: 1, col: 1, pip: 5 }, { row: 2, col: 1, pip: 2 }]);
  });

  it('rotates clockwise through four steps and back', () => {
    expect([0, 1, 2, 3].map((o) => nextOrientation(o as 0 | 1 | 2 | 3))).toEqual([1, 2, 3, 0]);
  });
});