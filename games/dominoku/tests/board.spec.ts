import { describe, expect, it } from 'vitest';
import { addPlacement, canPlace, cellMap, createBoard, removePlacement, totals, trayTiles } from '../src/game/board';
import { lineStatus, isSolved } from '../src/game/rules';
import { p, puzzle, TINY } from './helpers';

describe('board', () => {
  const board = createBoard(TINY);

  it('rejects placements off the grid', () => {
    expect(canPlace(board, p('1-2', 0, 1, 0))).toBe(false); // sticks out right
    expect(canPlace(board, p('1-2', 1, 0, 1))).toBe(false); // sticks out bottom
    expect(canPlace(board, p('1-2', -1, 0, 1))).toBe(false);
    expect(canPlace(board, p('1-2', 0, 0, 0))).toBe(true);
  });

  it('rejects overlaps, unknown tiles and tiles already placed', () => {
    const b = addPlacement(board, p('1-2', 0, 0, 0));
    expect(canPlace(b, p('3-4', 0, 1, 1))).toBe(false);
    expect(canPlace(b, p('1-2', 1, 0, 0))).toBe(false);
    expect(canPlace(b, p('6-6', 1, 0, 0))).toBe(false);
    expect(canPlace(b, p('3-4', 1, 0, 0))).toBe(true);
  });

  it('counts locked dominoes as occupied cells and keeps them out of the tray', () => {
    const lockedPuzzle = puzzle(2, ['1-2', '3-4'], [3, 7], [4, 6], [p('1-2', 0, 0, 0)]);
    const b = createBoard(lockedPuzzle);
    expect(canPlace(b, p('3-4', 0, 0, 0))).toBe(false);
    expect(trayTiles(b).map((t) => t.id)).toEqual(['3-4']);
    expect(cellMap(b)[0]?.locked).toBe(true);
  });

  it('adds up rows and columns and updates after removal', () => {
    let b = addPlacement(board, p('1-2', 0, 0, 0));
    expect(totals(b)).toEqual({ rows: [3, 0], cols: [1, 2] });
    b = addPlacement(b, p('3-4', 1, 0, 0));
    expect(totals(b)).toEqual({ rows: [3, 7], cols: [4, 6] });
    b = removePlacement(b, '3-4');
    expect(totals(b)).toEqual({ rows: [3, 0], cols: [1, 2] });
  });

  it('puts the pips on the right side after rotating 180 degrees', () => {
    const b = addPlacement(board, p('1-2', 0, 0, 2));
    expect(totals(b).cols).toEqual([2, 1]);
  });
});

describe('rules', () => {
  it('classifies a line as short, match or over', () => {
    expect(lineStatus(3, 5)).toBe('short');
    expect(lineStatus(5, 5)).toBe('match');
    expect(lineStatus(6, 5)).toBe('over');
    expect(lineStatus(0, 0)).toBe('match');
  });

  it('is solved only when the grid is full and every line matches', () => {
    const empty = createBoard(TINY);
    expect(isSolved(empty, TINY)).toBe(false);
    const good = addPlacement(addPlacement(empty, p('1-2', 0, 0, 0)), p('3-4', 1, 0, 0));
    expect(isSolved(good, TINY)).toBe(true);
    const swapped = addPlacement(addPlacement(empty, p('1-2', 0, 0, 2)), p('3-4', 1, 0, 0));
    expect(isSolved(swapped, TINY)).toBe(false); // full, but columns are off
    expect(isSolved(addPlacement(empty, p('1-2', 0, 0, 0)), TINY)).toBe(false); // matches so far, not full
  });
});