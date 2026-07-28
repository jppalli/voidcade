export interface Position {
  row: number;
  col: number;
}

/**
 * A generated puzzle board.
 *
 * Rules of the genre (Queens / Star Battle / "two not touch"):
 *  - exactly one piece per row
 *  - exactly one piece per column
 *  - exactly one piece per colour region
 *  - no two pieces adjacent, including diagonally
 *
 * Every board produced by this package is guaranteed to have exactly one
 * solution, and every region is a single orthogonally-connected blob.
 */
export interface PuzzleBoard {
  size: number;
  /** regions[row][col] = region index in 0..size-1 */
  regions: number[][];
  /** the one true solution: one cell per row, in row order */
  solution: Position[];
}
