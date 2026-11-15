/**
 * Everything that can be found in the hay besides the needle.
 *
 * Items come in sets, one set for each world (and a small set for each seasonal event).
 * A set has three common items, two uncommon, one rare, and one treasure: the golden
 * thing at the end of the collection. Which ones turn up in a level is rolled every time
 * the level is played (see drops.ts); the first copy of an item goes into the collection
 * book, copies after that can be sold.
 *
 * This file is plain data so the tests and the economy simulation can load it. The pictures
 * are drawn in itemart.ts.
 */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'treasure';

export interface ItemDef {
  id: string;
  name: string;
  set: string;
  rarity: Rarity;
  /** What the shop pays for a spare copy. */
  value: number;
}

export interface SetDef {
  id: string;
  name: string;
  /** The world whose levels drop it (0 to 4), or -1 for a seasonal set. */
  world: number;
  /** For a seasonal set: which event brings it. */
  event?: string;
  blurb: string;
  /** Paid once, the first time every item in the set is in the collection. */
  reward: { coins: number; cells: number };
}

export const RARITIES: Record<Rarity, { label: string; color: string; order: number }> = {
  common: { label: 'Common', color: '#a8905f', order: 0 },
  uncommon: { label: 'Uncommon', color: '#4fa842', order: 1 },
  rare: { label: 'Rare', color: '#3f8fd8', order: 2 },
  treasure: { label: 'Treasure', color: '#e5a823', order: 3 },
};

export const SETS: SetDef[] = [
  { id: 'sewing', name: 'The Sewing Box', world: 0, blurb: 'Little things from a grandmother\'s basket', reward: { coins: 40, cells: 1 } },
  { id: 'farm', name: 'The Farmhouse Drawer', world: 1, blurb: 'Odds and ends from the barnyard', reward: { coins: 60, cells: 1 } },
  { id: 'orchard', name: 'The Orchard Basket', world: 2, blurb: 'Windfalls and a pot of honey', reward: { coins: 80, cells: 2 } },
  { id: 'winter', name: 'The Winter Cabin', world: 3, blurb: 'Cosy things for a snowy day', reward: { coins: 100, cells: 2 } },
  { id: 'night', name: 'The Night Sky', world: 4, blurb: 'Keepsakes from under the stars', reward: { coins: 120, cells: 3 } },
  { id: 'harvest', name: 'Harvest Festival', world: -1, event: 'harvest', blurb: 'A seasonal set: pumpkins, pies and straw hats', reward: { coins: 60, cells: 2 } },
  { id: 'festive', name: 'Festive Season', world: -1, event: 'festive', blurb: 'A seasonal set: baubles, biscuits and holly', reward: { coins: 60, cells: 2 } },
];

const item = (id: string, name: string, set: string, rarity: Rarity, value: number): ItemDef => ({ id, name, set, rarity, value });

export const ITEMS: ItemDef[] = [
  // The Sewing Box (the meadow)
  item('button', 'Button', 'sewing', 'common', 4),
  item('spool', 'Spool of thread', 'sewing', 'common', 5),
  item('thimble', 'Thimble', 'sewing', 'common', 4),
  item('scissors', 'Scissors', 'sewing', 'uncommon', 10),
  item('pincushion', 'Pin cushion', 'sewing', 'uncommon', 9),
  item('brooch', 'Brooch', 'sewing', 'rare', 30),
  item('goldneedle', 'Golden needle', 'sewing', 'treasure', 120),
  // The Farmhouse Drawer (the barnyard)
  item('feather', 'Feather', 'farm', 'common', 4),
  item('egg', 'Egg', 'farm', 'common', 4),
  item('wheat', 'Ear of wheat', 'farm', 'common', 5),
  item('key', 'Old key', 'farm', 'uncommon', 9),
  item('horseshoe', 'Horseshoe', 'farm', 'uncommon', 11),
  item('lantern', 'Lantern', 'farm', 'rare', 32),
  item('goldegg', 'Golden egg', 'farm', 'treasure', 140),
  // The Orchard Basket
  item('acorn', 'Acorn', 'orchard', 'common', 4),
  item('leaf', 'Autumn leaf', 'orchard', 'common', 4),
  item('apple', 'Apple', 'orchard', 'common', 5),
  item('pear', 'Pear', 'orchard', 'uncommon', 10),
  item('cherries', 'Cherries', 'orchard', 'uncommon', 10),
  item('honeypot', 'Honey pot', 'orchard', 'rare', 34),
  item('goldapple', 'Golden apple', 'orchard', 'treasure', 160),
  // The Winter Cabin (the snowy farm)
  item('mitten', 'Mitten', 'winter', 'common', 4),
  item('snowflake', 'Snowflake', 'winter', 'common', 4),
  item('candle', 'Candle', 'winter', 'common', 5),
  item('mug', 'Cocoa mug', 'winter', 'uncommon', 10),
  item('holly', 'Sprig of holly', 'winter', 'uncommon', 11),
  item('snowglobe', 'Snow globe', 'winter', 'rare', 36),
  item('iceheart', 'Ice heart', 'winter', 'treasure', 180),
  // The Night Sky
  item('star', 'Fallen star', 'night', 'common', 5),
  item('moon', 'Little moon', 'night', 'common', 5),
  item('jar', 'Firefly jar', 'night', 'common', 5),
  item('compass', 'Compass', 'night', 'uncommon', 11),
  item('spyglass', 'Spyglass', 'night', 'uncommon', 12),
  item('crystalball', 'Crystal ball', 'night', 'rare', 40),
  item('starstone', 'Starstone', 'night', 'treasure', 200),
  // Harvest Festival (autumn event)
  item('pumpkin', 'Pumpkin', 'harvest', 'common', 5),
  item('corn', 'Corn on the cob', 'harvest', 'uncommon', 10),
  item('strawhat', 'Straw hat', 'harvest', 'uncommon', 11),
  item('pie', 'Apple pie', 'harvest', 'rare', 34),
  // Festive Season (winter event)
  item('ornament', 'Bauble', 'festive', 'common', 5),
  item('gingerbread', 'Gingerbread man', 'festive', 'uncommon', 10),
  item('stocking', 'Stocking', 'festive', 'uncommon', 11),
  item('wreath', 'Wreath', 'festive', 'rare', 34),
];

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(ITEMS.map(i => [i.id, i]));
export const SET_BY_ID: Record<string, SetDef> = Object.fromEntries(SETS.map(s => [s.id, s]));
export const itemsOfSet = (set: string) => ITEMS.filter(i => i.set === set);
export const itemName = (id: string) => ITEM_BY_ID[id]?.name ?? id;
export const rarityOf = (id: string): Rarity => ITEM_BY_ID[id]?.rarity ?? 'common';
/** Rare and treasure items: the ones the pity timer promises. */
export const isRarePlus = (r: Rarity) => r === 'rare' || r === 'treasure';
/** The set a world drops. */
export const setOfWorld = (world: number) => SETS.find(s => s.world === world);

/** Pictures for things that are not collectables: look-alikes of the needle. */
export const DECOYS = ['pin', 'nail'] as const;
export const DECOY_NAME: Record<string, string> = { pin: 'a pin', nail: 'a nail' };
