import type { CoachEvent, CoachStep } from '../ui/coach';
import { pastel } from '../render/art';
import type { Game } from './state';

/**
 * Level 1's guided moment, building up to the "aha":
 *
 *  1. Double-tap the first one-square patch: a cat lands.
 *  2. Paws fill in, one by one, over every square that cat rules out.
 *  3. Your turn: double-tap the other one-square patch.
 *  4. Mark its squares with paws yourself (they glow until marked).
 *  5. Now one colour patch has a single square left: its cat must go there.
 *     Double-tap it. That's the whole game in one moment.
 *  6. "Finish the last cat!" and the coach steps away.
 *
 * Light touch throughout: no dark overlay, just soft glows and a short line.
 * Built from the real board, so it adapts if the board ever changes; any step
 * whose situation doesn't arise is skipped.
 */
export const TUTORIAL_LEVELS = 1;

interface Hooks {
  game: Game;
  /** The board square element at (r, c). */
  cell: (r: number, c: number) => Element | null;
  /** Mark these squares with paws, one after another. */
  ripplePaws: (cells: Pos[]) => void;
}

type Pos = { row: number; col: number };

/** Friendly colour words for the patch palette (see PASTELS in art.ts). */
const COLOUR_WORD: Record<string, string> = {
  peach: 'orange', lilac: 'purple', mint: 'green', sky: 'blue', blossom: 'pink',
  butter: 'yellow', sage: 'green', cornflower: 'blue', clay: 'orange',
};

/** Every square a cat at `p` rules out: its row, its column, its colour
 *  patch and the squares touching it. Row first, then column, then the rest,
 *  so a ripple reads as "along the row, down the column, around it". */
export function ruledOutBy(g: Game, p: Pos): Pos[] {
  const row: Pos[] = [];
  const col: Pos[] = [];
  const rest: Pos[] = [];
  for (let r = 0; r < g.size; r++) {
    for (let c = 0; c < g.size; c++) {
      if (r === p.row && c === p.col) continue;
      const touching = Math.abs(r - p.row) <= 1 && Math.abs(c - p.col) <= 1;
      if (r === p.row) row.push({ row: r, col: c });
      else if (c === p.col) col.push({ row: r, col: c });
      else if (touching || g.regionAt(r, c) === g.regionAt(p.row, p.col)) rest.push({ row: r, col: c });
    }
  }
  return [...row, ...col, ...rest];
}

export function tutorialSteps(levelIndex: number, { game: g, cell, ripplePaws }: Hooks): CoachStep[] {
  if (levelIndex !== 0) return [];

  const sizes = new Map<number, number>();
  g.board.regions.forEach((row) => row.forEach((v) => sizes.set(v, (sizes.get(v) ?? 0) + 1)));
  const singles = g.board.solution.filter((p) => sizes.get(g.regionAt(p.row, p.col)) === 1);
  const first = singles[0] ?? g.board.solution[0];
  const second = singles[1] ?? null;

  const empty = (p: Pos) => g.marks[p.row][p.col] === 'empty';
  const els = (list: Pos[]) => list.map((p) => cell(p.row, p.col)).filter((x): x is Element => !!x);
  const catAt = (p: Pos) => (e: CoachEvent) => e.type === 'cat' && e.r === p.row && e.c === p.col;
  const toMark = () => (second ? ruledOutBy(g, second).filter(empty) : []);

  /** A patch with no cat yet and exactly one open square left: its cat is certain. */
  const lastSquare = (): { at: Pos; colour: string } | null => {
    const open = new Map<number, Pos[]>();
    const hasCat = new Set<number>();
    for (let r = 0; r < g.size; r++) {
      for (let c = 0; c < g.size; c++) {
        const reg = g.regionAt(r, c);
        if (g.marks[r][c] === 'cat') hasCat.add(reg);
        if (g.marks[r][c] === 'empty') open.set(reg, [...(open.get(reg) ?? []), { row: r, col: c }]);
      }
    }
    for (const [reg, cells] of open) {
      if (!hasCat.has(reg) && cells.length === 1 && g.isSolutionCell(cells[0].row, cells[0].col)) {
        return { at: cells[0], colour: COLOUR_WORD[pastel(reg).name] ?? 'coloured' };
      }
    }
    return null;
  };
  let aha: { at: Pos; colour: string } | null = null;

  return [
    {
      caption: 'Double-tap to place a cat',
      target: () => cell(first.row, first.col),
      gesture: 'double',
      until: catAt(first),
    },
    {
      caption: 'Paws show where no other cat can go',
      sub: 'Its row, its column and the squares right next to it.',
      onEnter: () => ripplePaws(ruledOutBy(g, first).filter(empty)),
      hold: 4600,
    },
    {
      caption: 'Your turn! Double-tap this cat',
      target: () => (second ? cell(second.row, second.col) : null),
      gesture: 'double',
      until: second ? catAt(second) : undefined,
      skipIf: () => !second || !empty(second),
    },
    {
      caption: 'Tap the glowing squares to add paws',
      marks: () => els(toMark()),
      keep: () => (second ? els([second]) : []),
      counter: () => toMark().length,
      until: () => toMark().length === 0,
      skipIf: () => toMark().length === 0,
    },
    {
      caption: '',
      sub: 'So its cat must go there. Double-tap it!',
      target: () => {
        aha = lastSquare();
        return aha ? cell(aha.at.row, aha.at.col) : null;
      },
      captionFn: () => (aha ? `Only one square is left in the ${aha.colour} patch…` : ''),
      sizeHint: 'Only one square is left in the coloured patch…', // longest colour word

      gesture: 'double',
      until: (e) => !!aha && catAt(aha.at)(e),
      skipIf: () => !lastSquare(),
    },
    { caption: 'You’ve got it! Now place the last cat', hold: 2600 },
  ];
}
