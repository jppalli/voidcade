import { CHAPTERS, TOTAL_LEVELS, allLevels, type LevelRef } from '../game/levels';
import { cleanCount, solvedCount, type Progress } from '../game/progress';
import { mascotSvg, medalSvg } from '../render/art';
import { WORLDS, worldBackground, worldCoat, type World } from './mapScenery';

const $ = (id: string) => document.getElementById(id) as HTMLElement;

interface Pt { x: number; y: number }

// World themes and scenery live in mapScenery.ts.
export { worldCoat };

const WAVE =
  'M0 30 V15 C150 1 300 29 450 15 C600 1 750 29 900 15 C1050 1 1140 23 1200 13 V30 Z';

const stripBg = (s: World['strip']) =>
  // Single quotes: this lands inside a double-quoted style="" attribute, and
  // encodeURIComponent leaves ' untouched (the strip SVGs never use it).
  `url('data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${s.w}" height="48" viewBox="0 0 ${s.w} 48">${s.svg}</svg>`
  )}')`;

/** Tiny deterministic pseudo-random so star fields don't jump on re-render. */
const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---------------------------------------------------------------- testing unlock

/**
 * Debug: tap a locked level 10 times in a row (no more than 1.5s between
 * taps) to play it anyway. Kept in production builds on purpose, for testing.
 * Nothing is unlocked up front; it just opens that one level. Winning it
 * counts like any other win.
 */
const DEBUG_TAPS = 10;
const DEBUG_GAP_MS = 1500;
let debugTaps = { level: -1, count: 0, last: 0 };

function handleLockedLevelClick(levelIndex: number, onPick: (index: number) => void): void {
  const now = Date.now();
  const same = debugTaps.level === levelIndex && now - debugTaps.last <= DEBUG_GAP_MS;
  debugTaps = { level: levelIndex, count: same ? debugTaps.count + 1 : 1, last: now };
  if (debugTaps.count >= DEBUG_TAPS) {
    debugTaps = { level: -1, count: 0, last: 0 };
    console.info(`[kittydoku] debug: opening locked level ${levelIndex + 1}`);
    onPick(levelIndex);
  }
}

// ---------------------------------------------------------------- public API

export function renderMap(
  progress: Progress,
  onPick: (index: number) => void,
  onWorldTap?: (chapterIndex: number) => void
): void {
  const wrap = $('mapWrap');
  const width = wrap.clientWidth || 420;
  const cx = width / 2;
  const amp = Math.max(70, cx - 84);

  // ------ layout: a winding trail, laid out top-down then flipped ------
  const refs = allLevels();
  const points: Pt[] = [];
  const signSlots: { chapterIndex: number; y: number }[] = [];

  let y = 96;
  let phase = 0.9;
  let lastChapter = -1;
  refs.forEach((ref, i) => {
    if (ref.chapterIndex !== lastChapter) {
      if (lastChapter !== -1) y += 44; // breathing room before a new world
      signSlots.push({ chapterIndex: ref.chapterIndex, y });
      y += 124;
      lastChapter = ref.chapterIndex;
    }
    const jitter = Math.sin((i + 1) * 12.9898) * 14;
    points.push({ x: cx + amp * Math.sin(phase) + jitter, y });
    // Slightly tighter than before so 100 levels don't make an endless map.
    y += 86 + ((i * 47) % 3) * 8;
    phase += 0.78;
  });

  // Extra sky above the last world for the "more worlds coming" sign.
  const TOP_PAD = 280;
  const totalH = y + 60 + TOP_PAD;
  wrap.style.height = `${totalH}px`;

  // Journey climbs upward: level 1 at the bottom, each world's sign sits at
  // its entrance (the bottom of its band).
  const flip = (yy: number) => totalH - yy;
  points.forEach((p) => (p.y = flip(p.y)));
  signSlots.forEach((s) => (s.y = flip(s.y)));

  const BAND_PAD = 72; // band edge sits this far below the world's sign
  const bandOf = (k: number) => {
    const bottom = k === 0 ? totalH : signSlots[k].y + BAND_PAD;
    const top = k === signSlots.length - 1 ? TOP_PAD : signSlots[k + 1].y + BAND_PAD;
    return { top, bottom };
  };

  const isUnlockedWorld = (k: number) => {
    const first = refs.find((r) => r.chapterIndex === k);
    return !!first && first.index <= progress.unlocked;
  };

  // ------ world bands ------
  const regionsEl = $('mapRegions');
  regionsEl.style.height = `${totalH}px`;
  regionsEl.innerHTML = '';
  signSlots.forEach((slot, k) => {
    const w = WORLDS[slot.chapterIndex % WORLDS.length];
    const { top, bottom } = bandOf(k);
    const h = bottom - top;

    const band = document.createElement('div');
    band.className = `worldBand${w.night ? ' night' : ''}${isUnlockedWorld(k) ? '' : ' lockedWorld'}`;
    // Lower worlds stack above higher ones so each wave overlaps the band above.
    band.style.cssText = `top:${top}px;height:${h}px;z-index:${signSlots.length - k};
      background:${worldBackground(w)};`;

    let inner = '';
    // Every world, including the last, gets a wave on top (the last one
    // rises into the "coming soon" sky).
    inner += `<svg class="worldWave" viewBox="0 0 1200 30" preserveAspectRatio="none" aria-hidden="true"><path d="${WAVE}" fill="${w.top}"/></svg>`;
    inner += `<div class="worldStrip" style="background-image:${stripBg(w.strip)}"></div>`;

    if (w.night) {
      for (let s = 0; s < 26; s++) {
        const sx = (rand(s + k * 50) * 100).toFixed(1);
        const sy = Math.round(30 + rand(s * 3.7 + k) * (h - 140));
        const sz = 3 + Math.round(rand(s * 9.1) * 4);
        inner += `<span class="star" style="left:${sx}%;top:${sy}px;width:${sz}px;height:${sz}px;animation-delay:${(-rand(s) * 3).toFixed(2)}s"></span>`;
      }
    }

    // Scenery in the margins: each prop has its own size, height in the band
    // (`at`) and distance out into the margin (`inset`).
    w.props.forEach((p, i) => {
      const py = Math.round(30 + p.at * Math.max(0, h - 100 - p.size));
      inner += `<span class="mapProp ${p.side}${p.still ? ' still' : ''}" style="top:${py}px;--sz:${p.size}px;--in:${p.inset};animation-delay:${(-i * 1.7).toFixed(1)}s">${p.svg}</span>`;
    });

    band.innerHTML = inner;
    regionsEl.appendChild(band);
  });

  // ------ "more worlds coming" sky above the last world ------
  const sky = document.createElement('div');
  sky.className = 'comingSky';
  sky.style.height = `${TOP_PAD + 40}px`;
  // Blend from the page colour down into the last world's own sky colour.
  const lastWorld = WORLDS[signSlots[signSlots.length - 1].chapterIndex % WORLDS.length];
  sky.style.background = lastWorld.night
    ? `linear-gradient(180deg, #fff8ef 0%, #ffe3d6 30%, #b98aa8 62%, ${lastWorld.top} 100%)`
    : `linear-gradient(180deg, #fff8ef 0%, #fff1f4 50%, ${lastWorld.top} 100%)`;
  const cloud = (cls: string, style: string, scale = 1) =>
    `<svg class="skyCloud ${cls}" style="${style}" viewBox="0 0 160 80" width="${Math.round(160 * scale)}" height="${Math.round(80 * scale)}" aria-hidden="true">
      <circle cx="44" cy="48" r="24" fill="#ffffff"/><circle cx="78" cy="34" r="30" fill="#ffffff"/>
      <circle cx="112" cy="46" r="24" fill="#ffffff"/><rect x="24" y="46" width="112" height="26" rx="13" fill="#ffffff"/>
      <ellipse cx="66" cy="26" rx="14" ry="6" fill="#ffffff" opacity="0.9"/>
    </svg>`;
  sky.innerHTML =
    cloud('', 'left:4%;top:34px', 0.9) +
    cloud('slow', 'right:6%;top:18px', 1.15) +
    cloud('', 'left:22%;top:150px', 0.7) +
    cloud('slow', 'right:20%;top:170px', 0.8) +
    cloud('', 'left:58%;top:70px', 0.55) +
    [[12, 110], [30, 60], [70, 40], [86, 120], [48, 200], [92, 210]]
      .map(([x, yy], i) => `<span class="skySpark" style="left:${x}%;top:${yy}px;animation-delay:${(-i * 0.7).toFixed(1)}s"></span>`)
      .join('');
  regionsEl.appendChild(sky);

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
    const done = !!progress.results[i]?.solved;
    const night = !!WORLDS[refs[i + 1].chapterIndex % WORLDS.length].night;
    segs.push(
      `<path class="trail${done ? ' lit' : ''}${night ? ' night' : ''}" d="M ${p1.x} ${p1.y} C ${c1x} ${c1y},${c2x} ${c2y},${p2.x} ${p2.y}"/>`
    );
  }
  // A faint dotted path carries on past the last level, up to the sign.
  const lastPt = points[points.length - 1];
  const COMING_Y = 128; // centre of the "coming soon" sign
  segs.push(
    `<path class="trail future" d="M ${lastPt.x} ${lastPt.y} C ${lastPt.x} ${lastPt.y - 90}, ${cx} ${COMING_Y + 150}, ${cx} ${COMING_Y + 52}"/>`
  );
  svg.innerHTML = segs.join('');

  // ------ world signs ------
  const signHost = $('mapBanners');
  signHost.innerHTML = '';
  signSlots.forEach((slot, k) => {
    const ch = CHAPTERS[slot.chapterIndex];
    const w = WORLDS[slot.chapterIndex % WORLDS.length];
    const chRefs = refs.filter((r) => r.chapterIndex === slot.chapterIndex);
    const doneInCh = chRefs.filter((r) => progress.results[r.index]?.solved).length;
    const total = chRefs.length;
    const cleared = doneInCh === total;
    const unlocked = isUnlockedWorld(k);

    const sub = !unlocked
      ? `Finish ${CHAPTERS[slot.chapterIndex - 1].name} to open`
      : cleared
        ? 'Every cat is cozy here'
        : ch.blurb;

    const sign = document.createElement('button');
    sign.className = `worldSign${unlocked ? '' : ' locked'}${cleared ? ' cleared' : ''}`;
    sign.style.top = `${slot.y}px`;
    sign.style.setProperty('--deep', w.deep);
    sign.setAttribute('aria-label', `World ${k + 1}: ${ch.name}. ${unlocked ? `${doneInCh} of ${total} solved` : sub}`);
    sign.innerHTML = `
      <span class="wsCat">${mascotSvg(48, w.coat)}</span>
      <span class="wsText">
        <span class="wsKicker">World ${k + 1}${unlocked ? ` · ${doneInCh}/${total}` : ''}</span>
        <span class="wsName">${ch.name}</span>
        <span class="wsSub">${sub}</span>
        ${unlocked ? `<span class="wsBar"><span style="width:${Math.round((doneInCh / total) * 100)}%"></span></span>` : ''}
      </span>
      ${unlocked ? '' : '<svg class="icon wsLock"><use href="#i-lock"/></svg>'}
    `;
    if (unlocked && onWorldTap) sign.addEventListener('click', () => onWorldTap(slot.chapterIndex));
    else sign.tabIndex = -1;
    signHost.appendChild(sign);
  });

  // ------ "more worlds coming" signpost ------
  const allDone = solvedCount(progress) >= TOTAL_LEVELS;
  const coming = document.createElement('div');
  coming.className = `comingSign${allDone ? ' celebrate' : ''}`;
  coming.style.top = `${COMING_Y}px`;
  coming.setAttribute('role', 'note');
  coming.innerHTML = `
    <span class="csBoard">
      <span class="csNails" aria-hidden="true"><i></i><i></i></span>
      <span class="csKicker">${allDone ? 'Every cat is cozy!' : `World ${signSlots.length + 1}`}</span>
      <span class="csName">More worlds coming soon</span>
      <span class="csSub">${allDone ? 'You found a spot for every cat. New puzzles are on the way.' : 'The cats are still exploring up here…'}</span>
      <span class="csPaws" aria-hidden="true">
        <svg viewBox="0 0 24 24"><use href="#i-paw"/></svg><svg viewBox="0 0 24 24"><use href="#i-paw"/></svg><svg viewBox="0 0 24 24"><use href="#i-paw"/></svg>
      </span>
    </span>
    <span class="csPost" aria-hidden="true"></span>`;
  signHost.appendChild(coming);

  // ------ level nodes ------
  const nodesHost = $('mapNodes');
  nodesHost.innerHTML = '';
  const allSolved = solvedCount(progress) === TOTAL_LEVELS;
  const frontier = refs.find((r) => !progress.results[r.index]?.solved && r.index <= progress.unlocked);
  const frontierId = allSolved ? -1 : (frontier?.index ?? 0);

  refs.forEach((ref: LevelRef, i: number) => {
    const p = points[i];
    const w = WORLDS[ref.chapterIndex % WORLDS.length];
    const unlocked = ref.index <= progress.unlocked;
    const result = progress.results[ref.index];
    const done = !!result?.solved;
    const isNext = ref.index === frontierId;
    const clean = !!result?.clean;
    const num = ref.index + 1; // one number 1-100 across the whole game

    const stateClass = isNext ? 'next' : done ? 'done' : unlocked ? 'open' : 'locked';

    const node = document.createElement('button');
    node.className = `mapNode ${stateClass}${w.night ? ' onNight' : ''}`;
    node.style.cssText = `left:${p.x}px;top:${p.y}px`;
    node.style.setProperty('--deep', w.deep);
    node.setAttribute(
      'aria-label',
      `${ref.chapter.name}, level ${num}, ${ref.size} by ${ref.size}` +
        (done ? (clean ? ', purrfect' : ', solved') : unlocked ? '' : ', locked')
    );

    if (stateClass === 'done') {
      // A solved level is a cat that found its spot: show that world's cat.
      node.innerHTML = `
        <span class="mnCat">${mascotSvg(60, w.coat)}</span>
        <span class="mnBadge">${num}</span>
        ${clean ? `<span class="mnMedal" aria-hidden="true">${medalSvg(24)}</span>` : ''}
      `;
      node.addEventListener('click', () => onPick(ref.index));
    } else if (stateClass === 'next' || stateClass === 'open') {
      node.innerHTML = `
        <span class="mnNum">${num}</span>
        <span class="mnSize">${ref.size}×${ref.size}</span>
        ${isNext ? `<span class="mnAvatar" aria-hidden="true">${mascotSvg(56, w.coat)}</span><span class="mnLabel">Play</span>` : ''}
      `;
      node.addEventListener('click', () => onPick(ref.index));
    } else {
      // Locked; 10 quick taps open it anyway (debug, see handleLockedLevelClick).
      node.innerHTML = `<svg class="icon mnLock"><use href="#i-lock"/></svg>`;
      node.addEventListener('click', () => handleLockedLevelClick(ref.index, onPick));
    }

    nodesHost.appendChild(node);
  });

  // ------ header stats ------
  const solved = solvedCount(progress);
  const clean = cleanCount(progress);
  $('mapStats').innerHTML = `
    <span class="statPill" aria-label="${solved} of ${TOTAL_LEVELS} levels solved">
      <span class="spIcon">${mascotSvg(22)}</span><b>${solved}</b><span class="spOf">/ ${TOTAL_LEVELS}</span>
    </span>
    <span class="statPill gold" aria-label="${clean} purrfect, solved with no hints and no hearts lost">
      <span class="spIcon">${medalSvg(16)}</span><b>${clean}</b><span class="spOf">purrfect</span>
    </span>`;
}

/** Scroll so the frontier (next unsolved) node is centred on screen. */
export function scrollToFrontier(): void {
  const target =
    document.querySelector<HTMLElement>('.mapNode.next') ??
    document.querySelector<HTMLElement>('.mapNode.done');
  if (!target) return;
  // The map scrolls inside its own screen, not the page.
  const scroller = $('screen-map');
  const yAbs = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
  scroller.scrollTo({
    top: Math.max(0, yAbs - scroller.clientHeight * 0.45),
    behavior: 'instant' as ScrollBehavior,
  });
}
