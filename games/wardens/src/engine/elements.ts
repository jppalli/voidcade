// Elemental theme for each region/Warden. 9 elements defined so grids up to
// 9x9 (the largest size used in this game) always have a distinct glyph +
// color per region. Smaller levels just use the first N.

export interface ElementDef {
  id: string;
  name: string;
  color: string;
  glow: string;
}

export const ELEMENTS: ElementDef[] = [
  { id: 'fire',    name: 'Fire',    color: '#ff6b6b', glow: '#ff6b6b55' },
  { id: 'water',   name: 'Water',   color: '#4dd0ff', glow: '#4dd0ff55' },
  { id: 'earth',   name: 'Earth',   color: '#9a7b4f', glow: '#9a7b4f55' },
  { id: 'air',     name: 'Air',     color: '#d8e4ff', glow: '#d8e4ff44' },
  { id: 'lightning', name: 'Lightning', color: '#ffe14d', glow: '#ffe14d55' },
  { id: 'frost',   name: 'Frost',   color: '#8affea', glow: '#8affea55' },
  { id: 'bloom',   name: 'Bloom',   color: '#7dffb0', glow: '#7dffb055' },
  { id: 'shadow',  name: 'Shadow',  color: '#b58aff', glow: '#b58aff55' },
  { id: 'radiant', name: 'Radiant', color: '#ff9fe0', glow: '#ff9fe055' },
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
