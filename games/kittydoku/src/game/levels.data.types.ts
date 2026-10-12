/** Shape of levels.data.json, written by tools/generate-levels.ts. */

export interface LevelData {
  id: string;
  size: number;
  /** one string per row; each character is that square's patch index (0-8) */
  regions: string[];
  /** solution column for each row, in row order */
  solution: number[];
  /** logic grade the generator measured (see levels.spec.ts) */
  grade: { maxTier: number; score: number };
  /** which seed attempt produced it (for reproducing / debugging) */
  attempt: number;
}

export interface LevelsFile {
  version: 1;
  levels: LevelData[];
}
