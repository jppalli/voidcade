import type { Board, Player, WinInfo } from './types';

/** All 8 winning lines on a 3x3 board, by cell index. */
export const LINES: [number, number, number][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],           // diagonals
];

export function checkWinner(board: Board): WinInfo | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    const v = board[a];
    if (v && v === board[b] && v === board[c]) {
      return { player: v as Player, line };
    }
  }
  return null;
}

export function isBoardFull(board: Board): boolean {
  return board.every(c => c !== null);
}

/**
 * Normalizes a typed answer for lenient matching: trims, lowercases,
 * strips punctuation, collapses whitespace, and drops a leading article.
 */
export function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^(a|an|the)\s+/, '')
    .trim();
}

/**
 * Checks a typed answer against a cell's curated accepted-word list.
 * Tries an exact normalized match first, then a basic singular/plural
 * fallback so "eagles" still matches an entry stored as "eagle".
 */
export function checkAnswer(answer: string, accepted: string[]): boolean {
  const norm = normalize(answer);
  if (!norm) return false;
  const pool = accepted.map(normalize);
  if (pool.includes(norm)) return true;
  if (norm.endsWith('s') && pool.includes(norm.slice(0, -1))) return true;
  if (!norm.endsWith('s') && pool.includes(`${norm}s`)) return true;
  return false;
}
