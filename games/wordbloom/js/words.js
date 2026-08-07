/**
 * Curated word list for Wordbloom. Hand-picked rather than pulled from a
 * giant dictionary: every word here is common and unambiguous.
 *
 * Organized by length for quick lookups when generating/verifying levels.
 */

export const WORDS_BY_LENGTH = {
  3: [
    'CAT','DOG','SUN','RUN','BAT','HAT','MAP','CUP','BUS','JAR',
    'PEN','BOX','KEY','LEG','ARM','EAR','EYE','ICE','JAM','LOG',
    'MUD','NET','OAK','OWL','PIE','RAT','RIB','SAD','SIT','SKY',
    'TEA','TOP','VAN','WEB','WIN','YES','ZOO','AGE','AIR','ANT',
    'BAG','BED','BEE','BIG','BUG','CAB','CAP','CAR','COW','CRY',
    'CUT','DIG','EGG','FAN','FIG','FIN','FIT','FOG','FOX','FUN',
    'GAS','GEM','GUN','GYM','HEN','HOP','HOT','HUG','HUT','JET',
    'INK','JOG','JOY','KID','KIT','LAB','LAP','LID','LIP','LOT',
    'MAT','MIX','MOB','MOP','MUG','NUT','OIL','ONE','OWE','PAD',
    'PAN','PAW','PIG','PIN','POT','RAG','RAM','RAY','RED','RIM',
    'ROB','ROD','ROW','RUB','RUG','SAW','SEA','SET','SIP','SIX',
    'SUM','TAB','TAG','TAN','TAP','TEN','TIE','TIN','TOE','TON',
    'TOY','TUB','TUG','VAT','VET','WAG','WAX','WET','WIG','WIT',
    'ZIP','ZAP',
  ],
  4: [
    'FISH','BIRD','TREE','BOOK','LAMP','DOOR','MOON','STAR','RAIN','SNOW',
    'WIND','FIRE','ROCK','SAND','LEAF','SEED','ROOT','VINE','WAVE','LAKE',
    'HILL','PATH','GATE','WALL','ROOF','DESK','SOFA',
    'CAKE','MILK','SOUP','RICE','MEAT','BEAN','CORN','LIME','PLUM',
    'BEAR','WOLF','DEER','GOAT','DUCK','FROG','CRAB','SEAL','SWAN','HAWK',
    'GOLD','JADE','RUBY','IRON','COAL','CLAY','SILK','WOOL','ROPE','WIRE',
    'BALL','BELL','BOAT','CARD','COIN','DOLL','DRUM','FLAG','GIFT',
    'HORN','KITE','LOCK','MASK','NAIL','PIPE','RING','SAIL','SHOE','SPIN',
    'BAKE','CALL','DRAW','DROP','FALL','FEEL','FIND',
    'GIVE','GROW','HELP','HOLD','HOPE','JUMP','KEEP','KICK','KNOW','LAND',
    'LAST','LEAD','LIFT','LIVE','LOOK','LOSE','LOVE','MAKE','MOVE','OPEN',
    'PASS','PICK','PLAY','PULL','PUSH','RACE','READ','REST','RIDE',
    'RISE','ROLL','RUSH','SEND','SHOW','SING','STAY',
    'STOP','SWIM','TAKE','TALK','TELL','TURN','WAIT','WALK','WANT','WASH',
    'WEAR','WISH','WORK',
  ],
  5: [
    'APPLE','BEACH','BREAD','BRUSH','CANDY','CHAIR','CHESS','CLOUD','CRAFT','CROWN',
    'DANCE','DIARY','DREAM','EARTH','FENCE','FLAME','FLOUR','FORCE','FRUIT','GHOST',
    'GRAPE','GRASS','HEART','HONEY','HORSE','HOUSE','JUICE','LEMON','LIGHT','MAGIC',
    'MONEY','MONTH','MOUSE','MUSIC','NIGHT','NURSE','OCEAN','PAINT','PANEL','PAPER',
    'PARTY','PEACE','PHONE','PIANO','PIZZA','PLANE','PLANT','PLATE','POINT','POUND',
    'QUEEN','QUIET','RADIO','RIVER','ROBOT','ROUND','SCALE','SHARK','SHEEP','SHINE',
    'SHIRT','SHOCK','SMILE','SMOKE','SNAKE','SOUND','SPACE','SPARK','SPEAK','SPOON',
    'STAGE','STEAM','STICK','STONE','STORM','STORY','SUGAR','SWEET','SWORD',
    'TABLE','TASTE','TEETH','THINK','TIGER','TITLE','TOAST','TOUCH','TOWEL','TOWER',
    'TRACK','TRAIN','TRUCK','TRUTH','UNCLE','VOICE','WATCH','WATER','WHALE','WHEEL',
    'WORLD','WORTH','YOUTH','ZEBRA','FLOOR','CLOCK','DRINK','SLEEP','ARROW','ORBIT',
  ],
  6: [
    'ANIMAL','BASKET','BATTLE','BEAUTY','BOTTLE','BRANCH','BRIDGE','BUTTON','CAMERA',
    'CANDLE','CASTLE','CIRCLE','CIRCUS','COFFEE','COOKIE','CORNER','COTTON','COUNTY','COUPLE',
    'DESERT','DINNER','DOCTOR','DRAGON','ENERGY','ENGINE','FAMILY','FLOWER','FOREST','FRIEND',
    'GARDEN','GOLDEN','GUITAR','HAMMER','HELMET','ISLAND','JACKET','JUNGLE','KETTLE','KITTEN',
    'LADDER','LEGEND','LETTER','MARKET','MEMORY','MIRROR','MODULE','MONKEY','MOTHER','MOTION',
    'MUSEUM','NATURE','NUMBER','ORANGE','PACKET','PENCIL','PLANET','POCKET','POTATO',
    'PUZZLE','RABBIT','RECORD','RIBBON','ROCKET','SADDLE','SCHOOL','SEASON','SECRET',
    'SILVER','SISTER','SPIRIT','SPRING','SQUARE','STREAM','SUMMER','SUNSET','TEMPLE','TICKET',
    'TOMATO','TUNNEL','TURTLE','VALLEY','VOYAGE','WALNUT','WINDOW','WINTER','YELLOW',
  ],
};

// Flatten with metadata for quick length lookups
export const ALL_WORDS = Object.entries(WORDS_BY_LENGTH).flatMap(([len, list]) =>
  list.map((w) => ({ word: w, len: Number(len) }))
);
