import { CHAPTERS, LEVELS, levelsOfChapter } from '../game/levels';
import { progress } from '../game/state';
import type { Game } from '../game/state';
import { GLYPHS, PIECE_NAMES, PIECE_MOVES } from '../game/types';
import type { PieceType } from '../game/types';

export type ScreenId = 'title' | 'map' | 'game';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

const LOCK_ICON = '<svg class="icon lockIcon"><use href="#i-lock"/></svg>';

export function showScreen(id: ScreenId): void {
  const next = document.getElementById(`screen-${id}`)!;
  for (const s of document.querySelectorAll<HTMLElement>('.screen')) {
    if (s === next || s.classList.contains('hidden')) continue;
    if (s.classList.contains('leaving')) {
      // interrupted mid-transition — finish it instantly
      s.classList.add('hidden');
      s.classList.remove('leaving');
      continue;
    }
    // fade the old screen out in place; hide it when the animation ends
    s.classList.remove('enter');
    s.classList.add('leaving');
    const finish = (): void => {
      // stale callback guard: the screen may have re-entered since this leave began
      if (!s.classList.contains('leaving')) return;
      s.classList.add('hidden');
      s.classList.remove('leaving');
    };
    s.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, 280); // safety net (e.g. reduced-motion disables the animation)
  }
  next.classList.remove('hidden', 'leaving', 'enter');
  void next.offsetWidth; // restart the entrance animation
  next.classList.add('enter');
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
}

export function showOverlay(id: string, show: boolean): void {
  $(id).classList.toggle('hidden', !show);
}

// ---------------------------------------------------------------- title

export function renderTitle(): void {
  const total = progress.totalDone();
  $('titleProgress').textContent = total > 0 ? `${total} / ${LEVELS.length} levels solved` : '';
  const btn = $('btnContinue');
  btn.textContent = total > 0 ? 'Continue' : 'Play';
}

/** Floating background pieces on the title screen (pure decoration). */
export function spawnTitleFloat(): void {
  const host = document.querySelector<HTMLElement>('.titleFloat');
  if (!host) return;
  const glyphs = ['♛', '♜', '♝', '♞', '♚', '♟'];
  let html = '';
  for (let i = 0; i < 14; i++) {
    const g = glyphs[i % glyphs.length];
    const left = Math.random() * 100;
    const delay = Math.random() * 18;
    const dur = 14 + Math.random() * 14;
    const size = 20 + Math.random() * 44;
    html += `<span style="left:${left}%;animation-delay:-${delay}s;animation-duration:${dur}s;font-size:${size}px">${g}</span>`;
  }
  host.innerHTML = html;
}

// ---------------------------------------------------------------- adventure map

interface MapPoint { x: number; y: number }

/**
 * Renders the saga map: a serpentine trail through seven themed regions.
 * Node positions are deterministic (seeded by index) so the map is stable
 * across renders; the wrap must be visible so its width can be measured.
 */
export function renderMap(onPick: (index: number) => void): void {
  const wrap = $('mapWrap');
  const width = wrap.clientWidth || 560;
  const cx = width / 2;
  const amp = Math.max(84, cx - 96);

  // ---- layout: winding node positions + banner slots between chapters ----
  const points: MapPoint[] = [];
  const bannerSlots: { ch: number; y: number }[] = [];
  let y = 96;
  let t = 0.9; // phase along the serpentine
  LEVELS.forEach((level, i) => {
    if (levelsOfChapter(level.ch)[0].index === i) {
      bannerSlots.push({ ch: level.ch, y });
      y += 148;
    }
    const jitter = Math.sin((i + 1) * 12.9898) * 16;
    points.push({ x: cx + amp * Math.sin(t) + jitter, y });
    y += 100 + ((i * 53) % 3) * 11;
    t += 0.82;
  });
  const totalH = y + 40;
  wrap.style.height = `${totalH}px`;

  // The journey climbs: level 1 sits at the BOTTOM of the map. Layout was
  // computed top-down for simplicity, so mirror every y coordinate.
  const flip = (yy: number): number => totalH - yy;
  for (const p of points) p.y = flip(p.y);

  // ---- region tints with watermark glyphs ----
  const regions = $('mapRegions');
  regions.innerHTML = '';
  bannerSlots.forEach((slot, bi) => {
    const top = slot.y - 70; // pre-flip extent
    const end = bi + 1 < bannerSlots.length ? bannerSlots[bi + 1].y - 70 : totalH;
    const div = document.createElement('div');
    div.className = `mapRegion region-${slot.ch}`;
    div.style.top = `${flip(end)}px`;
    div.style.height = `${end - top}px`;
    div.innerHTML = `<span class="regionMark" style="transform:translate(-50%,-50%) rotate(${bi % 2 ? 9 : -9}deg)">${CHAPTERS[slot.ch].glyph}</span>`;
    regions.appendChild(div);
  });

  // ---- trail: smooth Catmull-Rom segments, lit gold behind conquered nodes ----
  const svg = $('mapPath');
  svg.setAttribute('viewBox', `0 0 ${width} ${totalH}`);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(totalH));
  const seg: string[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    const lit = progress.done.has(i);
    seg.push(
      `<path class="trail ${lit ? 'lit' : ''}" d="M ${p1.x} ${p1.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}"/>`,
    );
  }
  svg.innerHTML = seg.join('');

  // ---- chapter banners (gates between regions) ----
  const bannerHost = $('mapBanners');
  bannerHost.innerHTML = '';
  bannerSlots.forEach(slot => {
    const ch = CHAPTERS[slot.ch];
    const unlocked = progress.chapterUnlocked(slot.ch);
    const done = progress.doneInChapter(slot.ch);
    const total = levelsOfChapter(slot.ch).length;
    const cleared = progress.chapterCleared(slot.ch);
    const gate = Math.min(3, levelsOfChapter(Math.max(0, slot.ch - 1)).length);
    const sub = !unlocked
      ? `Clear ${gate} ${CHAPTERS[slot.ch - 1].name} levels to enter`
      : cleared
        ? 'Region conquered!'
        : `${done}/${total} conquered — ${ch.blurb}`;
    const div = document.createElement('div');
    div.className = `mapBanner${unlocked ? '' : ' lockedB'}${cleared ? ' clearedB' : ''}`;
    div.style.top = `${flip(slot.y + 34)}px`;
    div.innerHTML = `
      <span class="mbGlyph">${ch.glyph}</span>
      <span class="mbText">
        <span class="mbName">${ch.name}</span>
        <span class="mbSub">${sub}</span>
      </span>
      ${unlocked ? '' : LOCK_ICON}`;
    bannerHost.appendChild(div);
  });

  // ---- level nodes ----
  const host = $('mapNodes');
  host.innerHTML = '';
  const allDone = progress.totalDone() === LEVELS.length;
  const frontier = allDone ? -1 : progress.nextLevel();
  LEVELS.forEach((level, i) => {
    const p = points[i];
    const unlocked = progress.levelUnlocked(i);
    const done = progress.done.has(i);
    const node = document.createElement('button');
    node.className = 'mapNode ' + (done ? 'done' : i === frontier ? 'next' : unlocked ? 'open' : 'locked');
    node.style.left = `${p.x}px`;
    node.style.top = `${p.y}px`;
    node.title = unlocked || done
      ? `${level.name} — ${'★'.repeat(level.diff)}`
      : 'Locked';
    const stars = '★'.repeat(level.diff);
    node.innerHTML = unlocked || done
      ? `<span class="mnNum">${i + 1}</span><span class="mnStars">${stars}</span>`
      : LOCK_ICON;
    if (i === frontier) {
      node.innerHTML += `<span class="mnLabel">${level.name}</span>`;
    }
    if (unlocked || done) node.addEventListener('click', () => onPick(i));
    host.appendChild(node);
  });

  $('mapProgress').textContent = `${progress.totalDone()} / ${LEVELS.length}`;
}

/** Scroll the window so the frontier node sits comfortably in view. */
export function scrollToFrontier(): void {
  const target =
    document.querySelector<HTMLElement>('.mapNode.next') ??
    document.querySelector<HTMLElement>('.mapNode.done:last-of-type');
  if (!target) return;
  const yAbs = target.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top: Math.max(0, yAbs - window.innerHeight * 0.45), behavior: 'instant' as ScrollBehavior });
}

// ---------------------------------------------------------------- game HUD

export function renderHud(game: Game, onSelect: (p: PieceType) => void): void {
  $('hudChapter').textContent = game.chapterLabel();
  $('hudLevelName').textContent = game.level.name;
  $('hudStars').innerHTML =
    `${'★'.repeat(game.level.diff)}<span class="dim">${'★'.repeat(5 - game.level.diff)}</span>`;
  $('hudDesc').textContent = game.level.desc;
  const tags: string[] = [];
  if (game.level.rule === 'rowcol') tags.push('SUDOKU: 1 PER ROW & COLUMN');
  if (game.level.rule === 'box') tags.push('SUDOKU: 1 PER BOX');
  $('hudRuleTags').innerHTML = tags.map(t => `<span class="ruleTag">${t}</span>`).join('');

  const tray = $('tray');
  tray.innerHTML = '';
  for (const [p, count] of game.remaining) {
    const item = document.createElement('button');
    item.className = 'trayItem';
    if (game.selected === p && count > 0) item.classList.add('selected');
    if (count === 0) item.classList.add('empty');
    item.innerHTML = `
      <span class="trayGlyph">${GLYPHS[p]}</span>
      <span class="trayInfo">
        <span class="trayName">${PIECE_NAMES[p]}</span>
        <span class="trayMove">${PIECE_MOVES[p]}</span>
      </span>
      <span class="trayCount">×${count}</span>`;
    item.addEventListener('click', () => onSelect(p));
    tray.appendChild(item);
  }

  updateStatus(game);
}

export function updateStatus(game: Game, override?: string): void {
  const el = $('hudStatus');
  if (override) {
    el.textContent = override;
    el.className = 'bad';
    return;
  }
  const left = game.piecesLeft();
  if (game.conflicts.cells.size) {
    el.textContent = 'Pieces are attacking each other!';
    el.className = 'bad';
  } else if (game.ruleBad.size) {
    el.textContent = 'Sudoku rule broken — check rows, columns and boxes.';
    el.className = 'warn';
  } else if (left > 0) {
    el.textContent = `${left} piece${left > 1 ? 's' : ''} left to place. Board is peaceful so far.`;
    el.className = '';
  } else {
    el.textContent = 'Perfect harmony!';
    el.className = 'good';
  }
}

// ---------------------------------------------------------------- win modal

export function renderWin(game: Game, chapterJustCleared: boolean): void {
  const last = game.levelIndex === LEVELS.length - 1 && progress.totalDone() === LEVELS.length;
  $('winStars').innerHTML =
    `${'★'.repeat(game.level.diff)}<span class="dim">${'★'.repeat(5 - game.level.diff)}</span>`;
  $('winText').textContent = last
    ? 'Every board is at peace. You are the ChessDoku Grandmaster!'
    : chapterJustCleared
      ? `Chapter "${CHAPTERS[game.level.ch].name}" cleared! A new chapter awaits.`
      : `“${game.level.name}” solved — not a single piece in danger.`;
  $('btnWinNextLabel').textContent = last ? 'Back to title' : 'Next level';
}

export function syncSoundButtons(muted: boolean): void {
  for (const id of ['btnSoundTitle', 'btnSoundMap', 'btnSoundGame']) {
    const btn = $(id);
    btn.querySelector('use')?.setAttribute('href', muted ? '#i-sound-off' : '#i-sound-on');
    btn.title = muted ? 'Sound off — click to unmute' : 'Sound on — click to mute';
    btn.setAttribute('aria-pressed', String(muted));
    btn.classList.toggle('mutedState', muted);
  }
}
