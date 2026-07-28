import data from './levels.data.json';
import type { Level } from './types';

export interface Chapter {
  glyph: string;
  name: string;
  blurb: string;
}

/**
 * Level data lives in levels.data.json so the solver tool (tools/solver.mjs)
 * verifies exactly what the game ships. Run `npm run verify-levels` after
 * editing the JSON.
 */
export const CHAPTERS: Chapter[] = data.chapters;
export const LEVELS: Level[] = data.levels as Level[];

export function levelsOfChapter(ch: number): { level: Level; index: number }[] {
  return LEVELS.map((level, index) => ({ level, index })).filter(x => x.level.ch === ch);
}
