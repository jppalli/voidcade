/**
 * LocalStorage progress tracking for Wordbloom. Mirrors the shape used by
 * KittyDoku/ChessDoku: a results map keyed by level index, each holding
 * whether the level was solved and how many stars it earned.
 */

const KEY = 'wordbloom-progress-v1';

/**
 * @typedef {Object} LevelResult
 * @property {boolean} solved
 * @property {number} stars - 1 (required words), 2 (+ source word), 3 (+ all bonus words)
 */

/** @returns {{ unlocked: number, results: Record<number, LevelResult> }} */
export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { unlocked: 0, results: {} };
    const parsed = JSON.parse(raw);
    return {
      unlocked: Number(parsed.unlocked) || 0,
      results: parsed.results && typeof parsed.results === 'object' ? parsed.results : {},
    };
  } catch {
    return { unlocked: 0, results: {} };
  }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    /* ignore */
  }
}

/** Records a win, only ever improving the stored star count, and unlocking the next level. */
export function recordWin(progress, levelIndex, stars, totalLevels) {
  const existing = progress.results[levelIndex];
  const bestStars = Math.max(existing?.stars ?? 0, stars);
  const results = { ...progress.results, [levelIndex]: { solved: true, stars: bestStars } };
  const unlocked = Math.min(totalLevels - 1, Math.max(progress.unlocked, levelIndex + 1));
  return { unlocked, results };
}

export function solvedCount(progress) {
  return Object.values(progress.results).filter((r) => r.solved).length;
}

export function totalStars(progress) {
  return Object.values(progress.results).reduce((sum, r) => sum + (r.stars || 0), 0);
}
