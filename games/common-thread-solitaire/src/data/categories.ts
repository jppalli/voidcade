import type { Category } from '../engine/types';

const wordCategory = (t: string, e: string, s: string[], o?: string[]): Category => ({
  id: t,
  title: e,
  modality: "word",
  items: s,
  tags: o
});
const picCategory = (t: string, e: string, s: string[]): Category => ({
  id: t,
  title: e,
  modality: "pic",
  items: s
});
export const CATEGORIES: Category[] = [picCategory("fruit", "Fruit", ["apple", "pear", "cherries", "banana", "lemon", "grapes"]), picCategory("weather", "Weather", ["sun", "cloud", "rain", "snowflake", "lightning", "rainbow"]), picCategory("sealife", "Sea Life", ["fish", "whale", "crab", "starfish", "shell", "octopus"]), picCategory("onthemove", "On the Move", ["car", "bicycle", "sailboat", "airplane", "train", "balloon"]), picCategory("garden", "In the Garden", ["tulip", "wateringcan", "leaf", "mushroom", "carrot", "snail"]), wordCategory("baking", "Baking", ["Flour", "Yeast", "Whisk", "Oven", "Dough", "Rolling Pin", "Icing"]), wordCategory("breakfast", "Breakfast", ["Toast", "Cereal", "Oatmeal", "Bacon", "Waffle", "Omelet"]), wordCategory("coffee", "Coffee Shop", ["Latte", "Barista", "Mocha", "Espresso", "Muffin"]), wordCategory("teatime", "Tea Time", ["Kettle", "Scone", "Saucer", "Teapot", "Biscuit"]), wordCategory("pasta", "Pasta", ["Spaghetti", "Ravioli", "Penne", "Lasagna", "Macaroni", "Fettuccine"]), wordCategory("cheese", "Cheese", ["Cheddar", "Brie", "Gouda", "Feta", "Parmesan", "Mozzarella", "Swiss"]), wordCategory("herbs", "Herbs", ["Basil", "Parsley", "Thyme", "Rosemary", "Mint", "Oregano", "Dill"], ["homograph"]), wordCategory("spices", "Spices", ["Cinnamon", "Nutmeg", "Paprika", "Cumin", "Ginger", "Clove"]), wordCategory("kitchen", "Kitchen", ["Spatula", "Colander", "Ladle", "Grater", "Skillet"]), wordCategory("desserts", "Desserts", ["Pudding", "Sundae", "Brownie", "Cheesecake", "Custard", "Sorbet", "Fudge", "Tart"]), wordCategory("diner", "Diner", ["Booth", "Jukebox", "Milkshake", "Menu", "Counter", "Blue Plate"]), wordCategory("piano", "Piano", ["Keys", "Pedal", "Sonata", "Bench", "Concerto"]), wordCategory("orchestra", "Orchestra", ["Violin", "Cello", "Flute", "Oboe", "Harp", "Trombone", "Timpani", "Conductor"]), wordCategory("jazz", "Jazz", ["Saxophone", "Swing", "Bebop", "Scat", "Improvise"]), wordCategory("dance", "Ballroom", ["Waltz", "Rumba", "Jive", "Quickstep", "Polka", "Cha-Cha", "Mambo"]), wordCategory("theater", "Theater", ["Curtain", "Stage", "Usher", "Encore", "Matinee", "Rehearsal"]), wordCategory("poetry", "Poetry", ["Rhyme", "Stanza", "Sonnet", "Verse", "Haiku", "Limerick"]), wordCategory("library", "Library", ["Shelf", "Librarian", "Catalog", "Overdue", "Bookmark", "Index"]), wordCategory("newspaper", "Newspaper", ["Headline", "Editorial", "Crossword", "Column", "Obituary", "Byline"], ["homograph"]), wordCategory("painting", "Painting", ["Easel", "Canvas", "Brush", "Watercolor", "Portrait", "Landscape", "Palette"]), wordCategory("photo", "Photography", ["Lens", "Shutter", "Tripod", "Zoom", "Flash"]), wordCategory("mystery", "Mystery Novel", ["Detective", "Clue", "Suspect", "Alibi", "Motive", "Sleuth", "Butler"]), wordCategory("fairytale", "Fairy Tales", ["Dragon", "Wizard", "Giant", "Princess", "Spell", "Goblin"]), wordCategory("circus", "Circus", ["Clown", "Acrobat", "Juggler", "Ringmaster", "Trapeze", "Tightrope"]), wordCategory("knitting", "Knitting", ["Yarn", "Needle", "Purl", "Stitch", "Scarf", "Mitten"]), wordCategory("sewing", "Sewing", ["Thimble", "Bobbin", "Hem", "Seam", "Pattern", "Zipper", "Button"]), wordCategory("fabrics", "Fabrics", ["Silk", "Velvet", "Denim", "Linen", "Wool", "Tweed", "Corduroy"]), wordCategory("furniture", "Furniture", ["Sofa", "Armchair", "Dresser", "Bookcase", "Ottoman", "Recliner"]), wordCategory("rooms", "Rooms", ["Attic", "Basement", "Pantry", "Den", "Hallway", "Porch", "Parlor"]), wordCategory("tools", "Toolbox", ["Hammer", "Wrench", "Pliers", "Screwdriver", "Chisel", "Saw"]), wordCategory("gardentools", "Garden Shed", ["Trowel", "Rake", "Hoe", "Shears", "Wheelbarrow"]), wordCategory("writing", "Writing Desk", ["Pen", "Pencil", "Eraser", "Ink", "Notebook", "Envelope"]), wordCategory("trees", "Trees", ["Oak", "Maple", "Birch", "Willow", "Cedar", "Pine", "Elm", "Spruce"]), wordCategory("birds", "Backyard Birds", ["Robin", "Sparrow", "Cardinal", "Heron", "Finch", "Wren", "Owl", "Bluejay"], ["homograph"]), wordCategory("flowers", "Flowers", ["Rose", "Daisy", "Lily", "Orchid", "Peony", "Iris", "Marigold", "Daffodil"], ["homograph"]), wordCategory("dogs", "Dog Breeds", ["Beagle", "Poodle", "Collie", "Terrier", "Dachshund", "Labrador"]), wordCategory("bigcats", "Big Cats", ["Lion", "Tiger", "Leopard", "Cheetah", "Jaguar", "Cougar"]), wordCategory("farm", "Farm", ["Barn", "Tractor", "Silo", "Hay", "Rooster", "Pasture"]), wordCategory("camping", "Camping", ["Tent", "Lantern", "Campfire", "Sleeping Bag", "Compass", "Canoe"]), wordCategory("beach", "Beach", ["Sand", "Towel", "Sunscreen", "Lifeguard", "Boardwalk", "Surf"]), wordCategory("mountains", "Mountains", ["Summit", "Peak", "Ridge", "Glacier", "Valley", "Avalanche"]), wordCategory("ocean", "Ocean", ["Tide", "Wave", "Current", "Reef", "Harbor", "Lighthouse"], ["homograph"]), wordCategory("space", "Outer Space", ["Comet", "Galaxy", "Orbit", "Nebula", "Asteroid", "Rocket", "Astronaut"]), wordCategory("planets", "Planets", ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Neptune", "Uranus", "Earth"]), wordCategory("rivers", "Rivers", ["Nile", "Amazon", "Thames", "Danube", "Mississippi", "Yangtze"], ["homograph"]), wordCategory("capitals", "Capitals", ["Paris", "Rome", "London", "Madrid", "Vienna", "Lisbon", "Dublin", "Athens"]), wordCategory("gems", "Gemstones", ["Ruby", "Emerald", "Sapphire", "Topaz", "Opal", "Amethyst", "Garnet"]), wordCategory("metals", "Metals", ["Copper", "Silver", "Iron", "Nickel", "Tin", "Platinum", "Bronze"]), wordCategory("blues", "Shades of Blue", ["Navy", "Teal", "Azure", "Cobalt", "Indigo", "Turquoise"]), wordCategory("reds", "Shades of Red", ["Crimson", "Scarlet", "Maroon", "Burgundy", "Brick"]), wordCategory("shoes", "Shoes", ["Sneaker", "Loafer", "Sandal", "Slipper", "Boot", "Heel", "Clog"], ["homograph"]), wordCategory("hats", "Hats", ["Beret", "Fedora", "Bonnet", "Sombrero", "Top Hat", "Beanie"]), wordCategory("jewelry", "Jewelry Box", ["Necklace", "Bracelet", "Brooch", "Earring", "Locket", "Pendant"]), wordCategory("cars", "Parts of a Car", ["Engine", "Bumper", "Hood", "Trunk", "Windshield", "Tire"], ["homograph"]), wordCategory("shapes", "Shapes", ["Circle", "Triangle", "Square", "Oval", "Hexagon", "Diamond"]), wordCategory("hand", "The Hand", ["Thumb", "Palm", "Knuckle", "Wrist", "Fingernail"], ["homograph"]), wordCategory("ships", "All Aboard", ["Anchor", "Deck", "Mast", "Rudder", "Captain", "Galley", "Porthole"], ["homograph"]), wordCategory("station", "Train Station", ["Platform", "Ticket", "Timetable", "Porter", "Caboose", "Whistle"]), wordCategory("airport", "Airport", ["Departure", "Gate", "Pilot", "Customs", "Boarding Pass"]), wordCategory("hotel", "Hotel", ["Lobby", "Concierge", "Bellhop", "Suite", "Room Service", "Key Card"]), wordCategory("castle", "Castle", ["Moat", "Tower", "Drawbridge", "Throne", "Knight", "Dungeon"]), wordCategory("chess", "Chess", ["Checkmate", "Pawn", "Bishop", "Rook", "Gambit", "Queen"]), wordCategory("cardgames", "Card Games", ["Poker", "Rummy", "Bridge", "Cribbage", "Canasta", "Euchre"], ["homograph"]), wordCategory("boardgames", "Board Games", ["Checkers", "Backgammon", "Dominoes", "Mahjong", "Parcheesi"]), wordCategory("tennis", "Tennis", ["Racket", "Serve", "Deuce", "Volley", "Love", "Baseline"], ["homograph"]), wordCategory("golf", "Golf", ["Birdie", "Bogey", "Caddie", "Fairway", "Putter", "Tee"]), wordCategory("baseball", "Baseball", ["Pitcher", "Shortstop", "Inning", "Dugout", "Home Run", "Umpire"], ["homograph"]), wordCategory("swimming", "Swimming", ["Backstroke", "Butterfly", "Freestyle", "Lap", "Goggles"]), wordCategory("office", "Office", ["Stapler", "Printer", "Memo", "Cubicle", "Paperclip", "Agenda"]), wordCategory("school", "School Days", ["Recess", "Homework", "Locker", "Chalk", "Principal", "Cafeteria"]), wordCategory("bank", "Bank", ["Teller", "Vault", "Deposit", "Savings", "Loan"]), wordCategory("money", "Pocket Change", ["Penny", "Dime", "Quarter", "Dollar"]), wordCategory("wedding", "Wedding", ["Bride", "Groom", "Veil", "Bouquet", "Vows", "Reception"]), wordCategory("birthday", "Birthday", ["Cake", "Candles", "Presents", "Party Hat", "Wish", "Confetti"]), wordCategory("time", "Telling Time", ["Minute", "Hour", "Second", "Decade", "Century", "Moment"]), wordCategory("days", "Days of the Week", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]), wordCategory("months", "Months", ["January", "March", "April", "June", "October", "December"]), wordCategory("greek", "Greek Letters", ["Alpha", "Beta", "Gamma", "Delta", "Omega", "Sigma"], ["homograph"]), wordCategory("math", "Math Class", ["Fraction", "Decimal", "Equation", "Algebra", "Percent"])];
export const CATEGORY_BY_ID: Record<string, Category> = Object.fromEntries(CATEGORIES.map(t => [t.id, t]));
export const PIC_LABELS: Record<string, string> = {
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
  snail: "Snail"
};

