/**
 * Tunable numbers for SplitSpell. Kept in one place so the difficulty curve
 * can be adjusted without hunting through game logic.
 */

export const MAX_LIVES = 3;

// How long a falling letter stays "live" before it's a miss, per tier.
// Miss costs nothing but resets the combo streak — only a WRONG swipe costs
// a life.
export const DURATION_MS_BY_TIER = {
  1: 3400,
  2: 2900,
  3: 2450,
  4: 2000,
};

export const MAX_TIER = 4;
// Every this-many points, difficulty ratchets up one tier (caps at MAX_TIER).
export const SCORE_PER_TIER = 180;

// Base score per completed word = word.length * this.
export const SCORE_PER_LETTER = 12;

// Streak-based combo multiplier. Checked highest-first.
export const COMBO_THRESHOLDS = [
  { streak: 12, mult: 2.2 },
  { streak: 7, mult: 1.6 },
  { streak: 3, mult: 1.25 },
];

export function comboMultiplier(streak) {
  for (const { streak: s, mult } of COMBO_THRESHOLDS) {
    if (streak >= s) return mult;
  }
  return 1;
}

export function tierForScore(score) {
  return Math.min(MAX_TIER, 1 + Math.floor(score / SCORE_PER_TIER));
}

export function durationForTier(tier) {
  return DURATION_MS_BY_TIER[tier] ?? DURATION_MS_BY_TIER[MAX_TIER];
}
