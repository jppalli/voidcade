import { cellsOf } from './dominoes';
import type { Placement, Puzzle, Tile } from './types';

export interface Board {
  readonly size: number;
  readonly tiles: ReadonlyMap<string, Tile>;
  readonly locked: readonly Placement[];
  readonly placed: readonly Placement[];
}

export interface Cell {
  pip: number;
  tile: string;
  locked: boolean;
}

export function createBoard(puzzle: Puzzle, placed: readonly Placement[] = []): Board {
  return {
    size: puzzle.size,
    tiles: new Map(puzzle.tiles.map((t) => [t.id, t])),
    locked: puzzle.locked,
    placed,
  };
}

/** Row-major array of cells, null where empty. */
export function cellMap(board: Board): (Cell | null)[] {
  const map: (Cell | null)[] = new Array(board.size * board.size).fill(null);
  const add = (p: Placement, locked: boolean) => {
    const tile = board.tiles.get(p.tile);
    if (!tile) return;
    for (const c of cellsOf(tile, p)) map[c.row * board.size + c.col] = { pip: c.pip, tile: p.tile, locked };
  };
  board.locked.forEach((p) => add(p, true));
  board.placed.forEach((p) => add(p, false));
  return map;
}

export function isOnBoard(board: Board, tileId: string): boolean {
  return board.locked.some((p) => p.tile === tileId) || board.placed.some((p) => p.tile === tileId);
}

/** The two cells must be inside the grid and empty, and the tile must not already be on the grid. */
export function canPlace(board: Board, p: Placement): boolean {
  const tile = board.tiles.get(p.tile);
  if (!tile || isOnBoard(board, p.tile)) return false;
  const map = cellMap(board);
  return cellsOf(tile, p).every(
    (c) => c.row >= 0 && c.col >= 0 && c.row < board.size && c.col < board.size && map[c.row * board.size + c.col] === null,
  );
}

export function addPlacement(board: Board, p: Placement): Board {
  return { ...board, placed: [...board.placed, p] };
}

export function removePlacement(board: Board, tileId: string): Board {
  return { ...board, placed: board.placed.filter((p) => p.tile !== tileId) };
}

export function findPlaced(board: Board, tileId: string): Placement | undefined {
  return board.placed.find((p) => p.tile === tileId);
}

/** Tiles that are not on the grid yet, in puzzle order. */
export function trayTiles(board: Board): Tile[] {
  return [...board.tiles.values()].filter((t) => !isOnBoard(board, t.id));
}

/** Sum of the pips currently in each row and column. */
export function totals(board: Board): { rows: number[]; cols: number[] } {
  const rows = new Array<number>(board.size).fill(0);
  const cols = new Array<number>(board.size).fill(0);
  cellMap(board).forEach((c, i) => {
    if (!c) return;
    rows[Math.floor(i / board.size)] += c.pip;
    cols[i % board.size] += c.pip;
  });
  return { rows, cols };
}