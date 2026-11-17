import type { SaveData } from './types';

const STORAGE_KEY = 'common-thread-solitaire-save';

const DEFAULT_SAVE: SaveData = {
  currentLevel: 1,
  levelsCompleted: [],
  bestMoves: {},
  totalMoves: 0,
  totalTime: 0,
  soundEnabled: true,
};

export function loadSave(): SaveData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_SAVE };
    
    const data = JSON.parse(stored);
    return {
      ...DEFAULT_SAVE,
      ...data,
    };
  } catch (error) {
    console.warn('Failed to load save data:', error);
    return { ...DEFAULT_SAVE };
  }
}

export function saveSave(data: Partial<SaveData>): void {
  try {
    const current = loadSave();
    const updated = { ...current, ...data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to save data:', error);
  }
}

export function recordLevelComplete(
  levelId: number,
  moves: number,
  timeSeconds: number
): void {
  const save = loadSave();
  
  if (!save.levelsCompleted.includes(levelId)) {
    save.levelsCompleted.push(levelId);
  }
  
  if (!save.bestMoves[levelId] || moves < save.bestMoves[levelId]) {
    save.bestMoves[levelId] = moves;
  }
  
  save.totalMoves += moves;
  save.totalTime += timeSeconds;
  save.currentLevel = Math.max(save.currentLevel, levelId + 1);
  
  saveSave(save);
}

export function isLevelUnlocked(levelId: number): boolean {
  const save = loadSave();
  return levelId <= save.currentLevel;
}

export function getLevelBestMoves(levelId: number): number | null {
  const save = loadSave();
  return save.bestMoves[levelId] ?? null;
}

export function getTotalStats(): {
  levelsCompleted: number;
  totalMoves: number;
  totalTime: number;
} {
  const save = loadSave();
  return {
    levelsCompleted: save.levelsCompleted.length,
    totalMoves: save.totalMoves,
    totalTime: save.totalTime,
  };
}

export function resetProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to reset progress:', error);
  }
}
