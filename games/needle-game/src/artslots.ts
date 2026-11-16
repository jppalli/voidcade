/**
 * Art slots: every picture an artist can replace, with its exact file name and specification.
 *
 * Each item (and each look-alike of the needle) has a slot. While no file has been delivered for
 * a slot the game draws its own picture (itemart.ts), so nothing waits for the art. Once a file is
 * delivered and listed in public/art/manifest.json (by `npm run art:sync`), the game uses it.
 *
 * This file is plain data and has no browser code, so the tools in tools/ can read it too.
 */
import { ITEMS, SETS, DECOYS, DECOY_NAME } from './items';

export const ART_SPEC = {
  /** Size, in pixels, of the file an artist delivers (square). */
  master: 256,
  /** Size of the picture the game keeps in memory (the master is scaled down to it). */
  texture: 128,
  /** Biggest file allowed, in bytes. */
  maxBytes: 120_000,
  /** Free space, in master pixels, that must stay empty on every side of the picture. */
  margin: 10,
  /** The longest side of the picture must take up between these shares of the file. */
  fill: [0.5, 0.96] as [number, number],
  /** Pixels at or below this opacity (0 to 255) count as empty when measuring. */
  emptyAlpha: 16,
  /** Where delivered pictures are kept inside public/. */
  folder: 'art',
};

export type ArtKind = 'item' | 'decoy';
export interface ArtSlot {
  /** The item id, which is also the file name without .png. */
  id: string;
  kind: ArtKind;
  name: string;
  /** The set it belongs to, for the spec sheet. */
  group: string;
  rarity?: string;
  /** Path of the file inside the art folder. */
  file: string;
}

export const artFile = (id: string) => `items/${id}.png`;
/** The name the picture has inside Phaser. */
export const artKey = (id: string) => 'art-' + id;

/** Every slot, in the order they appear in the spec sheet. */
export function artSlots(): ArtSlot[] {
  const setName = (id: string) => SETS.find(s => s.id === id)?.name ?? id;
  const items: ArtSlot[] = ITEMS.map(i => ({ id: i.id, kind: 'item', name: i.name, group: setName(i.set), rarity: i.rarity, file: artFile(i.id) }));
  const decoys: ArtSlot[] = DECOYS.map(id => ({ id, kind: 'decoy', name: DECOY_NAME[id] ?? id, group: 'Look-alikes of the needle', file: artFile(id) }));
  return [...items, ...decoys];
}

/** What public/art/manifest.json holds: the pictures that have been delivered. `v` changes when the file does. */
export interface ArtManifest {
  version: 1;
  items: Record<string, { v: string }>;
}
