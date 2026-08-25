import type { Board, Cell, GameMode, GridDef, Player, WinInfo } from './types';
import { checkAnswer, checkWinner, isBoardFull } from './rules';
import { randomGrid } from './grids';

export type AttemptOutcome =
  | { kind: 'occupied' }
  | { kind: 'wrong'; nextPlayer: Player }
  | { kind: 'placed'; player: Player; win: WinInfo | null; draw: boolean };

export interface GameEvents {
  onBoardChange: (game: Game) => void;
  onWrong: (game: Game, cellIndex: number) => void;
  onWin: (game: Game, win: WinInfo) => void;
  onDraw: (game: Game) => void;
}

const SCORE_KEY = 'hinttactoe-scores-v1';

/** Persists cumulative win counts across rounds (per-browser, no accounts). */
export class Scoreboard {
  x = 0;
  o = 0;
  draws = 0;

  constructor() {
    try {
      const raw = localStorage.getItem(SCORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { x: number; o: number; draws: number };
        this.x = parsed.x ?? 0;
        this.o = parsed.o ?? 0;
        this.draws = parsed.draws ?? 0;
      }
    } catch { /* ignore storage errors */ }
  }

  private persist(): void {
    try {
      localStorage.setItem(SCORE_KEY, JSON.stringify({ x: this.x, o: this.o, draws: this.draws }));
    } catch { /* ignore storage errors */ }
  }

  recordWin(player: Player): void {
    if (player === 'X') this.x++;
    else this.o++;
    this.persist();
  }

  recordDraw(): void {
    this.draws++;
    this.persist();
  }

  reset(): void {
    this.x = 0;
    this.o = 0;
    this.draws = 0;
    this.persist();
  }
}

export const scoreboard = new Scoreboard();

export class Game {
  grid: GridDef;
  board: Board = Array(9).fill(null) as Board;
  current: Player = 'X';
  winner: WinInfo | null = null;
  draw = false;
  /** 'pvp' = local hotseat, 'ai' = human (X) vs computer (O). Human always starts. */
  mode: GameMode = 'pvp';
  private events: GameEvents;

  constructor(events: GameEvents, grid: GridDef = randomGrid()) {
    this.events = events;
    this.grid = grid;
  }

  /**
   * Starts a fresh round. Picks a new random grid unless one is given, and
   * keeps the current mode unless a new one is given.
   */
  newRound(grid?: GridDef, mode: GameMode = this.mode): void {
    this.grid = grid ?? randomGrid(this.grid.id);
    this.board = Array(9).fill(null) as Board;
    this.current = 'X';
    this.winner = null;
    this.draw = false;
    this.mode = mode;
    this.events.onBoardChange(this);
  }

  cellAt(index: number): Cell {
    return this.board[index];
  }

  rowOf(index: number): number {
    return Math.floor(index / 3);
  }

  colOf(index: number): number {
    return index % 3;
  }

  /** The accepted-answer list for a given cell (by its row category x column trait). */
  acceptedFor(index: number): string[] {
    return this.grid.answers[this.rowOf(index)][this.colOf(index)];
  }

  isOver(): boolean {
    return this.winner !== null || this.draw;
  }

  /** True when it's the computer's turn (AI is always 'O'; human is always 'X'). */
  isAiTurn(): boolean {
    return this.mode === 'ai' && this.current === 'O' && !this.isOver();
  }

  /**
   * Attempts to claim a cell with a typed answer for the current player.
   * - Occupied cell: no-op, returns 'occupied'.
   * - Wrong/unrecognized answer: no mark placed, turn passes to the other
   *   player, returns 'wrong'.
   * - Correct answer: mark placed, win/draw checked, turn passes if the
   *   game continues, returns 'placed'.
   */
  attempt(index: number, rawAnswer: string): AttemptOutcome {
    if (this.isOver()) return { kind: 'occupied' };
    if (this.board[index] !== null) return { kind: 'occupied' };

    const player = this.current;
    const accepted = this.acceptedFor(index);
    const correct = checkAnswer(rawAnswer, accepted);

    if (!correct) {
      this.current = player === 'X' ? 'O' : 'X';
      this.events.onWrong(this, index);
      this.events.onBoardChange(this);
      return { kind: 'wrong', nextPlayer: this.current };
    }

    this.board[index] = player;
    const win = checkWinner(this.board);
    const boardFull = isBoardFull(this.board);

    if (win) {
      this.winner = win;
      scoreboard.recordWin(win.player);
    } else if (boardFull) {
      this.draw = true;
      scoreboard.recordDraw();
    } else {
      this.current = player === 'X' ? 'O' : 'X';
    }

    this.events.onBoardChange(this);
    if (win) this.events.onWin(this, win);
    else if (this.draw) this.events.onDraw(this);

    return { kind: 'placed', player, win, draw: this.draw };
  }
}
