import { describe, expect, it } from 'vitest';
import { Game } from '../src/game/game';
import { p, puzzle, TINY } from './helpers';

describe('game: undo, take back, restart', () => {
  it('undoes placements one step at a time, back to the start', () => {
    const g = new Game(TINY);
    expect(g.canUndo).toBe(false);
    g.place(p('1-2', 0, 0, 0));
    g.place(p('3-4', 1, 0, 2));
    expect(g.board.placed).toHaveLength(2);
    expect(g.undo()?.type).toBe('place');
    expect(g.board.placed).toHaveLength(1);
    g.undo();
    expect(g.board.placed).toHaveLength(0);
    expect(g.canUndo).toBe(false);
    expect(g.undo()).toBeNull();
  });

  it('undoes a take-back by putting the domino back', () => {
    const g = new Game(TINY);
    g.place(p('1-2', 0, 0, 0));
    expect(g.takeBack('1-2')).toEqual(p('1-2', 0, 0, 0));
    expect(g.board.placed).toHaveLength(0);
    expect(g.undo()?.type).toBe('remove');
    expect(g.board.placed).toEqual([p('1-2', 0, 0, 0)]);
  });

  it('cannot take back a locked domino', () => {
    const g = new Game(puzzle(2, ['1-2', '3-4'], [3, 7], [4, 6], [p('1-2', 0, 0, 0)]));
    expect(g.takeBack('1-2')).toBeNull();
  });

  it('restart removes only player dominoes and clears history', () => {
    const g = new Game(puzzle(2, ['1-2', '3-4'], [3, 7], [4, 6], [p('1-2', 0, 0, 0)]));
    g.place(p('3-4', 1, 0, 2));
    g.restart();
    expect(g.board.placed).toHaveLength(0);
    expect(g.board.locked).toHaveLength(1);
    expect(g.canUndo).toBe(false);
  });

  it('freezes after the puzzle is solved', () => {
    const g = new Game(TINY);
    g.place(p('1-2', 0, 0, 0));
    g.place(p('3-4', 1, 0, 0));
    expect(g.solved).toBe(true);
    expect(g.canUndo).toBe(false);
    expect(g.takeBack('1-2')).toBeNull();
    g.restart();
    expect(g.board.placed).toHaveLength(2);
  });

  it('restores saved placements and drops invalid ones', () => {
    const g = new Game(TINY, [p('1-2', 0, 0, 0), p('3-4', 0, 0, 0), p('9-9', 1, 0, 0)]);
    expect(g.board.placed.map((x) => x.tile)).toEqual(['1-2']);
    expect(g.canUndo).toBe(true);
  });
});