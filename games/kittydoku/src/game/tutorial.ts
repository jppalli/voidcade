import type { CoachEvent, CoachStep } from '../ui/coach';
import type { Game } from './state';

/**
 * Level 1's guided moment: double-tap the one-square patch, the cat lands,
 * then "Now place the other cats". Everything else is explained by the How to
 * Play card (shown once on first launch) and by one-time notes when hearts or
 * hints first matter (see main.ts).
 */
export const TUTORIAL_LEVELS = 1;

interface Hooks {
  game: Game;
  /** The board square element at (r, c). */
  cell: (r: number, c: number) => Element | null;
}

type Pos = { row: number; col: number };

/** A one-square patch's cell (its cat is certain), or any unplaced solution cell. */
function certainCell(g: Game): Pos {
  const sizes = new Map<number, number>();
  g.board.regions.forEach((row) => row.forEach((v) => sizes.set(v, (sizes.get(v) ?? 0) + 1)));
  const free = g.board.solution.filter((p) => g.marks[p.row][p.col] !== 'cat');
  return free.find((p) => sizes.get(g.regionAt(p.row, p.col)) === 1) ?? free[0];
}

/** Every square a cat at `p` rules out: touching it, or in its row, column
 *  or colour patch. */
export function ruledOutBy(g: Game, p: Pos): Pos[] {
  const out: Pos[] = [];
  for (let r = 0; r < g.size; r++) {
    for (let c = 0; c < g.size; c++) {
      if (r === p.row && c === p.col) continue;
      const touching = Math.abs(r - p.row) <= 1 && Math.abs(c - p.col) <= 1;
      if (r === p.row || c === p.col || touching || g.regionAt(r, c) === g.regionAt(p.row, p.col)) out.push({ row: r, col: c });
    }
  }
  return out;
}

export function tutorialSteps(levelIndex: number, { game: g, cell }: Hooks): CoachStep[] {
  if (levelIndex !== 0) return [];
  const target = certainCell(g);

  return [
    {
      caption: 'Double-tap to place a cat',
      target: () => cell(target.row, target.col),
      dim: true,
      gesture: 'double',
      until: (e: CoachEvent) => e.type === 'cat' && e.r === target.row && e.c === target.col,
    },
    { caption: 'Lovely! Now place the other cats', hold: 2400 },
  ];
}
