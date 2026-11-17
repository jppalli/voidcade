// ORACLE: the original game's engine, copied verbatim from the pre-rewrite CommonThread.html
// (lines 452-2061 of the prettified script). Used only by tests to prove the new engine behaves identically.
var B = [
  {
    n: 1,
    board: 3,
    mu: 2,
    teaches: "Tutorial: start a set, add cards, stack, draw",
    sets: [
      { cat: "days", n: 3 },
      { cat: "pasta", n: 3 },
      { cat: "beach", n: 3 },
    ],
  },
  {
    n: 2,
    board: 3,
    mu: 1.8,
    teaches: "Five sets share three slots",
    sets: [
      { cat: "breakfast", n: 4 },
      { cat: "trees", n: 4 },
      { cat: "chess", n: 3 },
      { cat: "birthday", n: 4 },
      { cat: "blues", n: 3 },
    ],
  },
  {
    n: 3,
    board: 4,
    mu: 1.7,
    teaches: "The full 4x4 table; stack to save moves",
    sets: [
      { cat: "baking", n: 5 },
      { cat: "birds", n: 6 },
      { cat: "office", n: 4 },
      { cat: "golf", n: 5 },
      { cat: "time", n: 4 },
      { cat: "hats", n: 5 },
      { cat: "mountains", n: 4 },
    ],
  },
  {
    n: 4,
    board: 4,
    mu: 1.65,
    teaches: "Picture cards",
    sets: [
      { cat: "fruit", n: 5 },
      { cat: "sealife", n: 5 },
      { cat: "kitchen", n: 5 },
      { cat: "theater", n: 5 },
      { cat: "dogs", n: 5 },
      { cat: "furniture", n: 5 },
      { cat: "planets", n: 6 },
      { cat: "writing", n: 4 },
    ],
  },
  {
    n: 5,
    board: 4,
    mu: 1.6,
    teaches: "Wild Thread unlocked",
    chest: !0,
    sets: [
      { cat: "weather", n: 6 },
      { cat: "cheese", n: 6 },
      { cat: "castle", n: 5 },
      { cat: "camping", n: 5 },
      { cat: "jazz", n: 4 },
      { cat: "months", n: 5 },
      { cat: "tools", n: 5 },
      { cat: "poetry", n: 5 },
    ],
  },
  {
    n: 6,
    board: 4,
    mu: 1.65,
    teaches: "Breather: short sets",
    sets: [
      { cat: "hand", n: 4 },
      { cat: "shapes", n: 4 },
      { cat: "circus", n: 4 },
      { cat: "bank", n: 4 },
      { cat: "swimming", n: 4 },
      { cat: "ships", n: 4 },
      { cat: "gems", n: 4 },
      { cat: "money", n: 4 },
    ],
  },
  {
    n: 7,
    board: 4,
    mu: 1.55,
    teaches: "Close cousins: knitting vs sewing, coffee vs tea",
    sets: [
      { cat: "knitting", n: 6 },
      { cat: "sewing", n: 6 },
      { cat: "fabrics", n: 6 },
      { cat: "coffee", n: 5 },
      { cat: "teatime", n: 5 },
      { cat: "desserts", n: 6 },
      { cat: "herbs", n: 6 },
      { cat: "spices", n: 5 },
      { cat: "onthemove", n: 5 },
    ],
  },
  {
    n: 8,
    board: 4,
    mu: 1.5,
    teaches: "Double meanings: Bridge, Love, Trunk, Palm, Amazon",
    sets: [
      { cat: "cardgames", n: 6 },
      { cat: "tennis", n: 6 },
      { cat: "cars", n: 6 },
      { cat: "hand", n: 5 },
      { cat: "trees", n: 6 },
      { cat: "rivers", n: 6 },
      { cat: "flowers", n: 6 },
      { cat: "greek", n: 5 },
      { cat: "newspaper", n: 5 },
      { cat: "garden", n: 5 },
    ],
  },
  {
    n: 9,
    board: 4,
    mu: 1.5,
    teaches: "Deep sets of 7–8",
    sets: [
      { cat: "orchestra", n: 8 },
      { cat: "capitals", n: 8 },
      { cat: "desserts", n: 8 },
      { cat: "dance", n: 7 },
      { cat: "mystery", n: 7 },
      { cat: "space", n: 7 },
      { cat: "sealife", n: 6 },
      { cat: "school", n: 5 },
      { cat: "golf", n: 5 },
      { cat: "hotel", n: 5 },
    ],
  },
  {
    n: 10,
    board: 4,
    mu: 1.45,
    teaches: "Room milestone: 11 sets",
    chest: !0,
    sets: [
      { cat: "rooms", n: 6 },
      { cat: "furniture", n: 5 },
      { cat: "library", n: 6 },
      { cat: "painting", n: 6 },
      { cat: "photo", n: 5 },
      { cat: "fairytale", n: 6 },
      { cat: "castle", n: 6 },
      { cat: "wedding", n: 5 },
      { cat: "farm", n: 5 },
      { cat: "fruit", n: 6 },
      { cat: "weather", n: 5 },
    ],
  },
];
var Ct = [
  { n: 1, seed: 9020, par: 15, budget: 30 },
  { n: 2, seed: 24959, par: 37, budget: 67 },
  { n: 3, seed: 9222, par: 66, budget: 112 },
  { n: 4, seed: 9323, par: 82, budget: 135 },
  { n: 5, seed: 9424, par: 86, budget: 138 },
  { n: 6, seed: 1606, par: 68, budget: 112 },
  { n: 7, seed: 1707, par: 103, budget: 160 },
  { n: 8, seed: 9727, par: 118, budget: 177 },
  { n: 9, seed: 1909, par: 137, budget: 206 },
  { n: 10, seed: 2010, par: 167, budget: 242 },
];
var m = {
  startCoins: 500,
  startHints: 3,
  startWilds: 1,
  winBase: 50,
  dailyBase: 100,
  perMoveLeft: 2,
  freeUndosPerLevel: 3,
  undoCost: 100,
  hintCost: 150,
  wildCost: 300,
  rescueCost: 500,
  rescueMoves: 10,
  maxRescues: 5,
  archiveCost: 150,
  freeCoinsAd: 100,
  freeCoinsAdPerSession: 5,
  wildUnlockLevel: 5,
  streak: [
    { wins: 10, moves: 8, coinBonus: 0.25 },
    { wins: 5, moves: 5, coinBonus: 0.1 },
    { wins: 3, moves: 3, coinBonus: 0 },
  ],
  dailyChests: [
    { days: 7, label: "Bronze bundle", coins: 250, hints: 1, wilds: 1 },
    { days: 15, label: "Silver bundle", coins: 600, hints: 2, wilds: 1 },
    { days: 0, label: "Full Quilt", coins: 1500, hints: 2, wilds: 2 },
  ],
  interstitialCooldownSec: 180,
  rewardedGraceSec: 120,
  noInterstitialBeforeLevel: 4,
};
function ot(t) {
  return m.streak.find((e) => t >= e.wins) ?? null;
}
var mt = "commonthread.profile.v1",
  bt = "commonthread.session.v1";
function te() {
  return {
    v: 1,
    coins: m.startCoins,
    hints: m.startHints,
    wilds: m.startWilds,
    journeyLevel: 1,
    journeyStars: {},
    streak: 0,
    bestStreak: 0,
    daily: {},
    dailyChests: {},
    tutorialDone: !1,
    stats: { wins: 0, setsCleared: 0, biggestBatch: 0, gamesStarted: 0 },
    settings: {
      sfx: !0,
      music: !0,
      largePrint: !1,
      reducedMotion:
        typeof matchMedia < "u" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches,
      leftHanded: !1,
      reviewMode: !1,
    },
  };
}
function Tt(t) {
  try {
    return localStorage.getItem(t);
  } catch {
    return null;
  }
}
function it(t, e) {
  try {
    if (e === null) localStorage.removeItem(t);
    else localStorage.setItem(t, e);
  } catch {}
}
function Lt() {
  let t = Tt(mt),
    e = te();
  if (!t) return e;
  try {
    let s = JSON.parse(t);
    return {
      ...e,
      ...s,
      settings: { ...e.settings, ...(s.settings ?? {}) },
      stats: { ...e.stats, ...(s.stats ?? {}) },
    };
  } catch {
    return e;
  }
}
function Et(t) {
  it(mt, JSON.stringify(t));
}
function zt() {
  (it(mt, null), it(bt, null));
}
function at(t) {
  it(bt, t === null ? null : JSON.stringify(t));
}
function Bt() {
  let t = Tt(bt);
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}
function G(t = new Date()) {
  let e = String(t.getMonth() + 1).padStart(2, "0"),
    s = String(t.getDate()).padStart(2, "0");
  return `${t.getFullYear()}-${e}-${s}`;
}
var h = (t, e, s, o) => ({
    id: t,
    title: e,
    modality: "word",
    items: s,
    tags: o,
  }),
  U = (t, e, s) => ({ id: t, title: e, modality: "pic", items: s }),
  rt = [
    U("fruit", "Fruit", [
      "apple",
      "pear",
      "cherries",
      "banana",
      "lemon",
      "grapes",
    ]),
    U("weather", "Weather", [
      "sun",
      "cloud",
      "rain",
      "snowflake",
      "lightning",
      "rainbow",
    ]),
    U("sealife", "Sea Life", [
      "fish",
      "whale",
      "crab",
      "starfish",
      "shell",
      "octopus",
    ]),
    U("onthemove", "On the Move", [
      "car",
      "bicycle",
      "sailboat",
      "airplane",
      "train",
      "balloon",
    ]),
    U("garden", "In the Garden", [
      "tulip",
      "wateringcan",
      "leaf",
      "mushroom",
      "carrot",
      "snail",
    ]),
    h("baking", "Baking", [
      "Flour",
      "Yeast",
      "Whisk",
      "Oven",
      "Dough",
      "Rolling Pin",
      "Icing",
    ]),
    h("breakfast", "Breakfast", [
      "Toast",
      "Cereal",
      "Oatmeal",
      "Bacon",
      "Waffle",
      "Omelet",
    ]),
    h("coffee", "Coffee Shop", [
      "Latte",
      "Barista",
      "Mocha",
      "Espresso",
      "Muffin",
    ]),
    h("teatime", "Tea Time", [
      "Kettle",
      "Scone",
      "Saucer",
      "Teapot",
      "Biscuit",
    ]),
    h("pasta", "Pasta", [
      "Spaghetti",
      "Ravioli",
      "Penne",
      "Lasagna",
      "Macaroni",
      "Fettuccine",
    ]),
    h("cheese", "Cheese", [
      "Cheddar",
      "Brie",
      "Gouda",
      "Feta",
      "Parmesan",
      "Mozzarella",
      "Swiss",
    ]),
    h(
      "herbs",
      "Herbs",
      ["Basil", "Parsley", "Thyme", "Rosemary", "Mint", "Oregano", "Dill"],
      ["homograph"],
    ),
    h("spices", "Spices", [
      "Cinnamon",
      "Nutmeg",
      "Paprika",
      "Cumin",
      "Ginger",
      "Clove",
    ]),
    h("kitchen", "Kitchen", [
      "Spatula",
      "Colander",
      "Ladle",
      "Grater",
      "Skillet",
    ]),
    h("desserts", "Desserts", [
      "Pudding",
      "Sundae",
      "Brownie",
      "Cheesecake",
      "Custard",
      "Sorbet",
      "Fudge",
      "Tart",
    ]),
    h("diner", "Diner", [
      "Booth",
      "Jukebox",
      "Milkshake",
      "Menu",
      "Counter",
      "Blue Plate",
    ]),
    h("piano", "Piano", ["Keys", "Pedal", "Sonata", "Bench", "Concerto"]),
    h("orchestra", "Orchestra", [
      "Violin",
      "Cello",
      "Flute",
      "Oboe",
      "Harp",
      "Trombone",
      "Timpani",
      "Conductor",
    ]),
    h("jazz", "Jazz", ["Saxophone", "Swing", "Bebop", "Scat", "Improvise"]),
    h("dance", "Ballroom", [
      "Waltz",
      "Rumba",
      "Jive",
      "Quickstep",
      "Polka",
      "Cha-Cha",
      "Mambo",
    ]),
    h("theater", "Theater", [
      "Curtain",
      "Stage",
      "Usher",
      "Encore",
      "Matinee",
      "Rehearsal",
    ]),
    h("poetry", "Poetry", [
      "Rhyme",
      "Stanza",
      "Sonnet",
      "Verse",
      "Haiku",
      "Limerick",
    ]),
    h("library", "Library", [
      "Shelf",
      "Librarian",
      "Catalog",
      "Overdue",
      "Bookmark",
      "Index",
    ]),
    h(
      "newspaper",
      "Newspaper",
      ["Headline", "Editorial", "Crossword", "Column", "Obituary", "Byline"],
      ["homograph"],
    ),
    h("painting", "Painting", [
      "Easel",
      "Canvas",
      "Brush",
      "Watercolor",
      "Portrait",
      "Landscape",
      "Palette",
    ]),
    h("photo", "Photography", ["Lens", "Shutter", "Tripod", "Zoom", "Flash"]),
    h("mystery", "Mystery Novel", [
      "Detective",
      "Clue",
      "Suspect",
      "Alibi",
      "Motive",
      "Sleuth",
      "Butler",
    ]),
    h("fairytale", "Fairy Tales", [
      "Dragon",
      "Wizard",
      "Giant",
      "Princess",
      "Spell",
      "Goblin",
    ]),
    h("circus", "Circus", [
      "Clown",
      "Acrobat",
      "Juggler",
      "Ringmaster",
      "Trapeze",
      "Tightrope",
    ]),
    h("knitting", "Knitting", [
      "Yarn",
      "Needle",
      "Purl",
      "Stitch",
      "Scarf",
      "Mitten",
    ]),
    h("sewing", "Sewing", [
      "Thimble",
      "Bobbin",
      "Hem",
      "Seam",
      "Pattern",
      "Zipper",
      "Button",
    ]),
    h("fabrics", "Fabrics", [
      "Silk",
      "Velvet",
      "Denim",
      "Linen",
      "Wool",
      "Tweed",
      "Corduroy",
    ]),
    h("furniture", "Furniture", [
      "Sofa",
      "Armchair",
      "Dresser",
      "Bookcase",
      "Ottoman",
      "Recliner",
    ]),
    h("rooms", "Rooms", [
      "Attic",
      "Basement",
      "Pantry",
      "Den",
      "Hallway",
      "Porch",
      "Parlor",
    ]),
    h("tools", "Toolbox", [
      "Hammer",
      "Wrench",
      "Pliers",
      "Screwdriver",
      "Chisel",
      "Saw",
    ]),
    h("gardentools", "Garden Shed", [
      "Trowel",
      "Rake",
      "Hoe",
      "Shears",
      "Wheelbarrow",
    ]),
    h("writing", "Writing Desk", [
      "Pen",
      "Pencil",
      "Eraser",
      "Ink",
      "Notebook",
      "Envelope",
    ]),
    h("trees", "Trees", [
      "Oak",
      "Maple",
      "Birch",
      "Willow",
      "Cedar",
      "Pine",
      "Elm",
      "Spruce",
    ]),
    h(
      "birds",
      "Backyard Birds",
      [
        "Robin",
        "Sparrow",
        "Cardinal",
        "Heron",
        "Finch",
        "Wren",
        "Owl",
        "Bluejay",
      ],
      ["homograph"],
    ),
    h(
      "flowers",
      "Flowers",
      [
        "Rose",
        "Daisy",
        "Lily",
        "Orchid",
        "Peony",
        "Iris",
        "Marigold",
        "Daffodil",
      ],
      ["homograph"],
    ),
    h("dogs", "Dog Breeds", [
      "Beagle",
      "Poodle",
      "Collie",
      "Terrier",
      "Dachshund",
      "Labrador",
    ]),
    h("bigcats", "Big Cats", [
      "Lion",
      "Tiger",
      "Leopard",
      "Cheetah",
      "Jaguar",
      "Cougar",
    ]),
    h("farm", "Farm", ["Barn", "Tractor", "Silo", "Hay", "Rooster", "Pasture"]),
    h("camping", "Camping", [
      "Tent",
      "Lantern",
      "Campfire",
      "Sleeping Bag",
      "Compass",
      "Canoe",
    ]),
    h("beach", "Beach", [
      "Sand",
      "Towel",
      "Sunscreen",
      "Lifeguard",
      "Boardwalk",
      "Surf",
    ]),
    h("mountains", "Mountains", [
      "Summit",
      "Peak",
      "Ridge",
      "Glacier",
      "Valley",
      "Avalanche",
    ]),
    h(
      "ocean",
      "Ocean",
      ["Tide", "Wave", "Current", "Reef", "Harbor", "Lighthouse"],
      ["homograph"],
    ),
    h("space", "Outer Space", [
      "Comet",
      "Galaxy",
      "Orbit",
      "Nebula",
      "Asteroid",
      "Rocket",
      "Astronaut",
    ]),
    h("planets", "Planets", [
      "Mercury",
      "Venus",
      "Mars",
      "Jupiter",
      "Saturn",
      "Neptune",
      "Uranus",
      "Earth",
    ]),
    h(
      "rivers",
      "Rivers",
      ["Nile", "Amazon", "Thames", "Danube", "Mississippi", "Yangtze"],
      ["homograph"],
    ),
    h("capitals", "Capitals", [
      "Paris",
      "Rome",
      "London",
      "Madrid",
      "Vienna",
      "Lisbon",
      "Dublin",
      "Athens",
    ]),
    h("gems", "Gemstones", [
      "Ruby",
      "Emerald",
      "Sapphire",
      "Topaz",
      "Opal",
      "Amethyst",
      "Garnet",
    ]),
    h("metals", "Metals", [
      "Copper",
      "Silver",
      "Iron",
      "Nickel",
      "Tin",
      "Platinum",
      "Bronze",
    ]),
    h("blues", "Shades of Blue", [
      "Navy",
      "Teal",
      "Azure",
      "Cobalt",
      "Indigo",
      "Turquoise",
    ]),
    h("reds", "Shades of Red", [
      "Crimson",
      "Scarlet",
      "Maroon",
      "Burgundy",
      "Brick",
    ]),
    h(
      "shoes",
      "Shoes",
      ["Sneaker", "Loafer", "Sandal", "Slipper", "Boot", "Heel", "Clog"],
      ["homograph"],
    ),
    h("hats", "Hats", [
      "Beret",
      "Fedora",
      "Bonnet",
      "Sombrero",
      "Top Hat",
      "Beanie",
    ]),
    h("jewelry", "Jewelry Box", [
      "Necklace",
      "Bracelet",
      "Brooch",
      "Earring",
      "Locket",
      "Pendant",
    ]),
    h(
      "cars",
      "Parts of a Car",
      ["Engine", "Bumper", "Hood", "Trunk", "Windshield", "Tire"],
      ["homograph"],
    ),
    h("shapes", "Shapes", [
      "Circle",
      "Triangle",
      "Square",
      "Oval",
      "Hexagon",
      "Diamond",
    ]),
    h(
      "hand",
      "The Hand",
      ["Thumb", "Palm", "Knuckle", "Wrist", "Fingernail"],
      ["homograph"],
    ),
    h(
      "ships",
      "All Aboard",
      ["Anchor", "Deck", "Mast", "Rudder", "Captain", "Galley", "Porthole"],
      ["homograph"],
    ),
    h("station", "Train Station", [
      "Platform",
      "Ticket",
      "Timetable",
      "Porter",
      "Caboose",
      "Whistle",
    ]),
    h("airport", "Airport", [
      "Departure",
      "Gate",
      "Pilot",
      "Customs",
      "Boarding Pass",
    ]),
    h("hotel", "Hotel", [
      "Lobby",
      "Concierge",
      "Bellhop",
      "Suite",
      "Room Service",
      "Key Card",
    ]),
    h("castle", "Castle", [
      "Moat",
      "Tower",
      "Drawbridge",
      "Throne",
      "Knight",
      "Dungeon",
    ]),
    h("chess", "Chess", [
      "Checkmate",
      "Pawn",
      "Bishop",
      "Rook",
      "Gambit",
      "Queen",
    ]),
    h(
      "cardgames",
      "Card Games",
      ["Poker", "Rummy", "Bridge", "Cribbage", "Canasta", "Euchre"],
      ["homograph"],
    ),
    h("boardgames", "Board Games", [
      "Checkers",
      "Backgammon",
      "Dominoes",
      "Mahjong",
      "Parcheesi",
    ]),
    h(
      "tennis",
      "Tennis",
      ["Racket", "Serve", "Deuce", "Volley", "Love", "Baseline"],
      ["homograph"],
    ),
    h("golf", "Golf", [
      "Birdie",
      "Bogey",
      "Caddie",
      "Fairway",
      "Putter",
      "Tee",
    ]),
    h(
      "baseball",
      "Baseball",
      ["Pitcher", "Shortstop", "Inning", "Dugout", "Home Run", "Umpire"],
      ["homograph"],
    ),
    h("swimming", "Swimming", [
      "Backstroke",
      "Butterfly",
      "Freestyle",
      "Lap",
      "Goggles",
    ]),
    h("office", "Office", [
      "Stapler",
      "Printer",
      "Memo",
      "Cubicle",
      "Paperclip",
      "Agenda",
    ]),
    h("school", "School Days", [
      "Recess",
      "Homework",
      "Locker",
      "Chalk",
      "Principal",
      "Cafeteria",
    ]),
    h("bank", "Bank", ["Teller", "Vault", "Deposit", "Savings", "Loan"]),
    h("money", "Pocket Change", ["Penny", "Dime", "Quarter", "Dollar"]),
    h("wedding", "Wedding", [
      "Bride",
      "Groom",
      "Veil",
      "Bouquet",
      "Vows",
      "Reception",
    ]),
    h("birthday", "Birthday", [
      "Cake",
      "Candles",
      "Presents",
      "Party Hat",
      "Wish",
      "Confetti",
    ]),
    h("time", "Telling Time", [
      "Minute",
      "Hour",
      "Second",
      "Decade",
      "Century",
      "Moment",
    ]),
    h("days", "Days of the Week", [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ]),
    h("months", "Months", [
      "January",
      "March",
      "April",
      "June",
      "October",
      "December",
    ]),
    h(
      "greek",
      "Greek Letters",
      ["Alpha", "Beta", "Gamma", "Delta", "Omega", "Sigma"],
      ["homograph"],
    ),
    h("math", "Math Class", [
      "Fraction",
      "Decimal",
      "Equation",
      "Algebra",
      "Percent",
    ]),
  ],
  q = Object.fromEntries(rt.map((t) => [t.id, t])),
  $t = {
    apple: "Apple",
    pear: "Pear",
    cherries: "Cherries",
    banana: "Banana",
    lemon: "Lemon",
    grapes: "Grapes",
    sun: "Sun",
    cloud: "Cloud",
    rain: "Rain",
    snowflake: "Snowflake",
    lightning: "Lightning",
    rainbow: "Rainbow",
    fish: "Fish",
    whale: "Whale",
    crab: "Crab",
    starfish: "Starfish",
    shell: "Seashell",
    octopus: "Octopus",
    car: "Car",
    bicycle: "Bicycle",
    sailboat: "Sailboat",
    airplane: "Airplane",
    train: "Train",
    balloon: "Hot-air balloon",
    tulip: "Tulip",
    wateringcan: "Watering can",
    leaf: "Leaf",
    mushroom: "Mushroom",
    carrot: "Carrot",
    snail: "Snail",
  };
function N(t) {
  let e = t >>> 0;
  return () => {
    e = (e + 1831565813) >>> 0;
    let s = e;
    return (
      (s = Math.imul(s ^ (s >>> 15), s | 1)),
      (s ^= s + Math.imul(s ^ (s >>> 7), s | 61)),
      ((s ^ (s >>> 14)) >>> 0) / 4294967296
    );
  };
}
function At(t) {
  let e = 2166136261;
  for (let s = 0; s < t.length; s++)
    ((e ^= t.charCodeAt(s)), (e = Math.imul(e, 16777619) >>> 0));
  return e >>> 0;
}
function W(t, e) {
  for (let s = t.length - 1; s > 0; s--) {
    let o = Math.floor(e() * (s + 1)),
      a = t[s];
    ((t[s] = t[o]), (t[o] = a));
  }
  return t;
}
function nt(t) {
  let e = [];
  for (let s of t) {
    let o = q[s.cat];
    if (!o) throw Error(`Unknown category ${s.cat}`);
    let a = Math.min(s.n, o.items.length);
    e.push({
      id: e.length,
      kind: "cat",
      cat: o.id,
      label: o.title,
      total: a,
      icon: o.modality === "pic" ? o.items[0] : void 0,
    });
    for (let i of o.items.slice(0, a))
      if (o.modality === "pic")
        e.push({
          id: e.length,
          kind: "pic",
          cat: o.id,
          label: $t[i] ?? i,
          icon: i,
        });
      else e.push({ id: e.length, kind: "word", cat: o.id, label: i });
  }
  return e;
}
function ee(t) {
  return t === 3 ? { F: 3, C: 3, R: 3 } : { F: 4, C: 4, R: 4 };
}
function V(t, e, s, o) {
  let { F: a, C: i, R: r } = ee(e),
    l = W(
      t.map((p) => p.id),
      N(s),
    ),
    c = [],
    d = 0;
  for (let p = 0; p < i; p++) {
    let x = [];
    for (let f = 0; f < r; f++) x.push({ id: l[d++], up: f === r - 1 });
    c.push(x);
  }
  let u = l.slice(d);
  return {
    cols: c,
    stock: u,
    waste: [],
    found: Array.from({ length: a }, () => null),
    cleared: [],
    moves: o,
    movesUsed: 0,
  };
}
var L = (t) => t.kind === "word" || t.kind === "pic";
function Y(t) {
  return {
    cols: t.cols.map((e) => e.map((s) => ({ id: s.id, up: s.up }))),
    stock: t.stock.slice(),
    waste: t.waste.slice(),
    found: t.found.map((e) => (e ? { ...e } : null)),
    cleared: t.cleared.slice(),
    moves: t.moves,
    movesUsed: t.movesUsed,
  };
}
function R(t, e, s) {
  let o = t.cols[s];
  if (o.length === 0) return -1;
  let a = o.length - 1,
    i = o[a];
  if (!i.up) return -1;
  let r = e[i.id];
  if (r.kind === "wild") return -1;
  if (r.kind === "cat") return a;
  let l = a;
  while (l - 1 >= 0) {
    let c = o[l - 1];
    if (!c.up) break;
    let d = e[c.id];
    if (!L(d) || d.cat !== r.cat) break;
    l--;
  }
  return l;
}
function A(t, e, s) {
  if (s.z === "waste") {
    let i = t.waste[t.waste.length - 1];
    return i === void 0 ? null : [i];
  }
  let o = t.cols[s.i];
  if (!o) return null;
  let a = R(t, e, s.i);
  if (a < 0 || s.idx < a || s.idx > o.length - 1) return null;
  return o.slice(s.idx).map((i) => i.id);
}
function K(t, e, s, o, a) {
  let i = e[o[0]];
  if (a.z === "found") {
    let c = t.found[a.i];
    if (c === void 0) return "notMovable";
    if (!c) return i.kind === "cat" && o.length === 1 ? null : "needCategory";
    if (i.kind === "cat") return "slotBusy";
    if (i.kind === "wild") return "wrongSet";
    return i.cat === c.cat ? null : "wrongSet";
  }
  if (s.z === "col" && s.i === a.i) return "notMovable";
  let r = t.cols[a.i];
  if (!r) return "notMovable";
  if (r.length === 0) return null;
  let l = e[r[r.length - 1].id];
  if (l.kind === "cat") return "onCategory";
  if (!L(i)) return "mismatch";
  if (l.kind === "wild") return null;
  return l.cat === i.cat ? null : "mismatch";
}
function se(t, e, s) {
  if (t.moves <= 0) return "noMoves";
  if (s.t === "draw") return t.stock.length > 0 ? null : "notMovable";
  if (s.t === "recycle")
    return t.stock.length === 0 && t.waste.length > 0 ? null : "notMovable";
  let o = A(t, e, s.from);
  if (!o) return "notMovable";
  return K(t, e, s.from, o, s.to);
}
function lt(t, e, s) {
  let o = se(t, e, s);
  if (o) return { ok: !1, reason: o };
  if (((t.moves -= 1), (t.movesUsed += 1), s.t === "draw")) {
    let r = t.stock.pop();
    return (t.waste.push(r), { ok: !0, moved: [r] });
  }
  if (s.t === "recycle") {
    let r = t.waste.slice();
    return (
      (t.stock = t.waste.reverse()),
      (t.waste = []),
      { ok: !0, moved: r }
    );
  }
  let a = A(t, e, s.from),
    i = { ok: !0, moved: a, flipped: [] };
  if (s.from.z === "waste") t.waste.pop();
  else {
    let r = t.cols[s.from.i];
    r.splice(s.from.idx);
    let l = r[r.length - 1];
    if (l && e[l.id].kind === "wild") ((i.dissolvedWild = l.id), r.pop());
    let c = r[r.length - 1];
    if (c && !c.up) ((c.up = !0), i.flipped.push(c.id));
  }
  if (s.to.z === "found") {
    let r = t.found[s.to.i];
    if (!r) {
      let l = e[a[0]];
      t.found[s.to.i] = {
        cat: l.cat,
        catCard: l.id,
        count: 0,
        total: l.total ?? 0,
      };
    } else if (
      ((r.count += a.length),
      (i.scored = { found: s.to.i, ids: a }),
      r.count >= r.total)
    )
      (t.cleared.push(r.cat),
        (i.clearedCat = r.cat),
        (i.clearedFound = s.to.i),
        (t.found[s.to.i] = null));
  } else for (let r of a) t.cols[s.to.i].push({ id: r, up: !0 });
  return i;
}
function oe(t, e) {
  let s = [];
  if (t.waste.length) s.push({ z: "waste" });
  return (
    t.cols.forEach((o, a) => {
      let i = R(t, e, a);
      if (i >= 0)
        for (let r = i; r < o.length; r++) s.push({ z: "col", i: a, idx: r });
    }),
    s
  );
}
function ie(t) {
  let e = [];
  return (
    t.found.forEach((s, o) => e.push({ z: "found", i: o })),
    t.cols.forEach((s, o) => e.push({ z: "col", i: o })),
    e
  );
}
function xt(t, e, s = !0) {
  let o = [];
  if (t.moves <= 0) return o;
  for (let a of oe(t, e)) {
    let i = A(t, e, a);
    for (let r of ie(t))
      if (!K(t, e, a, i, r)) o.push({ t: "move", from: a, to: r });
  }
  if (s) {
    if (t.stock.length) o.push({ t: "draw" });
    else if (t.waste.length) o.push({ t: "recycle" });
  }
  return o;
}
function ae(t) {
  return t.filter((e) => e.kind === "cat").length;
}
function J(t, e) {
  return t.cleared.length >= ae(e);
}
function re(t, e, s) {
  let o = e[s];
  for (let a = 0; a < t.found.length; a++) {
    let i = t.found[a];
    if (!i && o.kind === "cat") return !0;
    if (i && L(o) && i.cat === o.cat) return !0;
  }
  for (let a of t.cols) {
    if (a.length === 0) return !0;
    let i = e[a[a.length - 1].id];
    if (!L(o)) continue;
    if (i.kind === "wild") return !0;
    if (L(i) && i.cat === o.cat) return !0;
  }
  return !1;
}
function Dt(t, e) {
  if (t.moves <= 0) return !1;
  if (
    xt(t, e, !1).filter((o) => {
      if (o.t !== "move") return !0;
      if (
        o.to.z === "col" &&
        t.cols[o.to.i].length === 0 &&
        o.from.z === "col" &&
        o.from.idx === 0
      )
        return !1;
      return !0;
    }).length
  )
    return !1;
  for (let o of [...t.stock, ...t.waste]) if (re(t, e, o)) return !1;
  return !0;
}
var ne = (t) => t === "word" || t === "pic";
function Ft(t, e) {
  return xt(t, e, !0).filter((s) => {
    if (s.t !== "move" || s.from.z !== "col") return !0;
    if (s.from.idx !== R(t, e, s.from.i)) return !1;
    if (s.to.z === "col" && t.cols[s.to.i].length === 0 && s.from.idx === 0)
      return !1;
    return !0;
  });
}
function le(t, e, s) {
  let o = 0;
  for (let i of t.cols) {
    let r = i[i.length - 1];
    if (r && e[r.id].cat === s && ne(e[r.id].kind)) o++;
  }
  let a = t.waste[t.waste.length - 1];
  if (a !== void 0 && e[a].cat === s) o++;
  return o;
}
function Ht(t, e, s) {
  if (s.t === "draw") return 6;
  if (s.t === "recycle") return 2;
  let o = A(t, e, s.from),
    a = e[o[0]],
    i;
  if (s.from.z === "col") i = t.cols[s.from.i][s.from.idx - 1];
  let r = i ? (i.up ? 8 : 14) : 0;
  if (s.to.z === "found") {
    let c = t.found[s.to.i];
    if (!c) return 70 + 4 * le(t, e, a.cat) + r;
    let d = c.count + o.length >= c.total;
    return 100 + 5 * o.length + (d ? 40 : 0) + r;
  }
  if (t.cols[s.to.i].length === 0) {
    if (s.from.z === "waste") return a.kind === "cat" ? 14 : 8;
    if (!i) return -1000;
    return i.up ? 15 : 45;
  }
  if (s.from.z === "waste") return 40;
  if (!i) return 35;
  return i.up ? 30 : 50;
}
function ce(t, e, s, o = 25, a = 600) {
  let i = Y(t);
  i.moves = 1e5;
  let r = [],
    l = 0;
  for (let c = 0; c < a; c++) {
    if (J(i, e)) return { solved: !0, moves: r.length, path: r };
    let d = Ft(i, e);
    if (!d.length) return { solved: !1, moves: r.length, path: r };
    let u = null,
      p = -1 / 0;
    for (let x of d) {
      let f = Ht(i, e, x) + s() * o;
      if (f > p) ((p = f), (u = x));
    }
    if (!u) break;
    if (u.t === "recycle") {
      if (++l > 3) return { solved: !1, moves: r.length, path: r };
    } else if (u.t === "move") l = 0;
    (lt(i, e, u), r.push(u));
  }
  return { solved: J(i, e), moves: r.length, path: r };
}
function Pt(t, e, s, o = 30) {
  let a = N(s ^ 2654435769),
    i = null,
    r = 0;
  for (let l = 0; l < o; l++) {
    let c = ce(t, e, a, l === 0 ? 0 : 25);
    if (c.solved) {
      if ((r++, !i || c.moves < i.moves)) i = c;
    }
  }
  return {
    solved: !!i,
    par: i ? i.moves : 0,
    successRate: r / o,
    bestPath: i ? i.path : [],
  };
}
function Rt(t, e) {
  let s = Ft(t, e),
    o = null,
    a = -1 / 0;
  for (let i of s) {
    let r = Ht(t, e, i);
    if (r > a) ((a = r), (o = i));
  }
  return o;
}
class Q {
  def;
  cards;
  state;
  history = [];
  freeUndos = m.freeUndosPerLevel;
  rescues = 0;
  hints = 0;
  bonusMoves = 0;
  startBudget;
  constructor(t, e = 0) {
    ((this.def = t),
      (this.cards = nt(t.sets)),
      (this.bonusMoves = e),
      (this.startBudget = t.budget + e),
      (this.state = V(this.cards, t.board, t.seed, this.startBudget)));
  }
  static restore(t) {
    let e = Object.create(Q.prototype);
    return (Object.assign(e, t), e);
  }
  save() {
    return {
      def: this.def,
      cards: this.cards,
      state: this.state,
      history: this.history.slice(-60),
      freeUndos: this.freeUndos,
      rescues: this.rescues,
      hints: this.hints,
      bonusMoves: this.bonusMoves,
      startBudget: this.startBudget,
    };
  }
  get totalSets() {
    return this.cards.filter((t) => t.kind === "cat").length;
  }
  get setsLeft() {
    return this.totalSets - this.state.cleared.length;
  }
  move(t) {
    let e = Y(this.state),
      s = lt(this.state, this.cards, t);
    if (s.ok) this.history.push({ state: e });
    return s;
  }
  status() {
    if (J(this.state, this.cards)) return "won";
    if (this.state.moves <= 0) return "out";
    if (Dt(this.state, this.cards)) return "deadlock";
    return "play";
  }
  canUndo() {
    return this.history.length > 0;
  }
  undo() {
    let t = this.history.pop();
    if (!t) return { ok: !1 };
    if (((this.state = t.state), t.wildPlaced !== void 0))
      this.cards = this.cards.filter((e) => e.id !== t.wildPlaced);
    return { ok: !0, wildRefund: t.wildPlaced !== void 0 };
  }
  canPlaceWild(t) {
    let e = this.state.cols[t];
    if (!e) return !1;
    if (e.length === 0) return !0;
    let s = e[e.length - 1];
    return s.up && L(this.cards[s.id]);
  }
  placeWild(t) {
    if (!this.canPlaceWild(t)) return null;
    let e = Y(this.state),
      s = this.cards.length;
    return (
      this.cards.push({ id: s, kind: "wild", cat: "", label: "Wild Thread" }),
      this.state.cols[t].push({ id: s, up: !0 }),
      this.history.push({ state: e, wildPlaced: s }),
      s
    );
  }
  hint() {
    return Rt(this.state, this.cards);
  }
  addMoves(t) {
    this.state.moves += t;
    for (let e of this.history) e.state.moves += t;
  }
  payout(t) {
    let e = this.def.mode === "daily" ? m.dailyBase : m.winBase;
    return Math.round((e + m.perMoveLeft * this.state.moves) * (1 + t));
  }
}
var F = globalThis.ArkadiumGameSdk,
  ct = 0,
  Ot = -1000000000000,
  Nt = 0,
  I = 0,
  tt = [],
  vt = new Set(),
  X = null,
  Z = null,
  de = () => /[?&]plus=1/.test(location.search),
  he = !F,
  b = {
    setAdPresenter(t) {
      X = t;
    },
    setMuteHook(t) {
      Z = t;
    },
    onTelemetry(t) {
      return (vt.add(t), () => vt.delete(t));
    },
    track(t, e = {}) {
      let s = { t: Date.now(), name: t, props: e };
      if ((tt.push(s), tt.length > 300)) tt.shift();
      if (
        (vt.forEach((o) => o(s)),
        F?.analytics?.track?.(t, e),
        /[?&]debug=1/.test(location.search))
      )
        console.info("[telemetry]", t, e);
    },
    gameReady() {
      (F?.lifecycle?.onTestReady?.(), this.track("game_ready", { mock: he }));
    },
    gameplayStart() {
      ((I = performance.now()), F?.lifecycle?.onGameStart?.());
    },
    gameplayStop() {
      if (I) Nt += performance.now() - I;
      ((I = 0), F?.lifecycle?.onGameEnd?.());
    },
    async rewarded(t) {
      (this.track("ad_rewarded_request", { placement: t }), Z?.(!0));
      let e = !1;
      try {
        if (F?.ads?.showRewardAd) e = (await F.ads.showRewardAd()).value;
        else if (X) e = await X("rewarded");
      } catch {
        e = !1;
      }
      if ((Z?.(!1), e)) Ot = Date.now();
      return (
        this.track(e ? "ad_rewarded_complete" : "ad_rewarded_fail", {
          placement: t,
        }),
        e
      );
    },
    async interstitial(t, e) {
      let s = Date.now(),
        o = (Nt + (I ? performance.now() - I : 0)) / 1000;
      if (de()) return;
      if (e > 0 && e < m.noInterstitialBeforeLevel) return;
      if (s - Ot < m.rewardedGraceSec * 1000) return;
      if (ct && (s - ct) / 1000 < m.interstitialCooldownSec) return;
      if (!ct && o < m.interstitialCooldownSec) return;
      ((ct = s), this.track("ad_interstitial", { placement: t }), Z?.(!0));
      try {
        if (F?.ads?.showMidrollAd) await F.ads.showMidrollAd();
        else if (X) await X("interstitial");
      } finally {
        Z?.(!1);
      }
    },
  };
function pe(t, e, s, o = !1) {
  let a = V(t, s, e, 1),
    i = a.cols.some((l) => t[l[l.length - 1].id].kind === "cat"),
    r = a.stock.slice(-3).some((l) => t[l].kind === "cat");
  return o ? i : i || r;
}
function Wt(t) {
  let e = nt(t.sets),
    s = t.minSuccess ?? 0.2,
    o = null;
  for (let a = 0; a < (t.maxTries ?? 80); a++) {
    let i = (t.seedStart + a * 7919) >>> 0;
    if (!pe(e, i, t.board, t.requireCatUp)) continue;
    let r = V(e, t.board, i, 1),
      l = Pt(r, e, i, t.attempts ?? 24);
    if (!l.solved) continue;
    let c = {
      key: t.key,
      mode: t.mode,
      title: t.title,
      board: t.board,
      sets: t.sets,
      mu: t.mu,
      seed: i,
      par: l.par,
      budget: Math.round(l.par * t.mu),
    };
    if (l.successRate >= s) return c;
    if (!o) o = c;
  }
  if (o) return o;
  throw Error(`Could not generate solvable level for ${t.key}`);
}
var ue = rt.filter((t) => t.modality === "pic").map((t) => t.id),
  fe = rt.filter((t) => t.modality === "word").map((t) => t.id);
function It(t, e) {
  let s = N(t),
    o = W(
      fe.filter(
        (r) => !(e.avoidHomographs && q[r].tags?.includes("homograph")),
      ),
      s,
    ),
    i = [
      ...W(ue.slice(), s).slice(0, e.picCount),
      ...o.slice(0, e.count - e.picCount),
    ];
  return W(i, s).map((r) => {
    let l = Math.min(e.maxN, q[r].items.length),
      c = Math.min(e.minN, l);
    return { cat: r, n: c + Math.floor(s() * (l - c + 1)) };
  });
}
var dt = {
  casual: {
    label: "Casual",
    count: 6,
    picCount: 1,
    minN: 3,
    maxN: 5,
    mu: 1.75,
    avoidHomographs: !0,
  },
  standard: {
    label: "Standard",
    count: 9,
    picCount: 1,
    minN: 4,
    maxN: 7,
    mu: 1.5,
    avoidHomographs: !1,
  },
  expert: {
    label: "Expert",
    count: 12,
    picCount: 2,
    minN: 5,
    maxN: 8,
    mu: 1.3,
    avoidHomographs: !1,
  },
};
function _t(t, e) {
  let s = dt[t],
    o = It(e, s);
  return Wt({
    key: `qp-${t}-${e}`,
    mode: "quick",
    title: `Quick Play · ${s.label}`,
    board: 4,
    sets: o,
    mu: s.mu,
    seedStart: e,
    attempts: 16,
    maxTries: 40,
  });
}
function jt(t) {
  let e = At("common-thread-daily-" + t),
    s = It(e, { count: 9, picCount: 1, minN: 4, maxN: 7 });
  return Wt({
    key: `daily-${t}`,
    mode: "daily",
    title: "Daily Puzzle",
    board: 4,
    sets: s,
    mu: 1.45,
    seedStart: e,
    attempts: 16,
    maxTries: 40,
  });
}
export { B as JOURNEY_LEVELS, Ct as JOURNEY_SEEDS, m as CONFIG, rt as CATEGORIES, N as seededRng, W as shuffle, At as hashString, nt as buildCards, V as deal, Y as cloneState, R as movableStart, A as movableCards, K as dropError, se as actionError, lt as applyAction, xt as legalActions, J as isSolved, Dt as isDeadlocked, Ft as solverActions, Ht as scoreAction, ce as playout, Pt as solve, Rt as bestAction, Q as Game, ot as streakTier, jt as dailyLevel, _t as quickLevel, dt as QUICK_TIERS, It as pickSets };
