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

/** Places and outings: mostly two-word phrases, less obvious topics. */
const WORLD_3 = (): Topic[] => [
  topic('At the Zoo', ['SEA LION', 'POLAR BEAR', 'PETTING ZOO', 'GORILLA', 'HIPPO'], ['REPTILE HOUSE', 'KOALA', 'ZOOKEEPER']),
  topic('Museum', ['DINOSAUR', 'MUMMY', 'STATUE', 'PAINTING', 'FOSSIL'], ['MAMMOTH', 'EXHIBIT', 'SCULPTURE']),
  topic('Airport', ['SUITCASE', 'PASSPORT', 'BOARDING PASS', 'RUNWAY', 'TICKET'], ['JET LAG', 'BAGGAGE', 'TERMINAL']),
  topic('Beach Day', ['SUNSCREEN', 'BEACH TOWEL', 'SEASHELL', 'LIFEGUARD', 'WAVES'], ['SANDCASTLE', 'FLIP FLOPS', 'SURFBOARD']),
  topic('Big City', ['SKYSCRAPER', 'SUBWAY', 'TAXI CAB', 'CROSSWALK', 'BRIDGE'], ['TRAFFIC LIGHT', 'SIDEWALK', 'ELEVATOR']),
  topic('National Park', ['GEYSER', 'CAMPGROUND', 'HIKING TRAIL', 'RANGER', 'CANYON'], ['BISON', 'VISITOR CENTER', 'PICNIC TABLE']),
  topic('Theme Park', ['ROLLER COASTER', 'FERRIS WHEEL', 'BUMPER CARS', 'COTTON CANDY', 'CAROUSEL'], ['LOG FLUME', 'FUNNEL CAKE', 'WATER SLIDE']),
  topic('Landmarks', ['STATUE OF LIBERTY', 'GRAND CANYON', 'EIFFEL TOWER', 'BIG BEN', 'MOUNT RUSHMORE'], ['GOLDEN GATE BRIDGE', 'GREAT WALL', 'PYRAMIDS']),
  topic('Road Trip', ['GAS STATION', 'ROAD MAP', 'MOTEL', 'BILLBOARD', 'HIGHWAY'], ['REST STOP', 'SNACKS', 'CAR WASH']),
  topic('Farmers Market', ['APPLE CIDER', 'FRESH EGGS', 'PUMPKIN', 'HONEY', 'BAKED GOODS'], ['MAPLE SYRUP', 'ZUCCHINI', 'KALE']),
];

/** Rarer letters and tricky spelling: Q, X, Z, J and silent letters. */
const WORLD_4 = (): Topic[] => [
  topic('Human Body', ['HEART', 'LUNGS', 'SKULL', 'KNUCKLE', 'ELBOW'], ['KIDNEY', 'SPINE', 'STOMACH']),
  topic('Weather Lab', ['HURRICANE', 'HUMIDITY', 'DROUGHT', 'FORECAST', 'HAILSTORM'], ['BAROMETER', 'DRIZZLE', 'TYPHOON']),
  topic('Rocks', ['QUARTZ', 'CRYSTAL', 'GRANITE', 'MAGMA', 'GEODE'], ['MARBLE', 'LAVA', 'JADE']),
  topic('Inventions', ['TELEPHONE', 'LIGHT BULB', 'COMPUTER', 'MICROSCOPE', 'ZIPPER'], ['PRINTING PRESS', 'CAMERA', 'TELEVISION']),
  topic('Bugs', ['BEETLE', 'LADYBUG', 'GRASSHOPPER', 'MOSQUITO', 'WASP'], ['CATERPILLAR', 'ANT', 'CRICKET']),
  topic('Deep Sea', ['CORAL REEF', 'SUBMARINE', 'ANGLERFISH', 'PLANKTON', 'SQUID'], ['STINGRAY', 'KELP', 'SEA URCHIN']),
  topic('Chemistry', ['OXYGEN', 'HYDROGEN', 'MOLECULE', 'BEAKER', 'ACID'], ['ELEMENT', 'LIQUID', 'VAPOR']),
  topic('Dinosaurs', ['TRICERATOPS', 'STEGOSAURUS', 'RAPTOR', 'JURASSIC', 'T-REX'], ['PTERODACTYL', 'BRONTOSAURUS', 'VELOCIRAPTOR']),
  topic('Energy', ['SOLAR PANEL', 'WINDMILL', 'ELECTRICITY', 'MAGNET', 'VOLTAGE'], ['BATTERY', 'GENERATOR', 'FUEL']),
  topic('Odd Animals', ['PLATYPUS', 'AXOLOTL', 'ARMADILLO', 'CHAMELEON', 'SLOTH'], ['NARWHAL', 'YAK', 'OKAPI']),
];

/** Stories and legends: longer phrases and names to recall. */
const WORLD_5 = (): Topic[] => [
  topic('Fairy Tales', ['CINDERELLA', 'SNOW WHITE', 'RAPUNZEL', 'SLEEPING BEAUTY', 'GOLDILOCKS'], ['THREE LITTLE PIGS', 'HANSEL AND GRETEL', 'LITTLE RED RIDING HOOD']),
  topic('Castle', ['DRAGON', 'KNIGHT', 'PRINCESS', 'DRAWBRIDGE', 'MOAT'], ['THRONE', 'TOWER', 'JESTER']),
  topic('Nursery Rhymes', ['HUMPTY DUMPTY', 'JACK AND JILL', 'LITTLE BO PEEP', 'OLD MOTHER HUBBARD', 'BAA BAA BLACK SHEEP'], ['HICKORY DICKORY DOCK', 'MARY HAD A LITTLE LAMB', 'ROW ROW ROW YOUR BOAT']),
  topic('Magic', ['WIZARD', 'MAGIC WAND', 'SPELL BOOK', 'POTION', 'CRYSTAL BALL'], ['UNICORN', 'FAIRY DUST', 'CAULDRON']),
  topic('Pirates', ['TREASURE CHEST', 'PIRATE SHIP', 'EYE PATCH', 'CAPTAIN', 'WALK THE PLANK'], ['CANNON', 'ANCHOR', 'JOLLY ROGER']),
  topic('Classic Tales', ['ROBIN HOOD', 'PETER PAN', 'ALICE IN WONDERLAND', 'TREASURE ISLAND', 'PINOCCHIO'], ['THE JUNGLE BOOK', 'OLIVER TWIST', 'BLACK BEAUTY']),
  topic('Myths', ['MERMAID', 'GIANT', 'TROLL', 'PHOENIX', 'CENTAUR'], ['GRIFFIN', 'CYCLOPS', 'MINOTAUR']),
  topic('Heroes', ['CAPE', 'MASK', 'SECRET IDENTITY', 'SUPERPOWER', 'SIDEKICK'], ['HERO', 'VILLAIN', 'X-RAY VISION']),
  topic('Book Words', ['CHAPTER', 'BOOKMARK', 'AUTHOR', 'LIBRARY CARD', 'PLOT TWIST'], ['HAPPY ENDING', 'ONCE UPON A TIME', 'PAPERBACK']),
  topic('Spooky Stories', ['HAUNTED HOUSE', 'GHOST', 'WEREWOLF', 'VAMPIRE', 'ZOMBIE'], ['SKELETON', 'BLACK CAT', 'FULL MOON']),
];

/** Sayings and idioms: full phrases behind vaguer clues. */
const WORLD_6 = (): Topic[] => [
  topic('Weather Sayings', ['RAINING CATS AND DOGS', 'CALM BEFORE THE STORM', 'STEAL MY THUNDER', 'UNDER THE WEATHER', 'ON CLOUD NINE'], ['A BREEZE', 'IT NEVER RAINS BUT IT POURS', 'EVERY CLOUD HAS A SILVER LINING']),
  topic('Animal Sayings', ['HOLD YOUR HORSES', 'EARLY BIRD', 'BUSY AS A BEE', 'THE ELEPHANT IN THE ROOM', 'WHEN PIGS FLY'], ['CAT GOT YOUR TONGUE', "LION'S SHARE", 'RAT RACE']),
  topic('Food Sayings', ['PIECE OF CAKE', 'EASY AS PIE', 'SPILL THE BEANS', 'APPLE OF MY EYE', 'BIG CHEESE'], ['TOUGH COOKIE', 'COOL AS A CUCUMBER', 'IN A NUTSHELL']),
  topic('Time Sayings', ['TIME FLIES', 'BETTER LATE THAN NEVER', 'IN THE NICK OF TIME', 'ONCE IN A BLUE MOON', 'AROUND THE CLOCK'], ['CALL IT A DAY', 'BEAT THE CLOCK', 'AT THE ELEVENTH HOUR']),
  topic('Body Sayings', ['BREAK A LEG', 'COLD FEET', 'COST AN ARM AND A LEG', 'ALL EARS', 'KEEP AN EYE ON IT'], ['LEND A HAND', 'TONGUE-TIED', 'SHOULDER TO CRY ON']),
  topic('Money Sayings', ['MONEY TALKS', 'PENNY FOR YOUR THOUGHTS', 'BREAK THE BANK', 'WORTH EVERY PENNY', 'ON A BUDGET'], ['PAY IT FORWARD', 'NEST EGG', 'BANG FOR YOUR BUCK']),
  topic('Famous Pairs', ['SALT AND PEPPER', 'PEANUT BUTTER AND JELLY', 'MILK AND COOKIES', 'SOCKS AND SHOES', 'THUNDER AND LIGHTNING'], ['BREAD AND BUTTER', 'ROCK AND ROLL', 'SUN AND MOON']),
  topic('Proverbs', ['PRACTICE MAKES PERFECT', 'HONESTY IS THE BEST POLICY', 'LOOK BEFORE YOU LEAP', 'NO PLACE LIKE HOME', 'ACTIONS SPEAK LOUDER THAN WORDS'], ['TWO HEADS ARE BETTER THAN ONE', 'SLOW AND STEADY WINS THE RACE', 'BETTER SAFE THAN SORRY']),
  topic('Tricky Spelling', ['RHYTHM', 'QUEUE', 'JUKEBOX', 'BUZZWORD', 'WALTZ'], ['JINX', 'QUIZ', 'ZIGZAG']),
  topic('Graduation', ['CAP AND GOWN', 'DIPLOMA', 'YEARBOOK', 'VALEDICTORIAN', 'HONOR ROLL'], ['COMMENCEMENT', 'SCHOLARSHIP', 'CLASS PHOTO']),
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
  {
    id: 'field-trip', name: 'Field Trip', blurb: 'Out of the classroom: places, rides and famous sights.',
    board: '#36452f', levels: WORLD_3(),
  },
  {
    id: 'science-class', name: 'Science Class', blurb: 'Tricky spelling and rare letters. Think Q, X and Z.',
    board: '#24414a', levels: WORLD_4(),
  },
  {
    id: 'library', name: 'Library', blurb: 'Fairy tales, legends and story-time phrases.',
    board: '#3a3346', levels: WORLD_5(),
  },
  {
    id: 'final-exam', name: 'Final Exam', blurb: 'Sayings and idioms. The toughest test in school.',
    board: '#3a302b', levels: WORLD_6(),
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
