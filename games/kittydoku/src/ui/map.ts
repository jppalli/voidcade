/**
 * Adventure map renderer — same winding-path format as ChessDoku, adapted
 * to KittyDoku's pastel palette. Nodes are circles on a Catmull-Rom trail
 * with chapter banners at the gates.
 */
import { CHAPTERS, TOTAL_LEVELS, allLevels, type LevelRef } from '../game/levels';
import { cleanCount, solvedCount, type Progress } from '../game/progress';
import { pawSvg } from '../render/art';

const $ = (id: string) => document.getElementById(id) as HTMLElement;

// ---------------------------------------------------------------- helpers

interface Pt { x: number; y: number }

/** Chapter accent colours in the same order as CHAPTERS. */
const REGION_TINTS: string[] = [
  'rgba(255,214,165,0.12)',
  'rgba(215,199,255,0.12)',
  'rgba(184,235,200,0.12)',
  'rgba(191,227,255,0.12)',
  'rgba(255,201,217,0.12)',
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
    const ch = CHAPTERS[slot.chapterIndex];

    const div = document.createElement('div');
    div.className = 'mapRegion';
    div.style.cssText = `
      position:absolute; left:0; right:0;
      top:${top - 40}px; height:${height}px;
      background:${REGION_TINTS[slot.chapterIndex % REGION_TINTS.length]};
      pointer-events:none;
    `;
    // Giant watermark paw print as the region glyph
    div.innerHTML = `<span class="regionMark" style="
      position:absolute; left:50%; top:50%;
      transform:translate(-50%,-50%) rotate(${bi % 2 ? 8 : -8}deg);
      opacity:0.06; pointer-events:none; user-select:none;
    ">${pawSvg(ch.accent, 200)}</span>`;
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
