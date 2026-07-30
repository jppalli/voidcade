import {
  compile, initialDomains, solveTraced, isSingle, soleColor, bit, WITH_CONTRADICTION,
} from "./puzzle.mjs";
import type { Compiled } from "./puzzle.mjs";
import type { Level } from "./types";

export const EMPTY = -1;
export const HEARTS = 3;
export const heartsFor = (level: Level) => level.hearts ?? HEARTS;

export type Tool = "fill" | "mark";

export interface Cell {
  /** Painted color, or EMPTY. Givens keep their color here too. */
  fill: number;
  /** Bitmask of colors the player has ruled out with an X. */
  cross: number;
  given: boolean;
  /** Set when a hint filled this cell, so it can be shown as borrowed. */
  hinted: boolean;
}

export type Outcome =
  | { kind: "none" }
  | { kind: "paint"; cells: number[] }
  | { kind: "mark"; cells: number[] }
  | { kind: "mistake"; cell: number }
  | { kind: "locked"; cell: number };

interface Snapshot { cells: number[]; before: Cell[] }

export class Game {
  readonly level: Level;
  readonly cx: Compiled;
  readonly size: number;
  cells: Cell[];
  hearts = HEARTS;
  /** What this board starts with — the Daily runs on more than three. */
  readonly maxHearts: number;
  hints = 0;
  mistakes = 0;
  moves = 0;
  startedAt = 0;
  private history: Snapshot[] = [];

  constructor(level: Level) {
    this.level = level;
    this.cx = compile(level);
    this.size = level.w * level.h;
    this.maxHearts = heartsFor(level);
    this.hearts = this.maxHearts;
    this.cells = this.freshCells();
  }

  private freshCells(): Cell[] {
    const given = new Set(this.level.given);
    return Array.from({ length: this.size }, (_, i) => ({
      fill: given.has(i) ? this.cx.sol[i] : EMPTY,
      cross: 0,
      given: given.has(i),
      hinted: false,
    }));
  }

  reset() {
    this.cells = this.freshCells();
    this.hearts = this.maxHearts;
    this.hints = 0;
    this.mistakes = 0;
    this.moves = 0;
    this.history = [];
    this.startedAt = performance.now();
  }

  solutionAt(i: number) { return this.cx.sol[i]; }

  /** The count shown on a numbered given, or null. */
  clueAt(i: number): number | null {
    const clue = this.cx.clues.find((c) => c.p === i);
    return clue ? clue.n : null;
  }

  /**
   * True once a clue has nothing left to tell you: its count is accounted for
   * *and* every neighbour is either painted or already crossed for its color.
   * Note the second half — a 0 has its count met from the very first move, but
   * it is still the most useful clue on the board until you have crossed its
   * color off everything it watches. Dimming it early would hide the good part.
   * This is exactly the condition under which chording it would do nothing.
   */
  clueSatisfied(i: number): boolean {
    const clue = this.cx.clues.find((c) => c.p === i);
    if (!clue) return false;
    const b = bit(clue.c);
    let found = 0;
    for (const q of clue.nb) {
      const cell = this.cells[q];
      if (cell.fill === clue.c) found++;
      else if (cell.fill === EMPTY && !(cell.cross & b)) return false;
    }
    return found === clue.n;
  }

  /** Tutorial boards never take a heart. */
  get gentle() { return this.level.gentle === true; }

  neighbors(i: number) { return this.cx.nbs[i]; }

  get solved() { return this.cells.every((c) => c.fill !== EMPTY); }
  get filledCount() { return this.cells.filter((c) => c.fill !== EMPTY && !c.given).length; }
  get blankCount() { return this.size - this.level.given.length; }
  get dead() { return this.hearts <= 0; }

  private record(indexes: number[]) {
    this.history.push({
      cells: indexes,
      before: indexes.map((i) => ({ ...this.cells[i] })),
    });
    if (this.history.length > 200) this.history.shift();
  }

  get canUndo() { return this.history.length > 0; }

  undo(): number[] {
    const snap = this.history.pop();
    if (!snap) return [];
    snap.cells.forEach((i, k) => { this.cells[i] = snap.before[k]; });
    return snap.cells;
  }

  /**
   * Paint a color. Painting the color already there lifts it again; painting a
   * color the solution disagrees with costs a heart and changes nothing.
   */
  paint(i: number, color: number): Outcome {
    const cell = this.cells[i];
    if (cell.given) return { kind: "locked", cell: i };
    if (cell.fill === color) {
      this.record([i]);
      cell.fill = EMPTY;
      cell.hinted = false;
      return { kind: "paint", cells: [i] };
    }
    if (this.cx.sol[i] !== color) {
      if (!this.gentle) this.hearts--;
      this.mistakes++;
      return { kind: "mistake", cell: i };
    }
    this.record([i]);
    cell.fill = color;
    cell.cross = 0;
    cell.hinted = false;
    this.moves++;
    return { kind: "paint", cells: [i] };
  }

  /**
   * Cross a color off a cell. An X is a note, not a claim — the game never
   * checks it against the solution and it never costs a heart. Only painting
   * is a commitment. Tapping the same color again lifts the mark.
   */
  mark(i: number, color: number): Outcome {
    const cell = this.cells[i];
    if (cell.given || cell.fill !== EMPTY) return { kind: "locked", cell: i };
    const b = bit(color);
    this.record([i]);
    if (cell.cross & b) cell.cross &= ~b;
    else { cell.cross |= b; this.moves++; }
    return { kind: "mark", cells: [i] };
  }

  /**
   * Double-tap a numbered given: cross its color off every empty square it
   * touches. That is the whole effect — it is a shortcut for marks the player
   * would otherwise place one at a time. The marks are not checked, nothing is
   * painted, and nothing about the solution is revealed.
   * Returns the cells it marked, or null if there was nothing left to mark.
   */
  chord(i: number): number[] | null {
    const clue = this.cx.clues.find((c) => c.p === i);
    if (!clue) return null;
    const b = bit(clue.c);
    const touched = clue.nb.filter((q) => this.cells[q].fill === EMPTY && !(this.cells[q].cross & b));
    if (touched.length === 0) return null;
    this.record(touched);
    for (const q of touched) this.cells[q].cross |= b;
    this.moves++;
    return touched;
  }

  /**
   * Find a cell the player could work out right now, using the same deduction
   * the generator guaranteed. Prefers cells next to what is already known so
   * the hint reads as a next step rather than a teleport.
   */
  hint(): { cell: number; color: number } | null {
    // Built from painted cells only. The player's X marks are notes and may be
    // wrong — feeding them to the solver would let a bad mark drive the hint to
    // a wrong color, or contradict the board outright.
    const dom = initialDomains(this.cx);
    for (let i = 0; i < this.size; i++) {
      const cell = this.cells[i];
      if (cell.fill !== EMPTY) dom[i] = bit(cell.fill);
    }
    // Every rule, including contradiction: Daily boards are tier 4, and a hint
    // that stops at the rules the chapters use would stall on them and fall
    // through to the arbitrary-reveal path below.
    const result = solveTraced(this.cx, dom, WITH_CONTRADICTION);
    const candidates: number[] = [];
    for (let i = 0; i < this.size; i++) {
      if (this.cells[i].fill === EMPTY && isSingle(result.dom[i])) candidates.push(i);
    }
    if (candidates.length === 0) {
      // Deduction stalled (shouldn't happen on a shipped level) — fall back to
      // the stored solution so a hint always does something.
      const blanks = [];
      for (let i = 0; i < this.size; i++) if (this.cells[i].fill === EMPTY) blanks.push(i);
      if (!blanks.length) return null;
      const pick = blanks[0];
      return { cell: pick, color: this.cx.sol[pick] };
    }
    const score = (i: number) =>
      this.cx.nbs[i].filter((q) => this.cells[q].fill !== EMPTY).length;
    candidates.sort((a, b) => score(b) - score(a));
    const cell = candidates[0];
    return { cell, color: soleColor(result.dom[cell]) };
  }

  applyHint(h: { cell: number; color: number }) {
    this.record([h.cell]);
    const cell = this.cells[h.cell];
    cell.fill = h.color;
    cell.cross = 0;
    cell.hinted = true;
    this.hints++;
  }
}
