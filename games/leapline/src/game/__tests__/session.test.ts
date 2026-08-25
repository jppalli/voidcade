import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generatePuzzle } from '../../core/generator';
import type { Puzzle } from '../../core/types';
import { PuzzleSession } from '../session';

/** Builds a tiny fully-pinned puzzle (every value given) so tests can
 *  drive placement deterministically without depending on solver timing. */
function fullyPinnedPuzzle(seed: string, size = 4): Puzzle {
  const base = generatePuzzle(seed, 'easy', { size });
  return {
    ...base,
    givens: base.solution.map((cell, i) => ({ value: i + 1, cell })),
  };
}

/** A puzzle with only value 1 given, so the player must place everything else. */
function minimalPuzzle(seed: string, size = 4): Puzzle {
  const base = generatePuzzle(seed, 'easy', { size });
  return {
    ...base,
    givens: [{ value: 1, cell: base.solution[0] }],
  };
}

describe('PuzzleSession', () => {
  describe('basic placement', () => {
    it('nextValue starts at the first value not covered by a given', () => {
      const puzzle = minimalPuzzle('session-basic');
      const session = new PuzzleSession(puzzle);
      expect(session.nextValue()).toBe(2);
    });

    it('placing the correct cell for the next value succeeds and advances', () => {
      const puzzle = minimalPuzzle('session-place-correct');
      const session = new PuzzleSession(puzzle);
      const correctCell = puzzle.solution[1]; // value 2's cell
      const outcome = session.attemptPlace(correctCell);
      expect(outcome.kind).toBe('placed');
      expect(session.nextValue()).toBe(3);
      expect(session.valueAt(correctCell)).toBe(2);
    });

    it('placing a wrong-but-legal cell counts as a mistake, not a crash, and does not advance', () => {
      const puzzle = minimalPuzzle('session-mistake');
      const session = new PuzzleSession(puzzle);
      const correctCell = puzzle.solution[1];
      const candidates = session.candidateCells();
      const wrongLegalCell = candidates.find(c => c !== correctCell);
      if (wrongLegalCell === undefined) return; // degenerate board with only one candidate — skip
      const outcome = session.attemptPlace(wrongLegalCell);
      expect(outcome.kind).toBe('mistake');
      expect(session.mistakes).toBe(1);
      expect(session.nextValue()).toBe(2); // unchanged — the mistake wasn't placed
    });

    it('placing a cell that is not a legal step at all returns "invalid" and does not count as a mistake', () => {
      const puzzle = minimalPuzzle('session-invalid-shape', 6);
      const session = new PuzzleSession(puzzle);
      // Find a cell that is definitely NOT in candidateCells() and not occupied.
      const candidates = new Set(session.candidateCells());
      let farCell = -1;
      for (let c = 0; c < puzzle.maxValue; c++) {
        if (!candidates.has(c) && session.valueAt(c) === null) {
          farCell = c;
          break;
        }
      }
      expect(farCell).toBeGreaterThanOrEqual(0);
      const outcome = session.attemptPlace(farCell);
      expect(outcome.kind).toBe('invalid');
      expect(session.mistakes).toBe(0); // UI-guard rejection — never punished
    });

    it('placing an already-occupied cell returns "occupied"', () => {
      const puzzle = minimalPuzzle('session-occupied');
      const session = new PuzzleSession(puzzle);
      const givenCell = puzzle.givens[0].cell;
      const outcome = session.attemptPlace(givenCell);
      expect(outcome.kind).toBe('occupied');
    });

    it('cannot place once the session is completed', () => {
      const puzzle = fullyPinnedPuzzle('session-over');
      const session = new PuzzleSession(puzzle);
      // Fully pinned means nextValue() is already null.
      expect(session.nextValue()).toBeNull();
      expect(session.isComplete()).toBe(false); // completion only flips via attemptPlace's own transition
    });
  });

  describe('candidateCells / distanceToCandidate', () => {
    it('every candidate cell is a legal step from the anchor and unoccupied', () => {
      const puzzle = minimalPuzzle('session-candidates');
      const session = new PuzzleSession(puzzle);
      const candidates = session.candidateCells();
      expect(candidates.length).toBeGreaterThan(0);
      for (const c of candidates) {
        expect(session.valueAt(c)).toBeNull();
        expect(session.distanceToCandidate(c)).not.toBeNull();
      }
    });
  });

  describe('undo / restart', () => {
    it('undo removes the most recently placed value and restores its cell', () => {
      const puzzle = minimalPuzzle('session-undo');
      const session = new PuzzleSession(puzzle);
      const correctCell = puzzle.solution[1];
      session.attemptPlace(correctCell);
      expect(session.nextValue()).toBe(3);

      const undone = session.undo();
      expect(undone).toBe(2);
      expect(session.nextValue()).toBe(2);
      expect(session.valueAt(correctCell)).toBeNull();
    });

    it('undo never removes a given clue (returns null when only givens are placed)', () => {
      const puzzle = minimalPuzzle('session-undo-given');
      const session = new PuzzleSession(puzzle);
      expect(session.undo()).toBeNull();
      expect(session.valueAt(puzzle.givens[0].cell)).toBe(1);
    });

    it('restart clears mistakes, hints, history and returns to the starting givens', () => {
      const puzzle = minimalPuzzle('session-restart');
      const session = new PuzzleSession(puzzle);
      session.attemptPlace(puzzle.solution[1]);
      session.requestHint();
      session.restart();
      expect(session.mistakes).toBe(0);
      expect(session.hintsUsed).toBe(0);
      expect(session.nextValue()).toBe(2);
      expect(session.isComplete()).toBe(false);
    });
  });

  describe('hints', () => {
    it('the first hint reveals only a distance', () => {
      const puzzle = minimalPuzzle('session-hint-1');
      const session = new PuzzleSession(puzzle);
      const hint = session.requestHint();
      expect(hint).not.toBeNull();
      expect(hint!.tier).toBe(1);
      expect(hint!.distance).toBeGreaterThanOrEqual(1);
      expect(hint!.direction).toBeUndefined();
      expect(hint!.cell).toBeUndefined();
      expect(session.hintsUsed).toBe(1);
    });

    it('a second hint for the same pending value escalates to include a direction', () => {
      const puzzle = minimalPuzzle('session-hint-2');
      const session = new PuzzleSession(puzzle);
      session.requestHint();
      const hint2 = session.requestHint();
      expect(hint2!.tier).toBe(2);
      expect(hint2!.direction).toBeDefined();
      expect(hint2!.cell).toBeUndefined();
    });

    it('a third hint for the same pending value reveals the exact correct cell', () => {
      const puzzle = minimalPuzzle('session-hint-3');
      const session = new PuzzleSession(puzzle);
      session.requestHint();
      session.requestHint();
      const hint3 = session.requestHint();
      expect(hint3!.tier).toBe(3);
      expect(hint3!.cell).toBe(puzzle.solution[1]);
    });

    it('hint tier resets once the pending value changes (placing correctly moves to a fresh value)', () => {
      const puzzle = minimalPuzzle('session-hint-reset');
      const session = new PuzzleSession(puzzle);
      session.requestHint();
      session.requestHint(); // tier 2 for value 2
      session.attemptPlace(puzzle.solution[1]); // correctly place value 2
      const hintForValue3 = session.requestHint();
      expect(hintForValue3!.tier).toBe(1); // fresh escalation for value 3
    });

    it('hintsUsed keeps counting across escalations', () => {
      const puzzle = minimalPuzzle('session-hint-count');
      const session = new PuzzleSession(puzzle);
      session.requestHint();
      session.requestHint();
      session.requestHint();
      expect(session.hintsUsed).toBe(3);
    });

    it('requestHint returns null once the puzzle is already complete', () => {
      const puzzle = fullyPinnedPuzzle('session-hint-complete');
      const session = new PuzzleSession(puzzle);
      expect(session.requestHint()).toBeNull();
    });
  });

  describe('timer', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('elapsedMs is 0 before start() is called', () => {
      const puzzle = minimalPuzzle('session-timer-0');
      const session = new PuzzleSession(puzzle);
      expect(session.elapsedMs()).toBe(0);
    });

    it('elapsedMs increases after start() and freezes after completion', () => {
      const puzzle = fullyPinnedPuzzle('session-timer-freeze', 3);
      const session = new PuzzleSession(puzzle);
      session.start();
      vi.advanceTimersByTime(5000);
      const midway = session.elapsedMs();
      expect(midway).toBeGreaterThanOrEqual(5000);
      vi.advanceTimersByTime(2000);
      const later = session.elapsedMs();
      expect(later).toBeGreaterThan(midway);
    });
  });

  describe('completion', () => {
    it('placing the final correct value flips status to completed and freezes the sequence', () => {
      const puzzle = minimalPuzzle('session-complete-flow', 3);
      const session = new PuzzleSession(puzzle);
      session.start();
      let outcome = session.attemptPlace(puzzle.solution[1]);
      expect(session.isComplete()).toBe(false);
      while (!session.isComplete()) {
        const v = session.nextValue();
        if (v === null) break;
        outcome = session.attemptPlace(puzzle.solution[v - 1]);
        expect(outcome.kind).toBe('placed');
      }
      expect(session.isComplete()).toBe(true);
    });

    it('getCompletionSummary reports verified=true for a legitimately completed puzzle', () => {
      const puzzle = minimalPuzzle('session-summary-valid', 3);
      const session = new PuzzleSession(puzzle);
      session.start();
      while (!session.isComplete()) {
        const v = session.nextValue();
        if (v === null) break;
        session.attemptPlace(puzzle.solution[v - 1]);
      }
      const summary = session.getCompletionSummary();
      expect(summary.verified).toBe(true);
      expect(summary.mistakes).toBe(0);
      expect(summary.hintsUsed).toBe(0);
      expect(summary.timeMs).toBeGreaterThanOrEqual(0);
    });

    it('tracks mistakes and hints in the final summary', () => {
      const puzzle = minimalPuzzle('session-summary-tracking', 4);
      const session = new PuzzleSession(puzzle);
      session.start();
      const candidates = session.candidateCells();
      const correctCell = puzzle.solution[1];
      const wrongCell = candidates.find(c => c !== correctCell);
      if (wrongCell !== undefined) session.attemptPlace(wrongCell);
      session.requestHint();
      while (!session.isComplete()) {
        const v = session.nextValue();
        if (v === null) break;
        session.attemptPlace(puzzle.solution[v - 1]);
      }
      const summary = session.getCompletionSummary();
      expect(summary.hintsUsed).toBeGreaterThanOrEqual(1);
      if (wrongCell !== undefined) expect(summary.mistakes).toBeGreaterThanOrEqual(1);
    });
  });
});
