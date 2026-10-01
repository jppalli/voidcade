import {
  playCat,
  playLift,
  playPaw,
  playTap,
  playUnhappy,
  playWin,
  setSoundEnabled,
  soundEnabled,
} from './audio/sound';
import { TOTAL_LEVELS, allLevels, levelAt, type LevelRef } from './game/levels';
import {
  loadProgress,
  recordWin,
  saveProgress,
  solvedCount,
  type Progress,
} from './game/progress';
import { Game, MAX_LIVES } from './game/state';
import { deadCatSvg, mascotSvg, pastel, pawSvg } from './render/art';
import { renderMap, scrollToFrontier } from './ui/map';

type Screen = 'title' | 'map' | 'game';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

let progress: Progress = loadProgress();
let game: Game | null = null;
let winPending = false;

// ---------------------------------------------------------------- screens

function show(screen: Screen) {
  (['title', 'map', 'game'] as Screen[]).forEach((s) => {
    const el = $(`screen-${s}`);
    el.classList.toggle('hidden', s !== screen);
    if (s === screen) {
      el.classList.remove('entering');
      void el.offsetWidth;
      el.classList.add('entering');
    }
  });
  if (screen === 'map') {
    renderMap(progress, startLevel);
    requestAnimationFrame(scrollToFrontier);
  }
  if (screen === 'title') renderTitle();
  window.scrollTo({ top: 0 });
}

// ---------------------------------------------------------------- title

function renderTitle() {
  $('titleCat').innerHTML = mascotSvg(92);
  const done = solvedCount(progress);
  $('titleProgress').textContent =
    done === 0 ? `${TOTAL_LEVELS} cosy puzzles` : `${done} / ${TOTAL_LEVELS} solved`;
  $('btnPlay').textContent = done === 0 ? 'Play' : 'Continue';
}

function seedTitleFloat() {
  const host = $('titleFloat');
  const tints = ['#ffd6a5', '#d7c7ff', '#b8ebc8', '#ffc9d9', '#bfe3ff'];
  host.innerHTML = Array.from({ length: 11 }, (_, i) => {
    const left = Math.round((i * 137) % 96);
    const size = 20 + ((i * 7) % 22);
    const dur = 20 + ((i * 5) % 16);
    const delay = -(i * 3.3).toFixed(1);
    return `<span style="left:${left}%;bottom:-10vh;animation-duration:${dur}s;animation-delay:${delay}s">
      ${pawSvg(tints[i % tints.length], size)}
    </span>`;
  }).join('');
}

// ---------------------------------------------------------------- game

function startLevel(index: number) {
  const ref = levelAt(index);
  if (!ref) return;
  game = new Game(ref);
  winPending = false;
  press = null;
  lastTap = null;

  $('gameChapter').textContent = ref.chapter.name;
  $('gameLevelNum').textContent = `Level ${ref.levelInChapter + 1} · ${ref.size}×${ref.size}`;

  const tipBar = $('tipBar');
  tipBar.classList.toggle('hidden', !ref.tip);
  if (ref.tip) $('tipText').textContent = ref.tip;

  buildBoard(ref);
  renderBoard();
  show('game');
}

function buildBoard(ref: LevelRef) {
  const board = $('board');
  board.style.gridTemplateColumns = `repeat(${ref.size}, 1fr)`;
  board.style.gridTemplateRows = `repeat(${ref.size}, 1fr)`;

  const g = game!;
  board.innerHTML = '';

  for (let r = 0; r < ref.size; r++) {
    for (let c = 0; c < ref.size; c++) {
      const region = g.regionAt(r, c);
      const tone = pastel(region);
      const cell = document.createElement('button');
      cell.className = 'cell';
      cell.dataset.r = String(r);
      cell.dataset.c = String(c);
      cell.style.setProperty('--cell', tone.fill);
      // Stagger the idle wiggle so cats aren't all in sync
      cell.style.setProperty('--cat-delay', `${((r * ref.size + c) * 0.31) % 2.8}s`);
      cell.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}`);

      const edges: string[] = [];
      const same = (rr: number, cc: number) =>
        rr >= 0 && rr < ref.size && cc >= 0 && cc < ref.size && g.regionAt(rr, cc) === region;
      if (!same(r - 1, c)) edges.push('inset 0 3px 0 0 var(--ink)');
      if (!same(r + 1, c)) edges.push('inset 0 -3px 0 0 var(--ink)');
      if (!same(r, c - 1)) edges.push('inset 3px 0 0 0 var(--ink)');
      if (!same(r, c + 1)) edges.push('inset -3px 0 0 0 var(--ink)');
      edges.push('inset 0 -1px 0 0 rgba(74,59,52,0.16)');
      edges.push('inset -1px 0 0 0 rgba(74,59,52,0.16)');
      cell.style.boxShadow = edges.join(', ');

      // Pointer taps/drags are handled on the board (see wireBoardInput).
      // A click with detail 0 is keyboard (Enter/Space) or assistive-tech
      // activation: toggle the paw. "C" places a cat on the focused cell.
      cell.addEventListener('click', (e) => { if (e.detail === 0) keyTogglePaw(r, c); });
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'c' || e.key === 'C') { e.preventDefault(); placeCat(r, c, true); }
      });
      board.appendChild(cell);
    }
  }
}

function cellEl(r: number, c: number): HTMLElement | null {
  return $('board').querySelector<HTMLElement>(`[data-r="${r}"][data-c="${c}"]`);
}

function renderBoard() {
  const g = game!;
  const size = g.size;
  // Scale mascot to ~72% of the cell for a big cosy feel
  const catPx = Math.max(24, Math.round(270 / size));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const el = cellEl(r, c);
      if (!el) continue;
      const mark = g.marks[r][c];

      if (mark === 'cat') {
        if (!el.querySelector('.catWrap')) {
          el.classList.remove('wrong-cell');
          el.innerHTML = `<span class="catWrap">${mascotSvg(catPx)}</span>`;
        }
      } else if (mark === 'wrong') {
        if (!el.querySelector('.wrongWrap')) {
          el.innerHTML = `<span class="wrongWrap">${deadCatSvg(catPx)}</span>`;
          el.classList.add('wrong-cell');
        }
      } else if (mark === 'paw') {
        if (!el.querySelector('.pawWrap')) {
          el.classList.remove('wrong-cell');
          const tone = pastel(g.regionAt(r, c));
          el.innerHTML = `<span class="pawWrap">${pawSvg(tone.ink, Math.round(catPx * 0.55))}</span>`;
        }
      } else {
        if (el.innerHTML !== '') {
          el.innerHTML = '';
          el.classList.remove('wrong-cell');
        }
      }
    }
  }

  // Hearts HUD — rendered in the header, updated after every tap
  $('livesRow').innerHTML = Array.from({ length: MAX_LIVES }, (_, i) =>
    `<span class="heart ${i < g.livesRemaining ? 'full' : 'empty'}">
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path d="M12 20.5s-7.5-4.6-7.5-9.6a4.4 4.4 0 0 1 7.5-3.1 4.4 4.4 0 0 1 7.5 3.1c0 5-7.5 9.6-7.5 9.6Z"
          fill="${i < g.livesRemaining ? '#e7908c' : 'none'}"
          stroke="${i < g.livesRemaining ? '#e7908c' : '#d4bfb7'}"
          stroke-width="1.8"/>
      </svg>
    </span>`
  ).join('');

  ($('btnUndo') as HTMLButtonElement).disabled = !g.canUndo;
}

// ---------------------------------------------------------------- board input
//
//  tap empty cell      -> paw (free, applied immediately, no waiting)
//  tap paw             -> clears it (free), however fast the taps come
//  double-tap empty    -> places a cat (wrong = dead cat, -1 heart); the first
//                         tap still applies a paw instantly and the second
//                         converts it, undoing as one action. Clearing a paw
//                         never arms a double-tap.
//  hold + drag         -> paints paws on empty cells only (free); never a tap.
//                         Needs DRAG_SLOP_PX of movement first.

/** Max gap between two taps on the same cell to count as a double-tap. */
const DOUBLE_TAP_MS = 300;
/** Movement (px) from pointerdown before a press can become a drag, so a
 *  jittery tap near a cell border still counts as a tap. */
const DRAG_SLOP_PX = 8;

/** Pointer currently held on the board. */
let press: {
  id: number; r: number; c: number;
  sx: number; sy: number; x: number; y: number;
  dragging: boolean; painted: boolean;
} | null = null;
/** Last single tap, so a fast second tap on the same cell becomes a cat. */
let lastTap: { r: number; c: number; time: number } | null = null;

/** Empty -> paw, paw -> empty. Returns null on a resolved (cat/dead) cell. */
function togglePaw(r: number, c: number): 'paw' | 'cleared' | null {
  const g = game!;
  let result: 'paw' | 'cleared';
  if (g.markPaw(r, c)) { playPaw(); result = 'paw'; }
  else if (g.clearPaw(r, c)) { playLift(); result = 'cleared'; }
  else return null;
  renderBoard();
  return result;
}

function keyTogglePaw(r: number, c: number) {
  if (!game || winPending) return;
  lastTap = null;
  togglePaw(r, c);
}

function placeCat(r: number, c: number, recordUndo: boolean) {
  const g = game;
  if (!g || winPending) return;
  const result = g.placeCat(r, c, recordUndo);
  if (result === 'already-filled') return;
  renderBoard();

  if (result === 'correct') {
    playCat();
    if (g.isSolved()) finishLevel();
  } else {
    playUnhappy();
    if (g.outOfLives) {
      winPending = true;
      setTimeout(showFailModal, 480);
    }
  }
}

function onTap(r: number, c: number) {
  if (!game || winPending) return;
  const now = performance.now();
  const prev = lastTap;
  lastTap = null;

  if (prev && prev.r === r && prev.c === c && now - prev.time <= DOUBLE_TAP_MS) {
    // The first tap already pushed an undo step holding the pre-tap state;
    // fold the cat into it.
    placeCat(r, c, false);
    return;
  }
  // Only a tap that put a paw on an empty cell arms a double-tap. Clearing a
  // paw leaves lastTap null, so a fast follow-up tap is a fresh single tap.
  if (togglePaw(r, c) === 'paw') lastTap = { r, c, time: now };
}

function cellAtPoint(x: number, y: number): { r: number; c: number } | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('#board .cell');
  return el ? { r: Number(el.dataset.r), c: Number(el.dataset.c) } : null;
}

/** Drag paint: add a paw if the cell is empty; never clears or touches cats. */
function paintPaw(r: number, c: number) {
  if (!press || !game) return;
  if (game.markPaw(r, c, !press.painted)) {
    press.painted = true; // whole stroke = one undo step
    playPaw();
    renderBoard();
  }
}

function wireBoardInput() {
  const board = $('board');

  board.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0 || !game || winPending) return;
    const cell = cellAtPoint(e.clientX, e.clientY);
    if (!cell) return;
    press = {
      id: e.pointerId, ...cell,
      sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY,
      dragging: false, painted: false,
    };
    board.setPointerCapture(e.pointerId);
  });

  board.addEventListener('pointermove', (e) => {
    if (!press || e.pointerId !== press.id || !game || winPending) return;
    // Still within tap slop: not a drag yet.
    if (!press.dragging && Math.hypot(e.clientX - press.sx, e.clientY - press.sy) < DRAG_SLOP_PX) return;
    // Sample along the segment so fast swipes don't skip cells.
    const dx = e.clientX - press.x;
    const dy = e.clientY - press.y;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8));
    for (let i = 1; i <= steps; i++) {
      const cell = cellAtPoint(press.x + (dx * i) / steps, press.y + (dy * i) / steps);
      if (!cell) continue;
      if (!press.dragging) {
        if (cell.r === press.r && cell.c === press.c) continue;
        // Left the starting cell: this is a drag, not a tap.
        press.dragging = true;
        lastTap = null;
        paintPaw(press.r, press.c);
      }
      paintPaw(cell.r, cell.c);
    }
    press.x = e.clientX;
    press.y = e.clientY;
  });

  board.addEventListener('pointerup', (e) => {
    if (!press || e.pointerId !== press.id) return;
    const { r, c, sx, sy, dragging } = press;
    press = null;
    if (dragging) return;
    // A release within the slop is a tap on the start cell, even if the
    // finger wobbled over a border.
    if (Math.hypot(e.clientX - sx, e.clientY - sy) < DRAG_SLOP_PX) { onTap(r, c); return; }
    const cell = cellAtPoint(e.clientX, e.clientY);
    if (cell && cell.r === r && cell.c === c) onTap(r, c);
  });

  board.addEventListener('pointercancel', (e) => {
    if (press && e.pointerId === press.id) press = null;
  });
}

function showFailModal() {
  $('failOverlay').classList.remove('hidden');
}

function finishLevel() {
  const g = game!;
  winPending = true;
  playWin();

  progress = recordWin(progress, g.ref.index, !g.usedHint, TOTAL_LEVELS);
  saveProgress(progress);

  const isLast = g.ref.index >= TOTAL_LEVELS - 1;
  $('winCat').innerHTML = mascotSvg(96);
  $('winTitle').textContent = g.usedHint ? 'All cosy!' : 'Purrfect!';
  $('winText').textContent = isLast
    ? 'Every cat in the game has found its spot. Thanks for playing!'
    : g.livesLost === 0 && !g.usedHint
      ? 'Not a single life lost — gold star!'
      : 'Every cat has a spot of its own.';
  ($('btnWinNext') as HTMLButtonElement).classList.toggle('hidden', isLast);

  setTimeout(() => $('winOverlay').classList.remove('hidden'), 520);
}

// ---------------------------------------------------------------- how to play

function renderDemoBoard() {
  const regions = [
    [0, 0, 1, 1],
    [0, 2, 2, 1],
    [3, 3, 2, 1],
    [3, 3, 2, 2],
  ];
  const cats = new Set(['0,1', '2,0']);
  const blocked = new Set(['0,0', '0,2', '1,0', '1,1', '1,2', '2,1', '3,0', '3,1']);

  let html = '';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const tone = pastel(regions[r][c]);
      const key = `${r},${c}`;
      const inner = cats.has(key)
        ? mascotSvg(26)
        : blocked.has(key)
          ? `<span class="no">${pawSvg(tone.ink, 14)}</span>`
          : '';
      html += `<div style="background:${tone.fill}">${inner}</div>`;
    }
  }
  $('demoBoard').innerHTML = html;
}

// ---------------------------------------------------------------- sound

function refreshSoundButtons() {
  const on = soundEnabled();
  ['btnSoundTitle', 'btnSoundMap', 'btnSoundGame'].forEach((id) => {
    const btn = $(id);
    btn.classList.toggle('off', !on);
    btn.innerHTML = `<svg class="icon"><use href="#${on ? 'i-sound-on' : 'i-sound-off'}"/></svg>`;
  });
}

// ---------------------------------------------------------------- wiring

function nextUnsolvedIndex(): number {
  const refs = allLevels();
  const next = refs.find((r) => !progress.results[r.index]?.solved && r.index <= progress.unlocked);
  return next ? next.index : Math.min(progress.unlocked, TOTAL_LEVELS - 1);
}

function retryLevel() {
  if (!game) return;
  $('failOverlay').classList.add('hidden');
  startLevel(game.ref.index);
}

function init() {
  seedTitleFloat();
  renderDemoBoard();
  refreshSoundButtons();
  renderTitle();

  $('btnPlay').addEventListener('click', () => { playTap(); startLevel(nextUnsolvedIndex()); });
  $('btnMap').addEventListener('click', () => { playTap(); show('map'); });

  document.querySelectorAll<HTMLElement>('[data-nav]').forEach((el) =>
    el.addEventListener('click', () => { playTap(); show(el.dataset.nav as Screen); })
  );

  // How-to modal
  const openHowTo = () => { playTap(); $('howToOverlay').classList.remove('hidden'); };
  $('btnHowTo').addEventListener('click', openHowTo);
  $('btnHelpGame').addEventListener('click', openHowTo);
  $('btnHowToClose').addEventListener('click', () => { playTap(); $('howToOverlay').classList.add('hidden'); });

  // Board controls
  wireBoardInput();
  $('btnUndo').addEventListener('click', () => {
    if (!game || winPending) return;
    lastTap = null;
    game.undo(); playLift(); renderBoard();
  });
  $('btnReset').addEventListener('click', () => {
    if (!game || winPending) return;
    lastTap = null;
    game.reset(); playLift(); renderBoard();
  });
  $('btnHint').addEventListener('click', () => {
    if (!game || winPending) return;
    lastTap = null;
    const spot = game.hint();
    if (!spot) return;
    playCat(); renderBoard();
    const el = cellEl(spot.row, spot.col);
    if (el) { el.classList.add('hintGlow'); setTimeout(() => el.classList.remove('hintGlow'), 2300); }
    if (game.isSolved()) finishLevel();
  });

  // Fail modal — inject sad mascot on open
  $('btnFailRetry').addEventListener('click', () => { playTap(); retryLevel(); });
  $('btnFailMap').addEventListener('click', () => {
    playTap(); $('failOverlay').classList.add('hidden'); show('map');
  });
  // Pre-populate the fail cat now so it's ready
  const failCatEl = document.getElementById('failCat');
  if (failCatEl) failCatEl.innerHTML = mascotSvg(96);

  // Win modal
  $('btnWinNext').addEventListener('click', () => {
    playTap(); $('winOverlay').classList.add('hidden');
    const next = (game?.ref.index ?? 0) + 1;
    if (next < TOTAL_LEVELS) startLevel(next); else show('map');
  });
  $('btnWinMap').addEventListener('click', () => {
    playTap(); $('winOverlay').classList.add('hidden'); show('map');
  });

  // Sound
  ['btnSoundTitle', 'btnSoundMap', 'btnSoundGame'].forEach((id) =>
    $(id).addEventListener('click', () => { setSoundEnabled(!soundEnabled()); refreshSoundButtons(); playTap(); })
  );

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if ($('screen-game').classList.contains('hidden')) return;
    if (e.key === 'r' || e.key === 'R') $('btnReset').click();
    if (e.key === 'z' || e.key === 'Z') $('btnUndo').click();
    if (e.key === 'h' || e.key === 'H') $('btnHint').click();
  });

  show('title');
}

init();
