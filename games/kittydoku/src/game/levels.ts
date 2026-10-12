import type { PuzzleBoard } from '@arcade/queens-core';
import { CHAPTERS, levelId, type ChapterDef, type LevelDef } from './levels.spec';
import type { LevelsFile } from './levels.data.types';
import levelsFile from './levels.data.json';

export { CHAPTERS, type ChapterDef, type LevelDef };

/**
 * The 100 levels: the plan in levels.spec.ts joined with the pre-generated,
 * pre-graded boards in levels.data.json (see tools/generate-levels.ts).
 */
export interface LevelRef {
  /** absolute index across the whole game, 0-based */
  index: number;
  chapterIndex: number;
  levelInChapter: number;
  chapter: ChapterDef;
  size: number;
  singletons: number;
  tip?: string;
  id: string;
  /** the board, ready to play: unique solution, logically solvable */
  board: PuzzleBoard;
  /** logic grade the generator measured (1 easy … 5.9 hardest) */
  grade: number;
}

const data = levelsFile as LevelsFile;
const byId = new Map(data.levels.map((l) => [l.id, l]));

let cached: LevelRef[] | null = null;

export function allLevels(): LevelRef[] {
  if (cached) return cached;
  const refs: LevelRef[] = [];
  let index = 0;
  CHAPTERS.forEach((chapter, chapterIndex) => {
    chapter.levels.forEach((def, levelInChapter) => {
      const id = levelId(chapter.id, levelInChapter);
      const saved = byId.get(id);
      if (!saved || saved.size !== def.size) {
        // levels.spec.ts changed without regenerating the boards.
        throw new Error(`KittyDoku: missing or stale board for ${id}. Run "npm run generate-levels".`);
      }
      refs.push({
        index,
        chapterIndex,
        levelInChapter,
        chapter,
        size: def.size,
        singletons: def.singletons,
        tip: def.tip,
        id,
        board: {
          size: saved.size,
          regions: saved.regions.map((row) => [...row].map(Number)),
          solution: saved.solution.map((col, row) => ({ row, col })),
        },
        grade: saved.grade.score,
      });
      index++;
    });
  });
  cached = refs;
  return refs;
}

export const TOTAL_LEVELS = CHAPTERS.reduce((n, c) => n + c.levels.length, 0);

export function levelAt(index: number): LevelRef | null {
  return allLevels()[index] ?? null;
}
