import type { Orientation, Placement, Tile } from './types';

export const MAX_PIP = 6;

export function tileId(a: number, b: number): string {
  return a <= b ? `${a}-${b}` : `${b}-${a}`;
}

export function parseTile(id: string): Tile {
  const [a, b] = id.split('-').map(Number);
  return { id, a, b };
}

/** The 28 dominoes of a double-six set. */
export const ALL_TILES: Tile[] = (() => {
  const out: Tile[] = [];
  for (let a = 0; a <= MAX_PIP; a++) for (let b = a; b <= MAX_PIP; b++) out.push({ id: tileId(a, b), a, b });
  return out;
})();

export const nextOrientation = (o: Orientation): Orientation => ((o + 1) % 4) as Orientation;
export const isFlat = (o: Orientation): boolean => o % 2 === 0;

export interface CellPip {
  row: number;
  col: number;
  pip: number;
}

/** The two cells a placed domino covers, with the pip shown on each. */
export function cellsOf(tile: Tile, p: Pick<Placement, 'row' | 'col' | 'orientation'>): [CellPip, CellPip] {
  const first = p.orientation < 2 ? tile.a : tile.b;
  const second = p.orientation < 2 ? tile.b : tile.a;
  const flat = isFlat(p.orientation);
  return [
    { row: p.row, col: p.col, pip: first },
    { row: p.row + (flat ? 0 : 1), col: p.col + (flat ? 1 : 0), pip: second },
  ];
}