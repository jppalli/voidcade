/**
 * Art slots: every picture an artist can replace, with its exact file name and specification.
 *
 * Each slot has a kind (item, look-alike, icon, scenery prop), a kit (the set of pictures that
 * belong together) and a size. While no file has been delivered for a slot, the game draws its
 * own picture, so nothing waits for the art. Once a file is delivered and listed in
 * public/art/manifest.json (by `npm run art:sync`), the game uses it.
 *
 * Icons and props are used only when every picture of their kit has been delivered, so a screen is
 * never half in the old style and half in the new one (`?art=all` in the address shows them anyway,
 * for testing). Items are used one by one.
 *
 * This file is plain data and has no browser code, so the tools in tools/ can read it too.
 */
import { ITEMS, SETS, DECOYS, DECOY_NAME } from './items';

export const ART_SPEC = {
  /** Where delivered pictures are kept inside public/ (and inside art/incoming). */
  folder: 'art',
  /** Biggest file allowed, in bytes. */
  maxBytes: 120_000,
  /** Pixels at or below this opacity (0 to 255) count as empty when measuring a PNG. */
  emptyAlpha: 16,
  /** Items (collectables and look-alikes): a square PNG. */
  item: { master: 256, texture: 128, margin: 10, fill: [0.5, 0.96] as [number, number] },
  /** Icons: the game's 64 x 64 drawings. A PNG is this many times bigger than the drawing. */
  icon: { scale: 2, margin: 4, fill: [0.6, 0.98] as [number, number] },
  /** Scenery props: a PNG is this many times bigger than the drawing's viewBox. */
  prop: { scale: 4, margin: 2, fill: null as [number, number] | null },
};

export type ArtKind = 'item' | 'decoy' | 'icon' | 'prop';
export type ArtFormat = 'png' | 'svg';
export interface ArtSlot {
  /** The file name without its extension. Unique inside its folder. */
  id: string;
  kind: ArtKind;
  name: string;
  /** The kit it belongs to. */
  kit: string;
  /** Icons and props are used only when the whole kit is delivered. */
  gate: boolean;
  rarity?: string;
  /** Folder inside the art folder: items, icons or props. */
  folder: 'items' | 'icons' | 'props';
  /** Which file types are accepted. */
  formats: ArtFormat[];
  /** Size of a PNG, in pixels. */
  w: number;
  h: number;
  /** Space that must stay empty on every side of a PNG, in pixels. */
  margin: number;
  /** The share of the file the longest side of the object must take up, or null when it is not checked. */
  fill: [number, number] | null;
  /** The size of the picture's coordinate box (an SVG must have this shape). */
  box: [number, number];
  /** What the picture is for. */
  use: string;
}

/** The key of a slot inside the manifest: "items/button". */
export const slotKey = (s: { folder: string; id: string }) => `${s.folder}/${s.id}`;
export const artFile = (id: string) => `items/${id}.png`;
/** The name the picture has inside Phaser. */
export const artKey = (id: string) => 'art-' + id;

const FOLDER_OF: Record<ArtKind, ArtSlot['folder']> = { item: 'items', decoy: 'items', icon: 'icons', prop: 'props' };

const itemSlot = (kind: 'item' | 'decoy', id: string, name: string, kit: string, rarity: string | undefined, use: string): ArtSlot => {
  const n = ART_SPEC.item.master;
  return { id, kind, name, kit, gate: false, rarity, folder: FOLDER_OF[kind], formats: ['png'], w: n, h: n, margin: ART_SPEC.item.margin, fill: ART_SPEC.item.fill, box: [n, n], use };
};
const iconSlot = (id: string, name: string, use: string): ArtSlot => {
  const n = 64 * ART_SPEC.icon.scale;
  return { id, kind: 'icon', name, kit: 'Icons', gate: true, folder: 'icons', formats: ['png', 'svg'], w: n, h: n, margin: ART_SPEC.icon.margin, fill: ART_SPEC.icon.fill, box: [64, 64], use };
};
const propSlot = (id: string, name: string, kit: string, vw: number, vh: number): ArtSlot => ({
  id, kind: 'prop', name, kit, gate: true, folder: 'props', formats: ['png', 'svg'],
  w: vw * ART_SPEC.prop.scale, h: vh * ART_SPEC.prop.scale, margin: ART_SPEC.prop.margin, fill: ART_SPEC.prop.fill, box: [vw, vh],
  use: 'Scenery in the map margins and behind the board',
});

/** The icons. The ids match the names used in art.ts. */
const ICONS: [string, string, string][] = [
  ['detector', 'Detector', 'Helper button, "new helper" card and the shop'],
  ['fan', 'Fan', 'Helper button, "new helper" card and the shop'],
  ['vacuum', 'Vacuum', 'Helper button, "new helper" card and the shop'],
  ['cells', 'Battery cells (pack)', 'The shop row that sells battery cells'],
  ['cell', 'One battery cell', 'Rewards and the daily gift'],
  ['shop', 'Shop', 'The shop button in the top bar'],
  ['gift', 'Gift', 'The daily gift'],
  ['map', 'Levels map', 'The "Levels" button on the title screen'],
  ['book', 'Collection book', 'The "Collection" button on the title screen'],
  ['calendar', 'Calendar', 'The "Today" button on the title screen'],
  ['hay', 'Hay', 'Today screen and rewards'],
  ['scroll', 'Scroll', 'Today screen (quests)'],
  ['barn', 'Barn', 'The "Barn" button on the title screen'],
];

/** The scenery props: id, name, world (0 to 4) and the drawing's viewBox. */
const PROPS: [string, string, number, number, number][] = [
  ['windmill', 'Windmill', 0, 100, 140],
  ['sunflower', 'Sunflower', 0, 70, 130],
  ['daisies', 'Daisies', 0, 110, 72],
  ['bush', 'Berry bush', 0, 120, 80],
  ['butterfly', 'Butterfly (wings open, the game flaps it)', 0, 30, 24],
  ['barn', 'Red barn', 1, 160, 140],
  ['fence', 'Fence', 1, 150, 70],
  ['chicken', 'Chicken', 1, 70, 70],
  ['haystack', 'Haystack', 1, 120, 110],
  ['autumn_tree', 'Autumn tree', 2, 140, 170],
  ['pumpkin', 'Pumpkin', 2, 90, 76],
  ['scarecrow', 'Scarecrow', 2, 110, 170],
  ['leaf_pile', 'Pile of leaves', 2, 130, 56],
  ['pine', 'Snowy pine tree', 3, 100, 160],
  ['snowman', 'Snowman', 3, 80, 120],
  ['cabin', 'Log cabin', 3, 170, 140],
  ['tent_fire', 'Tent and campfire', 4, 210, 120],
  ['moon', 'Moon', 4, 120, 120],
  ['owl', 'Owl', 4, 90, 110],
  ['mushrooms', 'Mushrooms', 4, 100, 70],
];
const WORLD_KIT = ['World 1: The Meadow', 'World 2: The Barnyard', 'World 3: The Orchard', 'World 4: The Snowy Farm', 'World 5: Starry Night'];

/** Every slot, in the order they appear in the spec sheet. */
export function artSlots(): ArtSlot[] {
  const setName = (id: string) => SETS.find(s => s.id === id)?.name ?? id;
  return [
    ...ITEMS.map(i => itemSlot('item', i.id, i.name, setName(i.set), i.rarity, 'Hidden in the hay, then shown in the collection book, the shop and the "well done" card')),
    ...DECOYS.map(id => itemSlot('decoy', id, DECOY_NAME[id] ?? id, 'Look-alikes of the needle', undefined, 'Hidden in the hay to look like the needle. Drawn lying flat, pointing right')),
    ...ICONS.map(([id, name, use]) => iconSlot(id, name, use)),
    ...PROPS.map(([id, name, world, vw, vh]) => propSlot(id, name, WORLD_KIT[world], vw, vh)),
  ];
}

/** What public/art/manifest.json holds: the pictures that have been delivered. `v` changes when the file does. */
export interface ArtManifest {
  version: 2;
  files: Record<string, { ext: ArtFormat; v: string }>;
}
