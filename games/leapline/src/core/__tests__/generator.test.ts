import { describe, expect, it } from 'vitest';
import { DIFFICULTY_CONFIG } from '../difficulty';
import { generatePuzzle } from '../generator';
import { countSolutions } from '../solver';
import type { Difficulty } from '../types';
import { validateFullPath } from '../validate';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

describe('generatePuzzle', () => {
  it('produces a structurally valid solution for every difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      const puzzle = generatePuzzle(`test-seed-${difficulty}`, difficulty);
      const config = DIFFICULTY_CONFIG[difficulty];
      expect(puzzle.size).toBe(config.size);
      expect(puzzle.maxValue).toBe(config.size * config.size);
      expect(puzzle.solution).toHaveLength(puzzle.maxValue);
      expect(validateFullPath(puzzle.solution, puzzle.size)).toBe(true);
    }
  }, 30_000);

  it('always keeps value 1 and the final value as givens (fixed start/end anchors)', () => {
    for (const difficulty of DIFFICULTIES) {
      const puzzle = generatePuzzle(`anchor-seed-${difficulty}`, difficulty);
      const values = puzzle.givens.map(g => g.value);
      expect(values).toContain(1);
      expect(values).toContain(puzzle.maxValue);
    }
  }, 30_000);

  it('every given is consistent with the stored solution', () => {
    const puzzle = generatePuzzle('consistency-seed', 'medium');
    for (const g of puzzle.givens) {
      expect(puzzle.solution[g.value - 1]).toBe(g.cell);
    }
  });

  it('every generated puzzle is provably unique end to end', () => {
    for (const difficulty of DIFFICULTIES) {
      const puzzle = generatePuzzle(`unique-seed-${difficulty}`, difficulty);
      const result = countSolutions(puzzle.size, puzzle.givens, 2);
      expect(result.exhaustedBudget).toBe(false);
      expect(result.count).toBe(1);
    }
  }, 30_000);

  it('is deterministic: the same seed + difficulty always yields the same puzzle', () => {
    const a = generatePuzzle('determinism-seed', 'medium');
    const b = generatePuzzle('determinism-seed', 'medium');
    expect(a.solution).toEqual(b.solution);
    expect(a.givens).toEqual(b.givens);
  });

  it('different seeds produce different puzzles', () => {
    const a = generatePuzzle('seed-one', 'medium');
    const b = generatePuzzle('seed-two', 'medium');
    expect(a.solution).not.toEqual(b.solution);
  });

  it('the configured target given-density strictly decreases from easy to expert', () => {
    // This is the actual difficulty knob: grid size AND target density both
    // increase in "hardness" together across the table in difficulty.ts.
    expect(DIFFICULTY_CONFIG.easy.givenDensity).toBeGreaterThan(DIFFICULTY_CONFIG.medium.givenDensity);
    expect(DIFFICULTY_CONFIG.medium.givenDensity).toBeGreaterThan(DIFFICULTY_CONFIG.hard.givenDensity);
    expect(DIFFICULTY_CONFIG.hard.givenDensity).toBeGreaterThan(DIFFICULTY_CONFIG.expert.givenDensity);
  });

  it('a generated puzzle never has more givens than it started with, and never fewer than the 2 mandatory anchors', () => {
    // The reducer is a best-effort minimizer (greedy removal can plateau
    // above the exact target on some solution paths — see reduceGivens'
    // comment), so we verify it actually reduced *something* and stayed
    // within sane bounds, rather than asserting an exact density.
    for (const difficulty of DIFFICULTIES) {
      const puzzle = generatePuzzle(`bounds-seed-${difficulty}`, difficulty);
      expect(puzzle.givens.length).toBeGreaterThanOrEqual(2);
      expect(puzzle.givens.length).toBeLessThan(puzzle.maxValue);
      // Loose sanity band only: greedy single-path reduction can plateau
      // well above the exact target density on some solution paths (the
      // structural floor described in reduceGivens' comment), so this
      // just guards against the reducer doing nothing at all rather than
      // asserting a precise density.
      expect(puzzle.givens.length).toBeLessThan(puzzle.maxValue * 0.6);
    }
  }, 30_000);

  it('respects an explicit size override', () => {
    const puzzle = generatePuzzle('override-seed', 'easy', { size: 6 });
    expect(puzzle.size).toBe(6);
    expect(puzzle.maxValue).toBe(36);
  });
});
