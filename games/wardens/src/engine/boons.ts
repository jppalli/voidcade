export type BoonId = 'seers-eye' | 'banish' | 'aegis';

export interface BoonDef {
  id: BoonId;
  name: string;
  description: string;
  glyph: string; // key into elements.ts-style glyph set, defined locally below
}

export const BOONS: BoonDef[] = [
  {
    id: 'seers-eye',
    name: "Seer's Eye",
    description: 'Reveals one cell that is guaranteed correct in the true placement.',
    glyph: 'seers-eye',
  },
  {
    id: 'banish',
    name: 'Banish',
    description: 'Choose a domain — every cell in it that cannot hold a Warden is marked for you.',
    glyph: 'banish',
  },
  {
    id: 'aegis',
    name: 'Aegis',
    description: 'Shields you from your next mistake. The wrong placement is undone instead of counted against you.',
    glyph: 'aegis',
  },
];

export function getBoon(id: BoonId): BoonDef {
  return BOONS.find((b) => b.id === id)!;
}

const BOON_GLYPHS: Record<string, string> = {
  'seers-eye': '<circle cx="12" cy="12" r="4" /><path d="M2 12c2.5-4.5 6-7 10-7s7.5 2.5 10 7c-2.5 4.5-6 7-10 7s-7.5-2.5-10-7Z" stroke-opacity="0.7" />',
  banish: '<path d="M12 3l7 3.5v6c0 4.2-3 7-7 8.5-4-1.5-7-4.3-7-8.5v-6Z" /><line x1="9" y1="12" x2="15" y2="12" stroke-opacity="0.75" />',
  aegis: '<path d="M12 3l7 3.5v6c0 4.2-3 7-7 8.5-4-1.5-7-4.3-7-8.5v-6Z" /><path d="M9 12l2 2 4-4" />',
};

export function boonGlyphInner(id: string): string {
  return BOON_GLYPHS[id] ?? '';
}
