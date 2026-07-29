import { generatePuzzle, type Position, type PuzzleBoard } from '@arcade/queens-core';
import type { LevelRef } from './levels';

export type CellMark = 'empty' | 'wrong' | 'cat';

export const MAX_LIVES = 3;

export class Game {
  readonly ref: LevelRef;
  readonly board: PuzzleBoard;
  marks: CellMark[][];
  livesLost = 0;
  usedHint = false;
  private history: Array<{ marks: CellMark[][]; livesLost: number }> = [];

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

  /** Tap a cell: places a cat if correct, marks as wrong and costs a life if incorrect.
   *  Returns what happened: 'correct' | 'wrong' | 'already-filled' */
  tap(row: number, col: number): 'correct' | 'wrong' | 'already-filled' {
    if (this.marks[row][col] !== 'empty') return 'already-filled';

    this.history.push({ marks: this.marks.map((r) => r.slice()), livesLost: this.livesLost });
    if (this.history.length > 200) this.history.shift();

    if (this.isSolutionCell(row, col)) {
      this.marks[row][col] = 'cat';
      return 'correct';
    } else {
      this.marks[row][col] = 'wrong';
      this.livesLost++;
      return 'wrong';
    }
  }

  get canUndo(): boolean { return this.history.length > 0; }

  undo() {
    const prev = this.history.pop();
    if (prev) {
      this.marks = prev.marks;
      this.livesLost = prev.livesLost;
    }
  }

  reset() {
    this.history.push({ marks: this.marks.map((r) => r.slice()), livesLost: this.livesLost });
    this.marks = Game.emptyMarks(this.size);
    this.livesLost = 0;
  }

  /** Hint: places one correct cat for free, marks as hinted. */
  hint(): Position | null {
    const target = this.board.solution.find((p) => this.marks[p.row][p.col] !== 'cat');
    if (!target) return null;
    this.history.push({ marks: this.marks.map((r) => r.slice()), livesLost: this.livesLost });
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
