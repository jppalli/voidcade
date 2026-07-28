const STORAGE_KEY = 'kittydoku-progress-v1';

export interface LevelResult {
  solved: boolean;
  /** solved without asking for a hint */
  clean: boolean;
}

export interface Progress {
  /** highest level index the player may open */
  unlocked: number;
  results: Record<number, LevelResult>;
}

function empty(): Progress {
  return { unlocked: 0, results: {} };
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    return { ...empty(), ...JSON.parse(raw) };
  } catch {
    return empty();
  }
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // localStorage unavailable — the game still plays, it just won't remember.
  }
}

export function recordWin(p: Progress, index: number, clean: boolean, totalLevels: number): Progress {
  const prev = p.results[index];
  const results = {
    ...p.results,
    // Never downgrade a clean solve to a hinted one on a replay.
    [index]: { solved: true, clean: prev?.clean || clean },
  };
  return {
    unlocked: Math.max(p.unlocked, Math.min(index + 1, totalLevels - 1)),
    results,
  };
}

export function solvedCount(p: Progress): number {
  return Object.values(p.results).filter((r) => r.solved).length;
}

export function cleanCount(p: Progress): number {
  return Object.values(p.results).filter((r) => r.solved && r.clean).length;
}
