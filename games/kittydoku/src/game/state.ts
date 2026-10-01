import { generatePuzzle, type Position, type PuzzleBoard } from '@arcade/queens-core';
import type { LevelRef } from './levels';

export type CellMark = 'empty' | 'paw' | 'wrong' | 'cat';

export const MAX_LIVES = 3;

export class Game {
  readonly ref: LevelRef;
  readonly board: PuzzleBoard;
  marks: CellMark[][];
  /** Hearts lost this attempt. Only ever goes up: Undo and Reset restore
   *  marks but never give a heart back. A fresh Game (start, re-enter or
   *  "Try again") is the only way to refill. */
  livesLost = 0;
  usedHint = false;
  /** Undo snapshots hold marks only, so a lost heart stays lost. */
  private history: CellMark[][][] = [];

  constructor(ref: LevelRef) {
    this.ref = ref;
    this.board = generatePuzzle({
      size: ref.size,
      seed: ref.seed,
      singletonRegions: ref.singletons,
      minRegionSize: ref.minRegionSize,
    });
    this.marks = Game.emptyMarks(ref.size);
  }

  static emptyMarks(size: number): CellMark[][] {
    return Array.from({ length: size }, () => new Array<CellMark>(size).fill('empty'));
  }

  get size(): number { return this.board.size; }

  regionAt(row: number, col: number): number {
    return this.board.regions[row][col];
  }

  isSolutionCell(row: number, col: number): boolean {
    return this.board.solution.some((p) => p.row === row && p.col === col);
  }

  get livesRemaining(): number {
    return Math.max(0, MAX_LIVES - this.livesLost);
  }

  get outOfLives(): boolean {
    return this.livesLost >= MAX_LIVES;
  }

  private pushHistory() {
    this.history.push(this.marks.map((r) => r.slice()));
    if (this.history.length > 200) this.history.shift();
  }

  /** Free paw mark ("no cat here yet") on an empty cell. Never costs a life.
   *  `recordUndo: false` folds the change into the previous undo step (used
   *  so one drag stroke undoes as a single action). Returns false if the
   *  cell wasn't empty. */
  markPaw(row: number, col: number, recordUndo = true): boolean {
    if (this.marks[row][col] !== 'empty') return false;
    if (recordUndo) this.pushHistory();
    this.marks[row][col] = 'paw';
    return true;
  }

  /** Clears a paw back to empty. Free, no other side effects. */
  clearPaw(row: number, col: number): boolean {
    if (this.marks[row][col] !== 'paw') return false;
    this.pushHistory();
    this.marks[row][col] = 'empty';
    return true;
  }

  /** Commit a cat on an empty or paw cell: correct places a cat, wrong
   *  leaves a dead-cat mark and costs a life. This is the only way to lose
   *  a life. `recordUndo: false` folds it into the previous undo step (a
   *  double-tap undoes as one action back to the state before its first tap). */
  placeCat(row: number, col: number, recordUndo = true): 'correct' | 'wrong' | 'already-filled' {
    const current = this.marks[row][col];
    if (current === 'cat' || current === 'wrong') return 'already-filled';
    if (recordUndo) this.pushHistory();

    if (this.isSolutionCell(row, col)) {
      this.marks[row][col] = 'cat';
      return 'correct';
    }

    this.marks[row][col] = 'wrong';
    this.livesLost++;
    return 'wrong';
  }

  get canUndo(): boolean { return this.history.length > 0; }

  /** Restores the previous marks (it can lift a dead-cat mark) but keeps
   *  `livesLost` as it is. */
  undo() {
    const prev = this.history.pop();
    if (prev) this.marks = prev;
  }

  /** Clears the board (undoable). Lost hearts stay lost. */
  reset() {
    this.pushHistory();
    this.marks = Game.emptyMarks(this.size);
  }

  /** Hint: places one correct cat for free, marks as hinted. */
  hint(): Position | null {
    const target = this.board.solution.find((p) => this.marks[p.row][p.col] !== 'cat');
    if (!target) return null;
    this.pushHistory();
    this.marks[target.row][target.col] = 'cat';
    this.usedHint = true;
    return target;
  }

  isSolved(): boolean {
    return this.board.solution.every((p) => this.marks[p.row][p.col] === 'cat');
  }

  correctCount(): number {
    return this.board.solution.filter((p) => this.marks[p.row][p.col] === 'cat').length;
  }
}
