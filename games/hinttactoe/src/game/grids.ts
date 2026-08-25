import type { GridDef } from './types';

/**
 * Curated hint grids. Each grid crosses 3 row categories with 3 column
 * traits; `answers[r][c]` is the accepted-word list for that intersection.
 * Answers are matched case-insensitively with light punctuation/plural
 * tolerance (see game/rules.ts:checkAnswer) — no free dictionary lookup,
 * since this is a static offline site with no backend.
 */
export const GRIDS: GridDef[] = [
  {
    id: 'animal-kingdom',
    name: 'Animal Kingdom',
    rows: ['Wild Animal', 'Pet', 'Bird'],
    cols: ['Can Fly', 'Is Fast', 'Lives in Water'],
    answers: [
      [
        ['eagle', 'hawk', 'falcon', 'owl', 'vulture', 'condor', 'bat', 'kite', 'osprey'],
        ['cheetah', 'lion', 'wolf', 'gazelle', 'antelope', 'leopard', 'tiger', 'fox', 'jackal'],
        ['crocodile', 'alligator', 'hippo', 'hippopotamus', 'otter', 'beaver', 'seal', 'walrus', 'frog'],
      ],
      [
        ['parakeet', 'budgie', 'parrot', 'cockatiel', 'canary', 'cockatoo'],
        ['greyhound', 'whippet', 'horse', 'dog', 'cat'],
        ['goldfish', 'fish', 'turtle', 'terrapin', 'duck', 'frog'],
      ],
      [
        ['eagle', 'hawk', 'sparrow', 'robin', 'pigeon', 'dove', 'parrot', 'owl', 'falcon', 'swallow', 'crow', 'seagull', 'gull'],
        ['falcon', 'hawk', 'eagle', 'swift', 'ostrich', 'peregrine falcon'],
        ['duck', 'swan', 'goose', 'penguin', 'pelican', 'heron', 'seagull', 'gull', 'flamingo', 'loon'],
      ],
    ],
  },
  {
    id: 'fruits-veggies',
    name: 'Fruits & Veggies',
    rows: ['Fruit', 'Vegetable', 'Berry'],
    cols: ['Is Red', 'Is Yellow or Orange', 'Is Green'],
    answers: [
      [
        ['apple', 'cherry', 'watermelon', 'pomegranate', 'plum', 'red grape'],
        ['banana', 'lemon', 'mango', 'orange', 'papaya', 'pineapple', 'peach', 'apricot', 'tangerine', 'grapefruit'],
        ['kiwi', 'lime', 'green grape', 'honeydew', 'avocado', 'pear', 'green apple'],
      ],
      [
        ['tomato', 'radish', 'red pepper', 'beet', 'beetroot', 'red onion', 'red cabbage'],
        ['carrot', 'corn', 'pumpkin', 'squash', 'sweet potato', 'yellow pepper', 'butternut squash'],
        ['broccoli', 'spinach', 'lettuce', 'cucumber', 'pea', 'peas', 'green bean', 'green pepper', 'kale', 'celery', 'zucchini'],
      ],
      [
        ['strawberry', 'raspberry', 'cranberry', 'red currant'],
        ['golden berry', 'cloudberry', 'cloud berry'],
        ['gooseberry', 'kiwi', 'green grape'],
      ],
    ],
  },
  {
    id: 'on-the-move',
    name: 'On the Move',
    rows: ['Land Vehicle', 'Water Vehicle', 'Air Vehicle'],
    cols: ['Can Carry Cargo', 'Carries Many People', 'Is Fast'],
    answers: [
      [
        ['truck', 'van', 'train', 'tractor', 'trailer', 'moving truck'],
        ['bus', 'train', 'subway', 'tram', 'van', 'coach', 'minibus'],
        ['car', 'motorcycle', 'sports car', 'race car', 'bullet train', 'train'],
      ],
      [
        ['cargo ship', 'ship', 'barge', 'freighter', 'tanker', 'container ship'],
        ['cruise ship', 'ferry', 'ship', 'yacht', 'ferry boat', 'boat'],
        ['speedboat', 'jet ski', 'jetski', 'hydrofoil', 'motorboat', 'powerboat'],
      ],
      [
        ['cargo plane', 'plane', 'helicopter', 'jet', 'airplane'],
        ['airplane', 'plane', 'jet', 'airliner', 'jumbo jet'],
        ['jet', 'fighter jet', 'rocket', 'space shuttle', 'concorde', 'supersonic jet'],
      ],
    ],
  },
  {
    id: 'musical-notes',
    name: 'Musical Notes',
    rows: ['String Instrument', 'Wind Instrument', 'Percussion Instrument'],
    cols: ['Found in an Orchestra', 'Small Enough to Carry', 'Is Loud'],
    answers: [
      [
        ['violin', 'viola', 'cello', 'double bass', 'harp'],
        ['violin', 'viola', 'guitar', 'ukulele', 'banjo', 'mandolin'],
        ['electric guitar', 'bass guitar', 'banjo', 'guitar'],
      ],
      [
        ['flute', 'clarinet', 'oboe', 'bassoon', 'trumpet', 'trombone', 'tuba', 'french horn', 'saxophone'],
        ['flute', 'clarinet', 'recorder', 'harmonica', 'saxophone', 'trumpet'],
        ['trumpet', 'trombone', 'tuba', 'french horn', 'saxophone', 'bagpipes'],
      ],
      [
        ['timpani', 'snare drum', 'bass drum', 'xylophone', 'cymbals', 'triangle'],
        ['tambourine', 'maracas', 'triangle', 'castanets', 'bongos', 'hand bells'],
        ['drums', 'drum set', 'cymbals', 'gong', 'bass drum'],
      ],
    ],
  },
  {
    id: 'kitchen-and-food',
    name: 'Kitchen & Food',
    rows: ['Fast Food', 'Breakfast Food', 'Dessert'],
    cols: ['Is Sweet', 'Is Served Hot', 'Comes in a Cone or Cup'],
    answers: [
      [
        ['milkshake', 'donut', 'doughnut', 'ice cream', 'cookie', 'sundae'],
        ['burger', 'hamburger', 'fries', 'french fries', 'pizza', 'hot dog', 'nuggets', 'chicken nuggets', 'fried chicken'],
        ['ice cream', 'slushie', 'milkshake', 'sundae', 'soft serve'],
      ],
      [
        ['pancake', 'pancakes', 'waffle', 'waffles', 'donut', 'doughnut', 'muffin', 'french toast'],
        ['pancakes', 'waffles', 'oatmeal', 'coffee', 'tea', 'eggs', 'fried egg', 'bacon', 'sausage', 'french toast'],
        ['coffee', 'tea', 'yogurt', 'yoghurt', 'smoothie', 'juice'],
      ],
      [
        ['cake', 'ice cream', 'cookie', 'brownie', 'pie', 'candy', 'chocolate'],
        ['apple pie', 'brownie', 'molten lava cake', 'cobbler'],
        ['ice cream', 'sundae', 'frozen yogurt', 'pudding', 'gelato', 'sorbet'],
      ],
    ],
  },
  {
    id: 'weather-and-seasons',
    name: 'Weather & Seasons',
    rows: ['Summer Thing', 'Winter Thing', 'Rainy Day Thing'],
    cols: ['Is Cold', 'Is Fun to Play With', 'You Wear It'],
    answers: [
      [
        ['ice cream', 'popsicle', 'lemonade', 'ice pop', 'iced tea', 'snow cone'],
        ['beach ball', 'frisbee', 'kite', 'water gun', 'pool', 'sprinkler'],
        ['sunglasses', 'swimsuit', 'bathing suit', 'sandals', 'sun hat', 'flip flops', 'shorts'],
      ],
      [
        ['snow', 'ice', 'snowball', 'icicle', 'snowman', 'sleet', 'frost'],
        ['sled', 'sledge', 'snowman', 'snowball', 'skis', 'snowboard', 'ice skates'],
        ['scarf', 'mittens', 'gloves', 'coat', 'jacket', 'beanie', 'earmuffs', 'boots', 'sweater'],
      ],
      [
        ['hail', 'rain', 'puddle'],
        ['puddle', 'rainbow', 'paper boat'],
        ['raincoat', 'umbrella', 'rain boots', 'galoshes', 'poncho', 'rain jacket'],
      ],
    ],
  },
];

export function randomGrid(excludeId?: string): GridDef {
  const pool = excludeId ? GRIDS.filter(g => g.id !== excludeId) : GRIDS;
  return pool[Math.floor(Math.random() * pool.length)];
}
