import type { BoonId } from './boons';
import { TOTAL_LEVELS } from './saga';

const STORAGE_KEY = 'wardens_progress_v1';

export interface LevelResult {
  completed: boolean;
  mistakes: number;
  usedHint: boolean;
  bestMoveTimeMs?: number;
}

export interface Progress {
  /** highest globalIndex unlocked (playable). Starts at 0. */
  unlockedIndex: number;
  results: Record<number, LevelResult>; // key: globalIndex
  /** boons currently held, ready to spend */
  inventory: Record<BoonId, number>;
  totalStars: number;
}

function emptyProgress(): Progress {
  return {
    unlockedIndex: 0,
    results: {},
    inventory: { 'seers-eye': 0, banish: 0, aegis: 0 },
    totalStars: 0,
  };
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw);
    // Merge with defaults in case new fields were added since last save.
    return { ...emptyProgress(), ...parsed, inventory: { ...emptyProgress().inventory, ...parsed.inventory } };
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

export function starsForResult(result: LevelResult | undefined): number {
  if (!result?.completed) return 0;
  if (result.usedHint) return 1;
  if (result.mistakes === 0) return 3;
  if (result.mistakes <= 2) return 2;
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

export function grantBoon(progress: Progress, boonId: BoonId, amount = 1): Progress {
  return {
    ...progress,
    inventory: { ...progress.inventory, [boonId]: (progress.inventory[boonId] ?? 0) + amount },
  };
}

export function spendBoon(progress: Progress, boonId: BoonId): Progress | null {
  const have = progress.inventory[boonId] ?? 0;
  if (have <= 0) return null;
  return { ...progress, inventory: { ...progress.inventory, [boonId]: have - 1 } };
}
