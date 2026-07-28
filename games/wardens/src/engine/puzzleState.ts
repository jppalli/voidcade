import { cellConflictsWithPlaced } from './solver';
import type { CellMark, Position, WardenLevel } from './types';

/** Lives granted at the start of every level. */
export const MAX_LIVES = 3;

export interface PuzzleState {
  marks: CellMark[][];
  /** how many wrong taps have been made this attempt */
  livesLost: number;
  usedHint: boolean;
  aegisShieldActive: boolean;
}

export function createInitialState(size: number): PuzzleState {
  return {
    marks: Array.from({ length: size }, () => new Array<CellMark>(size).fill('empty')),
    livesLost: 0,
    usedHint: false,
    aegisShieldActive: false,
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

/** True if this cell holds a Warden in the level's one true solution. */
export function isSolutionCell(level: WardenLevel, row: number, col: number): boolean {
  return level.solution.some((p) => p.row === row && p.col === col);
}

/**
 * Since a Warden can only ever be placed on a true-solution cell now, the
 * puzzle is solved once every solution cell has been revealed.
 */
export function isSolved(marks: CellMark[][], level: WardenLevel): boolean {
  return level.solution.every((p) => marks[p.row][p.col] === 'warden');
}

export function livesRemaining(state: PuzzleState): number {
  return Math.max(0, MAX_LIVES - state.livesLost);
}

export function isOutOfLives(state: PuzzleState): boolean {
  return state.livesLost >= MAX_LIVES;
}

/**
 * Applies the Banish boon to one region: every cell in that region which
 * conflicts with an already-revealed Warden gets crossed out for free (no
 * life cost), doing the tedious elimination work for the player.
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
