/**
 * Core data model for Leapline puzzles.
 *
 * A puzzle is played on an N x N grid. Cells are addressed by a flat
 * 0-indexed "cell index" (row-major: index = row * size + col). The
 * solution is a permutation of every cell index, one per value from
 * 1..maxValue (maxValue = size*size), such that consecutive values sit on
 * cells reachable by an orthogonal (non-diagonal) step of 1, 2 or 3 cells.
 */

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

/** A pre-revealed number on the board: value `value` lives at cell `cell`. */
export interface GivenClue {
  value: number;
  cell: number;
}

export interface Puzzle {
  /** Deterministic seed string this puzzle was generated from. */
  seed: string;
  size: number;
  difficulty: Difficulty;
  /** size * size */
  maxValue: number;
  /** The unique solution: solution[v - 1] = cell index holding value v. */
  solution: number[];
  /** Pre-revealed clues shown to the player at the start of the puzzle. */
  givens: GivenClue[];
}

/** Lookup helpers derived from a Puzzle's givens, built once per session. */
export interface GivenMaps {
  /** cell index -> given value at that cell */
  cellToValue: Map<number, number>;
  /** value -> given cell index */
  valueToCell: Map<number, number>;
}

export function buildGivenMaps(givens: GivenClue[]): GivenMaps {
  const cellToValue = new Map<number, number>();
  const valueToCell = new Map<number, number>();
  for (const g of givens) {
    cellToValue.set(g.cell, g.value);
    valueToCell.set(g.value, g.cell);
  }
  return { cellToValue, valueToCell };
}
