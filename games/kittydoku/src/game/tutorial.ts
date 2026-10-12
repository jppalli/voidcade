import type { CoachEvent, CoachStep } from '../ui/coach';
import type { Game } from './state';

/**
 * Guided first levels (World 1, levels 1-3). Show, don't tell: one action at
 * a time on a dimmed screen, an animated paw acting it out, a few words of
 * caption. The rules are taught by the board itself: after the first cat,
 * paws ripple across every square it rules out.
 *
 * Scripts are built from the level's real board, so they always point at a
 * real one-square patch (levels 1-3 are generated with at least one).
 */
export const TUTORIAL_LEVELS = 3;

interface Hooks {
  game: Game;
  /** The board square element at (r, c). */
  cell: (r: number, c: number) => Element | null;
  /** Mark these squares with paws, one after another (a ripple). */
  ripplePaws: (cells: { row: number; col: number }[]) => void;
}

type Pos = { row: number; col: number };

/** A one-square patch's cell (its cat is certain), or any unplaced solution cell. */
function certainCell(g: Game): Pos {
  const sizes = new Map<number, number>();
  g.board.regions.forEach((row) => row.forEach((v) => sizes.set(v, (sizes.get(v) ?? 0) + 1)));
  const free = g.board.solution.filter((p) => g.marks[p.row][p.col] !== 'cat');
  return free.find((p) => sizes.get(g.regionAt(p.row, p.col)) === 1) ?? free[0];
}

/** Every empty square a cat at `p` rules out: its row, column, patch and the
 *  squares touching it, nearest first so the ripple spreads outwards. */
function ruledOutBy(g: Game, p: Pos): Pos[] {
  const out: Pos[] = [];
  for (let r = 0; r < g.size; r++) {
    for (let c = 0; c < g.size; c++) {
      if (r === p.row && c === p.col) continue;
      if (g.marks[r][c] !== 'empty') continue;
      const touching = Math.abs(r - p.row) <= 1 && Math.abs(c - p.col) <= 1;
      if (r === p.row || c === p.col || touching || g.regionAt(r, c) === g.regionAt(p.row, p.col)) out.push({ row: r, col: c });
    }
  }
  const d = (q: Pos) => Math.max(Math.abs(q.row - p.row), Math.abs(q.col - p.col));
  return out.sort((a, b) => d(a) - d(b));
}

export function tutorialSteps(levelIndex: number, hooks: Hooks): CoachStep[] {
  const { game: g, cell, ripplePaws } = hooks;
  const target = certainCell(g);
  const at = (p: Pos) => () => cell(p.row, p.col);
  const isCatAt = (p: Pos) => (e: CoachEvent) => e.type === 'cat' && e.r === p.row && e.c === p.col;

  switch (levelIndex) {
    case 0:
      return [
        {
          caption: 'Double-tap to place a cat',
          target: at(target), dim: true, gesture: 'double',
          until: isCatAt(target),
        },
        {
          caption: 'No other cat can go here',
          onEnter: () => ripplePaws(ruledOutBy(g, target)),
          hold: 3000,
        },
        { caption: 'Now place the other cats!', hold: 2200 },
      ];

    case 1: {
      // A square in that cat's row is certain to be empty: a perfect first paw.
      const pawAt = (): Pos | null => {
        for (let c = 0; c < g.size; c++) {
          if (c !== target.col && g.marks[target.row][c] === 'empty') return { row: target.row, col: c };
        }
        return null;
      };
      let pawSpot: Pos | null = null;
      return [
        {
          caption: 'Double-tap to place a cat',
          target: at(target), dim: true, gesture: 'double',
          until: isCatAt(target),
        },
        {
          caption: 'Tap once to mark “no cat here”',
          target: () => { pawSpot = pawAt(); return pawSpot ? cell(pawSpot.row, pawSpot.col) : null; },
          dim: true, gesture: 'tap',
          until: (e) => e.type === 'paw' && !!pawSpot && e.r === pawSpot.row && e.c === pawSpot.col,
        },
        {
          caption: 'Or hold and drag to mark lots',
          target: () => document.getElementById('board'),
          gesture: 'drag',
          hold: 3200,
        },
      ];
    }

    case 2:
      return [
        {
          caption: 'A wrong cat costs a heart',
          target: () => document.getElementById('livesRow'),
          dim: true, hold: 3200,
        },
        {
          caption: 'Stuck? Tap Hint for help',
          target: () => document.getElementById('btnHint'),
          dim: true, hold: 3200,
        },
      ];

    default:
      return [];
  }
}
