import { parseTile } from '../src/game/dominoes';
import type { Orientation, Placement, Puzzle, Size } from '../src/game/types';

export function puzzle(size: Size, tiles: string[], rows: number[], cols: number[], locked: Placement[] = []): Puzzle {
  return { id: 'test', size, rowTargets: rows, colTargets: cols, tiles: tiles.map(parseTile), locked };
}

export const p = (tile: string, row: number, col: number, orientation: Orientation): Placement => ({ tile, row, col, orientation });

/** 2x2 grid:  [1 2]   from dominoes 1-2 (flat) and 3-4 (flat).  rows 3,7  cols 4,6 */
export const TINY = puzzle(2, ['1-2', '3-4'], [3, 7], [4, 6]);