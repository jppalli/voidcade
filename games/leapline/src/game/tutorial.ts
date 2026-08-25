import { generatePuzzle } from '../core/generator';
import type { Puzzle } from '../core/types';

/** A small, fixed, deterministic 3x3 puzzle used only for the FTUE — same
 *  generation pipeline as any real puzzle (never hand-authored/faked), just
 *  pinned to a stable seed so the tutorial script below can rely on it
 *  always looking the same. */
export function tutorialPuzzle(): Puzzle {
  return generatePuzzle('leapline-tutorial-v1', 'easy', { size: 3 });
}

export interface TutorialStep {
  /** Show this step once the "next value to place" reaches this number
   *  (step 1 is shown immediately, before anything is placed). */
  atNextValue: number;
  title: string;
  body: string;
  /** If set, highlights this cell while the step is showing (e.g. the given start cell). */
  highlightCell?: number;
}

/**
 * Scripted messages that walk a first-time player through the mechanic
 * using the tutorial puzzle above. Steps are keyed by the puzzle's own
 * "next value" progress, so the tutorial advances naturally as the
 * player actually plays rather than being a separate non-interactive
 * slideshow — it's real gameplay with contextual teaching layered on top.
 */
export function tutorialScript(puzzle: Puzzle): TutorialStep[] {
  return [
    {
      atNextValue: 2,
      title: 'Welcome to Leapline',
      body: 'Place the numbers 1 through 9, in order, on the grid. Number 1 is already down for you — it always starts the path.',
      highlightCell: puzzle.solution[0],
    },
    {
      atNextValue: 2,
      title: 'Reachable cells',
      body: 'The glowing cells are where 2 could legally go: 1, 2 or 3 cells away in a straight line — never diagonal. The dots show the distance. Tap the one that feels right.',
    },
    {
      atNextValue: 3,
      title: 'Nice!',
      body: 'That connector line is your path so far. Keep going — place 3 on one of the newly highlighted cells.',
    },
    {
      atNextValue: 4,
      title: 'Stuck later on?',
      body: 'If a puzzle gets tricky, the hint button gives you a nudge: first just a distance, then a direction, then the exact cell if you still want it.',
    },
    {
      atNextValue: 5,
      title: 'Wrong guesses are OK',
      body: "If you tap a legal-looking cell that turns out wrong, it's tracked as a mistake but nothing is lost — just try another candidate.",
    },
  ];
}
