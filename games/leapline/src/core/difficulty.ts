import type { Difficulty } from './types';

/**
 * Difficulty is controlled by grid size (bigger board = more state to
 * track) and given-density (fraction of cells pre-revealed — fewer givens
 * means more branching to resolve through deduction alone). Both scale
 * together so "harder" difficulties are consistently more demanding.
 */
export interface DifficultyConfig {
  size: number;
  /** Target fraction of cells revealed as starting clues (approximate — the
   *  reducer stops early if going lower would break solution uniqueness). */
  givenDensity: number;
  label: string;
  description: string;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: {
    size: 5,
    givenDensity: 0.44,
    label: 'Easy',
    description: 'A small grid with plenty of clues — a gentle, obvious progression.',
  },
  medium: {
    size: 6,
    givenDensity: 0.28,
    label: 'Medium',
    description: 'More branching between clues. Expect a little backtracking.',
  },
  hard: {
    size: 7,
    givenDensity: 0.19,
    label: 'Hard',
    description: 'Sparse clues and longer deductive chains between them.',
  },
  expert: {
    size: 8,
    givenDensity: 0.12,
    label: 'Expert',
    description: 'Minimal assistance. Every move has to be reasoned out.',
  },
};

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

/** Scales the solver's search budget with board size — bigger boards need more room to search. */
export function nodeBudgetForSize(size: number): number {
  return Math.min(600_000, 30_000 + size * size * 4_000);
}
