/**
 * Looks you can buy with coins: the colour of the hay, the frame around the board and the
 * needle's finish. They change nothing about how the game plays.
 */
export type Slot = 'hay' | 'frame' | 'needle';

export interface Look {
  id: string;
  name: string;
  cost: number;
  /** Multiplied onto the hay or needle (0xffffff leaves it as it is). Unused for frames. */
  color: number;
  /** A swatch for the shop, as a CSS colour. */
  swatch: string;
  /** Not for sale: it comes with this barn improvement (see barn.ts). */
  barn?: string;
}

export const HAY: Look[] = [
  { id: 'plain', name: 'Golden', cost: 0, color: 0xffffff, swatch: '#e3b85c' },
  { id: 'honey', name: 'Honey', cost: 90, color: 0xffd9a2, swatch: '#f0a850' },
  { id: 'sage', name: 'Sage', cost: 120, color: 0xdcf0c4, swatch: '#a7c46e' },
  { id: 'rose', name: 'Rose', cost: 150, color: 0xffcbd3, swatch: '#e8a0ac' },
  { id: 'frost', name: 'Frost', cost: 200, color: 0xcbe6ff, swatch: '#9cc4e6' },
  { id: 'wheat', name: 'Wheat', cost: 0, color: 0xffeeb4, swatch: '#f2d27a', barn: 'vane' },
];
export const FRAMES: Look[] = [
  { id: 'wood', name: 'Oak', cost: 0, color: 0xffffff, swatch: '#b8793d' },
  { id: 'mint', name: 'Mint', cost: 100, color: 0xffffff, swatch: '#6fc29a' },
  { id: 'rose', name: 'Blush', cost: 100, color: 0xffffff, swatch: '#e590a0' },
  { id: 'sky', name: 'Sky', cost: 130, color: 0xffffff, swatch: '#6fb0e8' },
  { id: 'night', name: 'Midnight', cost: 160, color: 0xffffff, swatch: '#55649f' },
  { id: 'gold', name: 'Gilded', cost: 300, color: 0xffffff, swatch: '#e8c64a' },
  { id: 'barn', name: 'Barn red', cost: 0, color: 0xffffff, swatch: '#b5473a', barn: 'flowers' },
];
export const NEEDLES: Look[] = [
  { id: 'steel', name: 'Steel', cost: 0, color: 0xffffff, swatch: '#c3c7c0' },
  { id: 'copper', name: 'Copper', cost: 100, color: 0xf0a070, swatch: '#d98a58' },
  { id: 'mint', name: 'Mint', cost: 120, color: 0xa6f0c8, swatch: '#7fd6a8' },
  { id: 'rose', name: 'Rose gold', cost: 120, color: 0xffa8b8, swatch: '#f08aa0' },
  { id: 'gold', name: 'Gold', cost: 200, color: 0xffdc72, swatch: '#f0c23c' },
  { id: 'brass', name: 'Brass', cost: 0, color: 0xe8c27a, swatch: '#c99a45', barn: 'mill' },
];
export const LOOKS: Record<Slot, Look[]> = { hay: HAY, frame: FRAMES, needle: NEEDLES };
export const SLOT_NAME: Record<Slot, string> = { hay: 'Haystack colour', frame: 'Board frame', needle: 'Needle' };

/** Multiplies two colours channel by channel. */
export function mulColor(a: number, b: number): number {
  const ch = (s: number) => Math.round((((a >> s) & 255) * ((b >> s) & 255)) / 255);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
