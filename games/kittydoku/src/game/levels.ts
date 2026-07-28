import { seedFromString } from '@arcade/queens-core';

export interface LevelDef {
  size: number;
  /** how many regions get shrunk to one cell — a free, certain cat */
  singletons: number;
  /** one-line lesson shown above the board on the teaching levels */
  tip?: string;
}

export interface ChapterDef {
  id: string;
  name: string;
  /** short flavour line under the chapter name */
  blurb: string;
  /** pastel accent for this chapter's map section */
  accent: string;
  levels: LevelDef[];
}

/**
 * The ramp is deliberately gentle. Chapter 1 opens at 4x4 with two one-cell
 * cushions (each hands you a certain cat), and the board only reaches 5x5 by
 * its end. Cushions taper off as the grids grow, and the last two chapters
 * drop them entirely with a size floor so no free cats appear by accident.
 */
export const CHAPTERS: ChapterDef[] = [
  {
    id: 'sunny-windowsill',
    name: 'Sunny Windowsill',
    blurb: 'Where every cat finds a warm square of its own.',
    accent: '#ffd6a5',
    levels: [
      { size: 4, singletons: 2, tip: 'Every colour patch needs exactly one cat. A patch of a single square is an easy first cat.' },
      { size: 4, singletons: 2, tip: 'One cat per row and one per column, too. No sharing lines.' },
      { size: 4, singletons: 1, tip: 'Cats will not sit next to each other — not even corner to corner.' },
      { size: 5, singletons: 2, tip: 'Tap once to leave a paw mark for "no cat here". Tap again to place a cat.' },
      { size: 5, singletons: 2, tip: 'A patch squeezed inside one row must keep its cat in that row.' },
      { size: 5, singletons: 1 },
    ],
  },
  {
    id: 'cosy-armchair',
    name: 'Cosy Armchair',
    blurb: 'Room for a few more paws.',
    accent: '#bdb2ff',
    levels: [
      { size: 5, singletons: 1, tip: 'When a row has only one square left that works, that square is certain.' },
      { size: 5, singletons: 1 },
      { size: 6, singletons: 2 },
      { size: 6, singletons: 1 },
      { size: 6, singletons: 1 },
      { size: 6, singletons: 0 },
    ],
  },
  {
    id: 'garden-fence',
    name: 'Garden Fence',
    blurb: 'A wider perch, and trickier company.',
    accent: '#a0e7b4',
    levels: [
      { size: 6, singletons: 1 },
      { size: 6, singletons: 0 },
      { size: 7, singletons: 1 },
      { size: 7, singletons: 1 },
      { size: 7, singletons: 0 },
      { size: 7, singletons: 0 },
    ],
  },
  {
    id: 'rooftop-moon',
    name: 'Rooftop Moon',
    blurb: 'The night crowd keeps its distance.',
    accent: '#9fd8ff',
    levels: [
      { size: 7, singletons: 0 },
      { size: 7, singletons: 0 },
      { size: 8, singletons: 1 },
      { size: 8, singletons: 0 },
      { size: 8, singletons: 0 },
      { size: 8, singletons: 0 },
    ],
  },
  {
    id: 'cat-council',
    name: 'Cat Council',
    blurb: 'Nine opinions, none of them touching.',
    accent: '#ffb3c6',
    levels: [
      { size: 8, singletons: 0 },
      { size: 8, singletons: 0 },
      { size: 9, singletons: 1 },
      { size: 9, singletons: 0 },
      { size: 9, singletons: 0 },
      { size: 9, singletons: 0 },
    ],
  },
];

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
  seed: number;
  /** regions never shrink below this, so later levels give nothing away */
  minRegionSize: number;
}

let cached: LevelRef[] | null = null;

export function allLevels(): LevelRef[] {
  if (cached) return cached;
  const refs: LevelRef[] = [];
  let index = 0;
  CHAPTERS.forEach((chapter, chapterIndex) => {
    chapter.levels.forEach((def, levelInChapter) => {
      const id = `${chapter.id}-${levelInChapter}`;
      refs.push({
        index,
        chapterIndex,
        levelInChapter,
        chapter,
        size: def.size,
        singletons: def.singletons,
        tip: def.tip,
        id,
        seed: seedFromString(id),
        minRegionSize: def.singletons > 0 ? 1 : 2,
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
