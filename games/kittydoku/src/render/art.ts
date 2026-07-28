/**
 * Pastel region palette. Nine entries so boards up to 9x9 always have a
 * distinct colour per region. `fill` is the square, `ink` is the cat drawn on
 * top of it — each ink is a deep version of its own hue so the cat reads
 * clearly without going muddy grey.
 */
export interface Pastel {
  name: string;
  fill: string;
  ink: string;
}

export const PASTELS: Pastel[] = [
  { name: 'peach',     fill: '#ffd6a5', ink: '#8a4b12' },
  { name: 'lilac',     fill: '#d7c7ff', ink: '#4b3187' },
  { name: 'mint',      fill: '#b8ebc8', ink: '#1f6b3c' },
  { name: 'sky',       fill: '#bfe3ff', ink: '#175680' },
  { name: 'blossom',   fill: '#ffc9d9', ink: '#8f2c4d' },
  { name: 'butter',    fill: '#fff0a8', ink: '#7d5f04' },
  { name: 'sage',      fill: '#d6e6b8', ink: '#4c6320' },
  { name: 'cornflower',fill: '#c9cdff', ink: '#333b91' },
  { name: 'clay',      fill: '#f6cdb8', ink: '#8a4526' },
];

export function pastel(index: number): Pastel {
  return PASTELS[index % PASTELS.length];
}

/**
 * A sitting cat, as SVG inner markup. Simple filled silhouette — ears, head,
 * body, tail — so it stays readable at small board sizes where line art would
 * turn to mush.
 */
export function catSvg(color: string, size = 40): string {
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" fill="none" aria-hidden="true">
    <path d="M13 19 L11.5 9.5 L19.5 14.5 Z" fill="${color}"/>
    <path d="M35 19 L36.5 9.5 L28.5 14.5 Z" fill="${color}"/>
    <ellipse cx="24" cy="22" rx="11" ry="9.5" fill="${color}"/>
    <path d="M15 30 Q24 27 33 30 L35 41 Q24 44 13 41 Z" fill="${color}"/>
    <path d="M35 38 Q43 37 42 29 Q41.4 25 37.5 25.5" stroke="${color}" stroke-width="3.4"
      stroke-linecap="round" fill="none"/>
    <circle cx="20" cy="21" r="1.7" fill="#fffdf7"/>
    <circle cx="28" cy="21" r="1.7" fill="#fffdf7"/>
    <path d="M22.4 25.4 Q24 26.8 25.6 25.4" stroke="#fffdf7" stroke-width="1.5"
      stroke-linecap="round" fill="none"/>
  </svg>`;
}

/** Paw print used for "no cat can go here" marks. */
export function pawSvg(color: string, size = 22): string {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}" aria-hidden="true">
    <ellipse cx="12" cy="15.5" rx="5" ry="4.2"/>
    <circle cx="6.2" cy="10.4" r="2.1"/>
    <circle cx="10" cy="7.4" r="2.2"/>
    <circle cx="14" cy="7.4" r="2.2"/>
    <circle cx="17.8" cy="10.4" r="2.1"/>
  </svg>`;
}
