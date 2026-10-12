import type { CoachEvent, CoachStep } from '../ui/coach';
import type { Game } from './state';

/**
 * Guided first levels (World 1, levels 1-4). Each script is built from the
 * level's actual board, so it always points at a real one-square patch, a
 * real row, and so on. The boards for levels 1-3 are generated with one-square
 * patches (see levels.spec.ts), which the scripts rely on.
 */
export const TUTORIAL_LEVELS = 4;

interface Hooks {
  game: Game;
  /** The board square element at (r, c). */
  cell: (r: number, c: number) => Element | null;
}

const isCat = (e: CoachEvent) => e.type === 'cat';

/** A one-square patch's cell (its cat is certain), or any solution cell. */
function certainCell(g: Game): { row: number; col: number } {
  const sizes = new Map<number, number>();
  g.board.regions.forEach((row) => row.forEach((v) => sizes.set(v, (sizes.get(v) ?? 0) + 1)));
  const free = g.board.solution.filter((p) => g.marks[p.row][p.col] !== 'cat');
  return free.find((p) => sizes.get(g.regionAt(p.row, p.col)) === 1) ?? free[0];
}

export function tutorialSteps(levelIndex: number, { game: g, cell }: Hooks): CoachStep[] {
  const els = (list: { row: number; col: number }[]) =>
    list.map((p) => cell(p.row, p.col)).filter((x): x is Element => !!x);
  const all = () => els(g.board.solution.flatMap((_, r) => Array.from({ length: g.size }, (_, c) => ({ row: r, col: c }))));
  // The cat the player places first; filled in when they do.
  let placed: { row: number; col: number } | null = null;
  const remember = (e: CoachEvent) => { if (isCat(e)) { placed = { row: e.r, col: e.c }; return true; } return false; };
  const lineOf = (p: { row: number; col: number }) =>
    els(Array.from({ length: g.size }, (_, i) => [{ row: p.row, col: i }, { row: i, col: p.col }]).flat()
      .filter((q) => q.row !== p.row || q.col !== p.col));
  const target = certainCell(g);

  switch (levelIndex) {
    case 0:
      return [
        { text: 'Hi! Every colour patch needs exactly one cat.', lanes: all },
        {
          text: 'This patch is just one square, so its cat must go here. Double-tap it!',
          spot: () => els([target]),
          until: remember,
          doThis: 'Double-tap the glowing square',
        },
        {
          text: 'Lovely! A cat also needs its own row and column, so no other cat can sit on these squares.',
          lanes: () => lineOf(placed ?? target),
        },
        { text: 'Now find a spot for every other patch. Take your time!' },
      ];

    case 1: {
      // A square in the placed cat's row that is still empty: perfect for a paw.
      const pawSpot = () => {
        const p = placed ?? target;
        const spot = Array.from({ length: g.size }, (_, c) => ({ row: p.row, col: c }))
          .find((q) => q.col !== p.col && g.marks[q.row][q.col] === 'empty');
        return spot ? els([spot]) : [];
      };
      return [
        {
          text: 'Here’s another one-square patch. Double-tap it to place its cat.',
          spot: () => els([target]),
          until: remember,
          doThis: 'Double-tap the glowing square',
        },
        {
          text: 'No other cat fits in this row now. Tap a square once to leave a paw, a little note that means “no cat here”.',
          spot: pawSpot,
          until: (e) => e.type === 'paw',
          doThis: 'Tap the glowing square once',
        },
        { text: 'Tap a paw again to clear it, or hold and drag to paint lots of paws at once. Paws are always free!' },
      ];
    }

    case 2:
      return [
        {
          text: 'Start with the one-square patch again.',
          spot: () => els([target]),
          until: remember,
          doThis: 'Double-tap the glowing square',
        },
        {
          text: 'Cats like their space. They never sit next to each other, not even corner to corner, so all these squares are out.',
          lanes: () => {
            const p = placed ?? target;
            const out: { row: number; col: number }[] = [];
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const row = p.row + dr;
                const col = p.col + dc;
                if ((dr || dc) && row >= 0 && col >= 0 && row < g.size && col < g.size) out.push({ row, col });
              }
            }
            return els(out);
          },
        },
      ];

    case 3:
      return [
        {
          text: 'Careful! A cat in the wrong spot costs a heart, and you have three.',
          spot: () => [document.getElementById('livesRow')].filter((x): x is HTMLElement => !!x),
        },
        {
          text: 'Stuck? Tap Hint and I’ll place a cat for you. You get three free every day.',
          spot: () => [document.getElementById('btnHint')].filter((x): x is HTMLElement => !!x),
        },
      ];

    default:
      return [];
  }
}
