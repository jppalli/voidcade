/**
 * Needle's levels: 5 worlds of 8 levels each (40 in all).
 *
 * The curve is a sawtooth. Each world brings at most one new idea, on an
 * easy level, and the level after it is practice with nothing new:
 *
 *   level 1   brush the hay and tap the needle (the needle is mostly in view)
 *   level 2   tap a straw to lift it (one long straw lies across the needle)
 *   level 3   a first bonus item
 *   level 4   practice
 *   level 5   detector; from here the needle starts 90% under hay
 *   level 9   fan (first level of world 2)
 *   level 17  vacuum (first level of world 3)
 *   from world 2 on the haystack grows and gets denser (see WORLD_SIZE); you zoom and pan to search it
 *   worlds 4 and 5 mix everything, with much bigger, denser hay and smaller needles.
 *
 * The last level of each world (the finale) is the biggest pile, with three
 * bonus items.
 */

/** The id of a collectable item (see items.ts). */
export type Treasure = string;

/** The level at which each helper (detector, fan, vacuum) unlocks. */
export const TOOL_LEVELS = [5, 9, 17] as const;

/** How many times larger (in each direction) the haystack is than the 1200 x 700 view, per world. */
export const WORLD_SIZE = [1, 1.25, 1.5, 1.8, 2.1] as const;

export interface WorldDef {
  id: string;
  name: string;
  blurb: string;
  /** Tint multiplied onto the straw textures. */
  tint: number;
}

export const WORLDS: readonly WorldDef[] = [
  { id: 'meadow', name: 'The Meadow', blurb: 'A sunny morning', tint: 0xffe5a8 },
  { id: 'barnyard', name: 'The Barnyard', blurb: 'A golden afternoon', tint: 0xf5c878 },
  { id: 'orchard', name: 'The Orchard', blurb: 'Autumn leaves', tint: 0xeab880 },
  { id: 'snow', name: 'The Snowy Farm', blurb: 'Soft, quiet snow', tint: 0xf3e4c0 },
  { id: 'night', name: 'Starry Night', blurb: 'Fireflies and stars', tint: 0xdcc48f },
];

export const LEVELS_PER_WORLD = 8;
export const TOTAL_LEVELS = WORLDS.length * LEVELS_PER_WORLD;

/** Index (0-based) of the world a level (1-based) belongs to. */
export const worldOf = (level: number) =>
  Math.min(WORLDS.length - 1, Math.max(0, Math.floor((Math.floor(level) - 1) / LEVELS_PER_WORLD)));

/** What the first levels teach, one thing each. */
export type Teach = 'brush' | 'pluck' | 'bonus';

export interface LevelDef {
  /** 1-based, across the whole game. */
  n: number;
  /** 0-based world index. */
  world: number;
  /** 1-based position inside its world. */
  inWorld: number;
  /** The last level of a world. */
  finale: boolean;
  shape: string;
  tint: number;
  /** How many times larger the haystack is than one screen (1 = fits the view). */
  size: number;
  /** A real haystack: tall in the middle, with the lower layers in shade. Only the last level. */
  dome: boolean;
  /** Straws in the pile, before the extra ones laid over hidden objects. */
  count: number;
  /** How many bonus items the level holds. Which ones is rolled every time it is played (see drops.ts). */
  slots: number;
  /** A night level: only a small circle of light around the pointer shows the hay. */
  night: boolean;
  /** Look-alikes of the needle lying in the hay (a pin, a nail). Tapping one is harmless. */
  decoys: number;
  /** Share (0 to 1) of the needle and of each bonus item that starts under hay. */
  hidden: number;
  /** Where the needle and bonus items sit in the pile, as a share of its depth (1 is the top). */
  depth: [number, number];
  /** Needle scale; it shrinks as the game goes on. */
  needle: number;
  /** One long straw lies right across the needle (level 2). */
  cover: boolean;
  teach?: Teach;
}

const SHAPES = ['mound', 'twins', 'ring', 'rows', 'scatter', 'spiral'] as const;

/** Bonus items per level, for world 1 and for the later worlds. */
const BONUS_COUNT = [
  [0, 0, 1, 1, 1, 2, 2, 3],
  [1, 1, 2, 2, 2, 2, 2, 3],
];

/** Levels 1 to 4 start easier; from level 5 on the needle starts 90% hidden. */
const EARLY_HIDDEN = [0.7, 0, 0.8, 0.85];
const EARLY_DEPTH: [number, number][] = [[0.88, 0.95], [0.9, 0.95], [0.75, 0.85], [0.6, 0.8]];

/**
 * Layout of level n. The first two levels share the gentle mound and every
 * finale is the spiral. Otherwise layouts rotate, never repeating the one
 * before, and the level before a finale is never a spiral itself.
 */
const shapeAt = (n: number): string => {
  const inWorld = ((n - 1) % LEVELS_PER_WORLD) + 1;
  if (n <= 2) return 'mound';
  if (inWorld === LEVELS_PER_WORLD) return 'spiral';
  const prev = shapeAt(n - 1);
  let i = (n * 5 + worldOf(n) * 2) % SHAPES.length;
  while (SHAPES[i] === prev || (inWorld === LEVELS_PER_WORLD - 1 && SHAPES[i] === 'spiral')) i = (i + 1) % SHAPES.length;
  return SHAPES[i];
};

/**
 * The last level of the game: one huge haystack, 2.5 times the straws of any other level.
 * Measured in a browser without a graphics card: it ran at about half the frame rate of the old biggest level, and zooming in brings it back.
 * Raise it with care: every extra straw costs speed, most of all on phones.
 */
export const GRAND_FINALE = { size: 3, count: 25200 };

export function levelDef(level: number): LevelDef {
  const def = baseDef(level);
  if (def.n === TOTAL_LEVELS) {
    return { ...def, shape: 'stack', dome: true, size: GRAND_FINALE.size, count: GRAND_FINALE.count };
  }
  return def;
}

function baseDef(level: number): LevelDef {
  const n = Math.min(TOTAL_LEVELS, Math.max(1, Math.floor(level) || 1));
  const world = worldOf(n);
  const inWorld = ((n - 1) % LEVELS_PER_WORLD) + 1;
  const early = n <= EARLY_HIDDEN.length;

  const bonusCount = BONUS_COUNT[world === 0 ? 0 : 1][inWorld - 1];
  return {
    n,
    world,
    inWorld,
    finale: inWorld === LEVELS_PER_WORLD,
    shape: shapeAt(n),
    tint: WORLDS[world].tint,
    size: WORLD_SIZE[world],
    dome: false,
    // Bigger worlds hold more straws per square metre too, up to a ceiling the browser handles comfortably.
    count: Math.min(10000, Math.round(Math.min(2100, 700 + n * 45) * WORLD_SIZE[world] ** 2 * (1 + world * 0.08))),
    slots: bonusCount,
    // Worlds 4 and 5 have a few night levels; decoys start in world 3.
    night: world >= 3 && (inWorld === 4 || inWorld === 6),
    decoys: world >= 2 ? (inWorld === LEVELS_PER_WORLD ? 2 : inWorld === 3 || inWorld === 5 || inWorld === 7 ? 1 : 0) : 0,
    hidden: early ? EARLY_HIDDEN[n - 1] : inWorld === 1 ? 0.85 : 0.9,
    depth: early ? EARLY_DEPTH[n - 1] : [0.35, 0.65],
    needle: Math.min(0.82, Math.max(0.53, 0.82 - n * 0.012)),
    cover: n === 2,
    teach: n === 1 ? 'brush' : n === 2 ? 'pluck' : n === 3 ? 'bonus' : undefined,
  };
}

export function pilePoint(shape: string, random: () => number = Math.random): { x: number; y: number; angle: number } {
  const a = random() * Math.PI * 2,
    r = Math.sqrt(random());
  let x = 600,
    y = 350,
    angle = a;
  if (shape === 'mound') {
    x += Math.cos(a) * r * 450;
    y += Math.sin(a) * r * 245;
  } else if (shape === 'twins') {
    x = (random() < 0.5 ? 340 : 860) + Math.cos(a) * r * 235;
    y += Math.sin(a) * r * 230;
  } else if (shape === 'ring') {
    const radius = 0.58 + r * 0.42;
    x += Math.cos(a) * radius * 440;
    y += Math.sin(a) * radius * 235;
    angle = a + Math.PI / 2;
  } else if (shape === 'rows') {
    x = 200 + Math.floor(random() * 3) * 400 + (random() - 0.5) * 150;
    y = 150 + random() * 400;
    angle = Math.PI / 2 + (random() - 0.5) * 0.6;
  } else if (shape === 'stack') {
    // A haystack: crowded toward the middle, straws lying every which way.
    const rr = Math.pow(random(), 0.75);
    x += Math.cos(a) * rr * 500;
    y += Math.sin(a) * rr * 270;
    angle = random() * Math.PI * 2;
  } else if (shape === 'spiral') {
    const radius = 0.18 + random() * 0.8;
    const spin = radius * Math.PI * 5;
    x += Math.cos(spin) * radius * 450 + (random() - 0.5) * 65;
    y += Math.sin(spin) * radius * 230 + (random() - 0.5) * 60;
    angle = spin + 0.7;
  } else {
    x = 150 + random() * 900;
    y = 130 + random() * 440;
    angle = random() * Math.PI * 2;
  }
  return { x, y, angle };
}

/** The look of the daily haystack: the same on every device on a given date, because `rng` is seeded from the date. */
export function dailyDef(rng: () => number): LevelDef {
  const world = 2 + Math.floor(rng() * 3);
  const size = WORLD_SIZE[world];
  return {
    n: 0,
    world,
    inWorld: 0,
    finale: false,
    shape: SHAPES[Math.floor(rng() * SHAPES.length)],
    tint: WORLDS[world].tint,
    size,
    dome: false,
    count: Math.min(10000, Math.round(Math.min(2100, 700 + 24 * 45) * size ** 2 * (1 + world * 0.08))),
    slots: 3,
    night: rng() < 0.25,
    decoys: rng() < 0.5 ? 1 : 0,
    hidden: 0.9,
    depth: [0.35, 0.65],
    needle: 0.6,
    cover: false,
  };
}