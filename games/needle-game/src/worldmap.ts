/**
 * The level map: a winding trail that climbs from level 1 at the bottom to a
 * "more worlds coming soon" sign at the top. Each world is a band with its
 * own colors, ground strip and scenery in the margins; a wooden sign marks
 * where each world begins and shows how much of it is done.
 *
 * Laid out like Kitty Doku's map, with farm scenery instead of furniture.
 * Levels are numbered 1 to 40 across the whole game.
 */
import { LEVELS_PER_WORLD, TOTAL_LEVELS, WORLDS, levelDef } from './levels';
import { hasAllBonus, isSolved, saved } from './progress';
import * as P from './props';

const $ = (id: string) => document.getElementById(id) as HTMLElement;

interface Pt {
  x: number;
  y: number;
}

interface MapProp {
  svg: string;
  /** Box size in px on a desktop screen (smaller on phones). */
  size: number;
  side: 'left' | 'right';
  /** How far down the band the prop sits: 0 at the top, 1 at the bottom. */
  at: number;
  /** How far out into the margin: 0 hugging the trail, 1 at the screen edge. */
  inset: number;
  /** Props that are alive (sway, flutter) bob; furniture-like ones stay put. */
  still?: boolean;
}

interface MapWorld {
  /** Band gradient, top to bottom. */
  top: string;
  bottom: string;
  /** Accent for node borders and the sign's progress bar. */
  deep: string;
  night?: boolean;
  /** Ground strip along the bottom of the band: SVG markup for a 120x48 tile, no single quotes. */
  strip: string;
  /** A faint pattern laid over the band's gradient (CSS background layers). */
  texture: string;
  props: MapProp[];
}

const MAP_WORLDS: MapWorld[] = [
  {
    top: '#c8e8f6',
    bottom: '#cdeba6',
    deep: '#4a9a3c',
    // Soft sunlight spots, like light through leaves.
    texture: 'radial-gradient(circle,#ffffff66 0 3px,transparent 4px) 0 0/78px 78px,radial-gradient(circle,#ffffff3d 0 2px,transparent 3px) 39px 39px/78px 78px',
    strip:
      '<rect y="40" width="120" height="8" fill="#6db95a"/><path d="M0 42 Q6 30 12 42 Q18 26 24 42Z M50 42 Q56 32 62 42 Q68 28 74 42Z M92 42 Q98 30 104 42 Q110 26 116 42Z" fill="#74c05d"/><circle cx="32" cy="36" r="3" fill="#ffffff"/><circle cx="80" cy="35" r="3" fill="#ffd34d"/><circle cx="110" cy="38" r="3" fill="#ff8fb1"/>',
    props: [
      { svg: P.SUNFLOWER, size: 120, side: 'left', at: 0.78, inset: 0.55 },
      { svg: P.WINDMILL, size: 160, side: 'right', at: 0.2, inset: 0.7, still: true },
      { svg: P.DAISIES, size: 100, side: 'right', at: 0.86, inset: 0.4, still: true },
      { svg: P.BUSH, size: 100, side: 'left', at: 0.34, inset: 0.8, still: true },
      { svg: P.BUTTERFLY('#ffd75e', '#fff3b0'), size: 64, side: 'right', at: 0.55, inset: 0.3 },
    ],
  },
  {
    top: '#ffe3b8',
    bottom: '#f2c880',
    deep: '#b86d1d',
    // Furrows across a field.
    texture: 'repeating-linear-gradient(180deg,transparent 0 44px,#ffffff30 44px 48px,transparent 48px 52px,#b8791f14 52px 54px)',
    strip:
      '<rect y="40" width="120" height="8" fill="#e2b765"/><path d="M10 48 V28 M40 48 V24 M72 48 V28 M102 48 V24" stroke="#c99a3a" stroke-width="2.6" stroke-linecap="round"/><ellipse cx="10" cy="24" rx="3.4" ry="7" fill="#e8c25c"/><ellipse cx="40" cy="20" rx="3.4" ry="7" fill="#e8c25c"/><ellipse cx="72" cy="24" rx="3.4" ry="7" fill="#e8c25c"/><ellipse cx="102" cy="20" rx="3.4" ry="7" fill="#e8c25c"/>',
    props: [
      { svg: P.BARN, size: 190, side: 'left', at: 0.22, inset: 0.8, still: true },
      { svg: P.HAYSTACK, size: 120, side: 'right', at: 0.68, inset: 0.55, still: true },
      { svg: P.FENCE, size: 150, side: 'left', at: 0.84, inset: 0.55, still: true },
      { svg: P.CHICKEN, size: 72, side: 'right', at: 0.34, inset: 0.6 },
      { svg: P.SUNFLOWER, size: 110, side: 'right', at: 0.08, inset: 0.35 },
    ],
  },
  {
    top: '#ffd3a2',
    bottom: '#eaab5e',
    deep: '#b04e18',
    // Warm spots, like dappled light under the trees.
    texture: 'radial-gradient(circle,#ffe9b866 0 4px,transparent 5px) 0 0/92px 92px,radial-gradient(circle,#ffd08a55 0 3px,transparent 4px) 46px 46px/92px 92px',
    strip:
      '<rect y="40" width="120" height="8" fill="#c4812c"/><ellipse cx="18" cy="38" rx="9" ry="4" fill="#d9531f" transform="rotate(-20 18 38)"/><ellipse cx="46" cy="42" rx="8" ry="3.6" fill="#f0a53c" transform="rotate(14 46 42)"/><ellipse cx="74" cy="37" rx="9" ry="4" fill="#c9302a" transform="rotate(-8 74 37)"/><ellipse cx="102" cy="41" rx="8" ry="3.6" fill="#e8892f" transform="rotate(22 102 41)"/>',
    props: [
      { svg: P.AUTUMN_TREE, size: 190, side: 'right', at: 0.2, inset: 0.75, still: true },
      { svg: P.SCARECROW, size: 140, side: 'left', at: 0.42, inset: 0.6 },
      { svg: P.PUMPKIN, size: 96, side: 'right', at: 0.74, inset: 0.45, still: true },
      { svg: P.LEAF_PILE, size: 120, side: 'left', at: 0.86, inset: 0.4, still: true },
      { svg: P.PUMPKIN, size: 70, side: 'left', at: 0.14, inset: 0.8, still: true },
    ],
  },
  {
    top: '#cfe4f8',
    bottom: '#f3f8fc',
    deep: '#3f7fb0',
    // Snowfall.
    texture: 'radial-gradient(circle,#ffffffee 0 4px,transparent 5px) 0 0/110px 110px,radial-gradient(circle,#ffffffaa 0 2.5px,transparent 3.5px) 55px 55px/110px 110px,radial-gradient(circle,#ffffff88 0 2px,transparent 3px) 20px 80px/110px 110px',
    strip:
      '<rect y="40" width="120" height="8" fill="#f6fafd"/><circle cx="20" cy="42" r="10" fill="#f6fafd"/><circle cx="62" cy="40" r="13" fill="#ffffff"/><circle cx="102" cy="42" r="9" fill="#f6fafd"/><path d="M8 46 Q20 40 32 46 M48 46 Q62 38 76 46 M92 46 Q102 41 112 46" stroke="#c6d9ec" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
    props: [
      { svg: P.PINE, size: 150, side: 'left', at: 0.2, inset: 0.8, still: true },
      { svg: P.PINE, size: 120, side: 'right', at: 0.1, inset: 0.85, still: true },
      { svg: P.SNOWMAN, size: 110, side: 'right', at: 0.6, inset: 0.55 },
      { svg: P.CABIN, size: 170, side: 'left', at: 0.72, inset: 0.7, still: true },
      { svg: P.PINE, size: 100, side: 'right', at: 0.86, inset: 0.3, still: true },
    ],
  },
  {
    top: '#1d2460',
    bottom: '#41448c',
    deep: '#e9b13a',
    night: true,
    // A faint glow near the ground (the stars are drawn separately).
    texture: 'radial-gradient(ellipse at 50% 100%,#8b6fc044,transparent 60%)',
    strip:
      '<rect y="40" width="120" height="8" fill="#26493f"/><path d="M0 44 Q6 32 12 44 Q18 28 24 44Z M50 44 Q56 34 62 44 Q68 30 74 44Z M92 44 Q98 32 104 44 Q110 28 116 44Z" fill="#2e5a4c"/><circle cx="34" cy="30" r="2.4" fill="#ffe27a"/><circle cx="84" cy="26" r="2.4" fill="#ffe27a"/><circle cx="108" cy="34" r="2" fill="#ffe27a"/>',
    props: [
      { svg: P.MOON, size: 130, side: 'right', at: 0.12, inset: 0.6, still: true },
      { svg: P.TENT_FIRE, size: 210, side: 'left', at: 0.7, inset: 0.7, still: true },
      { svg: P.OWL, size: 100, side: 'right', at: 0.42, inset: 0.6, still: true },
      { svg: P.MUSHROOMS, size: 100, side: 'right', at: 0.84, inset: 0.4, still: true },
      { svg: P.PINE, size: 120, side: 'left', at: 0.2, inset: 0.85, still: true },
    ],
  },
];

const WAVE = 'M0 30 V15 C150 1 300 29 450 15 C600 1 750 29 900 15 C1050 1 1140 23 1200 13 V30 Z';

const stripBg = (svg: string) =>
  // Single quotes: this lands inside a double-quoted style="" attribute, and
  // encodeURIComponent leaves ' untouched (the strips never use it).
  `url('data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="48" viewBox="0 0 120 48">${svg}</svg>`)}')`;

/** Tiny deterministic pseudo-random so star fields don't jump when the map is drawn again. */
const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const NEEDLE_ICON =
  '<svg viewBox="0 0 64 64" aria-hidden="true"><g transform="rotate(-42 32 32)"><path d="M4 32 L52 28 C62 27 62 37 52 36 Z" fill="#cfd3cb" stroke="#6d6a5c" stroke-width="2.6" stroke-linejoin="round"/><ellipse cx="54" cy="32" rx="4.5" ry="1.8" fill="#5a4a30"/></g></svg>';
const LOCK_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 11 V8 a4 4 0 0 1 8 0 V11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
const SPARKLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1 Q13.4 10.6 23 12 Q13.4 13.4 12 23 Q10.6 13.4 1 12 Q10.6 10.6 12 1Z" fill="currentColor"/></svg>';

export function renderMap(onPick: (level: number) => void, freshWorld = -1): void {
  const wrap = $('mapWrap');
  const width = wrap.clientWidth || 420;
  const cx = width / 2;
  const amp = Math.min(190, Math.max(64, cx - 72));
  wrap.style.setProperty('--col', `${amp + 52}px`);

  // ------ layout: a winding trail, laid out top-down then flipped so level 1 is at the bottom ------
  const levels = Array.from({ length: TOTAL_LEVELS }, (_, i) => levelDef(i + 1));
  const points: Pt[] = [];
  const signSlots: { world: number; y: number }[] = [];
  let y = 96;
  let phase = 0.9;
  let lastWorld = -1;
  levels.forEach((def, i) => {
    if (def.world !== lastWorld) {
      if (lastWorld !== -1) y += 44;
      signSlots.push({ world: def.world, y });
      y += 140; // room for the sign (about 130px tall) before the first level of the world
      lastWorld = def.world;
    }
    const jitter = Math.sin((i + 1) * 12.9898) * 12;
    points.push({ x: cx + amp * Math.sin(phase) + jitter, y });
    y += 102 + ((i * 47) % 3) * 8;
    phase += 0.78;
  });

  const TOP_PAD = 300; // sky above the last world, for the "coming soon" sign
  const totalH = y + 60 + TOP_PAD;
  wrap.style.height = `${totalH}px`;
  const flip = (yy: number) => totalH - yy;
  points.forEach((p) => (p.y = flip(p.y)));
  signSlots.forEach((s) => (s.y = flip(s.y)));

  const BAND_PAD = 72;
  const bandOf = (k: number) => ({
    bottom: k === 0 ? totalH : signSlots[k].y + BAND_PAD,
    top: k === signSlots.length - 1 ? TOP_PAD : signSlots[k + 1].y + BAND_PAD,
  });
  const worldUnlocked = (k: number) => k * LEVELS_PER_WORLD + 1 <= saved.unlocked;

  // ------ world bands ------
  const regions = $('mapRegions');
  regions.style.height = `${totalH}px`;
  regions.innerHTML = '';
  signSlots.forEach((slot, k) => {
    const w = MAP_WORLDS[slot.world];
    const { top, bottom } = bandOf(k);
    const h = bottom - top;
    const band = document.createElement('div');
    band.className = `worldBand${w.night ? ' night' : ''}${worldUnlocked(k) ? '' : ' lockedWorld'}`;
    // Lower worlds stack above higher ones so each wave overlaps the band above.
    band.style.cssText = `top:${top}px;height:${h}px;z-index:${signSlots.length - k};background:${w.texture},linear-gradient(180deg,${w.top},${w.bottom});`;

    let inner = `<svg class="worldWave" viewBox="0 0 1200 30" preserveAspectRatio="none" aria-hidden="true"><path d="${WAVE}" fill="${w.top}"/></svg>`;
    inner += `<div class="worldStrip" style="background-image:${stripBg(w.strip)}"></div>`;
    if (w.night) {
      for (let s = 0; s < 30; s++) {
        const sz = 3 + Math.round(rand(s * 9.1) * 4);
        inner += `<span class="mapStar" style="left:${(rand(s + k * 50) * 100).toFixed(1)}%;top:${Math.round(34 + rand(s * 3.7 + k) * (h - 150))}px;width:${sz}px;height:${sz}px;animation-delay:${(-rand(s) * 3).toFixed(2)}s"></span>`;
      }
    }
    w.props.forEach((p, i) => {
      const py = Math.round(30 + p.at * Math.max(0, h - 110 - p.size));
      inner += `<span class="mapProp ${p.side}${p.still ? ' still' : ''}" style="top:${py}px;--sz:${p.size}px;--in:${p.inset};animation-delay:${(-i * 1.7).toFixed(1)}s">${p.svg}</span>`;
    });
    band.innerHTML = inner;
    regions.appendChild(band);
  });

  // ------ the sky above the last world ------
  const sky = document.createElement('div');
  sky.className = 'comingSky';
  sky.style.height = `${TOP_PAD + 40}px`;
  let skyStars = '';
  for (let s = 0; s < 34; s++) {
    const sz = 2 + Math.round(rand(s * 5.3 + 7) * 4);
    skyStars += `<span class="mapStar" style="left:${(rand(s * 2.1) * 100).toFixed(1)}%;top:${Math.round(rand(s * 4.7 + 3) * (TOP_PAD + 20))}px;width:${sz}px;height:${sz}px;animation-delay:${(-rand(s + 9) * 3).toFixed(2)}s"></span>`;
  }
  sky.innerHTML = skyStars;
  regions.appendChild(sky);

  // ------ dotted trail ------
  const svg = $('mapPath') as unknown as SVGSVGElement;
  svg.setAttribute('viewBox', `0 0 ${width} ${totalH}`);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(totalH));
  const segs: string[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    const night = !!MAP_WORLDS[levels[i + 1].world].night;
    segs.push(`<path class="trail${isSolved(i + 1) ? ' lit' : ''}${night ? ' night' : ''}" d="M ${p1.x} ${p1.y} C ${c1x} ${c1y},${c2x} ${c2y},${p2.x} ${p2.y}"/>`);
  }
  // A faint trail carries on past the last level, up to the sign.
  const last = points[points.length - 1];
  const COMING_Y = 150;
  segs.push(`<path class="trail future night" d="M ${last.x} ${last.y} C ${last.x} ${last.y - 90}, ${cx} ${COMING_Y + 170}, ${cx} ${COMING_Y + 60}"/>`);
  svg.innerHTML = segs.join('');

  // ------ world signs ------
  const signs = $('mapBanners');
  signs.innerHTML = '';
  signSlots.forEach((slot, k) => {
    const world = WORLDS[slot.world];
    const w = MAP_WORLDS[slot.world];
    const first = slot.world * LEVELS_PER_WORLD + 1;
    const done = Array.from({ length: LEVELS_PER_WORLD }, (_, i) => first + i).filter(isSolved).length;
    const unlocked = worldUnlocked(k);
    const cleared = done === LEVELS_PER_WORLD;
    const sub = !unlocked ? `Finish world ${k} to open` : cleared ? 'All needles found' : world.blurb;
    const el = document.createElement('div');
    el.className = `worldSign${unlocked ? '' : ' locked'}${cleared ? ' cleared' : ''}${k === freshWorld ? ' fresh' : ''}`;
    el.style.top = `${slot.y}px`;
    el.style.setProperty('--deep', w.deep);
    el.setAttribute('role', 'note');
    el.setAttribute('aria-label', `World ${k + 1}: ${world.name}. ${unlocked ? `${done} of ${LEVELS_PER_WORLD} solved` : sub}`);
    el.innerHTML = `
      <span class="wsKicker">World ${k + 1}${unlocked ? ` · ${done}/${LEVELS_PER_WORLD}` : ''}</span>
      <span class="wsName">${world.name}</span>
      <span class="wsSub">${sub}</span>
      ${unlocked ? `<span class="wsBar"><span style="width:${Math.round((done / LEVELS_PER_WORLD) * 100)}%"></span></span>` : `<span class="wsLock">${LOCK_ICON}</span>`}`;
    signs.appendChild(el);
  });

  // ------ "more worlds coming" sign ------
  const everything = Object.keys(saved.results).length >= TOTAL_LEVELS;
  const coming = document.createElement('div');
  coming.className = `comingSign${everything ? ' celebrate' : ''}`;
  coming.style.top = `${COMING_Y}px`;
  coming.setAttribute('role', 'note');
  coming.innerHTML = `
    <span class="csBoard"><span class="csNails" aria-hidden="true"><i></i><i></i></span>
      <span class="csKicker">${everything ? 'Every needle found!' : `World ${WORLDS.length + 1}`}</span>
      <span class="csName">More worlds coming soon</span>
    </span><span class="csPost" aria-hidden="true"></span>`;
  signs.appendChild(coming);

  // ------ level nodes ------
  const nodes = $('mapNodes');
  nodes.innerHTML = '';
  const frontier = levels.find((l) => !isSolved(l.n) && l.n <= saved.unlocked)?.n ?? -1;
  levels.forEach((def, i) => {
    const p = points[i];
    const w = MAP_WORLDS[def.world];
    const unlocked = def.n <= saved.unlocked;
    const done = isSolved(def.n);
    const gold = hasAllBonus(def.n);
    const isNext = def.n === frontier;
    const state = isNext ? 'next' : done ? 'done' : unlocked ? 'open' : 'locked';

    const node = document.createElement('button');
    node.className = `mapNode ${state}${gold ? ' gold' : ''}${def.finale ? ' finale' : ''}`;
    node.style.cssText = `left:${p.x}px;top:${p.y}px`;
    node.style.setProperty('--deep', w.deep);
    node.setAttribute('aria-label', `Level ${def.n}${def.finale ? ', last level of the world' : ''}${done ? (gold ? ', solved, every extra found' : ', solved') : unlocked ? '' : ', locked'}`);
    if (state === 'locked') {
      node.disabled = true;
      node.innerHTML = `<span class="mnLock">${LOCK_ICON}</span>`;
    } else {
      node.innerHTML =
        state === 'done'
          ? `<span class="mnNeedle">${NEEDLE_ICON}</span><span class="mnBadge">${def.n}</span>${gold ? `<span class="mnGold">${SPARKLE}</span>` : ''}`
          : `<span class="mnNum">${def.n}</span>${isNext ? '<span class="mnLabel">Play</span>' : ''}`;
      node.addEventListener('click', () => onPick(def.n));
    }
    nodes.appendChild(node);
  });
}

/** Scrolls so the next level to play is in the middle of the screen. */
export function scrollToFrontier(): void {
  const target = document.querySelector<HTMLElement>('.mapNode.next') ?? document.querySelector<HTMLElement>('.mapNode.done');
  if (!target) return;
  const scroller = $('screen-map');
  const y = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
  scroller.scrollTo({ top: Math.max(0, y - scroller.clientHeight * 0.5), behavior: 'instant' as ScrollBehavior });
}
