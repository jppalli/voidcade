/**
 * The pictures of the barn screen. `barnBackdrop` is the countryside behind everything and fills the
 * screen. `barnScene` is the barn itself, with a silo, a pile for your hay, its improvements and your
 * bales in front. Improvements you have not built yet show as grey ghosts, so you can see what is
 * still to come, and a green plus floats over the ones you can afford. The sky follows the clock
 * (see `timeOfDay`), so the barn is lit up in the evening.
 */
export const MAX_BALES = 15;
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';
/** The time of day from the player's clock. `?tod=night` in the address picks one for a look. */
export function timeOfDay(now = new Date()): TimeOfDay {
  const pick = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('tod');
  if (pick === 'dawn' || pick === 'day' || pick === 'dusk' || pick === 'night') return pick;
  const h = now.getHours();
  return h >= 5 && h < 8 ? 'dawn' : h >= 8 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'dusk' : 'night';
}
/** Where the green plus floats over each improvement (picture coordinates). */
export const CUE_AT: Record<string, [number, number]> = {
  sign: [552, 282],
  vane: [490, 50],
  flowers: [330, 424],
  mill: [795, 296],
  bell: [240, 322],
  lantern: [690, 366],
};
/** A small repeatable random generator, so the scenery looks the same every time. */
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const f = (n: number) => Math.round(n * 10) / 10;

/** The countryside: sky, sun or moon, clouds, hills, trees, a fence and a meadow. It is drawn to fill any screen shape. */
export function barnBackdrop(): string {
  const r = rng(11);
  const trees = Array.from({ length: 34 }, () => {
    const x = r() * 1600,
      y = 408 + r() * 52,
      s = 9 + r() * 9;
    return `<g><rect x="${f(x - 1.5)}" y="${f(y)}" width="3" height="${f(s * 0.8)}" fill="#7b5a3a"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(s)}" fill="${r() > 0.5 ? '#86bf70' : '#78b563'}"/><circle cx="${f(x - s * 0.3)}" cy="${f(y - s * 0.3)}" r="${f(s * 0.45)}" fill="#a5d68c" opacity=".7"/></g>`;
  }).join('');
  const posts = Array.from({ length: 33 }, (_, i) => `<rect x="${i * 50 + 6}" y="552" width="10" height="46" rx="3" fill="#f5ead0" stroke="#c9a56a" stroke-width="2"/>`).join('');
  const flowers = Array.from({ length: 70 }, () => {
    const x = r() * 1600,
      y = 612 + r() * 280,
      c = ['#ffffff', '#ffd1dc', '#fff0a0', '#d9c7ff'][Math.floor(r() * 4)];
    return `<g><path d="M${f(x)} ${f(y)}v9" stroke="#5aa044" stroke-width="2"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(3 + r() * 2)}" fill="${c}"/><circle cx="${f(x)}" cy="${f(y)}" r="1.600" fill="#f0b83a"/></g>`;
  }).join('');
  const tufts = Array.from({ length: 50 }, () => {
    const x = r() * 1600,
      y = 600 + r() * 290;
    return `<path d="M${f(x)} ${f(y)}q-3-10-8-13M${f(x)} ${f(y)}q1-11 0-16M${f(x)} ${f(y)}q4-9 9-12" stroke="#5f9f48" stroke-width="2.500" fill="none" stroke-linecap="round"/>`;
  }).join('');
  const stars = Array.from({ length: 46 }, () => `<circle cx="${f(r() * 1600)}" cy="${f(r() * 380)}" r="${f(1 + r() * 2)}" fill="#fff8d8" opacity="${f(0.5 + r() * 0.5)}"/>`).join('');
  const flies = Array.from({ length: 9 }, (_, i) => `<circle class="firefly" style="animation-delay:-${i * 1.3}s" cx="${f(100 + r() * 1400)}" cy="${f(560 + r() * 280)}" r="3.500" fill="#fff59a"/>`).join('');
  const tree = (x: number) =>
    `<g><ellipse cx="${x}" cy="604" rx="70" ry="9" fill="#2a4a1a" opacity=".18"/><path d="M${x - 9} 604 ${x - 6} 520h12l3 84Z" fill="#8b5e3c"/><g fill="#6aab55"><circle cx="${x}" cy="478" r="58"/><circle cx="${x - 44}" cy="510" r="40"/><circle cx="${x + 44}" cy="510" r="40"/></g><g fill="#86c46e"><circle cx="${x - 14}" cy="456" r="34"/><circle cx="${x + 30}" cy="486" r="22"/></g><g fill="#e5506a"><circle cx="${x - 20}" cy="490" r="5"/><circle cx="${x + 22}" cy="466" r="5"/><circle cx="${x + 4}" cy="518" r="5"/><circle cx="${x - 46}" cy="520" r="5"/><circle cx="${x + 48}" cy="516" r="5"/></g></g>`;
  return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<defs>
<linearGradient id="bg-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sky1)"/><stop offset=".55" style="stop-color:var(--sky2)"/><stop offset="1" style="stop-color:var(--sky3)"/></linearGradient>
<radialGradient id="bg-sun"><stop offset="0" stop-color="#fff6c4"/><stop offset=".35" stop-color="#ffe9a0" stop-opacity=".8"/><stop offset="1" stop-color="#ffe9a0" stop-opacity="0"/></radialGradient>
<radialGradient id="bg-moon"><stop offset="0" stop-color="#e8f0ff" stop-opacity=".9"/><stop offset=".4" stop-color="#cfdcff" stop-opacity=".4"/><stop offset="1" stop-color="#cfdcff" stop-opacity="0"/></radialGradient>
<linearGradient id="bg-grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd27a"/><stop offset="1" stop-color="#76b25a"/></linearGradient>
</defs>
<rect width="1600" height="900" fill="url(#bg-sky)"/>
<g class="stars">${stars}</g>
<g class="sun"><circle cx="1260" cy="150" r="260" fill="url(#bg-sun)"/><circle cx="1260" cy="150" r="48" fill="#fff3b8"/></g>
<g class="moon"><circle cx="1260" cy="150" r="170" fill="url(#bg-moon)"/><circle cx="1260" cy="150" r="42" fill="#f4f7ff"/><circle cx="1246" cy="140" r="9" fill="#dfe6f6"/><circle cx="1274" cy="162" r="6" fill="#dfe6f6"/></g>
<g class="bs-cloud"><g fill="#fff" opacity=".92"><ellipse cx="300" cy="150" rx="110" ry="30"/><ellipse cx="350" cy="122" rx="70" ry="32"/><ellipse cx="250" cy="130" rx="55" ry="26"/></g></g>
<g class="bs-cloud slow"><g fill="#fff" opacity=".85"><ellipse cx="820" cy="90" rx="90" ry="24"/><ellipse cx="860" cy="68" rx="52" ry="24"/></g></g>
<g class="bs-cloud slow"><g fill="#fff" opacity=".8"><ellipse cx="1130" cy="270" rx="80" ry="20"/><ellipse cx="1165" cy="252" rx="44" ry="20"/></g></g>
<g class="bs-bird"><path d="M640 220q10-12 20 0q10-12 20 0" stroke="#7a5a3a" stroke-width="3" fill="none" stroke-linecap="round"/></g>
<path d="M0 430C250 372 430 442 700 408S1200 366 1600 420V900H0Z" fill="#cfe6a8"/>
<path d="M0 468C300 428 600 496 900 458S1400 432 1600 468V900H0Z" fill="#b9de92"/>
${trees}
<path d="M0 534C400 508 900 556 1600 530V900H0Z" fill="url(#bg-grass)"/>
<g opacity=".25" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"><path d="M-20 650Q800 612 1620 650"/><path d="M-20 730Q800 700 1620 736"/><path d="M-20 820Q800 790 1620 826"/></g>
${tree(150)}${tree(1470)}
<g>${posts}<path d="M0 566H1600M0 584H1600" stroke="#f5ead0" stroke-width="8"/><path d="M0 570H1600M0 588H1600" stroke="#c9a56a" stroke-width="2" opacity=".6"/></g>
<rect y="600" width="1600" height="300" fill="url(#bg-grass)"/>
${tufts}${flowers}
<g class="fireflies">${flies}</g>
</svg>`;
}

/** The pile of loose hay beside the silo. It grows with the hay in store. */
function hayPile(hay: number): string {
  if (hay <= 0) return '<g class="pile"><path d="M80 596q8-10 14 0M100 598q6-12 12 0" stroke="#d6aa4a" stroke-width="3" fill="none" stroke-linecap="round"/></g>';
  const n = Math.min(1, hay / 600),
    w = 46 + 70 * n,
    h = 22 + 64 * n,
    cx = 108,
    base = 600,
    r = rng(3);
  const strokes = Array.from({ length: 36 + Math.round(n * 70) }, () => {
    const x = cx - w * 0.92 + r() * w * 1.84,
      k = (x - cx) / w,
      top = base - h * (1 - k * k) * (0.35 + 0.65 * r());
    return `<path d="M${f(x)} ${f(base - r() * 8)}L${f(x + (r() - 0.5) * 16)} ${f(top)}" stroke="${['#f7e3a0', '#d6aa4a', '#e9c35e', '#c99a3a'][Math.floor(r() * 4)]}" stroke-width="${f(1.6 + r() * 1.2)}" stroke-linecap="round"/>`;
  }).join('');
  return `<g class="pile"><ellipse cx="${cx}" cy="${base + 2}" rx="${f(w + 8)}" ry="7" fill="#2a4a1a" opacity=".2"/><path d="M${f(cx - w)} ${base}Q${f(cx - w * 0.55)} ${f(base - h * 1.1)} ${cx} ${f(base - h)}Q${f(cx + w * 0.55)} ${f(base - h * 1.1)} ${f(cx + w)} ${base}Z" fill="#ebc562" stroke="#c99a3a" stroke-width="2.500" stroke-linejoin="round"/>${strokes}<path d="M${f(cx + w * 0.5)} ${base - 2}L${f(cx + w * 0.62)} ${f(base - h * 1.15)}" stroke="#8f5a28" stroke-width="4" stroke-linecap="round"/><path d="M${f(cx + w * 0.62 - 7)} ${f(base - h * 1.15 - 8)}v10M${f(cx + w * 0.62)} ${f(base - h * 1.15 - 12)}v14M${f(cx + w * 0.62 + 7)} ${f(base - h * 1.15 - 8)}v10" stroke="#7b7f86" stroke-width="3" stroke-linecap="round"/></g>`;
}

export interface SceneState {
  built: string[];
  bales: number;
  hay: number;
  /** Improvements you could build right now. */
  affordable: string[];
  justBuilt?: string;
  newBales?: number;
}

/** The barn with its silo, hay pile, whatever you have built, and your bales in front. */
export function barnScene(s: SceneState): string {
  const r = rng(5);
  const { built, bales, hay } = s;
  const imp = (id: string, body: string) => {
    const on = built.includes(id);
    return `<g class="imp${on ? ' on' : ' ghost'}${on && s.justBuilt === id ? ' new' : ''}" data-imp="${id}">${body}</g>`;
  };
  const cues = s.affordable
    .filter(id => !built.includes(id) && CUE_AT[id])
    .map(id => `<g class="cue" data-cue="${id}" role="button" tabindex="0" aria-label="Build ${id}" transform="translate(${CUE_AT[id][0]} ${CUE_AT[id][1]})"><g class="cue-bob"><circle r="19" fill="#7fcc58" stroke="#3f8a31" stroke-width="3.500"/><path d="M-8 0H8M0-8V8" stroke="#fff" stroke-width="4.500" stroke-linecap="round"/></g></g>`)
    .join('');
  // ---- bales: a pyramid of 5, 4, 3, 2 and 1 ----
  const spots: [number, number][] = [];
  for (let row = 0; row < 5; row++) for (let i = 0; i < 5 - row; i++) spots.push([640 + row * 22 + i * 44, 590 - row * 28]);
  const shown = Math.min(bales, MAX_BALES),
    fresh = s.newBales ?? 0;
  const baleSvg = spots
    .slice(0, shown)
    .map(([x, y], i) => {
      const straw = Array.from({ length: 6 }, () => `<path d="M${f(x + 3 + r() * 36)} ${f(y + 4 + r() * 20)}h${f(4 + r() * 6)}" stroke="${r() > 0.5 ? '#f7e3a0' : '#c99a3a'}" stroke-width="1.600" stroke-linecap="round"/>`).join('');
      return `<g class="bale${i >= shown - fresh ? ' new' : ''}"><rect x="${x}" y="${y}" width="44" height="28" rx="6" fill="url(#bs-bale)" stroke="#a8741a" stroke-width="2"/>${straw}<path d="M${x + 13} ${y}v28M${x + 31} ${y}v28" stroke="#8f5a28" stroke-width="2.600"/><path d="M${x + 5} ${y + 4}h34" stroke="#fff6c8" stroke-width="2" opacity=".7" stroke-linecap="round"/></g>`;
    })
    .join('');
  const more = bales > MAX_BALES ? `<text x="880" y="480" text-anchor="end" font-size="26" font-weight="900" fill="#8f5a28" stroke="#fff5d4" stroke-width="5" paint-order="stroke">+${bales - MAX_BALES}</text>` : '';
  // ---- the barn ----
  const planks = Array.from({ length: 21 }, (_, i) => `<path d="M${270 + i * 18} 120V520" stroke="#7a2a20" stroke-width="1.600" opacity=".22"/>`).join('');
  const stones = Array.from({ length: 11 }, (_, i) => `<rect x="${266 + i * 34}" y="${506 + (i % 2) * 3}" width="32" height="${24 - (i % 2) * 3}" rx="6" fill="${i % 3 ? '#b9b5aa' : '#a7a398'}" stroke="#8c887c" stroke-width="1.500"/>`).join('');
  const flowerBox = (x: number) => {
    const blooms = [6, 18, 30, 42, 54].map((d, k) => `<g><circle cx="${x + d}" cy="${k % 2 ? 437 : 433}" r="6" fill="${k % 2 ? '#ff8aa5' : '#e5506a'}"/><circle cx="${x + d}" cy="${k % 2 ? 437 : 433}" r="2" fill="#ffe27a"/></g>`).join('');
    return `<path d="M${x + 2} 440q-4 12-2 18M${x + 28} 440q0 14 3 20M${x + 58} 440q4 10 2 16" stroke="#4f9a3c" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="${x - 4}" y="438" width="68" height="18" rx="3" fill="#b0743a" stroke="#7a4a20" stroke-width="2"/><path d="M${x + 14} 438v18M${x + 34} 438v18M${x + 52} 438v18" stroke="#7a4a20" stroke-width="1.500"/>${blooms}<path d="M${x} 436q8-10 14 0M${x + 22} 436q8-10 14 0M${x + 44} 436q8-10 14 0" stroke="#4f9a3c" stroke-width="3" fill="none"/>`;
  };
  const windowSvg = (x: number) =>
    `<rect x="${x - 6}" y="374" width="64" height="64" rx="4" fill="#f5ead0" stroke="#8f3328" stroke-width="2.500"/><rect x="${x}" y="380" width="52" height="52" rx="2" fill="url(#bs-glass)" stroke="#a89160" stroke-width="2"/><rect class="night-glow" x="${x}" y="380" width="52" height="52" rx="2" fill="#ffd86b"/><path d="M${x + 26} 380v52M${x} 406h52" stroke="#f5ead0" stroke-width="4"/><path d="M${x + 6} 388l14 0M${x + 6} 394l8 0" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/><rect x="${x - 8}" y="436" width="68" height="6" rx="2" fill="#e7d8b0" stroke="#a89160" stroke-width="1.500"/>`;
  const hen = `<g class="hen"><ellipse cx="300" cy="606" rx="32" ry="5" fill="#2a4a1a" opacity=".2"/><path d="M296 598v8M306 598v8" stroke="#e8a13a" stroke-width="2.500"/><g class="hen-peck"><ellipse cx="300" cy="586" rx="19" ry="15" fill="#fffaf0" stroke="#d6c9a8" stroke-width="2"/><path d="M282 582q-12-12-8-20 8 4 12 12Z" fill="#fffaf0" stroke="#d6c9a8" stroke-width="2"/><ellipse cx="304" cy="588" rx="9" ry="6" fill="#f3e6c8"/><circle cx="316" cy="574" r="8" fill="#fffaf0" stroke="#d6c9a8" stroke-width="2"/><path d="M312 564q4-6 8-2 2-5 6 0l-4 4Z" fill="#e5506a"/><path d="M323 574l8 3-8 3Z" fill="#f0a83a"/><circle cx="318" cy="573" r="1.800" fill="#3a2a1a"/></g></g>`;
  // ---- the silo ----
  const ribs = Array.from({ length: 9 }, (_, i) => `<path d="M70 ${290 + i * 26}H150" stroke="#a9a38f" stroke-width="2.500" opacity=".7"/>`).join('');
  const silo = `<g class="silo"><ellipse cx="112" cy="528" rx="62" ry="9" fill="#2a4a1a" opacity=".2"/><rect x="70" y="262" width="84" height="264" fill="url(#bs-silo)" stroke="#8c887c" stroke-width="3"/>${ribs}<path d="M82 262V526" stroke="#fff" stroke-width="6" opacity=".35"/><path d="M64 266Q112 186 160 266Z" fill="#c9524a" stroke="#8f3328" stroke-width="3.500" stroke-linejoin="round"/><path d="M82 252Q112 214 142 252" stroke="#e57a6c" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/><circle cx="112" cy="202" r="6" fill="#8f3328"/><rect x="92" y="330" width="40" height="26" rx="3" fill="#5a6a70" opacity=".35"/><path d="M158 276V520M174 276V520M158 296h16M158 322h16M158 348h16M158 374h16M158 400h16M158 426h16M158 452h16M158 478h16M158 504h16" stroke="#8f5a28" stroke-width="3" stroke-linecap="round" opacity=".85"/></g>`;
  return `<svg viewBox="0 0 900 640" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Your barn, with its improvements and bales">
<defs>
<linearGradient id="bs-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e5705c"/><stop offset="1" stop-color="#c24f41"/></linearGradient>
<linearGradient id="bs-roof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a65a4a"/><stop offset="1" stop-color="#7d3d32"/></linearGradient>
<linearGradient id="bs-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2f4fa"/><stop offset="1" stop-color="#a9d3e2"/></linearGradient>
<linearGradient id="bs-bale" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d57a"/><stop offset="1" stop-color="#dba942"/></linearGradient>
<linearGradient id="bs-door" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf1d8"/><stop offset="1" stop-color="#ead9b0"/></linearGradient>
<linearGradient id="bs-silo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f2eee0"/><stop offset=".55" stop-color="#e2dcc7"/><stop offset="1" stop-color="#bdb7a2"/></linearGradient>
<radialGradient id="bs-lamp"><stop offset="0" stop-color="#fff0a8" stop-opacity=".9"/><stop offset="1" stop-color="#ffd24a" stop-opacity="0"/></radialGradient>
<pattern id="bs-shingle" width="22" height="16" patternUnits="userSpaceOnUse"><path d="M0 8a11 8 0 0 0 22 0M-11 16a11 8 0 0 0 22 0M11 16a11 8 0 0 0 22 0" fill="none" stroke="#5e2c24" stroke-width="1.800" opacity=".55"/></pattern>
<clipPath id="bs-clip"><path d="M270 520V262L300 182 450 126 600 182 630 262V520Z"/></clipPath>
</defs>
<path d="M300 640 366 520H534L600 640Z" fill="#e6cc9a"/>
<path d="M386 640 410 560M470 628 486 580M430 600l8-6M520 612l10-8M352 606l8-4" stroke="#cdb07a" stroke-width="5" stroke-linecap="round"/>
${imp('mill', `<ellipse cx="795" cy="474" rx="70" ry="9" fill="#2a4a1a" opacity=".2"/><path d="M742 472 760 364H830L848 472Z" fill="#f6ecd2" stroke="#b8793d" stroke-width="3.500" stroke-linejoin="round"/><path d="M752 436H838M756 410H834M760 386H830" stroke="#d9c496" stroke-width="2.500"/><path d="M780 472V442Q795 428 810 442V472Z" fill="#b0743a" stroke="#7a4a20" stroke-width="2.500"/><rect x="786" y="392" width="18" height="22" rx="9" fill="#fdf3c2" stroke="#b8793d" stroke-width="2.500"/><path d="M750 366 795 322 840 366Z" fill="#c9524a" stroke="#8f3328" stroke-width="3.500" stroke-linejoin="round"/><g class="mill-blades">${[0, 90, 180, 270].map(a => `<g transform="rotate(${a} 795 345)"><path d="M795 345V250" stroke="#8f5a28" stroke-width="5" stroke-linecap="round"/><rect x="797" y="258" width="20" height="74" fill="#fffaf0" stroke="#b8793d" stroke-width="2.500"/><path d="M797 276H817M797 294H817M797 312H817M807 258V332" stroke="#d9c496" stroke-width="2"/></g>`).join('')}</g><circle cx="795" cy="345" r="9" fill="#b8793d" stroke="#8f5a28" stroke-width="2.500"/>`)}
${silo}
<ellipse cx="450" cy="528" rx="250" ry="16" fill="#2a4a1a" opacity=".2"/>
<path d="M230 284 278 158 450 90 622 158 670 284Z" fill="url(#bs-roof)" stroke="#5e2c24" stroke-width="3.500" stroke-linejoin="round"/>
<path d="M230 284 278 158 450 90 622 158 670 284Z" fill="url(#bs-shingle)"/>
<path d="M230 284 278 158 450 90 622 158 670 284" fill="none" stroke="#f5ead0" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
<path d="M270 520V262L300 182 450 126 600 182 630 262V520Z" fill="url(#bs-wall)" stroke="#8f3328" stroke-width="3.500" stroke-linejoin="round"/>
<g clip-path="url(#bs-clip)">${planks}<rect x="270" y="120" width="360" height="400" fill="#fff" opacity=".05"/><path d="M270 262H630" stroke="#7a2a20" stroke-width="3" opacity=".3"/><ellipse cx="320" cy="300" rx="5" ry="9" fill="#7a2a20" opacity=".18"/><ellipse cx="590" cy="486" rx="5" ry="8" fill="#7a2a20" opacity=".18"/></g>
<path d="M270 262 300 182 450 126 600 182 630 262" fill="none" stroke="#f5ead0" stroke-width="8" stroke-linejoin="round"/>
<path d="M270 520V262M630 520V262" stroke="#f5ead0" stroke-width="12"/>
<rect x="413" y="152" width="74" height="64" rx="4" fill="#f5ead0" stroke="#8f3328" stroke-width="3"/><rect x="420" y="159" width="60" height="50" rx="2" fill="#5a3a28"/><rect class="night-glow" x="420" y="159" width="60" height="50" rx="2" fill="#ffd86b"/><path d="M424 172q10-8 18 0t18 0t16 0M424 186q10-8 18 0t18 0t16 0M424 200q10-8 18 0t18 0t16 0" stroke="#e3b44d" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M450 126v-22q0-8 8-8" stroke="#6e4a24" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="458" cy="96" r="3" fill="#6e4a24"/>
${windowSvg(300)}${windowSvg(548)}
<rect x="356" y="344" width="188" height="9" rx="3" fill="#6f7076"/><circle cx="380" cy="360" r="4" fill="#6f7076"/><circle cx="520" cy="360" r="4" fill="#6f7076"/>
<rect x="368" y="356" width="164" height="166" rx="3" fill="#f5ead0" stroke="#8f3328" stroke-width="3.500"/>
<rect x="376" y="364" width="73" height="152" fill="url(#bs-door)" stroke="#d9c496" stroke-width="2"/><rect x="451" y="364" width="73" height="152" fill="url(#bs-door)" stroke="#d9c496" stroke-width="2"/>
<path d="M376 364 449 516M449 364 376 516M451 364 524 516M524 364 451 516" stroke="#c9524a" stroke-width="9" stroke-linecap="round"/><path d="M376 364H449M451 364H524M376 516H449M451 516H524" stroke="#c9524a" stroke-width="7"/>
<circle cx="440" cy="446" r="5" fill="#6f7076"/><circle cx="460" cy="446" r="5" fill="#6f7076"/>
<rect x="368" y="356" width="164" height="14" fill="#2a1a08" opacity=".14"/>
${stones}
${imp('flowers', flowerBox(298) + flowerBox(546) + `<g><path d="M586 520V486q0-6 6-6h28q6 0 6 6V520Z" fill="#b0743a" stroke="#7a4a20" stroke-width="2.500"/><path d="M586 496H632M586 510H632" stroke="#7a4a20" stroke-width="2.500"/><g fill="#ff8aa5"><circle cx="594" cy="476" r="7"/><circle cx="609" cy="470" r="7"/><circle cx="624" cy="476" r="7"/></g><g fill="#ffe27a"><circle cx="594" cy="476" r="2.500"/><circle cx="609" cy="470" r="2.500"/><circle cx="624" cy="476" r="2.500"/></g></g>`)}
${imp('sign', `<rect x="374" y="238" width="152" height="9" rx="4" fill="#8f5a28"/><path d="M394 247v18M506 247v18" stroke="#6f7076" stroke-width="3" stroke-dasharray="4 3"/><rect x="378" y="263" width="144" height="40" rx="8" fill="#f6dca0" stroke="#8f5a28" stroke-width="3.500"/><path d="M386 270H514M386 296H514" stroke="#e3c27a" stroke-width="2"/><text x="450" y="292" text-anchor="middle" font-size="28" font-weight="900" fill="#8f3328" letter-spacing="3">HAY</text><g fill="#e3b44d" stroke="#a8741a" stroke-width="1"><ellipse cx="400" cy="283" rx="4" ry="8"/><ellipse cx="500" cy="283" rx="4" ry="8"/></g>`)}
${imp('vane', `<path d="M450 92V34" stroke="#6e4a24" stroke-width="5" stroke-linecap="round"/><path d="M430 62H470" stroke="#6e4a24" stroke-width="3" stroke-linecap="round"/><g font-size="11" font-weight="900" fill="#8f5a28" text-anchor="middle"><text x="479" y="66">E</text><text x="421" y="66">W</text></g><g class="vane-turn"><ellipse cx="450" cy="26" rx="19" ry="11" fill="#e8a13a" stroke="#a8741a" stroke-width="2.500"/><circle cx="467" cy="12" r="8.500" fill="#e8a13a" stroke="#a8741a" stroke-width="2.500"/><path d="M474 10l9 4-9 4Z" fill="#f0643a"/><path d="M463 4q3-8 8-3 2-6 6 1l-4 5Z" fill="#e5506a"/><circle cx="470" cy="11" r="2" fill="#3a2a1a"/><path d="M432 22 410 6l4 22 14 4Z" fill="#d98a2a" stroke="#a8741a" stroke-width="2.500" stroke-linejoin="round"/><path d="M436 24 418 14" stroke="#f3c26a" stroke-width="3" stroke-linecap="round"/></g>`)}
${imp('bell', `<g transform="translate(40 0)"><ellipse cx="170" cy="526" rx="40" ry="7" fill="#2a4a1a" opacity=".2"/><path d="M150 526 156 366H164L172 526Z" fill="#a8703a" stroke="#7a4a20" stroke-width="3" stroke-linejoin="round"/><path d="M136 372H226V360H136Z" fill="#b0743a" stroke="#7a4a20" stroke-width="3" stroke-linejoin="round"/><path d="M130 360 181 336 232 360Z" fill="#c9524a" stroke="#8f3328" stroke-width="3" stroke-linejoin="round"/><g class="bell-swing"><path d="M200 372v8" stroke="#6e4a24" stroke-width="3"/><path d="M182 424Q182 388 200 388T218 424Z" fill="#f0b83a" stroke="#a8741a" stroke-width="3"/><path d="M178 424H222" stroke="#a8741a" stroke-width="4" stroke-linecap="round"/><circle cx="200" cy="430" r="5" fill="#a8741a"/><path d="M190 400q3-6 6-2" stroke="#fff3b8" stroke-width="3" fill="none" stroke-linecap="round"/></g></g>`)}
${imp('lantern', `<ellipse cx="670" cy="528" rx="26" ry="5" fill="#2a4a1a" opacity=".2"/><path d="M670 526V404q0-14 14-14h6" stroke="#4a4038" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle class="glow" cx="690" cy="424" r="76" fill="url(#bs-lamp)"/><path d="M690 390v10" stroke="#4a4038" stroke-width="3"/><path d="M679 410h22l-3-10h-16Z" fill="#4a4038"/><rect x="680" y="410" width="20" height="28" rx="4" fill="#ffe9a0" stroke="#4a4038" stroke-width="3"/><path d="M690 414v20" stroke="#f0a83a" stroke-width="4.500" stroke-linecap="round"/><path d="M678 440h24" stroke="#4a4038" stroke-width="4" stroke-linecap="round"/>`)}
${hayPile(hay)}${hen}
${baleSvg}${more}
${cues}
</svg>`;
}
