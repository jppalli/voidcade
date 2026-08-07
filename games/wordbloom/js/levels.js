/**
 * Level data for Wordbloom.
 *
 * Each level has a "source" word (letters shown in the ring) and a list of
 * required words the player must find by tracing connected letters. Every
 * required word is a strict letter-subset of the source (verified by
 * verify-levels.mjs), and every source word has all-unique letters so the
 * ring never has to represent a repeated letter.
 *
 * Bonus words (any other corpus word that's a subset of the ring, length 3+)
 * are computed at runtime in game.js — not stored here.
 */

export const CHAPTERS = [
  {
    name: 'First Sprouts',
    blurb: 'Small rings, a handful of words. Getting the feel of it.',
    accent: '#e0a638',
  },
  {
    name: 'Petal Patch',
    blurb: 'A few more words hiding in every ring.',
    accent: '#3f97a8',
  },
  {
    name: 'Garden Path',
    blurb: 'Six-letter rings begin. More ground to cover.',
    accent: '#9b8ad1',
  },
  {
    name: 'Full Bloom',
    blurb: 'Dense rings, plenty of words to uncover.',
    accent: '#e2735f',
  },
  {
    name: 'Wildflower',
    blurb: 'The richest rings in the garden.',
    accent: '#6fb56f',
  },
];

// [source, [...requiredWords]]
const RAW_LEVELS = [
  // ---- Chapter 0: First Sprouts ----
  ['EARTH', ['HAT', 'EAR', 'RAT', 'TEA']],
  ['TABLE', ['BAT', 'TEA', 'LAB', 'TAB']],
  ['TOWER', ['OWE', 'ROW', 'TOE', 'WET']],
  ['BREAD', ['EAR', 'BED', 'RED', 'BEAR', 'READ']],
  ['DREAM', ['ARM', 'EAR', 'RAM', 'RED', 'READ']],
  ['PLANT', ['ANT', 'LAP', 'PAN', 'TAN', 'TAP']],

  // ---- Chapter 1: Petal Patch ----
  ['POINT', ['TOP', 'PIN', 'POT', 'TIN', 'TON']],
  ['STEAM', ['TEA', 'MAT', 'SEA', 'SET', 'MEAT']],
  ['TOWEL', ['OWL', 'LOT', 'OWE', 'TOE', 'WET']],
  ['WATER', ['EAR', 'RAT', 'TEA', 'WET', 'WEAR']],
  ['PAINT', ['ANT', 'PAN', 'PIN', 'TAN', 'TAP', 'TIN']],
  ['PHONE', ['PEN', 'HEN', 'HOP', 'ONE', 'HOPE', 'OPEN']],
  ['STAGE', ['TEA', 'AGE', 'GAS', 'SEA', 'SET', 'TAG', 'GATE']],

  // ---- Chapter 2: Garden Path ----
  ['STONE', ['NET', 'ONE', 'SET', 'TEN', 'TOE', 'TON']],
  ['TRAIN', ['RAT', 'AIR', 'ANT', 'TAN', 'TIN', 'RAIN']],
  ['GUITAR', ['RAT', 'AIR', 'RAG', 'RUG', 'TAG', 'TUG']],
  ['ISLAND', ['SAD', 'LID', 'SAND', 'NAIL', 'SAIL', 'LAND']],
  ['PACKET', ['CAT', 'TEA', 'CAP', 'TAP', 'CAKE', 'TAKE']],
  ['SPRING', ['PIG', 'PIN', 'SIP', 'RING', 'SPIN', 'SING']],
  ['FRIEND', ['FIN', 'RED', 'FIRE', 'FIND', 'RIDE']],
  ['GARDEN', ['EAR', 'AGE', 'RAG', 'RED', 'READ']],

  // ---- Chapter 3: Full Bloom ----
  ['GOLDEN', ['DOG', 'LEG', 'LOG', 'ONE', 'GOLD']],
  ['JACKET', ['CAT', 'TEA', 'JET', 'CAKE', 'TAKE']],
  ['PENCIL', ['PEN', 'ICE', 'PIE', 'LIP', 'PIN']],
  ['BEAUTY', ['BAT', 'TEA', 'TAB', 'TUB']],
  ['BASKET', ['BAT', 'TEA', 'SEA', 'SET', 'TAB', 'BAKE', 'TAKE']],
  ['BRIDGE', ['RIB', 'BED', 'BIG', 'DIG', 'RED', 'BIRD', 'RIDE']],
  ['CASTLE', ['CAT', 'TEA', 'SEA', 'SET', 'SEAL', 'LAST', 'SCALE']],
  ['WINTER', ['NET', 'WIN', 'TEN', 'TIE', 'TIN', 'WET', 'WIT', 'WIRE']],

  // ---- Chapter 4: Wildflower ----
  ['COUNTY', ['CUT', 'NUT', 'TON', 'TOY']],
  ['FLOWER', ['OWL', 'OWE', 'ROW', 'WOLF']],
  ['ORANGE', ['EAR', 'AGE', 'ONE', 'RAG']],
  ['WALNUT', ['ANT', 'NUT', 'TAN', 'WANT']],
  ['MARKET', ['ARM', 'EAR', 'RAT', 'TEA', 'MAT', 'RAM', 'MEAT', 'MAKE', 'TAKE']],
  ['NATURE', ['RUN', 'EAR', 'NET', 'RAT', 'TEA', 'ANT', 'NUT', 'TAN', 'TEN', 'TURN']],
  ['STREAM', ['ARM', 'EAR', 'RAT', 'TEA', 'MAT', 'RAM', 'SEA', 'SET', 'STAR', 'MEAT', 'REST', 'STEAM']],
  ['PLANET', ['PEN', 'NET', 'TEA', 'ANT', 'LAP', 'PAN', 'TAN', 'TAP', 'TEN', 'PANEL', 'PLANE', 'PLANT', 'PLATE']],
];

const CHAPTER_SIZES = [6, 7, 8, 8, 8];

/** Deterministic shuffle so each ring has a non-alphabetical layout that's
 * stable across sessions (a "shuffle" button lets the player rearrange it
 * further, but that's purely cosmetic and not persisted). */
function ringOrder(word, levelIndex) {
  const letters = [...new Set(word.split(''))];
  const arr = letters.slice();
  let seed = levelIndex * 2654435761 + word.length;
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const LEVELS = (() => {
  const out = [];
  let cursor = 0;
  CHAPTERS.forEach((chapter, chapterIndex) => {
    const count = CHAPTER_SIZES[chapterIndex];
    for (let i = 0; i < count; i++) {
      const [source, required] = RAW_LEVELS[cursor];
      const index = cursor;
      out.push({
        index,
        chapterIndex,
        chapter,
        levelInChapter: i,
        source,
        letters: ringOrder(source, index),
        required,
      });
      cursor++;
    }
  });
  return out;
})();

export const TOTAL_LEVELS = LEVELS.length;

export function levelAt(index) {
  return LEVELS[index] ?? null;
}

export function allLevels() {
  return LEVELS;
}
