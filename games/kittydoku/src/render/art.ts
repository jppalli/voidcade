/**
 * A cat coat for the mascot. `line` colours the eyes; `mouth` colours the
 * nose-to-mouth line (defaults to `line`). `outline` is the silhouette edge;
 * when omitted it's a deeper shade of `body`. `pattern` is extra SVG markup
 * drawn over the head (clipped to the silhouette) and under the face.
 */
export interface Coat {
  name: string;
  body: string;
  innerEar: string;
  blush: string;
  line: string;
  mouth?: string;
  nose?: string;
  outline?: string;
  pattern?: string;
}

/** Visible ear shapes, used by coat patterns (calico/siamese ear colours). */
const EAR_L = 'M25 42 L28 13 Q28.5 8 33 11 L55 25 Z';
const EAR_R = 'M75 42 L72 13 Q71.5 8 67 11 L45 25 Z';
/** Same ears with the base pushed deep into the head (hidden behind it), so
 *  a twitching ear never lifts far enough to show a gap at its root. */
const EAR_L_FULL = 'M25 42 L28 13 Q28.5 8 33 11 L55 25 L50 46 Z';
const EAR_R_FULL = 'M75 42 L72 13 Q71.5 8 67 11 L45 25 L50 46 Z';
/** Round head with little fur tufts at the cheeks, so the silhouette reads
 *  as fluffy rather than a plain ellipse. */
const HEAD_PATH =
  'M50 28 C67 28 79 37 81 51 L86.5 56.5 L81.5 60 L85.5 66 L79 68 ' +
  'C74.5 79.5 63.5 86 50 86 C36.5 86 25.5 79.5 21 68 L14.5 66 L18.5 60 ' +
  'L13.5 56.5 L19 51 C21 37 33 28 50 28 Z';

/** Whiskers are drawn in this warm ink so they read on every pastel square
 *  and on the cream page, whatever the coat colour. */
const WHISKER = '#4a3b34';

const foreheadStripes = (color: string) =>
  `<g fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round">
    <path d="M50 31 V40"/><path d="M42 32 L43.5 39"/><path d="M58 32 L56.5 39"/>
  </g>`;

export const COATS = {
  lilac: {
    name: 'lilac', body: '#b0a2d6', innerEar: '#e4dcf5', blush: '#f09a9a', line: '#4b3d66',
  },
  ginger: {
    name: 'ginger', body: '#f2a65e', innerEar: '#fbd5b0', blush: '#e5786f', line: '#6b3a17',
    pattern: foreheadStripes('#d9803a'),
  },
  greyTabby: {
    name: 'grey tabby', body: '#a9a6b3', innerEar: '#e0dce6', blush: '#ee9a98', line: '#3f3c4a',
    pattern: foreheadStripes('#7a7685'),
  },
  black: {
    // Golden eyes read on a dark face without the stark look of cream lines.
    name: 'black', body: '#4d4452', innerEar: '#8f7f92', blush: '#e58a93', line: '#f3c969',
    nose: '#e58a93', mouth: '#d9c3cc',
  },
  cream: {
    name: 'cream', body: '#f7e8d0', innerEar: '#f6c9bd', blush: '#eda39a', line: '#6e5242',
    outline: '#c9a984',
  },
  tuxedo: {
    name: 'tuxedo', body: '#4d4452', innerEar: '#9b8b9c', blush: '#e7908c', line: '#f3c969',
    mouth: '#4a3b34',
    // White blaze down the nose widening into a muzzle and chin bib.
    pattern: `<path d="M50 36 Q48.5 48 47.5 58 Q36 62 37 74 Q40 85.5 50 86 Q60 85.5 63 74 Q64 62 52.5 58 Q51.5 48 50 36 Z" fill="#fbf6ee"/>`,
  },
  calico: {
    name: 'calico', body: '#fbf3e6', innerEar: '#f6c9bd', blush: '#eda39a', line: '#6b5048',
    outline: '#cdb79c',
    pattern: `<path d="${EAR_L}" fill="#f0a35e"/><ellipse cx="37" cy="40" rx="12" ry="8" fill="#f0a35e"/>
      <path d="${EAR_R}" fill="#5a4f57"/><ellipse cx="65" cy="39" rx="9" ry="6.5" fill="#5a4f57"/>`,
  },
  snow: {
    // White winter cat with dark eyes and pink ears.
    name: 'snow', body: '#f7f5fa', innerEar: '#f6c9d4', blush: '#f2a5b2', line: '#4e4a62',
    outline: '#c6c0d6',
  },
  smoke: {
    // Blue-grey "smoke" cat with golden eyes, for the lantern night.
    name: 'smoke', body: '#7d87a6', innerEar: '#b9c0d8', blush: '#ef9aa6', line: '#ffd88a',
    mouth: '#2f3550', nose: '#e58a93',
  },
  siamese: {
    // Dark eye lines on the mid-brown mask, like the lighter coats.
    name: 'siamese', body: '#f4e8d6', innerEar: '#c9a08e', blush: '#e9a59b', line: '#3a2620',
    outline: '#c8b096', nose: '#d98e86',
    // Dark points: ears and a soft face mask.
    pattern: `<path d="${EAR_L}" fill="#7d5f52"/><path d="${EAR_R}" fill="#7d5f52"/>
      <ellipse cx="50" cy="63" rx="22" ry="15" fill="#8c6c5e" opacity="0.92"/>`,
  },
} satisfies Record<string, Coat>;

// ---------------------------------------------------------------- colour

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/** Blend two hex colours; t=0 gives `a`, t=1 gives `b`. */
function mix(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return '#' + ca.map((v, i) => Math.round(v + (cb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

function isLight(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

/** Each SVG needs its own gradient/clip ids, since many cats share a page. */
let svgUid = 0;

/** The original lilac mascot: title, modals and how-to demo. */
export const DEFAULT_COAT: Coat = COATS.lilac;

/**
 * The KittyDoku mascot: a soft-shaded happy cat face in a given coat.
 * Used on the title screen, modals, and board cells for correct cats.
 * Eyes are content and closed (`.eyesClosed`); `.eyesOpen` is hidden unless
 * CSS animates a blink on the board.
 */
export function mascotSvg(size = 100, coat: Coat = DEFAULT_COAT): string {
  const u = ++svgUid;
  const edge = coat.outline ?? mix(coat.body, '#2a1f1a', 0.38);
  const nose = coat.nose ?? mix(coat.blush, '#4a3b34', 0.3);
  const mouth = coat.mouth ?? coat.line;
  // Light (golden) eyes get a dark slit pupil when open; dark eyes don't need one.
  const pupils = isLight(coat.line)
    ? `<ellipse cx="38" cy="54.5" rx="1.3" ry="3.4" fill="#2a1f1a"/>
    <ellipse cx="62" cy="54.5" rx="1.3" ry="3.4" fill="#2a1f1a"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
  <defs>
    <radialGradient id="kd-shade-${u}" gradientUnits="userSpaceOnUse" cx="42" cy="38" r="58">
      <stop offset="0"    stop-color="#ffffff" stop-opacity="0.34"/>
      <stop offset="0.5"  stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="1"    stop-color="#2a1f1a" stop-opacity="0.24"/>
    </radialGradient>
    <radialGradient id="kd-blush-${u}">
      <stop offset="0" stop-color="${coat.blush}" stop-opacity="0.85"/>
      <stop offset="1" stop-color="${coat.blush}" stop-opacity="0"/>
    </radialGradient>
    <!-- Ears use an opaque gradient (not a translucent overlay) so the spot
         where the two ears overlap doesn't get shaded twice. -->
    <linearGradient id="kd-ear-${u}" gradientUnits="userSpaceOnUse" x1="50" y1="8" x2="50" y2="42">
      <stop offset="0" stop-color="${mix(coat.body, '#ffffff', 0.2)}"/>
      <stop offset="1" stop-color="${coat.body}"/>
    </linearGradient>
    <clipPath id="kd-clip-${u}">
      <path d="${EAR_L_FULL}"/><path d="${EAR_R_FULL}"/><path d="${HEAD_PATH}"/>
    </clipPath>
  </defs>

  <!-- silhouette edge, drawn behind so it reads as a soft outline -->
  <g fill="${edge}" stroke="${edge}" stroke-width="4.5" stroke-linejoin="round">
    <path d="${EAR_L_FULL}"/><path class="earR" d="${EAR_R_FULL}"/><path d="${HEAD_PATH}"/>
  </g>

  <path d="${EAR_L_FULL}" fill="url(#kd-ear-${u})"/>
  <path class="earR" d="${EAR_R_FULL}" fill="url(#kd-ear-${u})"/>
  <path d="${HEAD_PATH}" fill="${coat.body}"/>
  <g clip-path="url(#kd-clip-${u})">${coat.pattern ?? ''}</g>

  <path d="M30.5 36 L32.5 18 L46 27 Z" fill="${coat.innerEar}"/>
  <path class="earR" d="M69.5 36 L67.5 18 L54 27 Z" fill="${coat.innerEar}"/>

  <path d="${HEAD_PATH}" fill="url(#kd-shade-${u})"/>
  <ellipse cx="50" cy="69.5" rx="13" ry="8.5" fill="#ffffff" opacity="0.16"/>

  <ellipse cx="31" cy="63.5" rx="8" ry="5.2" fill="url(#kd-blush-${u})"/>
  <ellipse cx="69" cy="63.5" rx="8" ry="5.2" fill="url(#kd-blush-${u})"/>

  <g fill="none" stroke="${WHISKER}" stroke-width="2.2" stroke-linecap="round" opacity="0.72">
    <path d="M23 62 Q14 59.6 4.5 58.8"/>
    <path d="M23 66.5 Q14.5 67.2 5.5 70.5"/>
    <path d="M77 62 Q86 59.6 95.5 58.8"/>
    <path d="M77 66.5 Q85.5 67.2 94.5 70.5"/>
  </g>

  <g class="eyesClosed" fill="none" stroke="${coat.line}" stroke-width="3.6" stroke-linecap="round">
    <path d="M31 56.5 Q38 49.5 45 56.5"/>
    <path d="M55 56.5 Q62 49.5 69 56.5"/>
  </g>
  <g class="eyesOpen" fill="${coat.line}" opacity="0">
    <ellipse cx="38" cy="54.5" rx="3.8" ry="4.4"/>
    <ellipse cx="62" cy="54.5" rx="3.8" ry="4.4"/>
    ${pupils}
    <circle cx="39.3" cy="53" r="1.4" fill="#ffffff"/>
    <circle cx="63.3" cy="53" r="1.4" fill="#ffffff"/>
  </g>

  <path d="M46.2 62.4 Q50 60.8 53.8 62.4 Q52.6 65.8 50 66.2 Q47.4 65.8 46.2 62.4 Z" fill="${nose}"/>
  <g fill="none" stroke="${mouth}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M50 66.2 V68.2 Q50 71.2 46.6 71.2 Q44 71.2 43.2 69"/>
    <path d="M50 68.2 Q50 71.2 53.4 71.2 Q56 71.2 56.8 69"/>
  </g>
</svg>`;
}

/** Coat for the angel cat: pale lavender-white, soft grey lines. */
const ANGEL_COAT: Coat = {
  name: 'angel', body: '#f6f3fb', innerEar: '#ebe3f6', blush: '#f2c8d4', line: '#988fac',
  outline: '#cfc6e0', mouth: '#988fac', nose: '#e6b9c8',
};

/** One feathered wing (left side); the right one is mirrored. */
const WING =
  'M33 58 C21 44 7 46 4 58 C9 57 13 59 14 62 C8 63 5 68 7 73 C12 70 16 71 18 74 ' +
  'C14 77 15 82 19 85 C25 80 31 71 33 58 Z';

/**
 * Wrong guess: the same soft mascot, now a little angel. Pale coat, peaceful
 * closed eyes, a halo and small feathered wings. The board draws it see-through
 * (see .wrongWrap) so it reads as "not here" without being sad or scary.
 */
export function deadCatSvg(size = 100): string {
  const face = mascotSvg(74, ANGEL_COAT).replace('<svg ', '<svg x="13" y="22" ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
  <g transform="rotate(-7 50 58)">
    <g fill="#ffffff" stroke="#d6cee6" stroke-width="2" stroke-linejoin="round">
      <path d="${WING}"/>
      <path d="${WING}" transform="translate(100 0) scale(-1 1)"/>
    </g>
    <g fill="none" stroke="#e4dcef" stroke-width="1.4" stroke-linecap="round">
      <path d="M26 58 C19 54 13 55 10 59 M27 66 C21 64 15 66 13 69"/>
      <path d="M74 58 C81 54 87 55 90 59 M73 66 C79 64 85 66 87 69"/>
    </g>
    ${face}
    <ellipse cx="50" cy="15" rx="17" ry="4.6" fill="none" stroke="#fff3c4" stroke-width="6" opacity="0.7"/>
    <ellipse cx="50" cy="15" rx="17" ry="4.6" fill="none" stroke="#e9cf7a" stroke-width="2.6"/>
    <path d="M86 24 l1.6 3.6 3.6 1.6 -3.6 1.6 -1.6 3.6 -1.6 -3.6 -3.6 -1.6 3.6 -1.6 Z" fill="#e9cf7a"/>
    <path d="M14 26 l1.1 2.5 2.5 1.1 -2.5 1.1 -1.1 2.5 -1.1 -2.5 -2.5 -1.1 2.5 -1.1 Z" fill="#cfc6e0"/>
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
  /** Coat of the cat that lives in this patch, picked to contrast with
   *  `fill`. Fixed per colour, so a patch always shows the same cat. */
  coat: Coat;
}

export const PASTELS: Pastel[] = [
  { name: 'peach',     fill: '#ffd6a5', ink: '#8a4b12', coat: COATS.greyTabby },
  { name: 'lilac',     fill: '#d7c7ff', ink: '#4b3187', coat: COATS.ginger },
  { name: 'mint',      fill: '#b8ebc8', ink: '#1f6b3c', coat: COATS.tuxedo },
  { name: 'sky',       fill: '#bfe3ff', ink: '#175680', coat: COATS.siamese },
  { name: 'blossom',   fill: '#ffc9d9', ink: '#8f2c4d', coat: COATS.black },
  { name: 'butter',    fill: '#fff0a8', ink: '#7d5f04', coat: COATS.lilac },
  { name: 'sage',      fill: '#d6e6b8', ink: '#4c6320', coat: COATS.calico },
  { name: 'cornflower',fill: '#c9cdff', ink: '#333b91', coat: COATS.cream },
  { name: 'clay',      fill: '#f6cdb8', ink: '#8a4526', coat: COATS.tuxedo },
];

export function pastel(index: number): Pastel {
  return PASTELS[index % PASTELS.length];
}

/**
 * "Purrfect" medal: a gold coin with a star, hung on two pink ribbon tails.
 * Marks levels solved without a hint (map nodes, header stats). Flat fills
 * only (no gradient ids), so it can repeat freely on one page.
 */
export function medalSvg(size = 24): string {
  const star = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    .map((i) => {
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const r = i % 2 === 0 ? 5.6 : 2.5;
      return `${(12 + Math.cos(a) * r).toFixed(2)},${(11.2 + Math.sin(a) * r).toFixed(2)}`;
    })
    .join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 28" width="${size}" height="${Math.round((size * 28) / 24)}" aria-hidden="true">
    <path d="M7.2 15.5 L4.2 26.5 L7.9 24.9 L9.9 27.6 L12.2 17.4 Z" fill="#ff9db0"/>
    <path d="M16.8 15.5 L19.8 26.5 L16.1 24.9 L14.1 27.6 L11.8 17.4 Z" fill="#e0687f"/>
    <circle cx="12" cy="11.2" r="9.6" fill="#e9a92a"/>
    <circle cx="12" cy="11.2" r="8.2" fill="#ffcf4d"/>
    <circle cx="12" cy="11.2" r="6.6" fill="none" stroke="#f5b93a" stroke-width="1.1"/>
    <polygon points="${star}" fill="#fff6d6"/>
    <ellipse cx="8.6" cy="6.9" rx="2.6" ry="1.3" fill="#ffffff" opacity="0.55" transform="rotate(-30 8.6 6.9)"/>
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
