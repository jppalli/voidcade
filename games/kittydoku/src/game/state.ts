import { conflictsWithPlaced, generatePuzzle, type Position, type PuzzleBoard } from '@arcade/queens-core';
import type { LevelRef } from './levels';

/** empty -> paw mark ("no cat here") -> cat -> empty */
export type CellMark = 'empty' | 'paw' | 'cat';

export interface Snapshot {
  marks: CellMark[][];
}

/**
 * KittyDoku is deliberately forgiving — there are no lives and no fail state.
 * A cat placed somewhere illegal simply shows as unhappy until you move it, so
 * the puzzle stays a calm logic exercise rather than a test you can lose.
 */
export class Game {
  readonly ref: LevelRef;
  readonly board: PuzzleBoard;
  marks: CellMark[][];
  usedHint = false;
  private history: Snapshot[] = [];

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

  get size(): number {
    return this.board.size;
  }

  regionAt(row: number, col: number): number {
    return this.board.regions[row][col];
  }

  catPositions(): Position[] {
    const out: Position[] = [];
    this.marks.forEach((row, r) =>
      row.forEach((m, c) => {
        if (m === 'cat') out.push({ row: r, col: c });
      })
    );
    return out;
  }

  /** Cats that break a rule against some other placed cat, as "r,c" keys. */
  unhappyCats(): Set<string> {
    const cats = this.catPositions();
    const out = new Set<string>();
    for (const cat of cats) {
      if (conflictsWithPlaced(cat, this.board.regions, cats)) out.add(`${cat.row},${cat.col}`);
    }
    return out;
  }

  private pushHistory() {
    this.history.push({ marks: this.marks.map((r) => r.slice()) });
    if (this.history.length > 200) this.history.shift();
  }

  get canUndo(): boolean {
    return this.history.length > 0;
  }

  cycle(row: number, col: number): CellMark {
    this.pushHistory();
    const current = this.marks[row][col];
    const next: CellMark = current === 'empty' ? 'paw' : current === 'paw' ? 'cat' : 'empty';
    this.marks[row][col] = next;
    return next;
  }

  undo() {
    const prev = this.history.pop();
    if (prev) this.marks = prev.marks;
  }

  reset() {
    this.pushHistory();
    this.marks = Game.emptyMarks(this.size);
  }

  /** Places one guaranteed-correct cat and flags the level as hinted. */
  hint(): Position | null {
    const target = this.board.solution.find((p) => this.marks[p.row][p.col] !== 'cat');
    if (!target) return null;
    this.pushHistory();
    this.marks[target.row][target.col] = 'cat';
    this.usedHint = true;
    return target;
  }

  /**
   * Solved when every solution cell holds a cat and nothing else does. Checking
   * the count as well as the cells stops a board full of cats counting as a win.
   */
  isSolved(): boolean {
    const cats = this.catPositions();
    if (cats.length !== this.size) return false;
    return this.board.solution.every((p) => this.marks[p.row][p.col] === 'cat');
  }

  /** How many cats are correctly placed, for the progress readout. */
  correctCount(): number {
    return this.board.solution.filter((p) => this.marks[p.row][p.col] === 'cat').length;
  }
}
