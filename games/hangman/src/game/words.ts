/**
 * Hangman content: hand-picked US English words and phrases, each with a
 * category clue. Levels are fixed lists per world (ordered by difficulty at
 * load); Endless draws from everything.
 *
 * Only A-Z are guessed. Spaces, apostrophes and hyphens are shown from the
 * start, so the shape of a phrase is part of the clue.
 */

export interface Entry {
  /** Upper case, A-Z plus space / ' / - */
  text: string;
  category: string;
}

export interface World {
  id: string;
  name: string;
  /** One-line flavour shown on the level map. */
  blurb: string;
  /** Board colour (chalkboard tint) for this world. */
  board: string;
  levels: Entry[];
}

const e = (category: string, ...texts: string[]): Entry[] => texts.map((text) => ({ text, category }));

// ---------------------------------------------------------------- worlds

const WORLD_1: Entry[] = [
  ...e('Fruit', 'APPLE', 'BANANA'),
  ...e('Animals', 'TIGER', 'MONKEY'),
  ...e('Around the House', 'WINDOW'),
  ...e('Weather', 'RAINBOW'),
  ...e('School', 'PENCIL'),
  ...e('Transportation', 'TRAIN'),
  ...e('Colors', 'ORANGE'),
  ...e('Jobs', 'DOCTOR'),
];

const WORLD_2: Entry[] = [
  ...e('Animals', 'BUTTERFLY'),
  ...e('Desserts', 'ICE CREAM'),
  ...e('Plants', 'SUNFLOWER'),
  ...e('Food', 'HOT DOG'),
  ...e('Sports', 'BASKETBALL'),
  ...e('Transportation', 'FIRE TRUCK'),
  ...e('Party Time', 'BIRTHDAY CAKE'),
  ...e('Adventure', 'TREASURE MAP'),
  ...e('Winter', 'SNOWMAN'),
  ...e('Greetings', 'GOOD MORNING'),
];

// ---------------------------------------------------------------- endless pool

const POOL: Entry[] = [
  ...e('Animals', 'ELEPHANT', 'GIRAFFE', 'PENGUIN', 'KANGAROO', 'DOLPHIN', 'RABBIT', 'TURTLE', 'ZEBRA',
    'OWL', 'FOX', 'BEAR', 'HORSE', 'SQUIRREL', 'OCTOPUS', 'PANDA', 'KOALA', 'LION', 'CAMEL', 'PARROT',
    'HAMSTER', 'LOBSTER', 'JELLYFISH', 'HEDGEHOG', 'RACCOON', 'FLAMINGO', 'CHEETAH', 'GORILLA',
    'WALRUS', 'BEAVER', 'PEACOCK'),
  ...e('Fruit', 'CHERRY', 'GRAPE', 'LEMON', 'MANGO', 'PEACH', 'PEAR', 'PLUM', 'KIWI', 'PINEAPPLE',
    'STRAWBERRY', 'BLUEBERRY', 'WATERMELON', 'COCONUT', 'APRICOT', 'RASPBERRY'),
  ...e('Food', 'SANDWICH', 'PANCAKE', 'SPAGHETTI', 'BURRITO', 'POPCORN', 'PRETZEL', 'WAFFLE', 'MUFFIN',
    'CHEESE', 'BURGER', 'TACO', 'NOODLES', 'OMELET', 'BAGEL', 'CUPCAKE', 'COOKIE', 'BROWNIE', 'CEREAL',
    'YOGURT', 'KETCHUP'),
  ...e('Jobs', 'TEACHER', 'FARMER', 'PILOT', 'NURSE', 'CHEF', 'BAKER', 'DENTIST', 'PLUMBER',
    'FIREFIGHTER', 'ASTRONAUT', 'LIBRARIAN', 'MECHANIC', 'CARPENTER', 'JOURNALIST', 'MUSICIAN', 'ARCHITECT'),
  ...e('School', 'NOTEBOOK', 'ERASER', 'BACKPACK', 'CRAYON', 'RULER', 'SCISSORS', 'CALCULATOR',
    'HOMEWORK', 'ALPHABET', 'LIBRARY', 'CLASSROOM', 'CHALKBOARD', 'GLOBE', 'MARKER', 'LUNCHBOX'),
  ...e('Sports', 'SOCCER', 'TENNIS', 'BASEBALL', 'HOCKEY', 'GOLF', 'SWIMMING', 'VOLLEYBALL', 'BOWLING',
    'SKATEBOARD', 'KARATE', 'CYCLING', 'ARCHERY', 'SURFING', 'BADMINTON', 'GYMNASTICS'),
  ...e('Transportation', 'BICYCLE', 'AIRPLANE', 'SUBMARINE', 'HELICOPTER', 'SAILBOAT', 'TRACTOR',
    'SCOOTER', 'ROCKET', 'TAXI', 'BUS', 'CANOE', 'MOTORCYCLE', 'AMBULANCE', 'SPACESHIP'),
  ...e('Nature', 'THUNDER', 'VOLCANO', 'WATERFALL', 'MOUNTAIN', 'RIVER', 'ISLAND', 'DESERT', 'FOREST',
    'TORNADO', 'BLIZZARD', 'GLACIER', 'CANYON', 'MEADOW', 'LIGHTNING', 'SUNSET'),
  ...e('Around the House', 'KITCHEN', 'PILLOW', 'BLANKET', 'CANDLE', 'LADDER', 'TOASTER', 'MIRROR',
    'CURTAIN', 'BATHTUB', 'FREEZER', 'SOFA', 'LAMP', 'DOORBELL', 'BOOKSHELF'),
  ...e('Music', 'GUITAR', 'PIANO', 'VIOLIN', 'TRUMPET', 'DRUMS', 'FLUTE', 'TROMBONE', 'HARMONICA',
    'ORCHESTRA', 'MELODY', 'CONCERT', 'BANJO', 'XYLOPHONE', 'SAXOPHONE'),
  ...e('Space', 'PLANET', 'COMET', 'GALAXY', 'ASTEROID', 'TELESCOPE', 'SATELLITE', 'JUPITER', 'SATURN',
    'METEOR', 'NEBULA', 'ORBIT', 'MOONLIGHT'),
  ...e('Colors', 'PURPLE', 'YELLOW', 'SILVER', 'TURQUOISE', 'MAGENTA', 'CRIMSON', 'LAVENDER', 'MAROON',
    'BEIGE', 'EMERALD'),
  ...e('Common Sayings', 'BREAK THE ICE', 'PIECE OF CAKE', 'TIME FLIES', 'BETTER LATE THAN NEVER',
    'ONCE IN A BLUE MOON', 'HIT THE ROAD', 'UNDER THE WEATHER', 'ON CLOUD NINE', 'SPILL THE BEANS',
    'COLD FEET', 'BACK TO SQUARE ONE', 'EASY AS PIE', 'PRACTICE MAKES PERFECT', 'CALL IT A DAY',
    'HOLD YOUR HORSES', 'IN THE SAME BOAT', 'TAKE IT EASY', 'BEST OF BOTH WORLDS'),
  ...e('Food and Drink', 'APPLE PIE', 'FRENCH FRIES', 'PEANUT BUTTER', 'ORANGE JUICE', 'HOT CHOCOLATE',
    'CHOCOLATE CHIP', 'GRILLED CHEESE', 'MAC AND CHEESE', 'FRUIT SALAD', 'CORN ON THE COB'),
  ...e('Places', 'TOWN HALL', 'MOVIE THEATER', 'POST OFFICE', 'CANDY SHOP', 'FIRE STATION',
    'AMUSEMENT PARK', 'PLAYGROUND', 'AQUARIUM', 'MUSEUM', 'BAKERY', 'HOSPITAL', 'AIRPORT'),
  ...e('Fun and Games', 'BIRTHDAY PARTY', 'SUMMER VACATION', 'ROLLER COASTER', 'BEACH BALL',
    'SAND CASTLE', 'CAMPFIRE', 'FIREWORKS', 'PICNIC BASKET', 'MAGIC TRICK', 'HIDE AND SEEK',
    'TREASURE HUNT', 'BOARD GAME', 'JIGSAW PUZZLE'),
  ...e('Greetings', 'HAPPY BIRTHDAY', 'THANK YOU', 'SEE YOU LATER', 'GOOD NIGHT', 'NICE TO MEET YOU',
    'WELCOME HOME'),
];

// ---------------------------------------------------------------- difficulty

/** Roughly how often each letter turns up in English, most common first:
 *  the order a typical player tries letters in. */
const GUESS_ORDER = 'EAIOTNSRLHDCUMPGBYFWKVXZJQ';

/** Unique guessable letters in an entry. */
export function lettersOf(text: string): Set<string> {
  return new Set(text.replace(/[^A-Z]/g, ''));
}

/**
 * Difficulty = misses a player makes guessing in GUESS_ORDER until every
 * letter is found. Rare letters (JAZZ, LYNX) push it up; long phrases full of
 * common letters stay low. It is a relative score, used only for ordering.
 */
export function difficulty(text: string): number {
  const need = lettersOf(text);
  let left = need.size;
  let misses = 0;
  for (const ch of GUESS_ORDER) {
    if (!left) break;
    if (need.has(ch)) left--; else misses++;
  }
  return misses;
}

const byDifficulty = (a: Entry, b: Entry) => difficulty(a.text) - difficulty(b.text) || a.text.localeCompare(b.text);

export const WORLDS: World[] = [
  {
    id: 'first-lesson', name: 'First Lesson', blurb: 'Everyday words to warm up your chalk.',
    board: '#2f4b3c', levels: [...WORLD_1].sort(byDifficulty),
  },
  {
    id: 'recess', name: 'Recess', blurb: 'Longer words and your first phrases.',
    board: '#2b3a48', levels: [...WORLD_2].sort(byDifficulty),
  },
];

export interface LevelRef { index: number; world: number; worldLevel: number; entry: Entry; }

export const LEVELS: LevelRef[] = WORLDS.flatMap((w, wi) =>
  w.levels.map((entry, li) => ({ index: 0, world: wi, worldLevel: li, entry })),
).map((l, i) => ({ ...l, index: i }));

export const TOTAL_LEVELS = LEVELS.length;

const LEVEL_TEXTS = new Set(LEVELS.map((l) => l.entry.text));

/** Everything playable in Endless, easiest first. */
export const ENDLESS_POOL: Entry[] = [...POOL, ...WORLD_1, ...WORLD_2]
  .filter((x, i, all) => all.findIndex((y) => y.text === x.text) === i)
  .sort(byDifficulty);

/**
 * A fresh entry close in difficulty to a level the player just lost, so
 * "Try another word" never replays an answer they've already seen.
 */
export function replacementFor(level: Entry, seen: Set<string>): Entry {
  const phrase = level.text.includes(' ');
  const target = difficulty(level.text);
  const options = POOL.filter((x) => !LEVEL_TEXTS.has(x.text) && !seen.has(x.text) && x.text.includes(' ') === phrase);
  const pick = (options.length ? options : POOL)
    .map((x) => ({ x, d: Math.abs(difficulty(x.text) - target) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 5);
  return pick[Math.floor(Math.random() * pick.length)].x;
}
