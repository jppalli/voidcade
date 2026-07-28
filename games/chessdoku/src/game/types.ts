export type PieceType = 'Q' | 'R' | 'B' | 'N' | 'K' | 'P';

export interface GivenPiece {
  p: PieceType;
  r: number;
  c: number;
}

export interface Level {
  ch: number;
  diff: number; // 1-5 stars
  name: string;
  desc: string;
  size: number;
  pieces: Partial<Record<PieceType, number>>;
  rule?: 'rowcol' | 'box';
  boxH?: number;
  boxW?: number;
  blocked?: [number, number][];
  given?: GivenPiece[];
}

export interface Cell {
  p: PieceType;
  given: boolean;
}

export type Board = (Cell | null)[][];

export interface Conflicts {
  /** attacker/victim pairs as [r1, c1, r2, c2], deduplicated */
  pairs: [number, number, number, number][];
  /** every cell index (r * size + c) involved in an attack */
  cells: Set<number>;
}

export const GLYPHS: Record<PieceType, string> = { Q: '♛', R: '♜', B: '♝', N: '♞', K: '♚', P: '♟' };
export const PIECE_NAMES: Record<PieceType, string> = { Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', K: 'King', P: 'Pawn' };
export const PIECE_MOVES: Record<PieceType, string> = {
  Q: 'Attacks rows, columns & diagonals',
  R: 'Attacks along rows & columns',
  B: 'Attacks along diagonals',
  N: 'Jumps in an L — ignores blockers',
  K: 'Attacks the 8 adjacent squares',
  P: 'Attacks the 2 squares diagonally above',
};
