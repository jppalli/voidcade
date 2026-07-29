import { CHAPTERS, TOTAL_LEVELS, allLevels, type LevelRef } from '../game/levels';
import { cleanCount, solvedCount, type Progress } from '../game/progress';

const $ = (id: string) => document.getElementById(id) as HTMLElement;

interface Pt { x: number; y: number }

const REGION_TINTS: string[] = [
  'rgba(255,214,165,0.18)',
  'rgba(215,199,255,0.16)',
  'rgba(184,235,200,0.16)',
  'rgba(191,227,255,0.16)',
  'rgba(255,201,217,0.18)',
];

/**
 * One thematic SVG illustration per chapter — rendered as a large, very faint
 * background watermark so the chapter has personality without competing with
 * the nodes and trail. Each fits in a 200×200 viewBox.
 */
const CHAPTER_SCENES: string[] = [
  // 0: Sunny Windowsill — arched window with sun rays and a little plant
  `<svg viewBox="0 0 200 200" width="180" height="180" fill="none" opacity="0.13">
    <rect x="55" y="30" width="90" height="110" rx="45" fill="#ffd6a5"/>
    <rect x="70" y="30" width="60" height="110" rx="30" fill="#fff0d0" opacity="0.7"/>
    <line x1="100" y1="30" x2="100" y2="140" stroke="#e8b96a" stroke-width="4"/>
    <line x1="55" y1="85" x2="145" y2="85" stroke="#e8b96a" stroke-width="4"/>
    <line x1="62" y1="52" x2="138" y2="118" stroke="#e8b96a" stroke-width="2.5" opacity="0.5"/>
    <line x1="138" y1="52" x2="62" y2="118" stroke="#e8b96a" stroke-width="2.5" opacity="0.5"/>
    <rect x="45" y="135" width="110" height="14" rx="4" fill="#d4a96a"/>
    <circle cx="100" cy="168" r="10" fill="#9cd49c"/>
    <path d="M100 158 Q108 148 115 152" stroke="#6fb56f" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M100 158 Q92 145 85 150" stroke="#6fb56f" stroke-width="3" fill="none" stroke-linecap="round"/>
  </svg>`,

  // 1: Cosy Armchair — simple armchair silhouette with a cushion
  `<svg viewBox="0 0 200 200" width="180" height="180" fill="none" opacity="0.12">
    <rect x="35" y="100" width="130" height="65" rx="16" fill="#c9b8e8"/>
    <rect x="50" y="75" width="100" height="45" rx="12" fill="#d9caf0"/>
    <rect x="28" y="85" width="32" height="80" rx="14" fill="#c9b8e8"/>
    <rect x="140" y="85" width="32" height="80" rx="14" fill="#c9b8e8"/>
    <rect x="55" y="90" width="90" height="32" rx="10" fill="#e8dff8" opacity="0.8"/>
    <circle cx="100" cy="106" r="7" fill="#b0a2d6" opacity="0.6"/>
    <rect x="62" y="165" width="18" height="20" rx="5" fill="#b0a0d0"/>
    <rect x="120" y="165" width="18" height="20" rx="5" fill="#b0a0d0"/>
  </svg>`,

  // 2: Garden Fence — picket fence with flowers and a butterfly
  `<svg viewBox="0 0 200 200" width="180" height="180" fill="none" opacity="0.12">
    <line x1="20" y1="130" x2="180" y2="130" stroke="#9cd49c" stroke-width="5"/>
    ${[30,55,80,105,130,155].map(x=>`
      <rect x="${x-6}" y="95" width="12" height="45" rx="4" fill="#b8ebc8"/>
      <path d="M${x-6} 95 L${x} 82 L${x+6} 95Z" fill="#b8ebc8"/>
    `).join('')}
    <circle cx="55" cy="118" r="7" fill="#ffd6a5"/>
    <circle cx="55" cy="118" r="4" fill="#ffb84d"/>
    <circle cx="130" cy="112" r="9" fill="#ffc9d9"/>
    <circle cx="130" cy="112" r="5" fill="#ff9db0"/>
    <path d="M148 82 Q158 72 162 82 Q158 92 148 82Z" fill="#bfe3ff" opacity="0.9"/>
    <path d="M148 82 Q138 72 134 82 Q138 92 148 82Z" fill="#bfe3ff" opacity="0.9"/>
    <path d="M148 84 Q158 94 162 84 Q158 74 148 84Z" fill="#d7c7ff" opacity="0.8"/>
    <path d="M148 84 Q138 94 134 84 Q138 74 148 84Z" fill="#d7c7ff" opacity="0.8"/>
    <circle cx="148" cy="83" r="3" fill="#b0a2d6"/>
  </svg>`,

  // 3: Rooftop Moon — crescent moon, stars, rooftop silhouette
  `<svg viewBox="0 0 200 200" width="180" height="180" fill="none" opacity="0.13">
    <path d="M80 50 Q100 10 135 30 Q95 35 90 70 Q65 65 80 50Z" fill="#bfe3ff"/>
    <circle cx="52" cy="60" r="4" fill="#bfe3ff" opacity="0.8"/>
    <circle cx="155" cy="55" r="3" fill="#bfe3ff" opacity="0.7"/>
    <circle cx="140" cy="80" r="2.5" fill="#bfe3ff" opacity="0.6"/>
    <circle cx="48" cy="95" r="2" fill="#bfe3ff" opacity="0.5"/>
    <circle cx="170" cy="100" r="3.5" fill="#bfe3ff" opacity="0.6"/>
    <rect x="20" y="150" width="160" height="55" fill="#9abfcc" opacity="0.4"/>
    <path d="M20 150 L50 120 L80 140 L110 110 L140 130 L180 105 L180 150Z" fill="#7aaabb" opacity="0.5"/>
    <rect x="88" y="128" width="24" height="22" rx="2" fill="#bfe3ff" opacity="0.4"/>
    <line x1="100" y1="128" x2="100" y2="150" stroke="#7aaabb" stroke-width="1.5" opacity="0.5"/>
    <line x1="88" y1="139" x2="112" y2="139" stroke="#7aaabb" stroke-width="1.5" opacity="0.5"/>
  </svg>`,

  // 4: Cat Council — five cat silhouettes sitting in a row
  `<svg viewBox="0 0 200 200" width="180" height="180" fill="none" opacity="0.11">
    ${[22,52,82,112,142].map((x, i) => {
      const earTip = i % 2 === 0 ? '#e8c8d8' : '#d8c8f0';
      const body = i % 2 === 0 ? '#f0c8d8' : '#d8c8f0';
      return `
        <circle cx="${x+15}" cy="${130}" r="12" fill="${body}"/>
        <ellipse cx="${x+15}" cy="${120}" rx="10" ry="9" fill="${body}"/>
        <path d="${x+8} ${115} L${x+6} ${105} L${x+12} ${110}Z" fill="${earTip}"/>
        <path d="${x+22} ${115} L${x+24} ${105} L${x+18} ${110}Z" fill="${earTip}"/>
        <path d="${x+10} ${132} Q${x+15} ${130} ${x+20} ${132} L${x+22} ${142} Q${x+15} ${145} ${x+8} ${142}Z" fill="${body}"/>
      `;
    }).join('')}
    <line x1="15" y1="148" x2="185" y2="148" stroke="#d8c3b2" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
  </svg>`,
];

// ---------------------------------------------------------------- public API

export function renderMap(
  progress: Progress,
  onPick: (index: number) => void
): void {
  const wrap = $('mapWrap');
  const width = wrap.clientWidth || 420;
  const cx = width / 2;
  const amp = Math.max(70, cx - 80);

  // ------ layout: compute a winding node trail ------
  const refs = allLevels();
  const points: Pt[] = [];
  const bannerSlots: { chapterIndex: number; y: number }[] = [];

  let y = 88;
  let phase = 0.9;

  let lastChapter = -1;
  refs.forEach((ref, i) => {
    if (ref.chapterIndex !== lastChapter) {
      bannerSlots.push({ chapterIndex: ref.chapterIndex, y });
      y += 120;
      lastChapter = ref.chapterIndex;
    }
    const jitter = Math.sin((i + 1) * 12.9898) * 14;
    points.push({ x: cx + amp * Math.sin(phase) + jitter, y });
    y += 88 + ((i * 47) % 3) * 10;
    phase += 0.78;
  });

  const totalH = y + 40;
  wrap.style.height = `${totalH}px`;

  // Journey climbs upward: level 1 at the bottom. Mirror every y.
  const flip = (yy: number) => totalH - yy;
  points.forEach((p) => (p.y = flip(p.y)));
  bannerSlots.forEach((s) => (s.y = flip(s.y)));

  // ------ region tints ------
  const regionsEl = $('mapRegions');
  regionsEl.innerHTML = '';
  bannerSlots.forEach((slot, bi) => {
    const nextY = bi + 1 < bannerSlots.length ? bannerSlots[bi + 1].y : 0;
    const top = Math.min(slot.y, nextY);
    const height = Math.abs(slot.y - nextY) + 80;
    const div = document.createElement('div');
    div.className = 'mapRegion';
    div.style.cssText = `
      position:absolute; left:0; right:0;
      top:${top - 40}px; height:${height}px;
      background:${REGION_TINTS[slot.chapterIndex % REGION_TINTS.length]};
      pointer-events:none;
    `;
    // Chapter-themed watermark illustration
    const scene = CHAPTER_SCENES[slot.chapterIndex % CHAPTER_SCENES.length];
    div.innerHTML = `<span class="regionMark" style="
      position:absolute; left:50%; top:50%;
      transform:translate(-50%,-50%) rotate(${bi % 2 ? 5 : -5}deg);
      pointer-events:none; user-select:none;
    ">${scene}</span>`;
    regionsEl.appendChild(div);
  });

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
    segs.push(
      `<path class="trail${done ? ' lit' : ''}" d="M ${p1.x} ${p1.y} C ${c1x} ${c1y},${c2x} ${c2y},${p2.x} ${p2.y}"/>`
    );
  }
  svg.innerHTML = segs.join('');

  // ------ chapter banners ------
  const bannerHost = $('mapBanners');
  bannerHost.innerHTML = '';
  bannerSlots.forEach((slot) => {
    const ch = CHAPTERS[slot.chapterIndex];
    const chRefs = refs.filter((r) => r.chapterIndex === slot.chapterIndex);
    const doneInCh = chRefs.filter((r) => progress.results[r.index]?.solved).length;
    const total = chRefs.length;
    const cleared = doneInCh === total;

    // A chapter is unlocked once the previous one has ≥3 solved levels (or it's the first).
    const prevDone =
      slot.chapterIndex === 0
        ? 3
        : refs.filter((r) => r.chapterIndex === slot.chapterIndex - 1 && progress.results[r.index]?.solved).length;
    const unlocked = prevDone >= 3 || slot.chapterIndex === 0;

    const sub = !unlocked
      ? `Clear 3 levels in "${CHAPTERS[slot.chapterIndex - 1].name}" to enter`
      : cleared
        ? 'All cats cosy!'
        : `${doneInCh} / ${total} · ${ch.blurb}`;

    const banner = document.createElement('div');
    banner.className = `mapBanner${unlocked ? '' : ' lockedB'}${cleared ? ' clearedB' : ''}`;
    banner.style.top = `${slot.y - 30}px`;
    banner.innerHTML = `
      <span class="mbDot" style="background:${ch.accent}"></span>
      <span class="mbText">
        <span class="mbName">${ch.name}</span>
        <span class="mbSub">${sub}</span>
      </span>
      ${unlocked ? '' : '<svg class="icon lockIcon" style="width:14px;height:14px;margin-left:auto"><use href="#i-lock"/></svg>'}
    `;
    bannerHost.appendChild(banner);
  });

  // ------ level nodes ------
  const nodesHost = $('mapNodes');
  nodesHost.innerHTML = '';
  const allSolved = solvedCount(progress) === TOTAL_LEVELS;
  const frontier = refs.find((r) => !progress.results[r.index]?.solved && r.index <= progress.unlocked);
  const frontierId = allSolved ? -1 : (frontier?.index ?? 0);

  refs.forEach((ref: LevelRef, i: number) => {
    const p = points[i];
    const unlocked = ref.index <= progress.unlocked;
    const result = progress.results[ref.index];
    const done = !!result?.solved;
    const isNext = ref.index === frontierId;
    const clean = !!result?.clean;

    const stateClass = done ? 'done' : isNext ? 'next' : unlocked ? 'open' : 'locked';

    const node = document.createElement('button');
    node.className = `mapNode ${stateClass}`;
    node.style.cssText = `left:${p.x}px;top:${p.y}px`;

    if (unlocked || done) {
      const stamp = done
        ? `<span class="mnStamp${clean ? ' clean' : ''}">
             <svg viewBox="0 0 24 24" width="11" height="11" fill="${clean ? '#7d5f04' : '#1f6b3c'}" stroke="none">
               ${clean ? '<path d="M12 2.5l3.09 6.26 6.91 1-5 4.87 1.18 6.87L12 18.27 5.82 21.5 7 14.63l-5-4.87 6.91-1z"/>'
                       : '<path d="M20 6 9 17l-5-5" fill="none" stroke="#1f6b3c" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>'}
             </svg>
           </span>`
        : '';
      node.innerHTML = `
        <span class="mnNum">${ref.levelInChapter + 1}</span>
        <span class="mnSize">${ref.size}×${ref.size}</span>
        ${stamp}
      `;
      if (isNext) {
        node.innerHTML += `<span class="mnLabel">${ref.chapter.name}</span>`;
      }
      node.addEventListener('click', () => onPick(ref.index));
    } else {
      // locked
      node.innerHTML = `<svg class="icon lockIcon" style="width:16px;height:16px"><use href="#i-lock"/></svg>`;
      node.disabled = true;
    }

    nodesHost.appendChild(node);
  });

  // ------ progress chip ------
  const chip = $('mapProgressChip');
  if (chip) {
    chip.textContent = `${solvedCount(progress)} / ${TOTAL_LEVELS} cosy · ${cleanCount(progress)} purrfect`;
  }
}

/** Scroll so the frontier (next unsolved) node is centred on screen. */
export function scrollToFrontier(): void {
  const target =
    (document.querySelector<HTMLElement>('.mapNode.next') ??
    document.querySelector<HTMLElement>('.mapNode.done'));
  if (!target) return;
  const yAbs = target.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({
    top: Math.max(0, yAbs - window.innerHeight * 0.45),
    behavior: 'instant' as ScrollBehavior,
  });
}
