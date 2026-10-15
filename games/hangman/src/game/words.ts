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

/** A level: one topic, five words (easiest first), plus spares that stand in
 *  for a word the player lost, so a retry never shows a known answer. */
export interface Topic {
  name: string;
  words: Entry[];
  spares: Entry[];
}

export interface World {
  id: string;
  name: string;
  /** One-line flavour shown on the level map. */
  blurb: string;
  /** Board colour (chalkboard tint) for this world. */
  board: string;
  levels: Topic[];
}

export const WORDS_PER_LEVEL = 5;

const e = (category: string, ...texts: string[]): Entry[] => texts.map((text) => ({ text, category }));

/** Five words and their spares; the five are sorted so the last is hardest. */
const topic = (name: string, words: string[], spares: string[]): Topic => ({
  name,
  words: e(name, ...words).sort(byDifficulty),
  spares: e(name, ...spares),
});

// ---------------------------------------------------------------- worlds

const WORLD_1 = (): Topic[] => [
  topic('Fruit', ['APPLE', 'BANANA', 'ORANGE', 'GRAPE', 'LEMON'], ['CHERRY', 'PEACH', 'MANGO']),
  topic('Animals', ['TIGER', 'MONKEY', 'ZEBRA', 'LION', 'HORSE'], ['RABBIT', 'PANDA', 'BEAR']),
  topic('Colors', ['PURPLE', 'YELLOW', 'GREEN', 'SILVER', 'BROWN'], ['PINK', 'BLACK', 'WHITE']),
  topic('Weather', ['RAINBOW', 'THUNDER', 'CLOUDY', 'SUNNY', 'STORM'], ['WINDY', 'FOGGY', 'SNOW']),
  topic('School', ['PENCIL', 'ERASER', 'RULER', 'CRAYON', 'NOTEBOOK'], ['BACKPACK', 'MARKER', 'GLUE']),
  topic('At Home', ['WINDOW', 'KITCHEN', 'PILLOW', 'LAMP', 'SOFA'], ['MIRROR', 'CANDLE', 'DOOR']),
  topic('Farm', ['TRACTOR', 'CHICKEN', 'BARN', 'COW', 'PIG'], ['GOAT', 'SHEEP', 'DUCK']),
  topic('Vegetables', ['CARROT', 'POTATO', 'TOMATO', 'ONION', 'PEPPER'], ['BROCCOLI', 'CELERY', 'PEAS']),
  topic('Toys', ['DOLL', 'KITE', 'BALLOON', 'ROBOT', 'YO-YO'], ['BLOCKS', 'MARBLES', 'PUZZLE']),
  topic('Breakfast', ['PANCAKE', 'WAFFLE', 'CEREAL', 'TOAST', 'BACON'], ['MUFFIN', 'YOGURT', 'OATMEAL']),
];

const WORLD_2 = (): Topic[] => [
  topic('Flowers', ['ROSE', 'TULIP', 'DAISY', 'SUNFLOWER', 'LILY'], ['ORCHID', 'DAFFODIL', 'POPPY']),
  topic('Sports', ['SOCCER', 'TENNIS', 'BASEBALL', 'HOCKEY', 'GOLF'], ['BASKETBALL', 'BOWLING', 'KARATE']),
  topic('Desserts', ['ICE CREAM', 'APPLE PIE', 'CUPCAKE', 'BROWNIE', 'FUDGE'], ['CHEESECAKE', 'PUDDING', 'COOKIE']),
  topic('Music', ['GUITAR', 'PIANO', 'VIOLIN', 'TRUMPET', 'DRUMS'], ['FLUTE', 'BANJO', 'XYLOPHONE']),
  topic('Ocean', ['DOLPHIN', 'OCTOPUS', 'JELLYFISH', 'WHALE', 'SHARK'], ['STARFISH', 'CRAB', 'SEAHORSE']),
  topic('Jobs', ['DOCTOR', 'TEACHER', 'FIREFIGHTER', 'PILOT', 'CHEF'], ['NURSE', 'FARMER', 'DENTIST']),
  topic('Space', ['PLANET', 'ROCKET', 'COMET', 'GALAXY', 'ASTRONAUT'], ['MOON', 'STAR', 'METEOR']),
  topic('Birds', ['OWL', 'EAGLE', 'PARROT', 'PENGUIN', 'FLAMINGO'], ['ROBIN', 'PEACOCK', 'SWAN']),
  topic('Party Time', ['BIRTHDAY CAKE', 'BALLOONS', 'PRESENTS', 'PARTY HAT', 'CONFETTI'], ['CANDLES', 'GAMES', 'MUSIC']),
  topic('Camping', ['CAMPFIRE', 'TENT', 'FLASHLIGHT', 'MARSHMALLOW', 'SLEEPING BAG'], ['HIKING', 'LANTERN', 'COMPASS']),
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
    board: '#2f4b3c', levels: WORLD_1(),
  },
  {
    id: 'recess', name: 'Recess', blurb: 'Longer words and your first phrases.',
    board: '#2b3a48', levels: WORLD_2(),
  },
];

export interface LevelRef { index: number; world: number; worldLevel: number; topic: Topic; }

export const LEVELS: LevelRef[] = WORLDS.flatMap((w, wi) =>
  w.levels.map((topic, li) => ({ index: 0, world: wi, worldLevel: li, topic })),
).map((l, i) => ({ ...l, index: i }));

export const TOTAL_LEVELS = LEVELS.length;

/** Everything playable in Endless, easiest first. */
export const ENDLESS_POOL: Entry[] = [...POOL, ...LEVELS.flatMap((l) => [...l.topic.words, ...l.topic.spares])]
  .filter((x, i, all) => all.findIndex((y) => y.text === x.text) === i)
  .sort(byDifficulty);

/**
 * Stand-in for a word the player lost: an unseen word from the same topic,
 * the closest in difficulty.
 */
export function replacementFor(topic: Topic, lost: Entry, seen: Set<string>): Entry | null {
  const target = difficulty(lost.text);
  const inTopic = new Set(topic.words.map((w) => w.text));
  // Spares first, then Endless words filed under the same topic name.
  let options = topic.spares.filter((x) => !seen.has(x.text));
  if (!options.length) options = POOL.filter((x) => x.category === topic.name && !seen.has(x.text) && !inTopic.has(x.text));
  // Everything has been seen this session: reuse a spare (never the word just lost).
  if (!options.length) options = topic.spares.filter((x) => x.text !== lost.text);
  if (!options.length) return null;
  return [...options].sort((a, b) => Math.abs(difficulty(a.text) - target) - Math.abs(difficulty(b.text) - target))[0];
}

/** Level stars from the misses across all five words; help caps it at 2. */
export function levelStars(totalMisses: number, helped: boolean): number {
  const raw = totalMisses <= 2 ? 3 : totalMisses <= 6 ? 2 : 1;
  return helped ? Math.min(2, raw) : raw;
}
