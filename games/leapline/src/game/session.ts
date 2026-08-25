import { isValidStep, neighborsInRange, stepDistance, toRC } from '../core/grid';
import { validateFullPath } from '../core/validate';
import type { Puzzle } from '../core/types';

export type SessionStatus = 'playing' | 'completed';

export type AttemptOutcome =
  | { kind: 'over' }
  | { kind: 'occupied' }
  /** Not even a legal 1-3 orthogonal step from the current cell — a
   *  UI/keyboard-navigation guard case. Never counted as a mistake. */
  | { kind: 'invalid' }
  /** A legal step, but not the cell the hidden solution actually needs —
   *  a genuine reasoning mistake, tracked in stats. */
  | { kind: 'mistake'; value: number }
  | { kind: 'placed'; value: number; cell: number; completed: boolean };

export type HintDirection = 'up' | 'down' | 'left' | 'right';

export interface HintInfo {
  /** Which value this hint is for (the next value the player must place). */
  value: number;
  /** 1, 2 or 3 escalating tiers: distance only -> + direction -> + exact cell. */
  tier: 1 | 2 | 3;
  distance: number;
  direction?: HintDirection;
  cell?: number;
}

export interface CompletionSummary {
  timeMs: number;
  mistakes: number;
  hintsUsed: number;
  /** Defense-in-depth re-check of the full assembled sequence against the
   *  movement rules — should always be true since every step was already
   *  validated on placement, but completion is only ever reported once
   *  this independently re-verifies clean. */
  verified: boolean;
}

/**
 * Runtime state for one attempt at a puzzle: which cells are filled in,
 * undo history, mistakes, hints, and timing. The generator/solver never
 * run again here — this module only ever checks player moves against the
 * puzzle's already-verified-unique `solution`.
 */
export class PuzzleSession {
  readonly puzzle: Puzzle;
  /** placed[v] = cell index holding value v, or null if not yet placed. Index 0 unused. */
  private placed: Array<number | null>;
  /** Reverse lookup for rendering: cell index -> value placed there. */
  private cellToValue: Map<number, number>;
  /** Values placed by the player (not givens), in placement order, for undo. */
  private history: number[] = [];
  private hintTiers: Map<number, number> = new Map();

  mistakes = 0;
  hintsUsed = 0;
  status: SessionStatus = 'playing';
  private startedAt: number | null = null;
  private completedAt: number | null = null;

  constructor(puzzle: Puzzle) {
    this.puzzle = puzzle;
    this.placed = new Array(puzzle.maxValue + 1).fill(null);
    this.cellToValue = new Map();
    for (const g of puzzle.givens) {
      this.placed[g.value] = g.cell;
      this.cellToValue.set(g.cell, g.value);
    }
  }

  /** Starts (or resumes) the timer. Idempotent — a second call has no effect. */
  start(): void {
    if (this.startedAt === null) this.startedAt = Date.now();
  }

  /** Live elapsed time in ms; frozen once the puzzle is completed. */
  elapsedMs(): number {
    if (this.startedAt === null) return 0;
    const end = this.completedAt ?? Date.now();
    return end - this.startedAt;
  }

  isComplete(): boolean {
    return this.status === 'completed';
  }

  /** The smallest value not yet placed, or null if every value is placed. */
  nextValue(): number | null {
    for (let v = 1; v <= this.puzzle.maxValue; v++) {
      if (this.placed[v] === null) return v;
    }
    return null;
  }

  /** The cell holding the value immediately before the next value to place. */
  private anchorCell(): number | null {
    const v = this.nextValue();
    if (v === null) return null;
    return this.placed[v - 1] ?? null;
  }

  /** Public accessor for the renderer: the "current position" cell to draw the active cursor/glow on. */
  currentAnchorCell(): number | null {
    return this.anchorCell();
  }

  valueAt(cell: number): number | null {
    return this.cellToValue.get(cell) ?? null;
  }

  /** The cell currently holding `value` (given or player-placed), or null if not yet placed. */
  cellForValue(value: number): number | null {
    if (value < 1 || value > this.puzzle.maxValue) return null;
    return this.placed[value];
  }

  isGivenCell(cell: number): boolean {
    return this.puzzle.givens.some(g => g.cell === cell);
  }

  /**
   * Every empty cell reachable from the current anchor by one legal
   * orthogonal 1-3 step — exactly what the UI should highlight as
   * selectable for the next number. Does not reveal which one is correct.
   */
  candidateCells(): number[] {
    const anchor = this.anchorCell();
    if (anchor === null) return [];
    return neighborsInRange(anchor, this.puzzle.size).filter(c => !this.cellToValue.has(c));
  }

  /** The geometric step distance (1-3) a given candidate cell would represent, for the visual clue. */
  distanceToCandidate(cell: number): number | null {
    const anchor = this.anchorCell();
    if (anchor === null) return null;
    return stepDistance(anchor, cell, this.puzzle.size);
  }

  /**
   * Attempts to place the next value at `cell`. See AttemptOutcome for the
   * distinct occupied / invalid-shape / wrong-but-legal-mistake / placed
   * cases — only 'mistake' increments the tracked mistake counter, per
   * the "don't unnecessarily punish" requirement (UI-guard rejections are free).
   */
  attemptPlace(cell: number): AttemptOutcome {
    if (this.status === 'completed') return { kind: 'over' };
    const value = this.nextValue();
    if (value === null) return { kind: 'over' };

    if (this.cellToValue.has(cell)) return { kind: 'occupied' };

    const anchor = this.anchorCell();
    if (anchor === null || !isValidStep(anchor, cell, this.puzzle.size)) {
      return { kind: 'invalid' };
    }

    const correctCell = this.puzzle.solution[value - 1];
    if (cell !== correctCell) {
      this.mistakes++;
      return { kind: 'mistake', value };
    }

    this.placed[value] = cell;
    this.cellToValue.set(cell, value);
    this.history.push(value);
    this.hintTiers.delete(value);

    const completed = this.nextValue() === null;
    if (completed) {
      this.status = 'completed';
      this.completedAt = Date.now();
    }

    return { kind: 'placed', value, cell, completed };
  }

  /** Removes the most recent player-placed value (givens are never undoable). */
  undo(): number | null {
    if (this.status === 'completed') return null;
    const value = this.history.pop();
    if (value === undefined) return null;
    const cell = this.placed[value];
    this.placed[value] = null;
    if (cell !== null && cell !== undefined) this.cellToValue.delete(cell);
    this.hintTiers.delete(value);
    return value;
  }

  /** Restores the puzzle to its starting state (givens only) and resets all counters/timer. */
  restart(): void {
    this.placed = new Array(this.puzzle.maxValue + 1).fill(null);
    this.cellToValue = new Map();
    for (const g of this.puzzle.givens) {
      this.placed[g.value] = g.cell;
      this.cellToValue.set(g.cell, g.value);
    }
    this.history = [];
    this.hintTiers.clear();
    this.mistakes = 0;
    this.hintsUsed = 0;
    this.status = 'playing';
    this.startedAt = null;
    this.completedAt = null;
  }

  /**
   * Requests a hint for the next value, escalating in three tiers each
   * time it's called for the *same* pending value: (1) the step distance
   * only, (2) + the direction, (3) + the exact cell. Asking again after
   * placing a different value starts a fresh escalation for the new
   * pending value, so hints never carry stale information.
   */
  requestHint(): HintInfo | null {
    const value = this.nextValue();
    if (value === null) return null;
    const anchor = this.anchorCell();
    if (anchor === null) return null;

    const targetCell = this.puzzle.solution[value - 1];
    const distance = stepDistance(anchor, targetCell, this.puzzle.size) ?? 0;

    const currentTier = this.hintTiers.get(value) ?? 0;
    const tier = Math.min(3, currentTier + 1) as 1 | 2 | 3;
    this.hintTiers.set(value, tier);
    this.hintsUsed++;

    if (tier === 1) return { value, tier, distance };

    const pa = toRC(anchor, this.puzzle.size);
    const pb = toRC(targetCell, this.puzzle.size);
    let direction: HintDirection;
    if (pb.r > pa.r) direction = 'down';
    else if (pb.r < pa.r) direction = 'up';
    else if (pb.c > pa.c) direction = 'right';
    else direction = 'left';

    if (tier === 2) return { value, tier, distance, direction };
    return { value, tier, distance, direction, cell: targetCell };
  }

  /** Assembles the full 1..maxValue cell sequence from current placements (only meaningful once complete). */
  private fullSequence(): number[] {
    const seq: number[] = [];
    for (let v = 1; v <= this.puzzle.maxValue; v++) {
      const cell = this.placed[v];
      if (cell === null) break;
      seq.push(cell);
    }
    return seq;
  }

  /** Only valid to call once isComplete() is true. Re-verifies the full path and reports final stats. */
  getCompletionSummary(): CompletionSummary {
    const sequence = this.fullSequence();
    const verified = sequence.length === this.puzzle.maxValue && validateFullPath(sequence, this.puzzle.size);
    return {
      timeMs: this.elapsedMs(),
      mistakes: this.mistakes,
      hintsUsed: this.hintsUsed,
      verified,
    };
  }
}
