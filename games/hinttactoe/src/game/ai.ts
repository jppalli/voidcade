import type { Board, Player } from './types';
import { checkWinner, isBoardFull } from './rules';
import type { Game } from './state';

function otherPlayer(p: Player): Player {
  return p === 'X' ? 'O' : 'X';
}

/**
 * Standard minimax over the (tiny) tic-tac-toe search space. Scores from
 * the AI's perspective: +1 win, -1 loss, 0 draw. The board size (9 cells)
 * keeps the full tree cheap enough to search exhaustively every move.
 */
function minimax(board: Board, turn: Player, aiPlayer: Player): number {
  const win = checkWinner(board);
  if (win) return win.player === aiPlayer ? 1 : -1;
  if (isBoardFull(board)) return 0;

  let best = turn === aiPlayer ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (board[i] !== null) continue;
    board[i] = turn;
    const score = minimax(board, otherPlayer(turn), aiPlayer);
    board[i] = null;
    if (turn === aiPlayer) best = Math.max(best, score);
    else best = Math.min(best, score);
  }
  return best;
}

/**
 * Picks the AI's next cell via minimax (perfect play — it never loses).
 * Ties are broken randomly so the AI doesn't always play the same opening.
 */
export function chooseAiMove(board: Board, aiPlayer: Player): number {
  const working = board.slice();
  let bestScore = -Infinity;
  let bestMoves: number[] = [];

  for (let i = 0; i < 9; i++) {
    if (working[i] !== null) continue;
    working[i] = aiPlayer;
    const score = minimax(working, otherPlayer(aiPlayer), aiPlayer);
    working[i] = null;
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [i];
    } else if (score === bestScore) {
      bestMoves.push(i);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

/**
 * Picks a random accepted answer for the AI's chosen cell. The AI "knows"
 * the curated word list (there's no way to have it reason about arbitrary
 * words without a dictionary backend), so it always answers correctly —
 * beating it is about claiming the right squares, not tricking its answers.
 */
export function chooseAiAnswer(game: Game, index: number): string {
  const accepted = game.acceptedFor(index);
  return accepted[Math.floor(Math.random() * accepted.length)];
}
