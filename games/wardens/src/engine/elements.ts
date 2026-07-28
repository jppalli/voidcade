// Elemental theme for each region/Warden. 9 elements defined so grids up to
// 9x9 (the largest size used in this game) always have a distinct glyph +
// color per region. Smaller levels just use the first N.

export interface ElementDef {
  id: string;
  name: string;
  /** bright accent used for the Warden glyph and borders */
  color: string;
  /** solid, clearly-distinguishable region fill for the board */
  cell: string;
  /** darker ink used for glyphs drawn on top of the bright fill */
  ink: string;
}

// Region fills are deliberately solid mid-tone colors (not low-alpha tints)
// so adjacent domains stay easy to tell apart, including on small phone
// screens. Each `ink` is a darkened version of its fill so the Warden glyph
// reads clearly on top of it.
export const ELEMENTS: ElementDef[] = [
  { id: 'fire',      name: 'Fire',      color: '#ff8a75', cell: '#c94f3d', ink: '#2b0b06' },
  { id: 'water',     name: 'Water',     color: '#6fd2ff', cell: '#2f7fc4', ink: '#04182b' },
  { id: 'earth',     name: 'Earth',     color: '#e0b072', cell: '#9c7238', ink: '#2a1a05' },
  { id: 'air',       name: 'Air',       color: '#eef2ff', cell: '#8f9bbf', ink: '#151a2b' },
  { id: 'lightning', name: 'Lightning', color: '#ffe98a', cell: '#c9a520', ink: '#2b2103' },
  { id: 'frost',     name: 'Frost',     color: '#9dffee', cell: '#2fa896', ink: '#032722' },
  { id: 'bloom',     name: 'Bloom',     color: '#9dffc4', cell: '#3aa762', ink: '#04250f' },
  { id: 'shadow',    name: 'Shadow',    color: '#c9a8ff', cell: '#7a55c4', ink: '#170a2b' },
  { id: 'radiant',   name: 'Radiant',   color: '#ffc9ee', cell: '#dd7fbb', ink: '#33082a' },
];

// Neon line-art glyph paths, same rendering convention as Bubble Shooter's
// icons.js (plain SVG inner markup, no emoji).
const GLYPH_PATHS: Record<string, string> = {
  fire: '<path d="M12 3c1.8 3 .5 4.6-.6 6-1.4 1.8-2.2 3.3-2.2 5a4.8 4.8 0 0 0 9.6 0c0-2-1-3.4-1-5.2 0 1.6-1 2.6-2 2.6-1.3 0-1.6-1.3-1.2-2.6.5-1.7-.6-3.8-2.6-5.8Z" />',
  water: '<path d="M12 3c3 4 6 8.2 6 11.5A6 6 0 0 1 6 14.5C6 11.2 9 7 12 3Z" /><circle cx="12" cy="15" r="1.6" stroke-opacity="0.6" />',
  earth: '<circle cx="12" cy="12" r="8" /><path d="M6 10c2-1.5 4-.5 6 1s4 2.2 6 .8" stroke-opacity="0.6" /><path d="M5.5 15c2.2-1 4.3.2 6 1.4s4 1.6 6-0.2" stroke-opacity="0.4" />',
  air: '<path d="M3 8h12a3 3 0 1 0-2.4-4.8" stroke-opacity="0.85" /><path d="M3 13h15a3 3 0 1 1-2.4 4.8" /><path d="M3 18h9" stroke-opacity="0.6" />',
  lightning: '<path d="M13 2 5 14h5l-1 8 8-12h-5z" />',
  frost: '<path d="M12 2v20" /><path d="M4 7l16 10" /><path d="M20 7 4 17" /><circle cx="12" cy="12" r="1.6" />',
  bloom: '<circle cx="12" cy="8" r="3" /><circle cx="7.5" cy="14" r="3" stroke-opacity="0.75" /><circle cx="16.5" cy="14" r="3" stroke-opacity="0.75" /><circle cx="12" cy="12" r="1.4" />',
  shadow: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />',
  radiant: '<circle cx="12" cy="12" r="3.4" /><line x1="12" y1="2" x2="12" y2="5.5" /><line x1="12" y1="18.5" x2="12" y2="22" /><line x1="2" y1="12" x2="5.5" y2="12" /><line x1="18.5" y1="12" x2="22" y2="12" /><line x1="4.9" y1="4.9" x2="7.2" y2="7.2" stroke-opacity="0.6" /><line x1="19.1" y1="4.9" x2="16.8" y2="7.2" stroke-opacity="0.6" /><line x1="4.9" y1="19.1" x2="7.2" y2="16.8" stroke-opacity="0.6" /><line x1="19.1" y1="19.1" x2="16.8" y2="16.8" stroke-opacity="0.6" />',
};

export function elementGlyphInner(elementId: string): string {
  return GLYPH_PATHS[elementId] ?? '';
}

export function getElement(index: number): ElementDef {
  return ELEMENTS[index % ELEMENTS.length];
}
