import { cellConflictsWithPlaced, isAdjacent } from './solver';
import type { CellMark, Position, WardenLevel } from './types';

export interface PuzzleState {
  marks: CellMark[][];
  mistakes: number;
  usedHint: boolean;
  usedBanish: boolean;
  aegisShieldActive: boolean;
  history: CellMark[][][]; // stack of previous `marks` grids, for undo
}

export function createInitialState(size: number): PuzzleState {
  return {
    marks: Array.from({ length: size }, () => new Array<CellMark>(size).fill('empty')),
    mistakes: 0,
    usedHint: false,
    usedBanish: false,
    aegisShieldActive: false,
    history: [],
  };
}

export function cloneMarks(marks: CellMark[][]): CellMark[][] {
  return marks.map((row) => row.slice());
}

export function getWardenPositions(marks: CellMark[][]): Position[] {
  const out: Position[] = [];
  marks.forEach((row, r) =>
    row.forEach((mark, c) => {
      if (mark === 'warden') out.push({ row: r, col: c });
    })
  );
  return out;
}

/** Returns positions of all wardens that conflict with at least one other placed warden. */
export function findConflicts(marks: CellMark[][], regions: number[][]): Set<string> {
  const wardens = getWardenPositions(marks);
  const conflicts = new Set<string>();
  for (let i = 0; i < wardens.length; i++) {
    for (let j = i + 1; j < wardens.length; j++) {
      const a = wardens[i];
      const b = wardens[j];
      const sameRow = a.row === b.row;
      const sameCol = a.col === b.col;
      const sameRegion = regions[a.row][a.col] === regions[b.row][b.col];
      const adjacent = isAdjacent(a, b);
      if (sameRow || sameCol || sameRegion || adjacent) {
        conflicts.add(`${a.row},${a.col}`);
        conflicts.add(`${b.row},${b.col}`);
      }
    }
  }
  return conflicts;
}

export function isSolved(marks: CellMark[][], level: WardenLevel): boolean {
  const wardens = getWardenPositions(marks);
  if (wardens.length !== level.size) return false;
  const conflicts = findConflicts(marks, level.regions);
  return conflicts.size === 0;
}

/** Cycles a cell: empty -> x -> warden -> empty. */
export function nextMark(current: CellMark): CellMark {
  if (current === 'empty') return 'x';
  if (current === 'x') return 'warden';
  return 'empty';
}

/**
 * Applies the Banish boon to one region: every cell in that region which
 * conflicts with an already-placed warden (same row/col/region/adjacency)
 * gets auto-marked with an X, unless it's already a warden.
 */
export function applyBanish(marks: CellMark[][], regions: number[][], regionIndex: number): CellMark[][] {
  const next = cloneMarks(marks);
  const wardens = getWardenPositions(marks);
  const size = marks.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (regions[r][c] !== regionIndex) continue;
      if (next[r][c] === 'warden') continue;
      if (cellConflictsWithPlaced({ row: r, col: c }, regionIndex, regions, wardens)) {
        next[r][c] = 'x';
      }
    }
  }
  return next;
}
