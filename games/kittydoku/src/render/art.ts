/**
 * The KittyDoku mascot — flat-vector happy cat face.
 * Used on the title screen, win modal, and any spot needing a large cat.
 */
export function mascotSvg(size = 100): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
  <path d="M25 42 L28 13 Q28.5 8 33 11 L55 25 Z" fill="#b0a2d6"/>
  <path d="M75 42 L72 13 Q71.5 8 67 11 L45 25 Z" fill="#b0a2d6"/>
  <ellipse cx="50" cy="57" rx="32" ry="29" fill="#b0a2d6"/>
  <path d="M30.5 36 L32.5 18 L46 27 Z" fill="#ded8f0"/>
  <path d="M69.5 36 L67.5 18 L54 27 Z" fill="#ded8f0"/>
  <ellipse cx="33" cy="62" rx="5.5" ry="3.4" fill="#e7908c" opacity="0.75"/>
  <ellipse cx="67" cy="62" rx="5.5" ry="3.4" fill="#e7908c" opacity="0.75"/>
  <g fill="none" stroke="#fff8ef" stroke-width="3" stroke-linecap="round">
    <line x1="22" y1="60" x2="6"  y2="57"/>
    <line x1="22" y1="67" x2="7"  y2="69"/>
    <line x1="78" y1="60" x2="94" y2="57"/>
    <line x1="78" y1="67" x2="93" y2="69"/>
  </g>
  <g fill="none" stroke="#fff8ef" stroke-width="3.4" stroke-linecap="round">
    <path d="M32 57.5 Q38 51.5 44 57.5"/>
    <path d="M56 57.5 Q62 51.5 68 57.5"/>
    <path d="M43 65 Q50 73 57 65"/>
  </g>
</svg>`;
}

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
