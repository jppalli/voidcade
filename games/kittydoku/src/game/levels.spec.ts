/**
 * The level plan: 10 worlds x 10 levels = 100 levels.
 *
 * Difficulty comes from two dials:
 *   - board size, which grows slowly (4x4 up to 9x9, and stops there);
 *   - `target`, the logic grade from @arcade/queens-core's grader:
 *       1 = only "one square left" deductions
 *       2 = a patch confined to one row/column
 *       3 = a square that would block a whole row/column/patch
 *       4 = two or more patches squeezed into the same lines
 *       5 = imagine-a-cat lookahead
 *     The fraction is how often the harder steps come up (.0 light, .9 lots).
 *
 * Each world opens gently, climbs, and ends on a slightly tougher "boss"
 * level; the next world starts with a breather. `singletons` hands out
 * one-square patches (a free, certain cat) to ease in a new board size.
 *
 * This file has no data imports so the offline generator can read it.
 * Boards themselves live in levels.data.json (run `npm run generate-levels`).
 */

export interface LevelDef {
  size: number;
  /** one-square patches to carve (each is a free, certain cat) */
  singletons: number;
  /** target logic grade, see above */
  target: number;
  /** one-line lesson the cat says the first time you open this level */
  tip?: string;
}

export interface ChapterDef {
  id: string;
  name: string;
  /** short flavour line under the chapter name */
  blurb: string;
  /** pastel accent for this chapter's map section */
  accent: string;
  /** what the cat says the first time you arrive in this world */
  intro: string;
  levels: LevelDef[];
}

const L = (size: number, singletons: number, target: number, tip?: string): LevelDef =>
  tip ? { size, singletons, target, tip } : { size, singletons, target };

export const CHAPTERS: ChapterDef[] = [
  {
    id: 'sunny-windowsill',
    name: 'Sunny Windowsill',
    blurb: 'Where every cat finds a warm square of its own.',
    accent: '#ffd6a5',
    intro: 'Welcome to the Sunny Windowsill! Every puzzle here is a little group of cats, each looking for a warm spot of its own.',
    levels: [
      // Levels 1-3 are the guided tutorial (see game/tutorial.ts). They need
      // at least one one-square patch each, which the coach points at.
      L(4, 2, 1),
      L(4, 2, 1),
      L(4, 1, 1),
      L(4, 1, 1),
      L(5, 2, 1),
      L(5, 2, 2, 'When a patch sits entirely inside one row, its cat must be in that row. No other square in that row can hold a cat.'),
      L(5, 1, 2),
      L(5, 1, 3.1, 'If a cat on one square would leave a row, column or patch with no spot at all, no cat can sit there.'),
      L(5, 0, 3.2),
      L(5, 0, 3.4),
    ],
  },
  {
    id: 'cosy-armchair',
    name: 'Cozy Armchair',
    blurb: 'Room for a few more paws.',
    accent: '#bdb2ff',
    intro: 'You made it to the Cozy Armchair. The boards grow a little here, so take your time and leave plenty of paws.',
    levels: [
      L(5, 1, 2, 'When a row has only one possible square left, its cat must go there.'),
      L(5, 0, 3.2),
      L(6, 2, 1),
      L(6, 1, 2),
      L(6, 1, 3.0),
      L(6, 1, 3.2),
      L(6, 0, 3.2),
      L(6, 0, 3.3),
      L(6, 0, 3.4),
      L(6, 0, 4.1),
    ],
  },
  {
    id: 'garden-fence',
    name: 'Garden Fence',
    blurb: 'A wider perch, and trickier company.',
    accent: '#a0e7b4',
    intro: 'Out to the Garden Fence! One-square patches are rare from here on, so look for rows and patches with only one spot left.',
    levels: [
      L(6, 0, 3.1),
      L(6, 0, 3.3),
      L(6, 0, 4.1, 'When two patches only fit inside the same two rows, those rows belong to them. Every other square in those rows is out.'),
      L(6, 0, 3.4),
      L(7, 1, 2),
      L(7, 1, 3.1),
      L(7, 1, 3.2),
      L(7, 0, 3.3),
      L(7, 0, 4.2),
      L(7, 0, 4.4),
    ],
  },
  {
    id: 'rooftop-moon',
    name: 'Rooftop Moon',
    blurb: 'The night crowd keeps its distance.',
    accent: '#9fd8ff',
    intro: 'Up on the Rooftop Moon, the night crowd likes its space. Slow and steady wins the night.',
    levels: [
      L(7, 1, 2),
      L(7, 0, 3.2),
      L(7, 0, 3.4),
      L(7, 0, 4.1),
      L(7, 0, 3.3),
      L(7, 0, 4.2),
      L(7, 0, 3.4),
      L(7, 0, 4.3),
      L(7, 0, 4.4),
      L(7, 0, 4.5),
    ],
  },
  {
    id: 'cat-council',
    name: 'Cat Council',
    blurb: 'Big opinions, none of them touching.',
    accent: '#ffb3c6',
    intro: 'The Cat Council is in session. Big opinions, bigger boards, and not one cat touching another.',
    levels: [
      L(7, 0, 3.3),
      L(7, 0, 4.2),
      L(7, 0, 4.4),
      L(7, 0, 5.0, 'Stuck? Imagine a cat on one square and follow it through. If it leaves a row, column or patch with no room, that square is out.'),
      L(8, 1, 2),
      L(8, 1, 3.1),
      L(8, 0, 3.3),
      L(8, 0, 4.2),
      L(8, 0, 4.4),
      L(8, 0, 5.1),
    ],
  },
  {
    id: 'kitchen-counter',
    name: 'Kitchen Counter',
    blurb: 'Warm tiles and a full saucer.',
    accent: '#ffe08a',
    intro: 'Welcome to the Kitchen Counter! It smells like warm milk and fish. The boards are eight by eight now, so take it one row at a time.',
    levels: [
      L(8, 1, 3.0),
      L(8, 0, 3.3),
      L(8, 0, 4.2),
      L(8, 0, 3.4),
      L(8, 0, 4.3),
      L(8, 0, 5.0),
      L(8, 0, 4.3),
      L(8, 0, 4.5),
      L(8, 0, 5.2),
      L(8, 0, 5.3),
    ],
  },
  {
    id: 'bubble-bath',
    name: 'Bubble Bath',
    blurb: 'Every cat in its own bubble.',
    accent: '#9be3e8',
    intro: 'Splash! The Bubble Bath is full of soapy cats who refuse to share a bubble. Nine by nine boards float in near the end.',
    levels: [
      L(8, 0, 3.4),
      L(8, 0, 4.3),
      L(8, 0, 4.5),
      L(8, 0, 5.1),
      L(8, 0, 4.4),
      L(8, 0, 5.3),
      L(9, 1, 3.2),
      L(9, 1, 4.2),
      L(9, 0, 4.4),
      L(9, 0, 5.2),
    ],
  },
  {
    id: 'bookshop-nook',
    name: 'Bookstore Nook',
    blurb: 'Quiet corners, careful thinking.',
    accent: '#e3b77f',
    intro: 'Shh, this is the Bookstore Nook. Quiet cats, big boards, and puzzles that reward careful reading.',
    levels: [
      L(9, 1, 3.2),
      L(9, 0, 4.2),
      L(9, 0, 4.4),
      L(9, 0, 5.1),
      L(9, 0, 4.3),
      L(9, 0, 4.5),
      L(9, 0, 5.2),
      L(9, 0, 4.5),
      L(9, 0, 5.3),
      L(9, 0, 5.4),
    ],
  },
  {
    id: 'snowy-porch',
    name: 'Snowy Porch',
    blurb: 'Warm paws, cold noses.',
    accent: '#cfe3f5',
    intro: 'Brr, the Snowy Porch! Every cat wants the warmest spot by the door, and none of them will budge.',
    levels: [
      L(9, 0, 4.2),
      L(9, 0, 4.4),
      L(9, 0, 5.1),
      L(9, 0, 4.5),
      L(9, 0, 5.3),
      L(9, 0, 4.6),
      L(9, 0, 5.4),
      L(9, 0, 5.3),
      L(9, 0, 5.5),
      L(9, 0, 5.6),
    ],
  },
  {
    id: 'lantern-festival',
    name: 'Lantern Festival',
    blurb: 'The brightest night of all.',
    accent: '#ffb38a',
    intro: 'The Lantern Festival is the last and grandest night. These are the trickiest puzzles in the game. Enjoy the glow.',
    levels: [
      L(9, 0, 4.3),
      L(9, 0, 5.1),
      L(9, 0, 4.6),
      L(9, 0, 5.3),
      L(9, 0, 5.4),
      L(9, 0, 4.6),
      L(9, 0, 5.5),
      L(9, 0, 5.6),
      L(9, 0, 5.7),
      L(9, 0, 5.8),
    ],
  },
];

/** Stable id for a level, used for seeds and for the saved board data. */
export const levelId = (chapterId: string, levelInChapter: number) => `${chapterId}-${levelInChapter}`;
