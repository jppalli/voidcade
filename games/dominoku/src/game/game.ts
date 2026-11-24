import { addPlacement, canPlace, createBoard, findPlaced, removePlacement, type Board } from './board';
import { isSolved } from './rules';
import type { Placement, Puzzle } from './types';

export interface Action {
  type: 'place' | 'remove';
  placement: Placement;
}

/** One puzzle in play: the board, the undo history and the solved state. No DOM access. */
export class Game {
  board: Board;
  history: Action[] = [];

  constructor(readonly puzzle: Puzzle, saved: readonly Placement[] = []) {
    this.board = createBoard(puzzle);
    // Replay saved placements one by one so invalid data is dropped, and undo works after a reload.
    for (const p of saved) this.place(p);
  }

  get solved(): boolean {
    return isSolved(this.board, this.puzzle);
  }

  get canUndo(): boolean {
    return !this.solved && this.history.length > 0;
  }

  place(p: Placement): boolean {
    if (this.solved || !canPlace(this.board, p)) return false;
    this.board = addPlacement(this.board, p);
    this.history.push({ type: 'place', placement: p });
    return true;
  }

  /** Returns the placement that was taken back, or null. Locked dominoes cannot be taken back. */
  takeBack(tileId: string): Placement | null {
    if (this.solved) return null;
    const p = findPlaced(this.board, tileId);
    if (!p) return null;
    this.board = removePlacement(this.board, tileId);
    this.history.push({ type: 'remove', placement: p });
    return p;
  }

  undo(): Action | null {
    if (!this.canUndo) return null;
    const a = this.history.pop()!;
    this.board = a.type === 'place' ? removePlacement(this.board, a.placement.tile) : addPlacement(this.board, a.placement);
    return a;
  }

  restart(): void {
    if (this.solved) return;
    this.board = createBoard(this.puzzle);
    this.history = [];
  }
}