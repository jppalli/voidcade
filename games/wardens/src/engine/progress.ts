import { TOTAL_LEVELS } from './saga';

const STORAGE_KEY = 'wardens_progress_v1';

export interface LevelResult {
  completed: boolean;
  /** lives lost on the best clear of this level */
  mistakes: number;
  usedHint: boolean;
}

export interface Progress {
  /** highest globalIndex unlocked (playable). Starts at 0. */
  unlockedIndex: number;
  results: Record<number, LevelResult>; // key: globalIndex
  totalStars: number;
}

function emptyProgress(): Progress {
  return {
    unlockedIndex: 0,
    results: {},
    totalStars: 0,
  };
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw);
    // Merge with defaults in case new fields were added since last save.
    return { ...emptyProgress(), ...parsed };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress: Progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // localStorage unavailable — game still works, just won't persist.
  }
}

export function isLevelUnlocked(progress: Progress, globalIndex: number): boolean {
  return globalIndex <= progress.unlockedIndex;
}

/**
 * Stars map directly to lives kept: clear without losing a life (and
 * without a hint) for all 3. `mistakes` here is the count of lives lost.
 */
export function starsForResult(result: LevelResult | undefined): number {
  if (!result?.completed) return 0;
  if (result.mistakes === 0 && !result.usedHint) return 3;
  if (result.mistakes <= 1) return 2;
  return 1;
}

export function recordLevelWin(
  progress: Progress,
  globalIndex: number,
  mistakes: number,
  usedHint: boolean
): Progress {
  const prev = progress.results[globalIndex];
  const next: LevelResult = {
    completed: true,
    mistakes: prev && prev.mistakes < mistakes ? prev.mistakes : mistakes,
    usedHint: prev ? prev.usedHint && usedHint : usedHint,
  };

  const results = { ...progress.results, [globalIndex]: next };
  const unlockedIndex = Math.max(progress.unlockedIndex, Math.min(globalIndex + 1, TOTAL_LEVELS - 1));

  let totalStars = 0;
  for (const key of Object.keys(results)) {
    totalStars += starsForResult(results[Number(key)]);
  }

  return { ...progress, results, unlockedIndex, totalStars };
}
