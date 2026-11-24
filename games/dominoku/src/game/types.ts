export type Size = 2 | 4 | 6;
/** 0: a|b flat, 1: a over b, 2: b|a flat, 3: b over a. Each step is a 90 degree clockwise turn. */
export type Orientation = 0 | 1 | 2 | 3;

export interface Tile {
  /** "a-b" with a <= b, unique within a puzzle. */
  id: string;
  a: number;
  b: number;
}

export interface Placement {
  tile: string;
  /** Top or left cell of the domino. */
  row: number;
  col: number;
  orientation: Orientation;
}

export interface Puzzle {
  id: string;
  size: Size;
  rowTargets: number[];
  colTargets: number[];
  /** Every domino of the puzzle: locked ones and the ones in the tray. */
  tiles: Tile[];
  locked: Placement[];
}