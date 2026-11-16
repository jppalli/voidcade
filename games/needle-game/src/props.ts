/**
 * Scenery art for the five worlds, as inline SVG strings. The same pieces
 * stand in the map's margins (worldmap.ts) and behind the board (scenery.ts).
 *
 * Flat shapes with a little shading, no outlines, to match the rest of the game.
 * Classes starting with "p" (pSway, pPuff, pFlame...) are animated in casual.css.
 * Strings never contain single quotes: some end up inside style attributes.
 */
import { pickSvg, registerFallback } from './artdom';

const box = (viewBox: string, body: string) => `<svg viewBox="${viewBox}" aria-hidden="true">${body}</svg>`;

const ground = (cx: number, cy: number, rx: number) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${Math.max(3, rx / 9)}" fill="#1f3a14" opacity=".2"/>`;

/** n petals (ellipses) around a centre. */
const petals = (cx: number, cy: number, n: number, rx: number, ry: number, dist: number, fill: string) =>
  Array.from({ length: n }, (_, i) => `<ellipse cx="${cx}" cy="${cy - dist}" rx="${rx}" ry="${ry}" fill="${fill}" transform="rotate(${(i * 360) / n} ${cx} ${cy})"/>`).join('');

// ---------------------------------------------------------------- world 1 · The Meadow

const WINDMILL_SVG =
  '<svg viewBox="0 0 100 140" aria-hidden="true"><path d="M36 134 L44 54 H56 L64 134 Z" fill="#f2dfbd"/><path d="M50 54 H56 L64 134 H50 Z" fill="#dcc29a"/><path d="M39 56 L50 34 L61 56 Z" fill="#c8704a"/><rect x="46" y="116" width="8" height="18" rx="4" fill="#8a5a3c"/><circle cx="50" cy="86" r="4" fill="#8a5a3c"/>' +
  '<g class="blades">' +
  [0, 90, 180, 270]
    .map((a) => `<g transform="rotate(${a} 50 48)"><rect x="48.6" y="6" width="2.8" height="42" rx="1" fill="#8a5a3c"/><rect x="51.4" y="8" width="11" height="26" fill="#fff4dc" stroke="#9c7a52" stroke-width="1"/><path d="M51.4 21H62.4M57 8V34" stroke="#c9ad82" stroke-width=".8"/></g>`)
    .join('') +
  '<circle cx="50" cy="48" r="4.5" fill="#8a5a3c"/></g></svg>';

const SUNFLOWER_SVG = box(
  '0 0 70 130',
  `<g class="pSway"><path d="M35 128 V56" stroke="#4f9a47" stroke-width="5.5" stroke-linecap="round"/><path d="M35 100 Q12 96 8 78 Q30 80 35 96Z" fill="#62ae55"/><path d="M35 86 Q58 82 62 64 Q40 66 35 82Z" fill="#62ae55"/>${petals(35, 38, 14, 6, 12, 17, '#ffc93c')}${petals(35, 38, 14, 5, 10, 15, '#ffdc6b')}<circle cx="35" cy="38" r="12" fill="#7a4a21"/><circle cx="35" cy="38" r="6.5" fill="#5a3416"/></g>`
);

const daisy = (x: number, y: number, s: number) =>
  `<path d="M${x} ${y + 7 * s} V66" stroke="#5aa84f" stroke-width="3" stroke-linecap="round"/>${petals(x, y, 8, 3.2 * s, 5.5 * s, 7 * s, '#ffffff')}<circle cx="${x}" cy="${y}" r="${4 * s}" fill="#ffc93c"/>`;

const DAISIES_SVG = box(
  '0 0 110 72',
  `<path d="M4 70 Q18 54 28 70 Q40 50 50 70 Q64 52 74 70 Q88 56 104 70Z" fill="#6bbd5a"/><g class="pSway">${daisy(24, 38, 1)}${daisy(58, 26, 1.15)}${daisy(86, 40, 0.95)}</g>`
);

const BUSH_SVG = box(
  '0 0 120 80',
  `${ground(60, 74, 52)}<circle cx="34" cy="48" r="26" fill="#5aaa4e"/><circle cx="62" cy="38" r="32" fill="#68b95a"/><circle cx="88" cy="50" r="26" fill="#58a74c"/><circle cx="50" cy="26" r="8" fill="#8bd276" opacity=".6"/><circle cx="76" cy="58" r="3.4" fill="#e4453a"/><circle cx="30" cy="56" r="3.4" fill="#e4453a"/><circle cx="96" cy="46" r="3.4" fill="#e4453a"/>`
);

const BUTTERFLY_SVG = (wingA: string, wingB: string) =>
  box(
    '0 0 30 24',
    `<g fill="${wingA}" stroke="#6a4a2a" stroke-width=".8"><path class="wing l" d="M15 12 C7 0 0 5 4 12 C1 18 8 24 15 14 Z"/><path class="wing r" d="M15 12 C23 0 30 5 26 12 C29 18 22 24 15 14 Z"/></g><circle cx="9" cy="10" r="2.2" fill="${wingB}"/><circle cx="21" cy="10" r="2.2" fill="${wingB}"/><path d="M15 6 V19" stroke="#4a3320" stroke-width="1.8" stroke-linecap="round"/>`
  );

// ---------------------------------------------------------------- world 2 · The Barnyard

const BARN_SVG = box(
  '0 0 160 140',
  `${ground(80, 132, 66)}<path d="M22 70 H138 V128 H22Z" fill="#c4443a"/><path d="M12 74 L34 30 Q80 8 126 30 L148 74 Z" fill="#8c3a2e"/><path d="M34 30 Q80 8 126 30" fill="none" stroke="#b05a44" stroke-width="3"/><path d="M22 70 H138" stroke="#f6e9d8" stroke-width="4"/><rect x="58" y="84" width="44" height="44" fill="#a63a31" stroke="#f6e9d8" stroke-width="4"/><path d="M58 84 L102 128 M102 84 L58 128" stroke="#f6e9d8" stroke-width="4"/><rect x="68" y="42" width="24" height="20" rx="2" fill="#3a2a22" stroke="#f6e9d8" stroke-width="3.5"/><path d="M80 42 V62" stroke="#f6e9d8" stroke-width="2.5"/>`
);

const FENCE_SVG = box(
  '0 0 150 70',
  `<path d="M0 26 H150 M0 48 H150" stroke="#d9b87c" stroke-width="7"/>${[10, 40, 70, 100, 130].map((x) => `<path d="M${x - 8} 66 V16 L${x} 6 L${x + 8} 16 V66Z" fill="#f4e2b8" stroke="#c9a56a" stroke-width="2.4"/>`).join('')}`
);

const CHICKEN_SVG = box(
  '0 0 70 70',
  `${ground(34, 66, 22)}<path d="M28 56 V64 M38 56 V64" stroke="#e8923a" stroke-width="3" stroke-linecap="round"/><path d="M10 40 Q2 34 8 24 Q16 30 18 40Z" fill="#fff8ec" stroke="#e0c9a0" stroke-width="2"/><ellipse cx="32" cy="42" rx="22" ry="17" fill="#fff8ec" stroke="#e0c9a0" stroke-width="2"/><path d="M22 42 Q30 52 40 44" fill="none" stroke="#e0c9a0" stroke-width="2.4"/><circle cx="46" cy="26" r="11" fill="#fff8ec" stroke="#e0c9a0" stroke-width="2"/><path d="M42 17 Q44 8 48 13 Q51 7 53 14" fill="#e4453a"/><path d="M56 26 L66 29 L56 32Z" fill="#f2a53a"/><circle cx="49" cy="24" r="2" fill="#4a3320"/><path d="M48 36 Q50 42 46 44" fill="#e4453a"/>`
);

/** A classic cone-shaped haystack (the theme of the game). */
const HAYSTACK_SVG = box(
  '0 0 120 110',
  `${ground(60, 102, 52)}<path d="M8 100 Q10 44 60 8 Q110 44 112 100 Z" fill="#e8c25c"/><path d="M30 98 Q34 62 58 26 M60 98 V24 M90 98 Q86 62 62 26" fill="none" stroke="#c99a3a" stroke-width="3" stroke-linecap="round" opacity=".6"/><path d="M14 78 Q60 90 106 78" fill="none" stroke="#b98a30" stroke-width="3.4" stroke-linecap="round"/><path d="M26 54 Q60 64 94 54" fill="none" stroke="#b98a30" stroke-width="3.4" stroke-linecap="round"/><path d="M52 14 L56 2 L60 12 L64 1 L68 14Z" fill="#f2d57a"/>`
);

// ---------------------------------------------------------------- world 3 · The Orchard

const AUTUMN_TREE_SVG = box(
  '0 0 140 170',
  `${ground(70, 164, 40)}<path d="M62 164 Q64 120 58 96 H82 Q76 120 80 164Z" fill="#7a4a2a"/><path d="M68 112 Q48 98 38 82 M72 110 Q92 98 102 80" stroke="#7a4a2a" stroke-width="7" stroke-linecap="round" fill="none"/><g class="pSway"><circle cx="36" cy="78" r="30" fill="#d4602a"/><circle cx="106" cy="76" r="32" fill="#e89a35"/><circle cx="70" cy="60" r="44" fill="#e0782a"/><circle cx="52" cy="40" r="26" fill="#f0a53c"/><circle cx="92" cy="38" r="26" fill="#e0782a"/><circle cx="60" cy="30" r="9" fill="#f6c25a" opacity=".7"/><circle cx="50" cy="84" r="5" fill="#c9302a"/><circle cx="88" cy="70" r="5" fill="#c9302a"/><circle cx="108" cy="92" r="5" fill="#c9302a"/></g>`
);

const PUMPKIN_SVG = box(
  '0 0 90 76',
  `${ground(45, 70, 38)}<ellipse cx="45" cy="44" rx="36" ry="26" fill="#f08a2c"/><ellipse cx="28" cy="44" rx="14" ry="26" fill="#e47820"/><ellipse cx="62" cy="44" rx="14" ry="26" fill="#e47820"/><ellipse cx="45" cy="44" rx="14" ry="26" fill="#f6a043"/><path d="M45 20 Q44 10 50 6" stroke="#4f7a2a" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M50 14 Q62 8 66 16 Q58 20 50 14Z" fill="#6aa83a"/>`
);

const SCARECROW_SVG = box(
  '0 0 110 170',
  `${ground(55, 166, 20)}<path d="M55 40 V166" stroke="#7a5230" stroke-width="7" stroke-linecap="round"/><path d="M10 70 H100" stroke="#7a5230" stroke-width="7" stroke-linecap="round"/><g class="pSway"><path d="M32 62 H78 L84 112 H26Z" fill="#c4453a"/><path d="M40 62 V112 M55 62 V112 M70 62 V112 M30 80 H82 M28 96 H84" stroke="#e8c2a0" stroke-width="2" opacity=".6"/><path d="M8 66 l-6 -4 M8 70 l-7 0 M8 74 l-6 4 M102 66 l6 -4 M102 70 l7 0 M102 74 l6 4 M30 112 l-3 10 M42 112 l-1 12 M55 112 v12 M68 112 l1 12 M80 112 l3 10" stroke="#e8c25c" stroke-width="3" stroke-linecap="round"/><circle cx="55" cy="42" r="17" fill="#e6c78f" stroke="#b99556" stroke-width="2"/><circle cx="49" cy="40" r="2.4" fill="#4a3320"/><circle cx="61" cy="40" r="2.4" fill="#4a3320"/><path d="M55 43 l-3 6 h6z" fill="#e0a34a"/><path d="M47 51 Q55 58 63 51" stroke="#4a3320" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M34 30 H76 L70 26 Q55 6 40 26Z" fill="#8a5a34"/><ellipse cx="55" cy="30" rx="26" ry="5" fill="#6f4526"/><path d="M42 27 Q55 22 68 27" stroke="#e8c25c" stroke-width="3" fill="none"/></g>`
);

const LEAF_PILE_SVG = box(
  '0 0 130 56',
  `<ellipse cx="65" cy="44" rx="58" ry="11" fill="#d9731f"/><ellipse cx="42" cy="36" rx="30" ry="13" fill="#e8892f"/><ellipse cx="84" cy="34" rx="32" ry="14" fill="#c9501f"/><ellipse cx="62" cy="26" rx="26" ry="12" fill="#f0a53c"/><ellipse cx="30" cy="30" rx="8" ry="4" fill="#f6c25a" transform="rotate(-24 30 30)"/><ellipse cx="96" cy="26" rx="8" ry="4" fill="#e4453a" transform="rotate(20 96 26)"/><ellipse cx="64" cy="18" rx="8" ry="4" fill="#f6c25a" transform="rotate(-8 64 18)"/>`
);

// ---------------------------------------------------------------- world 4 · The Snowy Farm

const PINE_SVG = box(
  '0 0 100 160',
  `${ground(50, 156, 30)}<rect x="44" y="128" width="12" height="28" fill="#7a5230"/><path d="M50 62 L96 132 H4Z" fill="#265a3e"/><path d="M50 62 L76 102 Q64 98 50 108 Q36 98 24 102Z" fill="#f4f8fc"/><path d="M50 30 L88 94 H12Z" fill="#2a6244"/><path d="M50 30 L70 62 Q60 58 50 66 Q40 58 30 62Z" fill="#f4f8fc"/><path d="M50 6 L80 54 H20Z" fill="#2f6b4a"/><path d="M50 6 L66 30 Q58 26 50 34 Q42 26 34 30Z" fill="#f4f8fc"/>`
);

const SNOWMAN_SVG = box(
  '0 0 80 120',
  `<ellipse cx="40" cy="114" rx="30" ry="4" fill="#4b6a8a" opacity=".2"/><circle cx="40" cy="88" r="28" fill="#ffffff" stroke="#d6e4f2" stroke-width="2"/><circle cx="40" cy="52" r="20" fill="#ffffff" stroke="#d6e4f2" stroke-width="2"/><circle cx="40" cy="26" r="15" fill="#ffffff" stroke="#d6e4f2" stroke-width="2"/><path d="M22 52 L4 40 M58 52 L76 42" stroke="#7a5230" stroke-width="3.5" stroke-linecap="round"/><circle cx="35" cy="23" r="2.2" fill="#2a2a2a"/><circle cx="45" cy="23" r="2.2" fill="#2a2a2a"/><path d="M40 27 L55 30 L40 32Z" fill="#f08a2c"/><path d="M27 36 Q40 44 53 36 L55 44 Q40 52 25 44Z" fill="#c4453a"/><path d="M50 42 l6 14 l-7 2z" fill="#c4453a"/><circle cx="40" cy="66" r="2.4" fill="#2a2a2a"/><circle cx="40" cy="76" r="2.4" fill="#2a2a2a"/><path d="M27 14 H53 L50 6 H30Z" fill="#2f3a52"/><rect x="24" y="12" width="32" height="5" rx="2.5" fill="#2f3a52"/>`
);

const CABIN_SVG = box(
  '0 0 170 140',
  `${ground(85, 134, 70)}<rect x="26" y="64" width="118" height="64" fill="#b9854e"/><path d="M26 80 H144 M26 96 H144 M26 112 H144" stroke="#9a6b3a" stroke-width="2.4"/><rect x="112" y="26" width="16" height="30" fill="#8a6a50"/><rect x="110" y="21" width="20" height="8" rx="4" fill="#f6fafd"/><path d="M14 70 L85 20 L156 70Z" fill="#8f5a35"/><path d="M12 72 L85 18 L158 72 Q146 66 136 72 Q124 64 112 72 Q100 64 88 72 Q74 64 62 72 Q50 64 38 72 Q26 66 12 72Z" fill="#f6fafd"/><rect x="76" y="92" width="26" height="36" rx="3" fill="#6a4426"/><circle cx="96" cy="112" r="2" fill="#f2c25a"/><rect x="38" y="84" width="26" height="22" fill="#ffd77a" stroke="#6a4426" stroke-width="4"/><path d="M51 84 V106 M38 95 H64" stroke="#6a4426" stroke-width="2.4"/><circle class="pPuff" style="animation-delay:0s" cx="120" cy="14" r="6" fill="#ffffff"/><circle class="pPuff" style="animation-delay:1.1s" cx="120" cy="14" r="6" fill="#ffffff"/><circle class="pPuff" style="animation-delay:2.2s" cx="120" cy="14" r="6" fill="#ffffff"/>`
);

// ---------------------------------------------------------------- world 5 · Starry Night

const TENT_FIRE_SVG = box(
  '0 0 210 120',
  `${ground(105, 114, 90)}<path d="M20 108 L72 24 L124 108Z" fill="#e8884a"/><path d="M72 24 L56 108 H20Z" fill="#d86f35"/><path d="M72 50 L56 108 H88Z" fill="#3a2a22"/><path d="M72 24 V12" stroke="#7a5230" stroke-width="3"/><path d="M72 12 L88 17 L72 22Z" fill="#c4453a"/><circle class="pFlicker" cx="162" cy="86" r="44" fill="#ffb347" opacity=".25"/><circle cx="144" cy="106" r="5" fill="#8a8a96"/><circle cx="154" cy="110" r="5" fill="#9a9aa6"/><circle cx="166" cy="110" r="5" fill="#8a8a96"/><circle cx="176" cy="106" r="5" fill="#9a9aa6"/><path class="pFlame" d="M160 106 C148 96 150 80 160 62 C170 80 174 96 160 106Z" fill="#ff9a2e"/><path class="pFlame" style="animation-delay:.2s" d="M160 104 C154 96 155 88 160 78 C165 88 166 96 160 104Z" fill="#ffe27a"/>`
);

const MOON_SVG = box(
  '0 0 120 120',
  `<circle cx="60" cy="60" r="58" fill="#e8ecff" opacity=".16"/><circle cx="60" cy="60" r="46" fill="#e8ecff" opacity=".18"/><circle cx="60" cy="60" r="36" fill="#f6f2d6"/><circle cx="48" cy="50" r="7" fill="#e2dcb8"/><circle cx="70" cy="68" r="9" fill="#e2dcb8"/><circle cx="64" cy="42" r="4.5" fill="#e2dcb8"/><circle cx="46" cy="72" r="4" fill="#e2dcb8"/>`
);

const OWL_SVG = box(
  '0 0 90 110',
  `<path d="M4 98 Q40 92 86 100" stroke="#6a4a30" stroke-width="8" stroke-linecap="round" fill="none"/><ellipse cx="45" cy="64" rx="26" ry="32" fill="#9a7a5a"/><ellipse cx="45" cy="74" rx="16" ry="22" fill="#d8c3a0"/><path d="M36 70 q4 4 8 0 M46 70 q4 4 8 0 M36 80 q4 4 8 0 M46 80 q4 4 8 0" stroke="#b79d78" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M20 38 L24 14 L40 30Z M70 38 L66 14 L50 30Z" fill="#8a6a4a"/><circle cx="35" cy="46" r="11" fill="#fff4c8"/><circle cx="55" cy="46" r="11" fill="#fff4c8"/><circle cx="35" cy="47" r="5" fill="#2a2a2a"/><circle cx="55" cy="47" r="5" fill="#2a2a2a"/><path d="M45 50 L40 59 H50Z" fill="#f2a53a"/><path d="M36 94 v6 M54 94 v6" stroke="#f2a53a" stroke-width="4" stroke-linecap="round"/>`
);

const MUSHROOMS_SVG = box(
  '0 0 100 70',
  `${ground(50, 66, 38)}<path d="M62 44 H78 L76 64 H64Z" fill="#f4e6cc"/><path d="M52 46 Q54 14 70 14 Q88 14 88 46Z" fill="#d6453d"/><circle cx="62" cy="30" r="4" fill="#fff"/><circle cx="76" cy="24" r="3.4" fill="#fff"/><circle cx="80" cy="38" r="3" fill="#fff"/><path d="M26 50 H38 L37 66 H27Z" fill="#f4e6cc"/><path d="M16 52 Q18 28 32 28 Q46 28 48 52Z" fill="#e0584a"/><circle cx="26" cy="40" r="3.4" fill="#fff"/><circle cx="38" cy="36" r="3" fill="#fff"/>`
);

// ---------------------------------------------------------------- the pictures the game uses: a delivered file, or the drawing above
export const WINDMILL = pickSvg('props', 'windmill', WINDMILL_SVG);
export const SUNFLOWER = pickSvg('props', 'sunflower', SUNFLOWER_SVG);
export const DAISIES = pickSvg('props', 'daisies', DAISIES_SVG);
export const BUSH = pickSvg('props', 'bush', BUSH_SVG);
export const BUTTERFLY = (wingA: string, wingB: string) => pickSvg('props', 'butterfly', BUTTERFLY_SVG(wingA, wingB));
registerFallback('props', 'butterfly', BUTTERFLY_SVG('#ffd75e', '#fff3b0'));
export const BARN = pickSvg('props', 'barn', BARN_SVG);
export const FENCE = pickSvg('props', 'fence', FENCE_SVG);
export const CHICKEN = pickSvg('props', 'chicken', CHICKEN_SVG);
export const HAYSTACK = pickSvg('props', 'haystack', HAYSTACK_SVG);
export const AUTUMN_TREE = pickSvg('props', 'autumn_tree', AUTUMN_TREE_SVG);
export const PUMPKIN = pickSvg('props', 'pumpkin', PUMPKIN_SVG);
export const SCARECROW = pickSvg('props', 'scarecrow', SCARECROW_SVG);
export const LEAF_PILE = pickSvg('props', 'leaf_pile', LEAF_PILE_SVG);
export const PINE = pickSvg('props', 'pine', PINE_SVG);
export const SNOWMAN = pickSvg('props', 'snowman', SNOWMAN_SVG);
export const CABIN = pickSvg('props', 'cabin', CABIN_SVG);
export const TENT_FIRE = pickSvg('props', 'tent_fire', TENT_FIRE_SVG);
export const MOON = pickSvg('props', 'moon', MOON_SVG);
export const OWL = pickSvg('props', 'owl', OWL_SVG);
export const MUSHROOMS = pickSvg('props', 'mushrooms', MUSHROOMS_SVG);
