import { COATS, type Coat } from '../render/art';

/**
 * World themes for the map: band colours, the ground strip along each band's
 * bottom, and the scenery props in the margins.
 *
 * Props have their own size and placement so big pieces (armchair, lamp,
 * throne) read as furniture and small ones (teacup, mouse toy) as details.
 * `at` is how far down the band the prop sits (0 top, 1 bottom); `inset` is
 * how far out into the margin it sits (0 hugging the trail column, 1 at the
 * screen edge). `still` props don't bob — furniture shouldn't float.
 */

export interface Prop {
  svg: string;
  /** desktop size in px (the box is square; the art keeps its own aspect) */
  size: number;
  side: 'left' | 'right';
  at: number;
  inset: number;
  still?: boolean;
}

export interface World {
  /** band gradient, top → bottom */
  top: string;
  bottom: string;
  /** deeper accent for open-node borders and the sign's progress bar */
  deep: string;
  night?: boolean;
  /** coat of the cat who welcomes you here (and fills solved nodes) */
  coat: Coat;
  /** repeating ground strip (SVG markup, tiled horizontally, 48px tall) */
  strip: { svg: string; w: number };
  /** faint themed pattern tiled over the whole band (wallpaper, grass…),
   *  plus an optional CSS gradient wash (sunbeams, haze) under it. The tile
   *  SVG must not contain single quotes (it's inlined in a style attribute). */
  texture: { svg: string; w: number; h: number; wash?: string };
  props: Prop[];
}

const box = (viewBox: string, body: string) =>
  `<svg viewBox="${viewBox}" aria-hidden="true">${body}</svg>`;

const PAW =
  '<ellipse cx="12" cy="15.5" rx="5" ry="4.2"/><circle cx="6.2" cy="10.4" r="2.1"/>' +
  '<circle cx="10" cy="7.4" r="2.2"/><circle cx="14" cy="7.4" r="2.2"/><circle cx="17.8" cy="10.4" r="2.1"/>';

const paw = (x: number, y: number, scale: number, fill: string) =>
  `<g transform="translate(${x} ${y}) scale(${scale})" fill="${fill}">${PAW}</g>`;

const daisy = (cx: number, cy: number, petal: string, core: string, r = 7) =>
  [0, 60, 120, 180, 240, 300]
    .map((a) => {
      const t = (a * Math.PI) / 180;
      return `<ellipse cx="${(cx + Math.cos(t) * r).toFixed(1)}" cy="${(cy + Math.sin(t) * r).toFixed(1)}" rx="${(r * 0.75).toFixed(1)}" ry="${(r * 0.5).toFixed(1)}" fill="${petal}" transform="rotate(${a} ${(cx + Math.cos(t) * r).toFixed(1)} ${(cy + Math.sin(t) * r).toFixed(1)})"/>`;
    })
    .join('') + `<circle cx="${cx}" cy="${cy}" r="${(r * 0.62).toFixed(1)}" fill="${core}"/>`;

const tulip = (cx: number, cy: number, color: string, dark: string) =>
  `<path d="M${cx - 9} ${cy - 6} L${cx - 5} ${cy - 14} L${cx} ${cy - 7} L${cx + 5} ${cy - 14} L${cx + 9} ${cy - 6} Q${cx + 9} ${cy + 7} ${cx} ${cy + 7} Q${cx - 9} ${cy + 7} ${cx - 9} ${cy - 6} Z" fill="${color}"/>
   <path d="M${cx} ${cy - 7} Q${cx - 2} ${cy} ${cx} ${cy + 6}" stroke="${dark}" stroke-width="1.6" fill="none" opacity="0.5"/>`;

const twinkle = (x: number, y: number, s: number, fill: string) =>
  `<path class="pTwinkle" d="M${x} ${y - s} Q${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s} Z" fill="${fill}"/>`;

const butterfly = (wingA: string, wingB: string, spot: string) =>
  box('0 0 120 120', `<g class="pFloat">
    <g class="pFlap" style="transform-origin:60px 60px">
      <path d="M60 58 Q34 14 16 34 Q6 52 24 64 Q42 72 60 62 Z" fill="${wingA}"/>
      <path d="M60 58 Q86 14 104 34 Q114 52 96 64 Q78 72 60 62 Z" fill="${wingA}"/>
      <path d="M60 64 Q36 70 32 88 Q36 102 50 94 Q60 84 60 66 Z" fill="${wingB}"/>
      <path d="M60 64 Q84 70 88 88 Q84 102 70 94 Q60 84 60 66 Z" fill="${wingB}"/>
      <circle cx="32" cy="44" r="7" fill="${spot}"/><circle cx="88" cy="44" r="7" fill="${spot}"/>
      <circle cx="44" cy="86" r="4" fill="${spot}"/><circle cx="76" cy="86" r="4" fill="${spot}"/>
    </g>
    <rect x="56.5" y="46" width="7" height="40" rx="3.5" fill="#5a4a72"/>
    <path d="M58 48 Q52 34 46 30 M62 48 Q68 34 74 30" stroke="#5a4a72" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <circle cx="46" cy="30" r="3" fill="#5a4a72"/><circle cx="74" cy="30" r="3" fill="#5a4a72"/>
  </g>`);

// ---------------------------------------------------------------- 0 · Sunny Windowsill

const sunnyWindow = box('0 0 160 172', `
  <circle cx="80" cy="84" r="80" fill="#fff4dc" opacity="0.6" class="pPulse"/>
  <rect x="6" y="8" width="148" height="7" rx="3.5" fill="#c98a55"/>
  <circle cx="8" cy="11.5" r="6" fill="#b87a47"/><circle cx="152" cy="11.5" r="6" fill="#b87a47"/>
  <path d="M30 150 V64 A50 50 0 0 1 130 64 V150 Z" fill="#fffaf0" stroke="#e0a868" stroke-width="7"/>
  <path d="M38 146 V65 A42 42 0 0 1 122 65 V146 Z" fill="#cfe9ff"/>
  <circle cx="102" cy="60" r="12" fill="#ffd47a"/>
  <g class="pFloat"><g fill="#ffffff"><circle cx="54" cy="84" r="8"/><circle cx="64" cy="80" r="10"/><circle cx="74" cy="85" r="7"/><rect x="48" y="84" width="32" height="8" rx="4"/></g></g>
  <path d="M38 146 V124 Q58 110 80 121 Q102 132 122 116 V146 Z" fill="#a8dcb5"/>
  <path d="M38 146 V134 Q62 124 86 134 Q104 140 122 132 V146 Z" fill="#8fd1a2"/>
  <line x1="80" y1="18" x2="80" y2="146" stroke="#e0a868" stroke-width="5"/>
  <line x1="34" y1="100" x2="126" y2="100" stroke="#e0a868" stroke-width="5"/>
  <path d="M12 15 Q34 15 40 38 Q30 84 44 150 L12 150 Z" fill="#ff9db0"/>
  <path d="M20 16 Q24 70 22 150 M30 18 Q34 70 34 150" stroke="#f08aa0" stroke-width="2.5" fill="none"/>
  <path d="M148 15 Q126 15 120 38 Q130 84 116 150 L148 150 Z" fill="#ff9db0"/>
  <path d="M140 16 Q136 70 138 150 M130 18 Q126 70 126 150" stroke="#f08aa0" stroke-width="2.5" fill="none"/>
  <rect x="12" y="96" width="30" height="7" rx="3.5" fill="#ffd35c"/><rect x="118" y="96" width="30" height="7" rx="3.5" fill="#ffd35c"/>
  <rect x="16" y="148" width="128" height="13" rx="4" fill="#d79a5c"/><rect x="22" y="161" width="116" height="6" rx="3" fill="#bf8148"/>
  <path d="M98 134 H120 L117 148 H101 Z" fill="#e88f6a"/>
  <path d="M109 134 C102 126 103 118 109 113 C115 118 116 126 109 134 Z M109 134 C100 132 96 126 98 121 C104 121 108 128 109 134 Z M109 134 C118 132 122 126 120 121 C114 121 110 128 109 134 Z" fill="#7cc48f"/>`);

const sunnySun = box('0 0 120 120', `
  <g class="pSpin" style="transform-origin:60px 60px">
    ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<rect x="56" y="4" width="8" height="18" rx="4" fill="#ffc45c" transform="rotate(${a} 60 60)"/>`).join('')}
    ${[22, 67, 112, 157, 202, 247, 292, 337].map((a) => `<rect x="57.5" y="10" width="5" height="10" rx="2.5" fill="#ffd47a" transform="rotate(${a} 60 60)"/>`).join('')}
  </g>
  <circle cx="60" cy="60" r="30" fill="#ffd47a"/>
  <circle cx="60" cy="60" r="30" fill="none" stroke="#ffc45c" stroke-width="3"/>
  <ellipse cx="50" cy="48" rx="9" ry="5" fill="#fff0b8" opacity="0.7" transform="rotate(-25 50 48)"/>
  <path d="M46 59 Q51 53 56 59 M64 59 Q69 53 74 59" fill="none" stroke="#c97a22" stroke-width="3" stroke-linecap="round"/>
  <circle cx="43" cy="68" r="5" fill="#ffb38a" opacity="0.75"/><circle cx="77" cy="68" r="5" fill="#ffb38a" opacity="0.75"/>
  <path d="M53 70 Q60 76 67 70" fill="none" stroke="#c97a22" stroke-width="3" stroke-linecap="round"/>`);

const sunnyPlant = box('0 0 130 150', `
  <ellipse cx="65" cy="146" rx="40" ry="4" fill="#c98a55" opacity="0.3"/>
  <g class="pSway">
    <path d="M65 100 C62 82 50 64 34 52 M65 100 C68 78 78 58 96 46 M65 100 C64 76 64 48 66 24 M65 100 C58 92 48 86 40 82 M65 100 C72 92 82 84 90 78" stroke="#4f9a68" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="32" cy="50" rx="25" ry="15" fill="#6bb983" transform="rotate(-30 32 50)"/>
    <path d="M16 60 L50 40 M28 44 L32 54 M38 40 L40 50" stroke="#8fd4a0" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="98" cy="44" rx="25" ry="15" fill="#5fae78" transform="rotate(28 98 44)"/>
    <path d="M80 34 L114 56 M92 36 L88 46 M102 42 L98 50" stroke="#7cc48f" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="66" cy="24" rx="15" ry="22" fill="#7cc48f"/>
    <path d="M66 4 V44 M66 16 L58 12 M66 26 L74 22 M66 34 L58 30" stroke="#a6e0b4" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="40" cy="82" rx="17" ry="9" fill="#8fd4a0" transform="rotate(-15 40 82)"/>
    <ellipse cx="90" cy="78" rx="17" ry="9" fill="#7cc48f" transform="rotate(18 90 78)"/>
  </g>
  <path d="M34 104 H96 L88 146 H42 Z" fill="#e88f6a"/>
  <path d="M38 120 H92 M40 132 H90" stroke="#f6b597" stroke-width="4"/>
  <rect x="28" y="96" width="74" height="13" rx="5" fill="#f2a27f"/>
  ${paw(58, 120, 0.6, '#d9785a')}`);

const sunnyTeacup = box('0 0 100 90', `
  <path class="pSmoke" d="M38 32 C32 24 44 18 38 8" stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path class="pSmoke pSmoke2" d="M58 32 C52 24 64 18 58 8" stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round"/>
  <ellipse cx="50" cy="80" rx="42" ry="8" fill="#ffd0dc"/>
  <ellipse cx="50" cy="78" rx="30" ry="5" fill="#ffe3ea"/>
  <path d="M78 46 C94 46 94 66 76 66" stroke="#f2b8c6" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M18 40 H80 V54 C80 70 68 78 49 78 C30 78 18 70 18 54 Z" fill="#fffaf2" stroke="#f2b8c6" stroke-width="3"/>
  <ellipse cx="49" cy="41" rx="29" ry="5" fill="#d79a5c"/>
  <path d="M49 66 C40 60 42 52 49 56 C56 52 58 60 49 66 Z" fill="#ff9db0"/>`);

const sunnyBooks = box('0 0 130 100', `
  <ellipse cx="62" cy="96" rx="54" ry="4" fill="#c98a55" opacity="0.3"/>
  <rect x="12" y="70" width="100" height="22" rx="4" fill="#9fd8ff"/><rect x="104" y="72" width="8" height="18" fill="#fffaf2"/>
  <rect x="24" y="74" width="4" height="14" fill="#6fb5e6"/><rect x="34" y="74" width="4" height="14" fill="#6fb5e6"/>
  <rect x="20" y="48" width="86" height="22" rx="4" fill="#ffb3c6"/><rect x="98" y="50" width="8" height="18" fill="#fffaf2"/>
  <rect x="30" y="56" width="40" height="5" rx="2.5" fill="#ff8fa8"/>
  <rect x="16" y="28" width="78" height="20" rx="4" fill="#a0e7b4" transform="rotate(-4 55 38)"/>
  <rect x="86" y="30" width="7" height="16" fill="#fffaf2" transform="rotate(-4 55 38)"/>
  <path d="M40 30 V52 L44 48 L48 52 V30" fill="#ffd35c" transform="rotate(-4 55 38)"/>
  ${paw(60, 6, 0.9, '#e0904a')}`);

// ---------------------------------------------------------------- 1 · Cosy Armchair

const armchair = box('0 0 200 162', `
  <ellipse cx="100" cy="156" rx="92" ry="6" fill="#8a78c8" opacity="0.25"/>
  <rect x="32" y="136" width="12" height="20" rx="4" fill="#7d6bb8"/><rect x="156" y="136" width="12" height="20" rx="4" fill="#7d6bb8"/>
  <path d="M40 30 Q40 8 100 8 Q160 8 160 30 V98 H40 Z" fill="#c4b5f2"/>
  <path d="M52 32 Q52 18 100 18 Q148 18 148 32 V92 H52 Z" fill="#cdbff6"/>
  <path d="M70 40 L85 62 L100 36 L115 62 L130 40" stroke="#b6a5ee" stroke-width="2.4" fill="none"/>
  ${[[70, 40], [100, 36], [130, 40], [85, 62], [115, 62]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="#9c8ad8"/>`).join('')}
  <rect x="24" y="92" width="152" height="50" rx="18" fill="#b5a3ec"/>
  <rect x="42" y="84" width="116" height="30" rx="14" fill="#e2d9fb"/>
  <rect x="48" y="88" width="104" height="22" rx="10" fill="none" stroke="#cbbdf4" stroke-width="2" stroke-dasharray="4 4"/>
  <path d="M12 84 Q12 62 33 62 Q52 62 52 84 V140 H12 Z" fill="#a594e0"/>
  <path d="M188 84 Q188 62 167 62 Q148 62 148 84 V140 H188 Z" fill="#a594e0"/>
  <ellipse cx="32" cy="69" rx="15" ry="6" fill="#b9a8ec"/><ellipse cx="168" cy="69" rx="15" ry="6" fill="#b9a8ec"/>
  <g transform="rotate(-10 76 76)">
    <rect x="56" y="60" width="40" height="32" rx="11" fill="#ffc9d9"/>
    <rect x="60" y="64" width="32" height="24" rx="8" fill="none" stroke="#ffb3c6" stroke-width="2"/>
    ${paw(68, 64, 0.7, '#ff9db0')}
  </g>
  <path d="M148 70 Q168 62 188 72 L184 122 Q178 128 172 120 Q166 130 160 120 Q154 128 148 116 Z" fill="#ffd6a5"/>
  <path d="M150 84 Q168 78 186 86 M150 100 Q168 94 185 102" stroke="#ffb38a" stroke-width="4" fill="none"/>`);

const floorLamp = box('0 0 100 210', `
  <ellipse cx="50" cy="48" rx="50" ry="46" fill="#fff3c4" opacity="0.55" class="pPulse"/>
  <ellipse cx="50" cy="64" rx="20" ry="5" fill="#fff7d6"/>
  <path d="M24 14 H76 L90 56 H10 Z" fill="#ffe3a3"/>
  <path d="M20 26 H80 M14 44 H86" stroke="#f5cf7a" stroke-width="3"/>
  ${[14, 23, 32, 41, 50, 59, 68, 77, 86].map((x) => `<circle cx="${x}" cy="58" r="4" fill="#ffd47a"/>`).join('')}
  <rect x="47" y="60" width="6" height="128" fill="#8a78c8"/>
  <circle cx="50" cy="124" r="5" fill="#9c8ad8"/>
  <line x1="66" y1="58" x2="66" y2="84" stroke="#c9a03a" stroke-width="2"/><circle cx="66" cy="86" r="3" fill="#c9a03a"/>
  <ellipse cx="50" cy="194" rx="32" ry="9" fill="#8a78c8"/>
  <ellipse cx="44" cy="191" rx="12" ry="3" fill="#a594e0"/>`);

const yarnBasket = box('0 0 140 124', `
  <ellipse cx="70" cy="120" rx="56" ry="4" fill="#8a78c8" opacity="0.25"/>
  <line x1="70" y1="10" x2="98" y2="64" stroke="#c49a6c" stroke-width="4" stroke-linecap="round"/>
  <line x1="102" y1="12" x2="80" y2="64" stroke="#c49a6c" stroke-width="4" stroke-linecap="round"/>
  <circle cx="70" cy="10" r="4.5" fill="#e0687f"/><circle cx="102" cy="12" r="4.5" fill="#6fb5e6"/>
  <g class="pRoll" style="transform-origin:52px 54px">
    <circle cx="52" cy="54" r="24" fill="#ff9db0"/>
    <path d="M30 46 Q52 32 74 48 M28 58 Q52 44 76 60 M34 72 Q54 58 72 74" fill="none" stroke="#e0687f" stroke-width="3" stroke-linecap="round"/>
  </g>
  <circle cx="92" cy="52" r="20" fill="#9fd8ff"/>
  <path d="M74 46 Q92 36 110 50 M74 58 Q92 48 110 62" fill="none" stroke="#6fb5e6" stroke-width="3" stroke-linecap="round"/>
  <path d="M18 66 H122 L112 112 Q70 120 28 112 Z" fill="#e3b77f"/>
  <path d="M22 82 H118 M26 98 H114" stroke="#c99a5e" stroke-width="3"/>
  ${[34, 50, 66, 82, 98].map((x) => `<path d="M${x} 72 V108" stroke="#d4a46a" stroke-width="3"/>`).join('')}
  <rect x="12" y="60" width="116" height="12" rx="6" fill="#d4a46a"/>
  <path d="M40 72 Q28 94 14 100 Q6 104 10 116" stroke="#e0687f" stroke-width="3" fill="none" stroke-linecap="round"/>`);

const fishPicture = box('0 0 110 122', `
  <path d="M28 24 L55 6 L82 24" stroke="#8a78c8" stroke-width="2.5" fill="none"/><circle cx="55" cy="6" r="3.5" fill="#8a78c8"/>
  <rect x="10" y="22" width="90" height="94" rx="8" fill="#d4a46a"/>
  <rect x="14" y="26" width="82" height="86" rx="6" fill="none" stroke="#e8c08c" stroke-width="2"/>
  <rect x="20" y="32" width="70" height="74" rx="4" fill="#dff1ff"/>
  <path d="M20 86 Q38 80 55 86 Q72 92 90 86 V106 H20 Z" fill="#bfe3ff"/>
  <path d="M30 62 Q50 44 72 62 Q50 80 30 62 Z" fill="#ff9db0"/>
  <path d="M72 62 L84 52 L84 72 Z" fill="#ffb3c6"/>
  <path d="M44 56 Q48 62 44 68 M52 54 Q56 62 52 70" stroke="#ffc9d9" stroke-width="2" fill="none"/>
  <circle cx="38" cy="60" r="2.6" fill="#4a3b34"/>
  <circle cx="30" cy="46" r="3" fill="none" stroke="#9fd8ff" stroke-width="1.6"/><circle cx="26" cy="38" r="2" fill="none" stroke="#9fd8ff" stroke-width="1.4"/>`);

const mouseToy = box('0 0 110 70', `
  <ellipse cx="56" cy="64" rx="38" ry="4" fill="#8a78c8" opacity="0.25"/>
  <path d="M86 46 Q100 38 96 56 Q92 66 106 64" stroke="#b8b0c8" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M16 48 C22 28 50 22 72 28 C90 34 92 56 72 60 C52 64 26 62 16 48 Z" fill="#cfc8db"/>
  <path d="M30 50 C40 54 60 56 76 50" stroke="#b1a8c2" stroke-width="2" stroke-dasharray="3 3" fill="none"/>
  <circle cx="36" cy="28" r="10" fill="#cfc8db"/><circle cx="36" cy="28" r="6" fill="#ffc9d9"/>
  <circle cx="54" cy="25" r="8" fill="#cfc8db"/><circle cx="54" cy="25" r="4.5" fill="#ffc9d9"/>
  <circle cx="16" cy="48" r="4" fill="#ff9db0"/>
  <circle cx="30" cy="42" r="2.4" fill="#4a3b34"/>
  <path d="M14 44 L4 40 M14 50 L4 52" stroke="#8a776c" stroke-width="1.6" stroke-linecap="round"/>`);

// ---------------------------------------------------------------- 2 · Garden Fence

const birdhouse = box('0 0 120 172', `
  <path d="M30 172 Q60 160 90 172 Z" fill="#8fd1a2"/>
  <rect x="55" y="96" width="10" height="76" fill="#b68a5c"/>
  <rect x="28" y="52" width="64" height="52" rx="6" fill="#ffd6a5"/>
  <path d="M28 64 H92 M28 78 H92 M28 92 H92" stroke="#ffc58f" stroke-width="2"/>
  <path d="M16 58 L60 20 L104 58 Z" fill="#e88f6a"/>
  <path d="M30 46 Q38 50 44 44 M48 40 Q56 44 62 38 M66 40 Q74 44 80 38 M84 46 Q92 50 96 46" stroke="#d9785a" stroke-width="2.4" fill="none"/>
  <rect x="12" y="56" width="96" height="6" rx="3" fill="#d9785a"/>
  <circle cx="60" cy="76" r="9" fill="#6b4428"/>
  <rect x="50" y="90" width="20" height="4" rx="2" fill="#b68a5c"/>
  ${daisy(36, 100, '#ffffff', '#ffd35c', 4)}${daisy(84, 100, '#ffb3c6', '#ffd35c', 4)}
  <g class="pSway" style="transform-origin:84px 34px">
    <ellipse cx="84" cy="26" rx="13" ry="9" fill="#9fd8ff"/>
    <circle cx="74" cy="20" r="7" fill="#9fd8ff"/>
    <path d="M67 20 L61 22 L67 24 Z" fill="#ffb84d"/>
    <circle cx="72" cy="18.5" r="1.8" fill="#2a1f1a"/>
    <path d="M82 24 Q90 18 96 26 Q90 30 82 28 Z" fill="#6fb5e6"/>
    <path d="M96 26 L104 20 L102 30 Z" fill="#6fb5e6"/>
    <path d="M80 34 V38 M88 34 V38" stroke="#ffb84d" stroke-width="2" stroke-linecap="round"/>
  </g>`);

const flowerBed = box('0 0 220 150', `
  <path d="M2 148 Q110 106 218 148 Z" fill="#c99a6c"/>
  <path d="M2 148 Q110 118 218 148 Z" fill="#b5875b"/>
  <g class="pSway">
    ${[[28, 74], [62, 54], [96, 66], [130, 46], [164, 64], [194, 80]].map(([x, y]) => `<path d="M${x} 144 Q${x - 4} ${(y + 144) / 2} ${x} ${y}" stroke="#4f9a68" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="${x - 9}" cy="${y + 34}" rx="11" ry="5" fill="#6bb983" transform="rotate(-30 ${x - 9} ${y + 34})"/>
      <ellipse cx="${x + 9}" cy="${y + 46}" rx="11" ry="5" fill="#7cc48f" transform="rotate(30 ${x + 9} ${y + 46})"/>`).join('')}
    ${daisy(28, 74, '#ffffff', '#ffd35c')}
    ${tulip(62, 54, '#ff8fa8', '#e0687f')}
    ${daisy(96, 66, '#c9b6ff', '#ffd35c')}
    ${tulip(130, 46, '#ffd35c', '#e0a030')}
    ${daisy(164, 64, '#ffb3c6', '#fff0a8')}
    ${tulip(194, 80, '#bfa5ff', '#8f7fd6')}
  </g>
  <g class="pFloat">
    <ellipse cx="176" cy="22" rx="9" ry="7" fill="#ffd35c"/>
    <path d="M172 16 V28 M178 16 V28" stroke="#4a3b34" stroke-width="2.4"/>
    <ellipse cx="172" cy="12" rx="6" ry="4" fill="#ffffff" opacity="0.85"/><ellipse cx="181" cy="12" rx="6" ry="4" fill="#ffffff" opacity="0.85"/>
    <path d="M154 30 Q160 34 166 26" stroke="#4a3b34" stroke-width="1.4" fill="none" stroke-dasharray="2 3"/>
  </g>`);

const wateringCan = box('0 0 140 112', `
  <ellipse cx="68" cy="106" rx="44" ry="4" fill="#4f9a68" opacity="0.25"/>
  <path d="M100 74 L128 40" stroke="#9fd8ff" stroke-width="9" stroke-linecap="round"/>
  <ellipse cx="130" cy="37" rx="8" ry="6" fill="#7fc4f0" transform="rotate(-50 130 37)"/>
  <g class="pFloat" fill="#bfe3ff">
    <path d="M128 52 Q131 58 128 60 Q125 58 128 52 Z"/><path d="M136 58 Q139 64 136 66 Q133 64 136 58 Z"/><path d="M122 62 Q125 68 122 70 Q119 68 122 62 Z"/>
  </g>
  <path d="M48 42 Q68 6 90 42" stroke="#7fc4f0" stroke-width="7" fill="none" stroke-linecap="round"/>
  <rect x="34" y="40" width="68" height="62" rx="14" fill="#9fd8ff"/>
  <rect x="34" y="56" width="68" height="8" fill="#7fc4f0"/>
  <ellipse cx="48" cy="52" rx="6" ry="10" fill="#d6efff" opacity="0.6"/>
  ${daisy(70, 82, '#ffffff', '#ffd35c', 5)}`);

const snail = box('0 0 120 84', `
  <ellipse cx="60" cy="80" rx="46" ry="4" fill="#4f9a68" opacity="0.25"/>
  <path d="M14 72 Q36 64 92 66 Q106 68 104 76 H16 Q10 74 14 72 Z" fill="#ffe08a"/>
  <path d="M94 66 Q98 52 98 44 M100 68 Q108 54 110 46" stroke="#ffe08a" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="98" cy="42" r="4" fill="#ffe08a"/><circle cx="110" cy="44" r="4" fill="#ffe08a"/>
  <circle cx="98" cy="42" r="1.8" fill="#4a3b34"/><circle cx="110" cy="44" r="1.8" fill="#4a3b34"/>
  <path d="M98 70 Q102 73 106 70" stroke="#c9a03a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <circle cx="58" cy="44" r="27" fill="#ffb38a"/>
  <path d="M58 44 m-4 0 a4 4 0 1 1 8 0 a9 9 0 1 1 -17 0 a15 15 0 1 1 30 0 a21 21 0 1 1 -42 0" stroke="#e88f6a" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="48" cy="30" rx="7" ry="4" fill="#ffd2b5" opacity="0.8" transform="rotate(-30 48 30)"/>`);

// ---------------------------------------------------------------- 3 · Rooftop Moon

const moon = box('0 0 160 160', `
  <circle cx="80" cy="80" r="78" fill="#fff4c9" opacity="0.1" class="pPulse"/>
  <circle cx="80" cy="80" r="62" fill="#fff4c9" opacity="0.14"/>
  <circle cx="80" cy="80" r="50" fill="#fff1b8"/>
  <circle cx="60" cy="58" r="8" fill="#f3dd92"/><circle cx="106" cy="94" r="9" fill="#f3dd92"/>
  <circle cx="98" cy="54" r="5" fill="#f3dd92"/><circle cx="56" cy="104" r="4" fill="#f3dd92"/>
  <path d="M58 82 Q66 89 74 82 M88 82 Q96 89 104 82" fill="none" stroke="#c9a54e" stroke-width="3.4" stroke-linecap="round"/>
  <circle cx="58" cy="94" r="6" fill="#ffc9a0" opacity="0.7"/><circle cx="104" cy="94" r="6" fill="#ffc9a0" opacity="0.7"/>
  <path d="M74 98 Q81 103 88 98" fill="none" stroke="#c9a54e" stroke-width="3" stroke-linecap="round"/>
  <g class="pFloat" fill="none" stroke="#fff1b8" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M124 34 H136 L124 46 H136"/><path d="M142 16 H150 L142 24 H150" stroke-width="2.6"/>
  </g>
  ${twinkle(24, 30, 6, '#fff6d6')}${twinkle(140, 128, 5, '#fff6d6')}`);

const streetLamp = box('0 0 90 224', `
  <circle cx="45" cy="46" r="44" fill="#ffd97a" opacity="0.2" class="pPulse"/>
  <circle cx="45" cy="46" r="28" fill="#ffd97a" opacity="0.2"/>
  <path d="M28 28 L62 28 L56 68 L34 68 Z" fill="#ffe08a"/>
  <path d="M28 28 L34 68 M62 28 L56 68 M45 28 V68" stroke="#151b36" stroke-width="3"/>
  <path d="M22 28 L45 10 L68 28 Z" fill="#151b36"/><circle cx="45" cy="8" r="3.5" fill="#151b36"/>
  <rect x="30" y="66" width="30" height="6" rx="2" fill="#151b36"/>
  <rect x="41" y="70" width="8" height="140" fill="#151b36"/>
  <path d="M49 96 Q68 96 66 112 Q64 122 56 116" stroke="#151b36" stroke-width="4" fill="none" stroke-linecap="round"/>
  <rect x="37" y="140" width="16" height="6" rx="2" fill="#151b36"/>
  <path d="M28 222 L62 222 L56 204 L34 204 Z" fill="#151b36"/>`);

const chimneyRoof = box('0 0 140 150', `
  <circle class="pSmoke" cx="96" cy="46" r="9" fill="#8090c4"/>
  <circle class="pSmoke pSmoke2" cx="104" cy="30" r="8" fill="#8090c4"/>
  <circle class="pSmoke" cx="96" cy="16" r="6" fill="#8090c4" style="animation-delay:-1s"/>
  <rect x="82" y="62" width="28" height="56" fill="#b5634e"/>
  <path d="M82 74 H110 M82 86 H110 M82 98 H110 M96 62 V74 M89 74 V86 M103 74 V86 M96 86 V98" stroke="#9a4f3d" stroke-width="2"/>
  <rect x="78" y="56" width="36" height="9" rx="2" fill="#9a4f3d"/>
  <path d="M0 150 L70 94 L140 150 Z" fill="#1d2546"/>
  <path d="M20 134 Q30 140 40 134 Q50 140 60 134 Q70 140 80 134 Q90 140 100 134 Q110 140 120 134 M44 116 Q54 122 64 116 Q74 122 84 116 Q94 122 98 118" stroke="#2c3768" stroke-width="2.5" fill="none"/>
  <path d="M36 150 V128 L52 116 L68 128 V150 Z" fill="#232c54"/>
  <rect x="46" y="130" width="12" height="12" rx="2" fill="#ffd97a"/>
  <path d="M52 130 V142 M46 136 H58" stroke="#232c54" stroke-width="1.6"/>`);

const nightCloud = box('0 0 160 90', `
  <g class="pFloat">
    <circle cx="44" cy="54" r="24" fill="#5d6ca3"/><circle cx="76" cy="40" r="30" fill="#6878b0"/>
    <circle cx="110" cy="52" r="24" fill="#5d6ca3"/><circle cx="132" cy="62" r="16" fill="#56659c"/>
    <rect x="30" y="54" width="114" height="26" rx="13" fill="#6878b0"/>
    <path d="M56 34 Q68 22 84 24" stroke="#8494c8" stroke-width="5" fill="none" stroke-linecap="round"/>
  </g>`);

const shootingStar = box('0 0 150 80', `
  <defs><linearGradient id="kd-shoot" x1="0" y1="1" x2="1" y2="0">
    <stop offset="0" stop-color="#fff1b8" stop-opacity="0"/><stop offset="1" stop-color="#fff1b8" stop-opacity="0.9"/>
  </linearGradient></defs>
  <path d="M6 74 L112 22 L116 30 Z" fill="url(#kd-shoot)"/>
  <path d="M120 10 L125 21 L137 22 L128 30 L131 42 L120 36 L109 42 L112 30 L103 22 L115 21 Z" fill="#fff1b8"/>
  ${twinkle(40, 20, 5, '#fff6d6')}${twinkle(140, 60, 4, '#fff6d6')}${twinkle(76, 64, 3, '#fff6d6')}`);

// ---------------------------------------------------------------- 4 · Cat Council

const throne = box('0 0 180 170', `
  <ellipse cx="90" cy="166" rx="80" ry="4" fill="#c98aa0" opacity="0.3"/>
  <rect x="30" y="146" width="12" height="20" rx="3" fill="#b8506a"/><rect x="138" y="146" width="12" height="20" rx="3" fill="#b8506a"/>
  <path d="M28 150 V62 Q28 14 90 14 Q152 14 152 62 V150 Z" fill="#e0687f"/>
  <path d="M42 140 V66 Q42 30 90 30 Q138 30 138 66 V140 Z" fill="#ff9db0"/>
  ${paw(64, 48, 0.9, '#ffb3c6')}${paw(96, 48, 0.9, '#ffb3c6')}${paw(80, 74, 0.9, '#ffb3c6')}
  <circle cx="90" cy="12" r="8" fill="#ffd35c"/><circle cx="90" cy="12" r="3.5" fill="#ff8fa8"/>
  <circle cx="28" cy="60" r="6" fill="#ffd35c"/><circle cx="152" cy="60" r="6" fill="#ffd35c"/>
  <rect x="18" y="118" width="144" height="32" rx="15" fill="#ffd6a5"/>
  <path d="M26 128 H154" stroke="#ffc58f" stroke-width="2.4" stroke-dasharray="5 5"/>
  <path d="M20 146 L16 160 M160 146 L164 160" stroke="#f0b93a" stroke-width="2.5"/>
  <circle cx="16" cy="162" r="4" fill="#f0b93a"/><circle cx="164" cy="162" r="4" fill="#f0b93a"/>
  <path d="M60 120 L64 92 L77 106 L90 84 L103 106 L116 92 L120 120 Z" fill="#ffd35c"/>
  <rect x="58" y="114" width="64" height="8" rx="3" fill="#f0b93a"/>
  <circle cx="90" cy="108" r="4.5" fill="#ff8fa8"/><circle cx="72" cy="112" r="3.2" fill="#9fd8ff"/><circle cx="108" cy="112" r="3.2" fill="#a0e7b4"/>
  <circle cx="90" cy="83" r="3.5" fill="#ffd35c"/>
  ${twinkle(52, 92, 6, '#fff6c9')}${twinkle(130, 86, 5, '#fff6c9')}`);

const cushionStack = box('0 0 130 124', `
  <ellipse cx="65" cy="120" rx="56" ry="4" fill="#c98aa0" opacity="0.3"/>
  <rect x="10" y="88" width="110" height="30" rx="14" fill="#ff9db0"/>
  <path d="M20 103 H110" stroke="#ffc9d9" stroke-width="5" stroke-dasharray="10 8" stroke-linecap="round"/>
  <g transform="rotate(4 65 72)">
    <rect x="20" y="60" width="92" height="28" rx="13" fill="#ffd6a5"/>
    ${[34, 52, 70, 88].map((x) => `<circle cx="${x}" cy="74" r="3.5" fill="#ffb38a"/>`).join('')}
  </g>
  <g transform="rotate(-5 65 46)">
    <rect x="30" y="34" width="72" height="26" rx="12" fill="#c9b6ff"/>
    ${paw(56, 36, 0.85, '#a594e0')}
  </g>
  <path d="M10 92 L4 86 M120 92 L126 86 M10 114 L4 120 M120 114 L126 120" stroke="#e0687f" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="4" cy="86" r="3" fill="#e0687f"/><circle cx="126" cy="86" r="3" fill="#e0687f"/>`);

const councilScroll = box('0 0 120 140', `
  <rect x="22" y="18" width="76" height="104" fill="#fffaf2"/>
  <path d="M22 18 V122 M98 18 V122" stroke="#f2d3b8" stroke-width="2"/>
  <rect x="14" y="10" width="92" height="14" rx="7" fill="#f2d3b8"/><circle cx="14" cy="17" r="6" fill="#e3bf9d"/><circle cx="106" cy="17" r="6" fill="#e3bf9d"/>
  <rect x="14" y="116" width="92" height="14" rx="7" fill="#f2d3b8"/><circle cx="14" cy="123" r="6" fill="#e3bf9d"/><circle cx="106" cy="123" r="6" fill="#e3bf9d"/>
  <rect x="38" y="34" width="44" height="7" rx="3.5" fill="#e0687f"/>
  ${[52, 62, 72, 82].map((y, i) => `<line x1="34" y1="${y}" x2="${i % 2 ? 76 : 86}" y2="${y}" stroke="#e8b9c8" stroke-width="4" stroke-linecap="round"/>`).join('')}
  <circle cx="74" cy="102" r="12" fill="#e0687f"/>
  ${paw(66.5, 94, 0.62, '#ffc9d9')}
  <path d="M68 112 L64 124 L70 120 M80 112 L84 124 L78 120" fill="#e0687f"/>`);

const ballotBox = box('0 0 120 124', `
  <ellipse cx="60" cy="120" rx="48" ry="4" fill="#c98aa0" opacity="0.3"/>
  <g class="pFloat">
    <rect x="44" y="6" width="34" height="42" rx="3" fill="#fffaf2" transform="rotate(8 61 27)"/>
    <path d="M52 26 L58 32 L70 18" stroke="#4fb276" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="rotate(8 61 27)"/>
  </g>
  <rect x="16" y="44" width="88" height="72" rx="8" fill="#c9b6ff"/>
  <rect x="16" y="44" width="88" height="14" rx="7" fill="#b5a3ec"/>
  <rect x="40" y="48" width="40" height="6" rx="3" fill="#6b5a8a"/>
  <rect x="30" y="68" width="60" height="36" rx="6" fill="#e2d9fb"/>
  ${paw(48, 72, 1.05, '#ff9db0')}`);

const cakeStand = box('0 0 120 150', `
  <ellipse cx="60" cy="146" rx="36" ry="4" fill="#c98aa0" opacity="0.3"/>
  <path d="M46 146 L74 146 L66 126 L54 126 Z" fill="#f2d3b8"/>
  <ellipse cx="60" cy="126" rx="48" ry="7" fill="#fffaf2"/>
  <rect x="20" y="92" width="80" height="32" rx="8" fill="#ffd6a5"/>
  <path d="M20 100 Q30 108 40 100 Q50 108 60 100 Q70 108 80 100 Q90 108 100 100 V92 H20 Z" fill="#fffaf2"/>
  <rect x="32" y="62" width="56" height="32" rx="8" fill="#ffb3c6"/>
  <path d="M32 70 Q40 77 48 70 Q56 77 64 70 Q72 77 80 70 Q86 75 88 70 V62 H32 Z" fill="#fffaf2"/>
  ${[[40, 112, '#9fd8ff'], [56, 116, '#a0e7b4'], [74, 112, '#ff9db0'], [88, 116, '#c9b6ff'], [46, 84, '#ffd35c'], [66, 86, '#9fd8ff'], [78, 82, '#a0e7b4']].map(([x, y, c]) => `<rect x="${x}" y="${y}" width="6" height="2.6" rx="1.3" fill="${c}" transform="rotate(${(Number(x) * 7) % 60 - 30} ${x} ${y})"/>`).join('')}
  <path d="M60 46 Q58 54 60 62" stroke="#4f9a68" stroke-width="2" fill="none"/>
  <circle cx="60" cy="56" r="8" fill="#e0687f"/><ellipse cx="57" cy="53" rx="2.5" ry="1.6" fill="#ffc9d9"/>
  <path d="M60 48 Q66 40 72 44" stroke="#4f9a68" stroke-width="2.2" fill="none" stroke-linecap="round"/>`);

// ---------------------------------------------------------------- 5 · Kitchen Counter

const kettle = box('0 0 170 160', `
  <ellipse cx="84" cy="154" rx="66" ry="5" fill="#c99a30" opacity="0.25"/>
  <path class="pSmoke" d="M150 36 C142 26 156 18 148 6" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path class="pSmoke pSmoke2" d="M138 40 C130 30 144 22 136 10" stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M120 92 Q146 82 150 50 L158 52 Q156 92 126 108 Z" fill="#ff9db0"/>
  <path d="M54 54 Q84 18 114 54" stroke="#c9b6ff" stroke-width="9" fill="none" stroke-linecap="round"/>
  <path d="M26 150 Q18 96 50 66 Q84 46 118 66 Q150 96 142 150 Z" fill="#ff9db0"/>
  <path d="M30 120 Q84 132 138 120" stroke="#ffc9d9" stroke-width="6" fill="none"/>
  <ellipse cx="84" cy="62" rx="34" ry="8" fill="#ffb3c6"/>
  <rect x="76" y="46" width="16" height="12" rx="6" fill="#e0687f"/>
  <ellipse cx="54" cy="96" rx="9" ry="20" fill="#ffd6e0" opacity="0.7" transform="rotate(18 54 96)"/>
  ${paw(72, 92, 1.1, '#ffffff')}
  <rect x="22" y="146" width="124" height="8" rx="4" fill="#e0687f"/>`);

const fishPlate = box('0 0 190 120', `
  <ellipse cx="95" cy="104" rx="88" ry="14" fill="#c99a30" opacity="0.2"/>
  <ellipse cx="95" cy="92" rx="86" ry="22" fill="#ffffff"/>
  <ellipse cx="95" cy="90" rx="68" ry="15" fill="#f4f0ff"/>
  <ellipse cx="95" cy="92" rx="86" ry="22" fill="none" stroke="#9fd8ff" stroke-width="3"/>
  <path d="M40 74 Q86 40 132 74 Q86 104 40 74 Z" fill="#9fd8ff"/>
  <path d="M132 74 L158 56 Q152 74 158 92 Z" fill="#7fc4f0"/>
  <path d="M70 60 Q74 74 70 88 M86 56 Q90 74 86 92 M102 58 Q106 74 102 90" stroke="#bfe3ff" stroke-width="3" fill="none"/>
  <path d="M84 52 Q96 40 110 52" fill="#7fc4f0"/>
  <circle cx="54" cy="70" r="5" fill="#ffffff"/><circle cx="54" cy="70" r="2.6" fill="#2a1f1a"/>
  <path d="M44 80 Q48 82 52 80" stroke="#4a8fbf" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M30 96 Q36 88 44 92 M146 98 Q152 90 160 94" stroke="#a0e7b4" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="150" cy="84" r="5" fill="#ffd35c"/><path d="M147 84 H153" stroke="#e0a030" stroke-width="1.5"/>`);

const milkBottle = box('0 0 110 190', `
  <ellipse cx="55" cy="184" rx="38" ry="5" fill="#c99a30" opacity="0.25"/>
  <path d="M36 20 H74 V44 Q92 60 92 86 V170 Q92 182 80 182 H30 Q18 182 18 170 V86 Q18 60 36 44 Z" fill="#ffffff" stroke="#e8e0d0" stroke-width="3"/>
  <path d="M22 100 H88 V170 Q88 178 80 178 H30 Q22 178 22 170 Z" fill="#fffaf0"/>
  <rect x="32" y="8" width="46" height="16" rx="5" fill="#ff9db0"/>
  <rect x="32" y="20" width="46" height="5" fill="#e0687f"/>
  <rect x="28" y="110" width="54" height="44" rx="10" fill="#9fd8ff"/>
  <text x="55" y="129" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="900" font-size="14" fill="#ffffff">MILK</text>
  ${paw(45, 132, 0.85, '#ffffff')}
  <ellipse cx="34" cy="80" rx="5" ry="18" fill="#ffffff" opacity="0.8"/>`);

const cookieJar = box('0 0 140 150', `
  <ellipse cx="70" cy="146" rx="52" ry="4" fill="#c99a30" opacity="0.25"/>
  <rect x="34" y="14" width="72" height="16" rx="8" fill="#c9b6ff"/>
  <circle cx="70" cy="12" r="8" fill="#a594e0"/>
  <path d="M24 40 Q24 30 36 30 H104 Q116 30 116 40 V130 Q116 144 100 144 H40 Q24 144 24 130 Z" fill="#e6f6ff" stroke="#bfe3ff" stroke-width="3"/>
  ${[[46, 112], [76, 120], [98, 104], [58, 86], [88, 80]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="#e3b77f"/><circle cx="${x - 4}" cy="${y - 3}" r="2.4" fill="#8a5a3a"/><circle cx="${x + 4}" cy="${y + 3}" r="2.2" fill="#8a5a3a"/><circle cx="${x + 3}" cy="${y - 5}" r="1.8" fill="#8a5a3a"/>`).join('')}
  <rect x="38" y="48" width="64" height="22" rx="11" fill="#ffffff"/>
  ${paw(60, 49, 0.85, '#ff9db0')}
  <ellipse cx="34" cy="80" rx="4" ry="24" fill="#ffffff" opacity="0.7"/>`);

const milkSaucer = box('0 0 120 70', `
  <ellipse cx="60" cy="56" rx="54" ry="12" fill="#ffd6e0"/>
  <ellipse cx="60" cy="52" rx="44" ry="9" fill="#ffffff"/>
  <ellipse cx="60" cy="51" rx="34" ry="6" fill="#fffaf2"/>
  <path d="M30 34 Q34 26 40 32 M80 30 Q86 22 92 28" stroke="#ff9db0" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M56 26 C50 20 54 14 60 18 C66 14 70 20 64 26 L60 30 Z" fill="#ff9db0" class="pFloat"/>`);

// ---------------------------------------------------------------- 6 · Bubble Bath

const bubble = (cx: number, cy: number, r: number) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff" fill-opacity="0.55" stroke="#ffffff" stroke-width="2"/>
   <ellipse cx="${cx - r * 0.35}" cy="${cy - r * 0.4}" rx="${r * 0.32}" ry="${r * 0.18}" fill="#ffffff" transform="rotate(-30 ${cx - r * 0.35} ${cy - r * 0.4})"/>
   <path d="M${cx + r * 0.25} ${cy + r * 0.6} Q${cx + r * 0.6} ${cy + r * 0.4} ${cx + r * 0.7} ${cy}" stroke="#c9b6ff" stroke-width="1.6" fill="none" opacity="0.7"/>`;

const bathtub = box('0 0 260 180', `
  <ellipse cx="130" cy="174" rx="112" ry="6" fill="#2fb3bd" opacity="0.2"/>
  <path d="M206 50 V20 Q206 8 220 8 Q234 8 234 22" stroke="#c4cdd6" stroke-width="7" fill="none" stroke-linecap="round"/>
  <path d="M226 22 H242" stroke="#c4cdd6" stroke-width="7" stroke-linecap="round"/>
  <g class="pFloat">${bubble(70, 52, 20)}${bubble(104, 40, 26)}${bubble(144, 46, 22)}${bubble(178, 56, 16)}${bubble(122, 14, 10)}${bubble(48, 28, 9)}</g>
  <path d="M16 80 H244 Q244 150 186 154 H74 Q16 150 16 80 Z" fill="#ffffff"/>
  <path d="M16 80 H244 Q244 150 186 154 H74 Q16 150 16 80 Z" fill="none" stroke="#bfe3ff" stroke-width="4"/>
  <path d="M30 96 Q130 110 230 96" stroke="#e3f8f8" stroke-width="6" fill="none"/>
  <rect x="8" y="72" width="244" height="14" rx="7" fill="#e6f0f6"/>
  <g fill="#ffffff">${[30, 52, 74, 96, 118, 140, 162, 184, 206, 228].map((x, i) => `<circle cx="${x}" cy="${70 - (i % 2) * 4}" r="${12 + (i % 3) * 2}"/>`).join('')}</g>
  <path d="M60 154 L50 174 M200 154 L210 174" stroke="#ffd35c" stroke-width="8" stroke-linecap="round"/>
  <circle cx="50" cy="174" r="6" fill="#f0b93a"/><circle cx="210" cy="174" r="6" fill="#f0b93a"/>
  ${paw(118, 112, 1.2, '#bfe3ff')}`);

const rubberDuck = box('0 0 130 110', `
  <ellipse cx="62" cy="100" rx="52" ry="8" fill="#9be3e8" opacity="0.6"/>
  <path d="M14 70 Q14 102 60 102 Q108 102 112 72 Q106 58 90 62 Q70 66 54 60 Q30 52 14 70 Z" fill="#ffd35c"/>
  <path d="M30 76 Q48 92 72 80" stroke="#f0b93a" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="86" cy="40" r="26" fill="#ffd35c"/>
  <path d="M106 42 Q124 40 126 48 Q120 56 104 52 Z" fill="#ff9d4d"/>
  <path d="M106 50 Q118 52 122 50" stroke="#e07a30" stroke-width="2" fill="none"/>
  <path d="M84 36 Q90 30 96 36" stroke="#4a3b34" stroke-width="3.4" fill="none" stroke-linecap="round"/>
  <circle cx="78" cy="48" r="5" fill="#ffb38a" opacity="0.8"/>
  <ellipse cx="74" cy="26" rx="8" ry="4" fill="#fff0a8" transform="rotate(-25 74 26)"/>`);

const bubbleCluster = box('0 0 140 140', `
  <g class="pFloat">${bubble(48, 84, 30)}${bubble(96, 60, 22)}${bubble(92, 108, 14)}${bubble(40, 32, 12)}${bubble(118, 22, 8)}</g>
  ${twinkle(22, 110, 5, '#ffffff')}${twinkle(124, 92, 4, '#ffffff')}`);

const soapSponge = box('0 0 140 100', `
  <ellipse cx="70" cy="94" rx="60" ry="5" fill="#2fb3bd" opacity="0.2"/>
  <rect x="10" y="50" width="62" height="40" rx="14" fill="#ffc9d9"/>
  <rect x="16" y="54" width="50" height="14" rx="7" fill="#ffe3ea"/>
  ${paw(32, 64, 0.8, '#ff9db0')}
  <rect x="78" y="40" width="54" height="50" rx="10" fill="#ffe08a"/>
  ${[[88, 52], [104, 60], [120, 50], [92, 74], [112, 78], [124, 68]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="#f0c04a"/>`).join('')}
  <g class="pFloat">${bubble(52, 30, 9)}${bubble(70, 18, 6)}${bubble(100, 24, 7)}</g>`);

const shampooBottles = box('0 0 150 170', `
  <ellipse cx="74" cy="166" rx="64" ry="4" fill="#2fb3bd" opacity="0.2"/>
  <rect x="24" y="22" width="16" height="16" rx="3" fill="#2fb3bd"/><path d="M40 26 H54" stroke="#2fb3bd" stroke-width="5" stroke-linecap="round"/>
  <path d="M12 46 Q12 36 24 36 H40 Q52 36 52 46 V160 Q52 166 46 166 H18 Q12 166 12 160 Z" fill="#9be3e8"/>
  <rect x="16" y="80" width="32" height="40" rx="6" fill="#ffffff"/>${daisy(32, 100, '#ff9db0', '#ffd35c', 6)}
  <rect x="68" y="52" width="22" height="14" rx="4" fill="#a594e0"/>
  <path d="M60 74 Q60 64 72 64 H86 Q98 64 98 74 V160 Q98 166 92 166 H66 Q60 166 60 160 Z" fill="#c9b6ff"/>
  <rect x="64" y="96" width="30" height="34" rx="6" fill="#ffffff"/>${paw(70, 102, 0.75, '#a594e0')}
  <rect x="112" y="96" width="24" height="10" rx="4" fill="#e0687f"/>
  <path d="M106 112 Q106 106 114 106 H134 Q142 106 142 112 V160 Q142 166 136 166 H112 Q106 166 106 160 Z" fill="#ffb3c6"/>
  <path d="M110 134 H138" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="20" cy="70" rx="3" ry="14" fill="#ffffff" opacity="0.6"/>`);

// ---------------------------------------------------------------- 7 · Bookshop Nook

const spines = (x0: number, y0: number, h: number, n: number, seed: number) => {
  const colors = ['#e0687f', '#9fd8ff', '#a0e7b4', '#ffd35c', '#c9b6ff', '#ff9d4d', '#8a5a3a', '#6fb5e6'];
  let x = x0;
  let out = '';
  for (let i = 0; i < n; i++) {
    const w = 9 + ((i * 7 + seed) % 6);
    const bh = h - ((i * 5 + seed) % 12);
    const c = colors[(i * 3 + seed) % colors.length];
    const tilt = i === n - 1 ? ` transform="rotate(10 ${x} ${y0 + h})"` : '';
    out += `<rect x="${x}" y="${y0 + h - bh}" width="${w}" height="${bh}" rx="1.5" fill="${c}"${tilt}/>
      <rect x="${x + 2}" y="${y0 + h - bh + 6}" width="${w - 4}" height="3" fill="#ffffff" opacity="0.5"${tilt}/>`;
    x += w + 1.5;
  }
  return out;
};

const bookshelf = box('0 0 200 260', `
  <ellipse cx="100" cy="256" rx="92" ry="4" fill="#8a5a3a" opacity="0.25"/>
  <rect x="10" y="10" width="180" height="244" rx="6" fill="#a8703d"/>
  <rect x="20" y="20" width="160" height="226" fill="#7a4e2a"/>
  ${[0, 1, 2, 3].map((i) => `<rect x="14" y="${74 + i * 58}" width="172" height="8" fill="#c48a52"/>`).join('')}
  ${spines(24, 24, 50, 9, 1)}
  ${spines(24, 82, 50, 7, 3)}<g transform="translate(140 104)">${paw(0, 0, 1.2, '#e3b77f')}</g>
  ${spines(24, 140, 50, 10, 5)}
  <path d="M26 248 V212 Q26 200 40 200 H90 Q104 200 104 212 V248 Z" fill="#c48a52"/>
  ${spines(112, 198, 50, 5, 2)}
  <circle cx="64" cy="224" r="4" fill="#ffd35c"/>
  <rect x="4" y="4" width="192" height="12" rx="5" fill="#c48a52"/>`);

const deskLamp = box('0 0 170 170', `
  <circle cx="58" cy="78" r="56" fill="#fff3c4" opacity="0.5" class="pPulse"/>
  <ellipse cx="100" cy="164" rx="66" ry="4" fill="#8a5a3a" opacity="0.25"/>
  <path d="M40 156 Q70 140 100 150 Q130 140 160 156 L160 162 L40 162 Z" fill="#ffffff"/>
  <path d="M100 150 V162" stroke="#e8e0d0" stroke-width="2"/>
  ${[0, 1, 2].map((i) => `<path d="M${50 + i * 4} ${152 - i} Q70 ${146 - i * 3} 92 ${150 - i}" stroke="#d8c3b2" stroke-width="2" fill="none"/><path d="M${108 + i * 4} ${150 - i} Q130 ${146 - i * 3} 150 ${152 - i}" stroke="#d8c3b2" stroke-width="2" fill="none"/>`).join('')}
  <ellipse cx="38" cy="158" rx="26" ry="6" fill="#4f9a68"/>
  <path d="M38 156 L60 100 L30 60" stroke="#4f9a68" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="60" cy="100" r="6" fill="#3f8a58"/>
  <path d="M12 52 L46 34 L66 72 Q44 86 20 76 Z" fill="#6bb983"/>
  <ellipse cx="44" cy="76" rx="14" ry="5" fill="#fff3c4" transform="rotate(-28 44 76)"/>
  <g class="pFloat" fill="#b07a3c" font-family="Nunito, sans-serif" font-weight="900">
    <text x="112" y="122" font-size="16">a</text><text x="128" y="104" font-size="12">b</text><text x="98" y="96" font-size="14">c</text>
  </g>`);

const globe = box('0 0 130 160', `
  <ellipse cx="65" cy="154" rx="40" ry="5" fill="#8a5a3a" opacity="0.25"/>
  <path d="M40 152 H90 L82 140 H48 Z" fill="#a8703d"/>
  <rect x="61" y="118" width="8" height="24" fill="#c48a52"/>
  <path d="M22 70 A44 44 0 0 0 110 70" stroke="#c48a52" stroke-width="6" fill="none"/>
  <g class="pSpin" style="transform-origin:66px 66px;animation-duration:40s">
    <circle cx="66" cy="66" r="40" fill="#9fd8ff"/>
    <path d="M40 46 Q52 36 62 46 Q66 58 54 62 Q42 66 40 56 Z M74 34 Q92 34 96 50 Q88 54 80 50 Q72 44 74 34 Z M64 76 Q80 70 90 82 Q86 98 72 100 Q60 92 64 76 Z" fill="#a0e7b4"/>
  </g>
  <circle cx="66" cy="66" r="40" fill="none" stroke="#6fb5e6" stroke-width="3"/>
  <ellipse cx="52" cy="46" rx="10" ry="6" fill="#ffffff" opacity="0.45" transform="rotate(-30 52 46)"/>`);

const candle = box('0 0 90 150', `
  <ellipse cx="45" cy="34" rx="30" ry="34" fill="#ffd97a" opacity="0.25" class="pPulse"/>
  <path d="M45 10 Q56 26 50 38 Q45 44 40 38 Q34 26 45 10 Z" fill="#ffb84d" class="pSway"/>
  <path d="M45 22 Q50 30 47 36 Q45 38 43 36 Q40 30 45 22 Z" fill="#fff3c4"/>
  <line x1="45" y1="38" x2="45" y2="46" stroke="#4a3b34" stroke-width="2"/>
  <rect x="30" y="46" width="30" height="70" rx="5" fill="#fffaf2"/>
  <path d="M30 56 Q36 64 40 56 V70 Q42 76 44 70" fill="#f2e8da"/>
  <ellipse cx="45" cy="124" rx="34" ry="10" fill="#c48a52"/>
  <ellipse cx="45" cy="120" rx="26" ry="6" fill="#d9a066"/>
  <path d="M78 120 Q90 120 88 108" stroke="#c48a52" stroke-width="5" fill="none" stroke-linecap="round"/>`);

const readingGlasses = box('0 0 130 70', `
  <ellipse cx="65" cy="62" rx="54" ry="5" fill="#8a5a3a" opacity="0.2"/>
  <circle cx="38" cy="38" r="20" fill="#dff1ff" fill-opacity="0.7" stroke="#b07a3c" stroke-width="5"/>
  <circle cx="92" cy="38" r="20" fill="#dff1ff" fill-opacity="0.7" stroke="#b07a3c" stroke-width="5"/>
  <path d="M58 34 Q65 28 72 34" stroke="#b07a3c" stroke-width="5" fill="none"/>
  <path d="M18 34 L4 24 M112 34 L126 24" stroke="#b07a3c" stroke-width="4" stroke-linecap="round"/>
  <path d="M28 30 L36 26 M82 30 L90 26" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>`);

// ---------------------------------------------------------------- 8 · Snowy Porch

const snowflake = (cx: number, cy: number, r: number, color = '#ffffff') =>
  `<g stroke="${color}" stroke-width="${Math.max(1.4, r / 6)}" stroke-linecap="round" class="pTwinkle">
    ${[0, 60, 120].map((a) => `<line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}" transform="rotate(${a} ${cx} ${cy})"/>`).join('')}
    ${[0, 60, 120, 180, 240, 300].map((a) => `<path d="M${cx - r * 0.3} ${cy - r * 0.75} L${cx} ${cy - r * 0.5} L${cx + r * 0.3} ${cy - r * 0.75}" fill="none" transform="rotate(${a} ${cx} ${cy})"/>`).join('')}
  </g>`;

const snowman = box('0 0 170 220', `
  <ellipse cx="85" cy="212" rx="70" ry="8" fill="#9fbad6" opacity="0.4"/>
  <circle cx="85" cy="166" r="48" fill="#ffffff"/><circle cx="85" cy="166" r="48" fill="none" stroke="#dbe7f3" stroke-width="3"/>
  <circle cx="85" cy="98" r="36" fill="#ffffff"/><circle cx="85" cy="98" r="36" fill="none" stroke="#dbe7f3" stroke-width="3"/>
  <circle cx="85" cy="44" r="28" fill="#ffffff"/><circle cx="85" cy="44" r="28" fill="none" stroke="#dbe7f3" stroke-width="3"/>
  <path d="M54 70 Q85 84 116 70 L118 82 Q85 96 52 82 Z" fill="#e0687f"/>
  <path d="M100 80 L108 112 L96 110 Z" fill="#e0687f"/>
  <path d="M60 74 H112" stroke="#ff9db0" stroke-width="3" stroke-dasharray="6 6"/>
  <path d="M60 22 Q85 4 110 22 L104 30 H66 Z" fill="#9fd8ff"/><circle cx="85" cy="8" r="7" fill="#ffffff"/>
  <path d="M74 40 Q78 36 82 40 M88 40 Q92 36 96 40" stroke="#4a3b34" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M85 46 L104 50 L85 52 Z" fill="#ff9d4d"/>
  <circle cx="72" cy="52" r="4" fill="#ffb3c6" opacity="0.8"/><circle cx="98" cy="52" r="4" fill="#ffb3c6" opacity="0.8"/>
  <circle cx="85" cy="104" r="4" fill="#4a3b34"/><circle cx="85" cy="122" r="4" fill="#4a3b34"/><circle cx="85" cy="154" r="4" fill="#4a3b34"/>
  <path d="M50 96 L18 70 M24 76 L14 78 M24 76 L22 66 M120 96 L152 72 M146 78 L156 80 M146 78 L150 68" stroke="#8a5a3a" stroke-width="4" stroke-linecap="round"/>`);

const snowyPine = box('0 0 200 250', `
  <ellipse cx="100" cy="242" rx="80" ry="8" fill="#9fbad6" opacity="0.4"/>
  <rect x="90" y="206" width="20" height="36" fill="#8a5a3a"/>
  <path d="M100 8 L150 80 H124 L170 140 H140 L190 210 H10 L60 140 H30 L76 80 H50 Z" fill="#4f9a68"/>
  <path d="M100 8 L122 40 Q100 52 80 38 Z M76 80 Q100 92 124 80 L134 94 Q100 108 66 94 Z M60 140 Q100 154 140 140 L152 158 Q100 174 48 158 Z M28 196 Q100 214 172 196 L190 210 H10 Z" fill="#ffffff"/>
  ${[[86, 110, '#ff9db0'], [120, 124, '#ffd35c'], [74, 176, '#9fd8ff'], [128, 186, '#c9b6ff'], [104, 64, '#ff9d4d'], [60, 120, '#a0e7b4'], [148, 170, '#ff9db0']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="6" fill="${c}"/><circle cx="${Number(x) - 2}" cy="${Number(y) - 2}" r="1.8" fill="#ffffff" opacity="0.8"/>`).join('')}
  <path d="M100 0 L104 10 L114 11 L106 17 L109 27 L100 21 L91 27 L94 17 L86 11 L96 10 Z" fill="#ffd35c" class="pTwinkle"/>`);

const wreath = box('0 0 140 150', `
  <path d="M70 4 V18" stroke="#b07a3c" stroke-width="3"/>
  <circle cx="70" cy="76" r="50" fill="none" stroke="#4f9a68" stroke-width="26"/>
  ${Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    const x = 70 + Math.cos(a) * 50;
    const y = 76 + Math.sin(a) * 50;
    return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="12" ry="6" fill="${i % 2 ? '#6bb983' : '#3f8a58'}" transform="rotate(${((a * 180) / Math.PI + 90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }).join('')}
  ${[[40, 40], [100, 46], [112, 96], [34, 104], [70, 128]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#e0687f"/><circle cx="${x + 6}" cy="${y + 3}" r="4" fill="#e0687f"/>`).join('')}
  <path d="M70 26 L46 10 Q40 22 52 30 Z M70 26 L94 10 Q100 22 88 30 Z" fill="#e0687f"/>
  <path d="M66 30 L58 54 M74 30 L82 54" stroke="#e0687f" stroke-width="7" stroke-linecap="round"/>
  <circle cx="70" cy="27" r="7" fill="#c9506a"/>`);

const mittensLine = box('0 0 180 120', `
  <path d="M4 18 Q90 44 176 18" stroke="#b07a3c" stroke-width="3" fill="none"/>
  <g class="pSway" style="transform-origin:52px 30px">
    <rect x="46" y="24" width="8" height="14" rx="2" fill="#c48a52"/>
    <path d="M32 40 H70 V86 Q70 104 52 104 Q32 104 32 86 Z" fill="#ff9db0"/>
    <path d="M70 58 Q84 56 82 72 Q80 82 70 80" fill="#ff9db0"/>
    <rect x="30" y="38" width="42" height="12" rx="4" fill="#ffffff"/>
    <path d="M38 66 L44 72 L50 66 L56 72 L62 66" stroke="#ffffff" stroke-width="3" fill="none"/>
  </g>
  <g class="pSway" style="transform-origin:128px 30px;animation-delay:-1.5s">
    <rect x="122" y="24" width="8" height="14" rx="2" fill="#c48a52"/>
    <path d="M108 40 H146 V86 Q146 104 128 104 Q108 104 108 86 Z" fill="#9fd8ff"/>
    <path d="M108 58 Q94 56 96 72 Q98 82 108 80" fill="#9fd8ff"/>
    <rect x="106" y="38" width="42" height="12" rx="4" fill="#ffffff"/>
    ${paw(117, 64, 0.9, '#ffffff')}
  </g>`);

const cocoaMug = box('0 0 110 110', `
  <path class="pSmoke" d="M44 30 C38 22 50 16 44 6" stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path class="pSmoke pSmoke2" d="M64 30 C58 22 70 16 64 6" stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round"/>
  <ellipse cx="54" cy="102" rx="40" ry="5" fill="#9fbad6" opacity="0.4"/>
  <path d="M84 54 Q102 54 100 72 Q98 88 82 86" stroke="#e0687f" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M18 40 H88 V86 Q88 100 72 100 H34 Q18 100 18 86 Z" fill="#ff9db0"/>
  <path d="M18 56 H88 M18 72 H88" stroke="#ffffff" stroke-width="5" stroke-dasharray="8 6"/>
  <ellipse cx="53" cy="41" rx="35" ry="7" fill="#8a5a3a"/>
  <circle cx="42" cy="38" r="7" fill="#ffffff"/><circle cx="58" cy="36" r="6" fill="#ffe3ea"/><circle cx="66" cy="41" r="5" fill="#ffffff"/>`);

// ---------------------------------------------------------------- 9 · Lantern Festival

const paperLantern = (body: string, rib: string, glow = '#ffb38a') =>
  `<circle cx="60" cy="74" r="58" fill="${glow}" opacity="0.18" class="pPulse"/>
   <line x1="60" y1="0" x2="60" y2="20" stroke="#2a1d3d" stroke-width="3"/>
   <rect x="42" y="18" width="36" height="10" rx="3" fill="#ffd35c"/>
   <ellipse cx="60" cy="74" rx="46" ry="48" fill="${body}"/>
   ${[-30, -15, 0, 15, 30].map((dx) => `<path d="M${60 + dx * 0.3} 28 Q${60 + dx * 1.45} 74 ${60 + dx * 0.3} 120" stroke="${rib}" stroke-width="2.4" fill="none"/>`).join('')}
   <ellipse cx="60" cy="74" rx="46" ry="48" fill="none" stroke="${rib}" stroke-width="2.4"/>
   <ellipse cx="44" cy="56" rx="10" ry="18" fill="#ffffff" opacity="0.25" transform="rotate(20 44 56)"/>
   <rect x="42" y="118" width="36" height="10" rx="3" fill="#ffd35c"/>
   ${[46, 54, 62, 70].map((x) => `<line x1="${x}" y1="128" x2="${x}" y2="146" stroke="#ffd35c" stroke-width="2.4" stroke-linecap="round"/>`).join('')}`;

const bigLantern = box('0 0 120 150', `<g class="pSway" style="transform-origin:60px 0px">${paperLantern('#ff7a6b', '#e0503f')}
  ${paw(48, 64, 1, '#ffd35c')}</g>`);

const lanternString = box('0 0 280 120', `
  <path d="M4 14 Q140 70 276 14" stroke="#2a1d3d" stroke-width="3" fill="none"/>
  ${[[30, 26, '#ffb38a'], [80, 42, '#ff7a6b'], [140, 48, '#ffd35c'], [200, 42, '#c9b6ff'], [250, 26, '#9be3e8']].map(([x, y, c], i) => `
    <g class="pSway" style="transform-origin:${x}px ${y}px;animation-delay:${-i * 0.8}s">
      <circle cx="${x}" cy="${Number(y) + 26}" r="26" fill="${c}" opacity="0.2"/>
      <line x1="${x}" y1="${y}" x2="${x}" y2="${Number(y) + 8}" stroke="#2a1d3d" stroke-width="2"/>
      <rect x="${Number(x) - 9}" y="${Number(y) + 6}" width="18" height="5" rx="2" fill="#ffd35c"/>
      <ellipse cx="${x}" cy="${Number(y) + 26}" rx="16" ry="18" fill="${c}"/>
      <path d="M${Number(x) - 6} ${Number(y) + 10} Q${Number(x) - 10} ${Number(y) + 26} ${Number(x) - 6} ${Number(y) + 42} M${Number(x) + 6} ${Number(y) + 10} Q${Number(x) + 10} ${Number(y) + 26} ${Number(x) + 6} ${Number(y) + 42}" stroke="#2a1d3d" stroke-opacity="0.25" stroke-width="1.6" fill="none"/>
      <rect x="${Number(x) - 9}" y="${Number(y) + 42}" width="18" height="5" rx="2" fill="#ffd35c"/>
      <line x1="${x}" y1="${Number(y) + 47}" x2="${x}" y2="${Number(y) + 58}" stroke="#ffd35c" stroke-width="2"/>
    </g>`).join('')}`);

const firework = box('0 0 180 180', `
  <g class="pPulse" style="transform-origin:90px 90px">
    ${Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      const c = ['#ffd35c', '#ff9db0', '#9be3e8', '#c9b6ff'][i % 4];
      const r1 = 22;
      const r2 = i % 2 ? 70 : 84;
      return `<line x1="${(90 + Math.cos(a) * r1).toFixed(1)}" y1="${(90 + Math.sin(a) * r1).toFixed(1)}" x2="${(90 + Math.cos(a) * r2).toFixed(1)}" y2="${(90 + Math.sin(a) * r2).toFixed(1)}" stroke="${c}" stroke-width="4" stroke-linecap="round"/>
        <circle cx="${(90 + Math.cos(a) * (r2 + 6)).toFixed(1)}" cy="${(90 + Math.sin(a) * (r2 + 6)).toFixed(1)}" r="3.4" fill="${c}"/>`;
    }).join('')}
  </g>
  <circle cx="90" cy="90" r="8" fill="#fff6d6"/>
  ${twinkle(30, 34, 6, '#fff6d6')}${twinkle(150, 150, 5, '#fff6d6')}${twinkle(156, 30, 4, '#fff6d6')}`);

const skyLanterns = box('0 0 150 160', `
  ${[[40, 110, 1, '#ffb38a'], [104, 64, 0.8, '#ffd35c'], [62, 30, 0.6, '#ff9db0']].map(([x, y, s, c], i) => `
    <g class="pFloat" style="animation-delay:${-i * 1.6}s">
      <circle cx="${x}" cy="${y}" r="${30 * Number(s)}" fill="${c}" opacity="0.22"/>
      <path d="M${Number(x) - 16 * Number(s)} ${Number(y) - 20 * Number(s)} H${Number(x) + 16 * Number(s)} L${Number(x) + 12 * Number(s)} ${Number(y) + 20 * Number(s)} H${Number(x) - 12 * Number(s)} Z" fill="${c}"/>
      <path d="M${Number(x) - 16 * Number(s)} ${Number(y) - 20 * Number(s)} H${Number(x) + 16 * Number(s)}" stroke="#fff3c4" stroke-width="${3 * Number(s)}"/>
      <ellipse cx="${x}" cy="${Number(y) + 18 * Number(s)}" rx="${5 * Number(s)}" ry="${3 * Number(s)}" fill="#fff6d6"/>
    </g>`).join('')}`);

const festivalGate = box('0 0 230 200', `
  <ellipse cx="115" cy="196" rx="100" ry="5" fill="#000000" opacity="0.25"/>
  <rect x="40" y="56" width="16" height="140" fill="#e0503f"/><rect x="174" y="56" width="16" height="140" fill="#e0503f"/>
  <rect x="34" y="186" width="28" height="10" fill="#2a1d3d"/><rect x="168" y="186" width="28" height="10" fill="#2a1d3d"/>
  <rect x="26" y="70" width="178" height="12" fill="#e0503f"/>
  <path d="M6 30 Q115 52 224 30 L216 50 Q115 66 14 50 Z" fill="#2a1d3d"/>
  <path d="M10 42 Q115 60 220 42" stroke="#e0503f" stroke-width="6" fill="none"/>
  <rect x="98" y="50" width="34" height="26" rx="3" fill="#ffd35c"/>
  ${paw(105, 54, 0.85, '#e0503f')}
  ${[70, 160].map((x) => `<g class="pSway" style="transform-origin:${x}px 82px"><line x1="${x}" y1="82" x2="${x}" y2="94" stroke="#2a1d3d" stroke-width="2"/><ellipse cx="${x}" cy="112" rx="14" ry="18" fill="#ffb38a"/><circle cx="${x}" cy="112" r="24" fill="#ffb38a" opacity="0.2"/></g>`).join('')}`);

// ---------------------------------------------------------------- worlds

export const WORLDS: World[] = [
  {
    top: '#ffdcb5', bottom: '#fff0dc', deep: '#e0904a', coat: COATS.ginger,
    strip: {
      w: 120,
      svg: `<rect y="16" width="120" height="16" fill="#e9b47c"/><rect y="32" width="120" height="8" fill="#d39a5f"/>
        <rect x="0" y="16" width="120" height="3" fill="#f5cc9c"/>`,
    },
    // Warm wallpaper: scattered dots and tiny suns, with soft diagonal sunbeams.
    texture: {
      w: 96, h: 96,
      svg: `<g fill="#e0904a" fill-opacity="0.13">
          <circle cx="10" cy="12" r="2.2"/><circle cx="58" cy="30" r="1.6"/><circle cx="34" cy="62" r="2"/>
          <circle cx="84" cy="74" r="2.4"/><circle cx="72" cy="6" r="1.4"/><circle cx="16" cy="86" r="1.5"/>
        </g>
        <g fill="none" stroke="#e0904a" stroke-opacity="0.16" stroke-width="1.6" stroke-linecap="round">
          <circle cx="40" cy="22" r="3.2"/><path d="M40 15.5 V13.5 M40 28.5 V30.5 M33.5 22 H31.5 M46.5 22 H48.5"/>
          <circle cx="78" cy="48" r="2.6"/><path d="M78 42.8 V41.2 M78 53.2 V54.8 M72.8 48 H71.2 M83.2 48 H84.8"/>
        </g>`,
      wash: 'repeating-linear-gradient(118deg, rgba(255,255,255,0) 0 140px, rgba(255,255,255,0.22) 140px 200px, rgba(255,255,255,0) 200px 330px)',
    },
    props: [
      { svg: sunnyWindow, size: 210, side: 'left', at: 0.08, inset: 0.3, still: true },
      { svg: sunnySun, size: 130, side: 'right', at: 0.03, inset: 0.6 },
      { svg: sunnyPlant, size: 170, side: 'right', at: 0.42, inset: 0.22, still: true },
      { svg: sunnyTeacup, size: 92, side: 'left', at: 0.7, inset: 0.55, still: true },
      { svg: sunnyBooks, size: 124, side: 'right', at: 0.86, inset: 0.5, still: true },
    ],
  },
  {
    top: '#ddd3ff', bottom: '#efeaff', deep: '#8f7fd6', coat: COATS.lilac,
    strip: {
      w: 60,
      svg: `<rect y="12" width="60" height="26" fill="#cbbef5"/>
        <path d="M0 25 L15 17 L30 25 L45 17 L60 25" stroke="#a594e0" stroke-width="4" fill="none"/>
        ${[3, 9, 15, 21, 27, 33, 39, 45, 51, 57].map((x) => `<line x1="${x}" y1="38" x2="${x}" y2="45" stroke="#b3a3ea" stroke-width="2.4" stroke-linecap="round"/>`).join('')}`,
    },
    // Living-room wallpaper: soft vertical stripes with little diamonds.
    texture: {
      w: 56, h: 56,
      svg: `<rect x="0" y="0" width="14" height="56" fill="#8f7fd6" fill-opacity="0.06"/>
        <rect x="28" y="0" width="2" height="56" fill="#8f7fd6" fill-opacity="0.08"/>
        <path d="M42 22 L46 28 L42 34 L38 28 Z" fill="#8f7fd6" fill-opacity="0.15"/>
        <circle cx="42" cy="6" r="1.4" fill="#8f7fd6" fill-opacity="0.15"/><circle cx="42" cy="50" r="1.4" fill="#8f7fd6" fill-opacity="0.15"/>`,
    },
    props: [
      { svg: fishPicture, size: 112, side: 'left', at: 0.05, inset: 0.6, still: true },
      { svg: armchair, size: 270, side: 'left', at: 0.42, inset: 0.15, still: true },
      { svg: mouseToy, size: 86, side: 'left', at: 0.92, inset: 0.55 },
      { svg: floorLamp, size: 230, side: 'right', at: 0.05, inset: 0.3, still: true },
      { svg: yarnBasket, size: 150, side: 'right', at: 0.62, inset: 0.45, still: true },
    ],
  },
  {
    top: '#c7ecd5', bottom: '#e2f6e8', deep: '#4fb276', coat: COATS.tuxedo,
    strip: {
      w: 26,
      svg: `<rect x="0" y="16" width="26" height="5" fill="#efe6d6"/><rect x="0" y="32" width="26" height="5" fill="#efe6d6"/>
        <path d="M6 46 V12 L13 4 L20 12 V46 Z" fill="#fffaf2" stroke="#b5d8c0" stroke-width="2"/>`,
    },
    // Lawn: grass tufts, clover dots and the odd tiny flower.
    texture: {
      w: 110, h: 110,
      svg: `<g fill="none" stroke="#3f9a62" stroke-opacity="0.2" stroke-width="1.7" stroke-linecap="round">
          <path d="M12 30 L15 22 L17 30 L21 24"/><path d="M64 14 L67 6 L69 14 L73 8"/>
          <path d="M40 74 L43 66 L45 74 L49 68"/><path d="M90 58 L93 50 L95 58 L99 52"/>
          <path d="M74 100 L77 92 L79 100"/><path d="M18 96 L21 88 L23 96"/>
        </g>
        <g fill="#3f9a62" fill-opacity="0.12">
          <circle cx="36" cy="40" r="2.2"/><circle cx="39" cy="43" r="2.2"/><circle cx="33" cy="43" r="2.2"/>
          <circle cx="96" cy="22" r="1.6"/><circle cx="58" cy="54" r="1.4"/><circle cx="6" cy="64" r="1.6"/>
        </g>
        <g fill="#ff8fa8" fill-opacity="0.22"><circle cx="84" cy="80" r="2.2"/><circle cx="28" cy="10" r="1.8"/></g>
        <g fill="#ffffff" fill-opacity="0.45"><circle cx="84" cy="80" r="0.9"/><circle cx="28" cy="10" r="0.8"/></g>`,
    },
    props: [
      { svg: butterfly('#c9b6ff', '#ffc9d9', '#fff0a8'), size: 84, side: 'left', at: 0.04, inset: 0.7 },
      { svg: wateringCan, size: 136, side: 'left', at: 0.26, inset: 0.45, still: true },
      { svg: flowerBed, size: 250, side: 'left', at: 0.7, inset: 0.15, still: true },
      { svg: birdhouse, size: 200, side: 'right', at: 0.04, inset: 0.3, still: true },
      { svg: butterfly('#ffd6a5', '#bfe3ff', '#ff9db0'), size: 66, side: 'right', at: 0.46, inset: 0.75 },
      { svg: snail, size: 104, side: 'right', at: 0.68, inset: 0.4, still: true },
    ],
  },
  {
    top: '#273159', bottom: '#46558c', deep: '#7fb6ff', night: true, coat: COATS.black,
    strip: {
      w: 160,
      svg: `<path d="M0 48 V26 L20 12 L40 26 V48 Z M40 48 V30 H70 V20 L85 8 L100 20 V48 Z M100 48 V24 L130 14 L160 24 V48 Z" fill="#1d2546"/>
        <rect x="14" y="30" width="7" height="8" fill="#ffd97a"/><rect x="78" y="26" width="7" height="8" fill="#ffd97a"/>
        <rect x="124" y="30" width="7" height="8" fill="#ffd97a" opacity="0.6"/>`,
    },
    // Night sky: a fine dust of faint far-away stars behind the bright ones,
    // with a soft milky haze.
    texture: {
      w: 120, h: 120,
      svg: `<g fill="#ffffff" fill-opacity="0.28">
          <circle cx="8" cy="14" r="0.9"/><circle cx="46" cy="6" r="0.7"/><circle cx="92" cy="22" r="1"/>
          <circle cx="26" cy="48" r="0.7"/><circle cx="70" cy="40" r="0.9"/><circle cx="110" cy="58" r="0.7"/>
          <circle cx="14" cy="86" r="1"/><circle cx="56" cy="78" r="0.7"/><circle cx="98" cy="96" r="0.9"/>
          <circle cx="38" cy="110" r="0.8"/><circle cx="80" cy="114" r="0.6"/>
        </g>`,
      wash: 'radial-gradient(ellipse 70% 40% at 70% 35%, rgba(170,190,255,0.16), rgba(170,190,255,0) 70%)',
    },
    props: [
      { svg: streetLamp, size: 240, side: 'left', at: 0.05, inset: 0.3, still: true },
      { svg: chimneyRoof, size: 176, side: 'left', at: 0.6, inset: 0.45, still: true },
      { svg: shootingStar, size: 136, side: 'left', at: 0.95, inset: 0.65 },
      { svg: moon, size: 230, side: 'right', at: 0.03, inset: 0.35 },
      { svg: nightCloud, size: 160, side: 'right', at: 0.5, inset: 0.7 },
    ],
  },
  {
    top: '#ffcadb', bottom: '#ffe5ee', deep: '#e0687f', coat: COATS.calico,
    strip: {
      w: 60,
      svg: `<path d="M0 8 Q30 18 60 8" stroke="#c98aa0" stroke-width="2.5" fill="none"/>
        <path d="M6 11 L17 36 L28 14 Z" fill="#ff9db0"/><path d="M33 14 L43 36 L54 11 Z" fill="#ffd6a5"/>`,
    },
    // Council hall: quilted diamond lattice with a small heart in each square.
    texture: {
      w: 48, h: 48,
      svg: `<path d="M24 0 L48 24 L24 48 L0 24 Z" fill="none" stroke="#e0687f" stroke-opacity="0.12" stroke-width="1.4"/>
        <path d="M24 28.5 C18.5 24 19.5 19 24 21.4 C28.5 19 29.5 24 24 28.5 Z" fill="#e0687f" fill-opacity="0.14"/>
        <g fill="#e0687f" fill-opacity="0.16"><circle cx="0" cy="0" r="1.6"/><circle cx="48" cy="0" r="1.6"/><circle cx="0" cy="48" r="1.6"/><circle cx="48" cy="48" r="1.6"/></g>`,
    },
    props: [
      { svg: throne, size: 240, side: 'left', at: 0.3, inset: 0.2, still: true },
      { svg: ballotBox, size: 120, side: 'left', at: 0.88, inset: 0.55, still: true },
      { svg: cushionStack, size: 140, side: 'right', at: 0.06, inset: 0.45, still: true },
      { svg: councilScroll, size: 128, side: 'right', at: 0.48, inset: 0.3 },
      { svg: cakeStand, size: 136, side: 'right', at: 0.86, inset: 0.55, still: true },
    ],
  },
  // 5 · Kitchen Counter — butter-yellow tiles, milk and fish
  {
    top: '#ffe7a3', bottom: '#fff6d6', deep: '#d39b14', coat: COATS.cream,
    strip: {
      w: 48,
      svg: `<rect y="12" width="48" height="6" fill="#e9c46a"/>
        <rect x="0" y="18" width="12" height="12" fill="#ffffff"/><rect x="12" y="18" width="12" height="12" fill="#9fd8ff"/>
        <rect x="24" y="18" width="12" height="12" fill="#ffffff"/><rect x="36" y="18" width="12" height="12" fill="#9fd8ff"/>
        <rect x="0" y="30" width="12" height="12" fill="#9fd8ff"/><rect x="12" y="30" width="12" height="12" fill="#ffffff"/>
        <rect x="24" y="30" width="12" height="12" fill="#9fd8ff"/><rect x="36" y="30" width="12" height="12" fill="#ffffff"/>`,
    },
    // Kitchen tiles: soft grout grid with a dot at each corner.
    texture: {
      w: 64, h: 64,
      svg: `<path d="M0 0.5 H64 M0.5 0 V64" stroke="#d39b14" stroke-opacity="0.12" stroke-width="1.5"/>
        <circle cx="0.5" cy="0.5" r="2.4" fill="#d39b14" fill-opacity="0.14"/>
        <circle cx="32" cy="32" r="1.6" fill="#d39b14" fill-opacity="0.12"/>`,
    },
    props: [
      { svg: kettle, size: 210, side: 'left', at: 0.06, inset: 0.3, still: true },
      { svg: fishPlate, size: 200, side: 'left', at: 0.66, inset: 0.2, still: true },
      { svg: milkBottle, size: 180, side: 'right', at: 0.06, inset: 0.35, still: true },
      { svg: cookieJar, size: 150, side: 'right', at: 0.5, inset: 0.55, still: true },
      { svg: milkSaucer, size: 100, side: 'right', at: 0.93, inset: 0.3 },
    ],
  },
  // 6 · Bubble Bath — aqua tiles and floating bubbles
  {
    top: '#bdecef', bottom: '#e3f8f8', deep: '#2aa6b0', coat: COATS.greyTabby,
    strip: {
      w: 40,
      svg: `<rect y="12" width="40" height="30" fill="#e6f6f8"/>
        <path d="M0 12 H40 M0 27 H40 M20 12 V27 M0 27 V42 M40 27 V42" stroke="#9fd8e0" stroke-width="2"/>
        <circle cx="10" cy="8" r="5" fill="#ffffff"/><circle cx="30" cy="9" r="4" fill="#ffffff"/>`,
    },
    // Bath wall: little outlined bubbles drifting over the tiles.
    texture: {
      w: 90, h: 90,
      svg: `<g fill="#ffffff" fill-opacity="0.35" stroke="#ffffff" stroke-opacity="0.8" stroke-width="1.4">
          <circle cx="14" cy="18" r="6"/><circle cx="62" cy="10" r="3.5"/><circle cx="44" cy="52" r="8"/>
          <circle cx="80" cy="64" r="4.5"/><circle cx="16" cy="78" r="3"/>
        </g>
        <g fill="#2aa6b0" fill-opacity="0.12"><circle cx="34" cy="30" r="1.6"/><circle cx="72" cy="38" r="1.4"/><circle cx="60" cy="84" r="1.6"/></g>`,
    },
    props: [
      { svg: soapSponge, size: 130, side: 'left', at: 0.04, inset: 0.6, still: true },
      { svg: bathtub, size: 280, side: 'left', at: 0.5, inset: 0.15, still: true },
      { svg: rubberDuck, size: 130, side: 'right', at: 0.06, inset: 0.45 },
      { svg: bubbleCluster, size: 150, side: 'right', at: 0.44, inset: 0.7 },
      { svg: shampooBottles, size: 170, side: 'right', at: 0.9, inset: 0.3, still: true },
    ],
  },
  // 7 · Bookshop Nook — warm amber shelves and lamplight
  {
    top: '#efcf9f', bottom: '#f9e8cf', deep: '#a8703d', coat: COATS.siamese,
    strip: {
      w: 80,
      svg: `<rect y="38" width="80" height="8" fill="#a8703d"/>
        <rect x="2" y="14" width="10" height="24" rx="1.5" fill="#e0687f"/><rect x="13" y="18" width="8" height="20" rx="1.5" fill="#9fd8ff"/>
        <rect x="22" y="12" width="11" height="26" rx="1.5" fill="#a0e7b4"/><rect x="34" y="16" width="9" height="22" rx="1.5" fill="#ffd35c"/>
        <rect x="44" y="14" width="10" height="24" rx="1.5" fill="#c9b6ff"/><rect x="55" y="20" width="8" height="18" rx="1.5" fill="#ff9d4d"/>
        <rect x="64" y="14" width="12" height="24" rx="1.5" fill="#8a5a3a" transform="rotate(8 64 38)"/>`,
    },
    // Old wallpaper: tiny leaves in a diamond grid, with faint wood grain.
    texture: {
      w: 60, h: 60,
      svg: `<path d="M0 20 Q30 24 60 20 M0 48 Q30 44 60 48" stroke="#a8703d" stroke-opacity="0.06" stroke-width="2" fill="none"/>
        <path d="M15 15 Q20 8 25 15 Q20 22 15 15 Z M45 45 Q50 38 55 45 Q50 52 45 45 Z" fill="#a8703d" fill-opacity="0.14"/>
        <circle cx="45" cy="15" r="1.6" fill="#a8703d" fill-opacity="0.14"/><circle cx="15" cy="45" r="1.6" fill="#a8703d" fill-opacity="0.14"/>`,
    },
    props: [
      { svg: bookshelf, size: 260, side: 'left', at: 0.2, inset: 0.15, still: true },
      { svg: candle, size: 120, side: 'left', at: 0.92, inset: 0.6, still: true },
      { svg: deskLamp, size: 190, side: 'right', at: 0.06, inset: 0.3, still: true },
      { svg: readingGlasses, size: 110, side: 'right', at: 0.48, inset: 0.65, still: true },
      { svg: globe, size: 150, side: 'right', at: 0.82, inset: 0.35, still: true },
    ],
  },
  // 8 · Snowy Porch — icy blue winter, snowmen and pines
  {
    top: '#cfe1f3', bottom: '#eef5fc', deep: '#4f86c0', coat: COATS.snow,
    strip: {
      w: 90,
      svg: `<rect y="26" width="90" height="20" fill="#b68a5c"/>
        <path d="M0 36 H90 M30 26 V46 M60 26 V46" stroke="#9a7148" stroke-width="2"/>
        <path d="M0 30 Q12 16 26 26 Q40 14 56 24 Q70 14 90 28 V32 H0 Z" fill="#ffffff"/>`,
    },
    // Falling snow: scattered flakes and dots.
    texture: {
      w: 100, h: 100,
      svg: `<g fill="#ffffff" fill-opacity="0.85"><circle cx="12" cy="14" r="2"/><circle cx="58" cy="30" r="1.6"/><circle cx="84" cy="8" r="2.2"/>
          <circle cx="30" cy="62" r="1.8"/><circle cx="76" cy="74" r="2"/><circle cx="46" cy="92" r="1.5"/></g>
        <g stroke="#ffffff" stroke-opacity="0.9" stroke-width="1.4" stroke-linecap="round">
          <path d="M88 44 V56 M82 47 L94 53 M82 53 L94 47"/><path d="M14 84 V92 M10 86 L18 90 M10 90 L18 86"/>
        </g>`,
    },
    props: [
      { svg: wreath, size: 150, side: 'left', at: 0.04, inset: 0.5, still: true },
      { svg: snowman, size: 220, side: 'left', at: 0.55, inset: 0.2, still: true },
      { svg: cocoaMug, size: 104, side: 'left', at: 0.97, inset: 0.6, still: true },
      { svg: snowyPine, size: 250, side: 'right', at: 0.12, inset: 0.25, still: true },
      { svg: mittensLine, size: 160, side: 'right', at: 0.8, inset: 0.5, still: true },
      { svg: box('0 0 80 80', snowflake(40, 40, 30)), size: 72, side: 'right', at: 0.55, inset: 0.85 },
    ],
  },
  // 9 · Lantern Festival — the final night, plum sky and paper lanterns
  {
    top: '#2c1d42', bottom: '#4b3163', deep: '#ffb38a', night: true, coat: COATS.smoke,
    strip: {
      w: 120,
      svg: `<path d="M0 48 V30 H18 L28 20 L38 30 H54 V48 Z M54 48 V26 L72 14 L90 26 V48 Z M90 48 V32 H120 V48 Z" fill="#1c1230"/>
        <circle cx="28" cy="36" r="4" fill="#ffb38a"/><circle cx="72" cy="32" r="4" fill="#ffd35c"/><circle cx="104" cy="38" r="3.5" fill="#ff7a6b"/>`,
    },
    // Festival night: faint golden sparks with a warm glow low in the sky.
    texture: {
      w: 110, h: 110,
      svg: `<g fill="#ffd35c" fill-opacity="0.3"><circle cx="10" cy="16" r="1"/><circle cx="54" cy="8" r="0.8"/><circle cx="96" cy="26" r="1.1"/>
          <circle cx="30" cy="54" r="0.8"/><circle cx="76" cy="48" r="1"/><circle cx="14" cy="92" r="1.1"/><circle cx="62" cy="88" r="0.8"/><circle cx="102" cy="100" r="1"/></g>`,
      wash: 'radial-gradient(ellipse 80% 45% at 50% 100%, rgba(255,140,100,0.22), rgba(255,140,100,0) 70%)',
    },
    props: [
      { svg: lanternString, size: 280, side: 'left', at: 0.04, inset: 0.15 },
      { svg: firework, size: 190, side: 'left', at: 0.6, inset: 0.45 },
      { svg: bigLantern, size: 200, side: 'right', at: 0.04, inset: 0.35 },
      { svg: skyLanterns, size: 150, side: 'right', at: 0.46, inset: 0.7 },
      { svg: festivalGate, size: 230, side: 'right', at: 0.92, inset: 0.25, still: true },
    ],
  },
];

/** The cat who lives in (and talks for) a given world. */
export function worldCoat(chapterIndex: number): Coat {
  return WORLDS[chapterIndex % WORLDS.length].coat;
}

export function worldOf(chapterIndex: number): World {
  return WORLDS[chapterIndex % WORLDS.length];
}

/**
 * A world's full CSS background: its tiled theme pattern on top, then the
 * optional light/shade wash, then its colour gradient. Shared by the map
 * bands and the level screen so a level looks like it's inside its world.
 */
export function worldBackground(w: World): string {
  const tile = `<svg xmlns="http://www.w3.org/2000/svg" width="${w.texture.w}" height="${w.texture.h}" viewBox="0 0 ${w.texture.w} ${w.texture.h}">${w.texture.svg}</svg>`;
  // Single quotes: callers inline this into a double-quoted style attribute.
  return [
    `url('data:image/svg+xml,${encodeURIComponent(tile)}')`,
    ...(w.texture.wash ? [w.texture.wash] : []),
    `linear-gradient(180deg, ${w.top} 0%, ${w.bottom} 100%)`,
  ].join(', ');
}
