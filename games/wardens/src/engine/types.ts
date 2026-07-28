import type { Position } from '@arcade/queens-core';

export type { Position };

export interface WardenLevel {
  id: string;
  size: number;
  /** regions[row][col] = region index, one region per row of the solution */
  regions: number[][];
  /** ground-truth unique solution: one cell per row, in row order */
  solution: Position[];
  /** which element glyph/color each region index uses, for visual variety */
  elementOrder: number[];
}

export type CellMark = 'empty' | 'x' | 'warden';

export interface RealmDef {
  id: string;
  name: string;
  blurb: string;
  /** filled in from the realm's level list */
  levelCount: number;
  colorFrom: string;
  colorTo: string;
}
