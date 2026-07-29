/**
 * Color Sweeper — core game logic.
 *
 * State held here; rendering is handled by main.js.
 */
import { LEVELS, COLORS, clueValue } from './levels.js';

export const MAX_LIVES = 3;

/**
 * CellState:
 *   solved: boolean — painted correctly and locked in
 *   playerColor: null | 0|1|2 — color the player currently has painted (wrong guesses are
 *                               shown briefly then cleared, so this is only set while they haven't submitted)
 *   flags: Set<0|1|2> — colors the player has marked as "not here"
 *   clueColor: null | 0|1|2 — if this cell starts as a revealed clue, its real color
 *   clueValue: null | number — adjacency count for this clue cell (revealed when the
 *                              game determines showing it is deductively useful)
 *   showClue: boolean — whether the clue number is currently visible
 */

export class Game {
  constructor(levelIndex = 0) {
    this._levelIndex = levelIndex;
    this._level = LEVELS[levelIndex];
    this._size = this._level.size;
    this._solution = this._level.solution;
    this._lives = MAX_LIVES;
    this._solved = false;
    this._onUpdate = null; // callback(game) fired after every state change

    // Build per-cell state
    this._cells = Array.from({ length: this._size }, (_, r) =>
      Array.from({ length: this._size }, (_, c) => ({
        solved: false,
        playerColor: null, // transient wrong guess, cleared after animation
        flags: new Set(),
        clueColor: null,
        clueValue: null,
        showClue: false,
      }))
    );

    // Reveal starting clues
    for (const [r, c] of this._level.startClues) {
      const cell = this._cells[r][c];
      cell.solved = true;
      cell.clueColor = this._solution[r][c];
      cell.clueValue = clueValue(this._solution, r, c);
      cell.showClue = true;
    }

    // After initial reveal, check if any newly unlocked progressive clues can show
    this._revealProgressiveClues();
  }

  get size() { return this._size; }
  get lives() { return this._lives; }
  get solved() { return this._solved; }
  get levelName() { return this._level.name; }
  get levelIndex() { return this._levelIndex; }
  get totalLevels() { return LEVELS.length; }

  /** Returns immutable view of a cell for rendering. */
  cell(r, c) { return this._cells[r][c]; }

  setUpdateCallback(fn) { this._onUpdate = fn; }

  // ---------------------------------------------------------------- actions

  /**
   * Player paints a cell with selectedColor.
   * Returns 'correct' | 'wrong' | 'already-solved' | 'flagged'
   */
  paint(r, c, selectedColor) {
    if (this._solved || this._lives <= 0) return 'already-solved';
    const cell = this._cells[r][c];
    if (cell.solved) return 'already-solved';

    const correct = this._solution[r][c] === selectedColor;
    if (correct) {
      cell.solved = true;
      cell.clueColor = selectedColor;
      cell.clueValue = clueValue(this._solution, r, c);
      // Reveal the number immediately if it's useful (value > 0 or = 0 with
      // at least one unconfirmed neighbour that can benefit from the info)
      cell.showClue = this._shouldShowClue(r, c);
      // Clear any flags the player put here
      cell.flags.clear();

      // Update neighboring clue visibility
      this._revealProgressiveClues();
      // Check win
      this._checkWin();
    } else {
      this._lives = Math.max(0, this._lives - 1);
      cell.playerColor = selectedColor; // shown briefly by renderer, then cleared
      if (this._lives <= 0) this._solved = false; // game over handled by renderer
    }

    this._onUpdate?.(this);
    return correct ? 'correct' : 'wrong';
  }

  /**
   * Toggle a flag (elimination mark) on a cell for a given color.
   * Flags are only placed on unsolved cells.
   */
  toggleFlag(r, c, color) {
    if (this._solved) return;
    const cell = this._cells[r][c];
    if (cell.solved) return;
    if (cell.flags.has(color)) cell.flags.delete(color);
    else cell.flags.add(color);
    this._onUpdate?.(this);
  }

  /**
   * Auto-flag: when the player double-taps a solved clue cell with value 0,
   * mark all its unsolved neighbours with a flag for that cell's color.
   * (Value 0 means none of the neighbours share this color.)
   */
  autoFlag(r, c) {
    const cell = this._cells[r][c];
    if (!cell.solved || cell.clueValue !== 0) return;
    const color = cell.clueColor;
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < this._size && nc >= 0 && nc < this._size) {
        const n = this._cells[nr][nc];
        if (!n.solved) n.flags.add(color);
      }
    }
    this._onUpdate?.(this);
  }

  clearWrongGuess(r, c) {
    this._cells[r][c].playerColor = null;
    this._onUpdate?.(this);
  }

  isGameOver() { return this._lives <= 0; }

  // ---------------------------------------------------------------- private

  _shouldShowClue(r, c) {
    const cell = this._cells[r][c];
    if (!cell.solved) return false;
    const val = cell.clueValue;
    // Always show 0 — strongest possible clue.
    if (val === 0) return true;
    // Show if at least one unsolved neighbour exists (player can use the info)
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < this._size && nc >= 0 && nc < this._size) {
        if (!this._cells[nr][nc].solved) return true;
      }
    }
    return false;
  }

  /**
   * After a cell is confirmed, check whether any neighboring clue cells can
   * now reveal their number (their value becomes deductively actionable).
   */
  _revealProgressiveClues() {
    for (let r = 0; r < this._size; r++) {
      for (let c = 0; c < this._size; c++) {
        const cell = this._cells[r][c];
        if (!cell.solved) continue;
        if (!cell.showClue) {
          cell.showClue = this._shouldShowClue(r, c);
        }
      }
    }
  }

  _checkWin() {
    for (let r = 0; r < this._size; r++) {
      for (let c = 0; c < this._size; c++) {
        if (!this._cells[r][c].solved) return;
      }
    }
    this._solved = true;
  }
}
