// Nunito is bundled with the game (no Google Fonts request). Each weight's
// CSS uses unicode-range, so browsers only download the subsets they need.
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import {
  playCat,
  playHeartLost,
  playHint,
  playLift,
  playOutOfLives,
  playPaw,
  playTap,
  playUnhappy,
  playWin,
  loadSoundPref,
  musicEnabled,
  setAudioHold,
  setMusicEnabled,
  setSfxEnabled,
  sfxEnabled,
  unlockAudio,
} from './audio/sound';
import { FREE_HINTS_PER_DAY, freeHintsLeft, useFreeHint } from './game/hints';
import { createPlatform, GAME_VERSION, type Platform } from './platform/platform';
import { initStorage, resyncStorage, setSignedOut } from './platform/storage';
import { CHAPTERS, TOTAL_LEVELS, allLevels, levelAt, type LevelRef } from './game/levels';
import {
  cleanCount,
  hasSeenIntro,
  hasSeenTip,
  loadProgress,
  markIntroSeen,
  markTipSeen,
  recordWin,
  saveProgress,
  solvedCount,
  type Progress,
} from './game/progress';
import { Game, MAX_LIVES } from './game/state';
import { COATS, deadCatSvg, mascotSvg, medalSvg, pastel, pawSvg, type Coat } from './render/art';
import { renderMap, scrollToFrontier, worldCoat } from './ui/map';
import { worldBackground, worldOf } from './ui/mapScenery';
import { closeTip, isTipOpen, openTip, wireTip } from './ui/tip';
import { coachNotify, isCoachActive, startCoach, stopCoach, wireCoach } from './ui/coach';
import { TUTORIAL_LEVELS, tutorialSteps } from './game/tutorial';
import { IRIS_OPEN_MS, irisBusy, irisTo, wireIris } from './ui/iris';

type Screen = 'title' | 'map' | 'game';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

/** Set in boot(), once the platform (Arkadium SDK or local) and storage are ready. */
let platform: Platform;
let progress: Progress;
/** Subscribers get rewards without watching a video. */
let subscriber = false;
/** 1-based number of the level currently being played, for onLevelStart/End. */
let activeLevel: number | null = null;
/** A rewarded video is on screen: ignore taps and buttons until it's done. */
let adPlaying = false;
let game: Game | null = null;
let winPending = false;
/** Hearts currently drawn in #livesRow, so the row is only rebuilt when the
 *  count changes (a rebuild would cut a heart-loss animation short). */
let renderedLives = -1;
/** Pending timers of the win celebration, cleared when a level starts. */
let winTimers: number[] = [];

// ---------------------------------------------------------------- screens

function show(screen: Screen) {
  hideWelcomeToast();
  if (screen !== 'game') { endActiveLevel(); stopCoach(); hideNote(); if (idleTimer !== null) clearTimeout(idleTimer); idleTimer = null; }
  (['title', 'map', 'game'] as Screen[]).forEach((s) => {
    const el = $(`screen-${s}`);
    el.classList.toggle('hidden', s !== screen);
    // Under the iris the circle is the entrance; no extra fade.
    if (s === screen && !irisBusy()) {
      el.classList.remove('entering');
      void el.offsetWidth;
      el.classList.add('entering');
    }
  });
  if (screen === 'map') {
    renderMap(progress, (i) => go(() => startLevel(i)), (k) => { playTap(); speakWorld(k); });
    requestAnimationFrame(scrollToFrontier);
    maybeWelcomeOnMap();
  }
  if (screen === 'title') { renderTitle(); fitTitle(); }
}

/** Move to another screen (or a new level) through the iris transition. */
function go(swap: () => void) { void irisTo(swap); }

/** Shrink the title stage to fit short embeds (never enlarge it). */
function fitTitle() {
  const screen = $('screen-title');
  const stage = screen.querySelector<HTMLElement>('.titleStage');
  if (!stage || screen.classList.contains('hidden')) return;
  const room = screen.clientHeight - 24;
  const roomW = screen.clientWidth - 16;
  const fit = Math.min(1, room / stage.offsetHeight, roomW / stage.offsetWidth);
  screen.style.setProperty('--fit', fit.toFixed(3));
}

// ---------------------------------------------------------------- title

function renderTitle() {
  $('titleCat').innerHTML = mascotSvg(200);
  $('logoPaw').innerHTML = pawSvg('#e0687f', 22);

  const done = solvedCount(progress);
  const allDone = done >= TOTAL_LEVELS;
  const next = levelAt(nextUnsolvedIndex());

  // Simple: "Play" for a new player, then just the level number.
  $('playLabel').textContent =
    done === 0 || !next ? 'Play' : allDone ? 'Play again' : `Level ${next.index + 1}`;
  $('playSub').textContent = '';
  $('playSub').classList.add('hidden');
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

function startLevel(index: number, forceTutorial = false) {
  const ref = levelAt(index);
  if (!ref) return;
  endActiveLevel();
  platform.gameStart(); // only the first call per page load is sent
  activeLevel = index + 1;
  platform.levelStart(activeLevel);
  game = new Game(ref);
  winPending = false;
  press = null;
  lastTap = null;
  renderedLives = -1;
  clearCelebration();

  // The level sits inside its world: same pattern and colours as its map band.
  const world = worldOf(ref.chapterIndex);
  const gameScreen = $('screen-game');
  gameScreen.style.background = worldBackground(world);
  gameScreen.classList.toggle('night', !!world.night);

  $('gameChapter').textContent = ref.chapter.name;
  $('gameLevelNum').textContent = `Level ${ref.index + 1} · ${ref.size}×${ref.size}`;

  closeTip(false);
  stopCoach();
  $('panelTip').classList.toggle('hidden', !ref.tip);

  buildBoard(ref);
  renderBoard();
  refreshHintBadge();
  show('game');

  // Very first launch: the How to Play card opens before level 1 (instead of
  // the world welcome, so there's only one thing to read), then level 1's
  // guided moment. Otherwise: a non-blocking world welcome the first time in
  // a world, and the guided moment on level 1 (once or on request).
  const firstLaunch = ref.index === 0 && !hasSeenIntro(progress, HOWTO_SEEN);
  const needsIntro = !firstLaunch && !hasSeenIntro(progress, ref.chapter.id);
  const tutorial = ref.index < TUTORIAL_LEVELS && (forceTutorial || !hasSeenTip(progress, ref.index));
  // Level tips no longer pop up on their own (they broke the flow); they
  // live in the ☰ menu as "Level tip" for anyone who wants one.
  const next = tutorial ? runTutorial : undefined;
  if (firstLaunch || needsIntro || next) {
    const g = game;
    setTimeout(() => {
      if (game !== g || $('screen-game').classList.contains('hidden') || isTipOpen()) return;
      if (firstLaunch) {
        openFirstHowTo(() => {
          progress = markIntroSeen(markIntroSeen(progress, HOWTO_SEEN), ref.chapter.id);
          saveProgress(progress);
          if (game === g) next?.();
        });
      } else {
        if (needsIntro) welcomeToast(ref.chapterIndex);
        next?.();
      }
    }, 380 + (irisBusy() ? IRIS_OPEN_MS : 0)); // pop-ups wait for the iris to open
  }
  armIdleNudge();
}

/** Seen-marker for the first-launch How to Play card (stored with the world welcomes). */
const HOWTO_SEEN = 'how-to-play';
let afterHowTo: (() => void) | null = null;

function openFirstHowTo(then: () => void) {
  afterHowTo = then;
  $('btnReplayTutorial').classList.add('hidden'); // nothing to replay yet
  $('howToOverlay').classList.remove('hidden');
}

/** Level 1's guided moment with the world's cat. */
function runTutorial() {
  const g = game;
  if (!g) return;
  const index = g.ref.index;
  // Paws appear one after another (a gentle ripple), as one undo step.
  const ripplePaws = (cells: { row: number; col: number }[]) =>
    cells.forEach((p, i) =>
      window.setTimeout(() => {
        if (game !== g || winPending) return;
        if (g.markPaw(p.row, p.col, i === 0)) { playPaw(i); renderBoard(); }
      }, 500 + i * 300)
    );
  startCoach(tutorialSteps(index, { game: g, cell: cellEl, ripplePaws }), {
    coat: worldCoat(g.ref.chapterIndex),
    onDone: () => markTutorialDone(index),
  });
}

// ---------------------------------------------------------------- one-time notes
//
// Hearts and hints explain themselves when they first matter, instead of in
// a tutorial: the first wrong cat ever, and a gentle "Stuck?" after a quiet
// spell on an early level.

const NOTE_HEART = 'note-heart';
const IDLE_MS = 30_000;
const IDLE_LEVELS = 10; // only nudge on the first ten levels
let noteTimer: number | null = null;
let idleTimer: number | null = null;

function showNote(text: string, anchor: Element | null) {
  const note = $('note');
  if (noteTimer !== null) clearTimeout(noteTimer);
  note.textContent = text;
  note.classList.remove('hidden', 'above', 'below');
  const r = anchor?.getBoundingClientRect();
  if (r) {
    const above = r.top > window.innerHeight * 0.5;
    note.classList.add(above ? 'above' : 'below');
    note.style.left = `${Math.min(window.innerWidth - 20, Math.max(20, r.left + r.width / 2))}px`;
    note.style.top = `${above ? r.top - 12 : r.bottom + 12}px`;
  }
  noteTimer = window.setTimeout(hideNote, 4200);
}

function hideNote() {
  if (noteTimer !== null) clearTimeout(noteTimer);
  noteTimer = null;
  $('note').classList.add('hidden');
}

/** Restart the "Stuck?" countdown; called on level start and every move. */
function armIdleNudge() {
  if (idleTimer !== null) clearTimeout(idleTimer);
  idleTimer = null;
  const g = game;
  if (!g || g.ref.index >= IDLE_LEVELS) return;
  idleTimer = window.setTimeout(() => {
    idleTimer = null;
    if (game !== g || winPending || adPlaying || isCoachActive() || isTipOpen()) return;
    if ($('screen-game').classList.contains('hidden') || !$('howToOverlay').classList.contains('hidden')) return;
    showNote('Stuck? Tap Hint for a helping paw', $('btnHint'));
  }, IDLE_MS);
}

function noteFirstWrongCat() {
  if (hasSeenIntro(progress, NOTE_HEART)) return;
  progress = markIntroSeen(progress, NOTE_HEART);
  saveProgress(progress);
  showNote('A wrong cat costs a heart. You have 3!', $('livesRow'));
}

function markTutorialDone(index: number) {
  progress = markTipSeen(progress, index);
  saveProgress(progress);
}

/** The world's own cat welcomes you (typed speech bubble). Marks the intro
 *  as seen when dismissed, then runs `then` (e.g. the level's tip). */
function speakWorld(chapterIndex: number, then?: () => void) {
  const ch = CHAPTERS[chapterIndex];
  if (!ch) return;
  openTip(ch.intro, {
    title: ch.name,
    coat: worldCoat(chapterIndex),
    onClose: () => {
      progress = markIntroSeen(progress, ch.id);
      saveProgress(progress);
      if (then) setTimeout(then, 220);
    },
  });
}

/** Non-blocking world welcome: a small card with the world's cat slides in
 *  at the top, then fades by itself. Taps go straight through to the game
 *  (tapping the card itself just closes it). The full talking bubble is
 *  still there when the player taps a world sign on the map. */
let toastTimer: number | null = null;
function welcomeToast(chapterIndex: number) {
  const ch = CHAPTERS[chapterIndex];
  if (!ch) return;
  progress = markIntroSeen(progress, ch.id);
  saveProgress(progress);
  let el = document.getElementById('worldToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'worldToast';
    el.className = 'worldToast hidden';
    el.setAttribute('role', 'status');
    el.addEventListener('click', hideWelcomeToast);
    document.body.appendChild(el);
  }
  el.innerHTML = `<span class="wtCat" aria-hidden="true">${mascotSvg(44, worldCoat(chapterIndex))}</span>
    <span class="wtText"><b></b><span></span></span>`;
  el.querySelector('b')!.textContent = ch.name;
  el.querySelector('.wtText > span')!.textContent = ch.intro;
  el.classList.remove('hidden', 'out');
  if (toastTimer !== null) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(hideWelcomeToast, 5200);
}

function hideWelcomeToast() {
  if (toastTimer !== null) clearTimeout(toastTimer);
  toastTimer = null;
  const el = document.getElementById('worldToast');
  if (!el || el.classList.contains('hidden')) return;
  el.classList.add('out');
  window.setTimeout(() => { if (el.classList.contains('out')) el.classList.add('hidden'); }, 300);
}

/** On the map, greet the player the first time they reach a new world. */
function maybeWelcomeOnMap() {
  if (solvedCount(progress) >= TOTAL_LEVELS) return;
  const ref = levelAt(nextUnsolvedIndex());
  if (!ref || hasSeenIntro(progress, ref.chapter.id)) return;
  setTimeout(() => {
    if ($('screen-map').classList.contains('hidden') || isTipOpen()) return;
    welcomeToast(ref.chapterIndex);
  }, 450 + (irisBusy() ? IRIS_OPEN_MS : 0));
}

function showLevelTip() {
  const ref = game?.ref;
  if (!ref?.tip) return;
  openTip(ref.tip, {
    onClose: () => {
      progress = markTipSeen(progress, ref.index);
      saveProgress(progress);
    },
  });
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
      // Stagger idle breathing and blinks so cats aren't all in sync
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
      // One tab stop for the whole board; arrow keys move between squares.
      cell.tabIndex = r === 0 && c === 0 ? 0 : -1;
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'c' || e.key === 'C') { e.preventDefault(); placeCat(r, c, true); return; }
        const move: Record<string, [number, number]> = {
          ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
        };
        let nr = r;
        let nc = c;
        if (move[e.key]) { nr = r + move[e.key][0]; nc = c + move[e.key][1]; }
        else if (e.key === 'Home') nc = 0;
        else if (e.key === 'End') nc = ref.size - 1;
        else return;
        e.preventDefault();
        nr = Math.max(0, Math.min(ref.size - 1, nr));
        nc = Math.max(0, Math.min(ref.size - 1, nc));
        const next = cellEl(nr, nc);
        if (!next) return;
        cell.tabIndex = -1;
        next.tabIndex = 0;
        next.focus();
      });
      board.appendChild(cell);
    }
  }
}

function cellEl(r: number, c: number): HTMLElement | null {
  return $('board').querySelector<HTMLElement>(`[data-r="${r}"][data-c="${c}"]`);
}

function heartSvg(full: boolean, cls = ''): string {
  return `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path d="M12 20.5s-7.5-4.6-7.5-9.6a4.4 4.4 0 0 1 7.5-3.1 4.4 4.4 0 0 1 7.5 3.1c0 5-7.5 9.6-7.5 9.6Z"
      fill="${full ? '#e7908c' : 'none'}"
      stroke="${full ? '#e7908c' : '#d4bfb7'}"
      stroke-width="1.8"/>
  </svg>`;
}

/** `lostHeart` is the index of the heart that was just lost, if any: it gets
 *  a pop-and-drop animation on top of its empty outline. */
function renderBoard(lostHeart?: number) {
  const g = game!;
  const size = g.size;
  // SVG sizes are nominal; CSS scales cats, dead cats and paws to the cell.

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const el = cellEl(r, c);
      if (!el) continue;
      const mark = g.marks[r][c];

      if (mark === 'cat') {
        if (!el.querySelector('.catWrap')) {
          el.classList.remove('wrong-cell');
          el.innerHTML = `<span class="catWrap">${mascotSvg(100, pastel(g.regionAt(r, c)).coat)}</span>`;
        }
      } else if (mark === 'wrong') {
        if (!el.querySelector('.wrongWrap')) {
          el.innerHTML = `<span class="wrongWrap">${deadCatSvg(100)}</span>`;
          el.classList.add('wrong-cell');
        }
      } else if (mark === 'paw') {
        if (!el.querySelector('.pawWrap')) {
          el.classList.remove('wrong-cell');
          const tone = pastel(g.regionAt(r, c));
          el.innerHTML = `<span class="pawWrap">${pawSvg(tone.ink, 24)}</span>`;
        }
      } else {
        if (el.innerHTML !== '') {
          el.innerHTML = '';
          el.classList.remove('wrong-cell');
        }
      }
    }
  }

  // Hearts HUD in the header. Only rebuilt when the count changes.
  if (lostHeart !== undefined || g.livesRemaining !== renderedLives) {
    renderedLives = g.livesRemaining;
    $('livesRow').innerHTML = Array.from({ length: MAX_LIVES }, (_, i) =>
      i === lostHeart
        ? `<span class="heart empty losing">${heartSvg(false)}${heartSvg(true, 'heartGhost')}</span>`
        : `<span class="heart ${i < g.livesRemaining ? 'full' : 'empty'}">${heartSvg(i < g.livesRemaining)}</span>`
    ).join('');
  }

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
  /** Paws painted so far in this stroke (drives the rising paw pitch). */
  strokeCells: number;
} | null = null;
/** Last single tap, so a fast second tap on the same cell becomes a cat. */
let lastTap: { r: number; c: number; time: number } | null = null;

/** Empty -> paw, paw -> empty. Returns null on a resolved (cat/dead) cell. */
function togglePaw(r: number, c: number): 'paw' | 'cleared' | null {
  const g = game!;
  let result: 'paw' | 'cleared';
  if (g.markPaw(r, c)) { playPaw(); result = 'paw'; coachNotify({ type: 'paw', r, c }); }
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

/** Gentle sideways shake on a cell (a wrong cat). */
function shakeCell(r: number, c: number) {
  const el = cellEl(r, c);
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth; // restart the animation if it's already running
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 320);
}

function placeCat(r: number, c: number, recordUndo: boolean) {
  const g = game;
  if (!g || winPending) return;
  const result = g.placeCat(r, c, recordUndo);
  if (result === 'already-filled') return;

  if (result === 'correct') {
    renderBoard();
    playCat(g.correctCount());
    coachNotify({ type: 'cat', r, c });
    if (g.isSolved()) finishLevel();
  } else {
    // livesRemaining now equals the index of the heart just lost.
    renderBoard(g.livesRemaining);
    if (!g.outOfLives) noteFirstWrongCat();
    shakeCell(r, c);
    playUnhappy();
    // On the last heart the fail modal plays its own sigh; skip the heart
    // sound so the two don't overlap.
    if (!g.outOfLives) playHeartLost();
    if (g.outOfLives) {
      winPending = true;
      setTimeout(showFailModal, 480);
    }
  }
}

function onTap(r: number, c: number) {
  if (!game || winPending) return;
  armIdleNudge();
  const now = performance.now();
  const prev = lastTap;
  lastTap = null;

  if (prev && prev.r === r && prev.c === c && now - prev.time <= DOUBLE_TAP_MS) {
    // The first tap already pushed an undo step holding the pre-tap state;
    // fold the cat into it.
    placeCat(r, c, false);
    return;
  }
  // Any tap that changed the square arms a double-tap: on a paw the first tap
  // lifts it and the second places the cat (one undo step, like an empty one).
  if (togglePaw(r, c)) lastTap = { r, c, time: now };
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
    playPaw(press.strokeCells++); // pitch climbs per cell, resets per stroke
    renderBoard();
    coachNotify({ type: 'paw', r, c });
    armIdleNudge();
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
      dragging: false, painted: false, strokeCells: 0,
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

/** Tell the platform the current level attempt is over (won, lost, or left). */
function endActiveLevel() {
  if (activeLevel === null) return;
  platform.levelEnd(activeLevel);
  activeLevel = null;
}

function showFailModal() {
  playOutOfLives();
  // One revive per attempt; after that it's "Start over" or the map.
  const canRevive = !!game && !game.revived;
  const revive = $('btnFailRevive') as HTMLButtonElement;
  revive.classList.toggle('hidden', !canRevive);
  revive.disabled = false;
  $('failReviveLabel').textContent = subscriber ? 'Keep going (1 more heart)' : 'Watch a video for 1 more heart';
  $('btnFailRetry').classList.toggle('primary', !canRevive);
  $('failText').textContent = canRevive
    ? 'Keep your progress on this board with one more heart, or start the puzzle over.'
    : 'The cats need a little more coaxing. Start the puzzle over?';
  $('failOverlay').classList.remove('hidden');
}

// ---------------------------------------------------------------- rewarded ads

/** Minimum gap between interstitials. Any video counts as "the last ad",
 *  rewarded ones included, and the clock starts at page load because the
 *  Arena already shows its own preroll before the game. */
const INTERSTITIAL_GAP_MS = 5 * 60 * 1000;
let lastAdAt = Date.now();

/** After a win, on the way to the next screen: an interstitial if 5 minutes
 *  have passed since the last ad. Never for subscribers. */
async function maybeInterstitial() {
  if (subscriber || adPlaying || Date.now() - lastAdAt < INTERSTITIAL_GAP_MS) return;
  adPlaying = true;
  setAudioHold('ad', true);
  try {
    await platform.showInterstitialAd();
  } finally {
    lastAdAt = Date.now();
    setAudioHold('ad', false);
    adPlaying = false;
  }
}

/** Plays a rewarded video (skipped for subscribers). Resolves true if earned.
 *  Audio and animations pause while the video is up. */
async function earnReward(): Promise<boolean> {
  if (subscriber) return true;
  if (adPlaying) return false;
  adPlaying = true;
  setAudioHold('ad', true);
  try {
    return await platform.showRewardAd();
  } finally {
    lastAdAt = Date.now();
    setAudioHold('ad', false);
    adPlaying = false;
  }
}

function refreshHintBadge() {
  const left = freeHintsLeft();
  const badge = $('hintBadge');
  const btn = $('btnHint');
  if (subscriber) {
    badge.innerHTML = '';
    btn.setAttribute('aria-label', 'Hint');
  } else if (left > 0) {
    badge.textContent = String(left);
    btn.setAttribute('aria-label', `Hint, ${left} of ${FREE_HINTS_PER_DAY} free left today`);
  } else {
    badge.innerHTML = '<svg class="icon"><use href="#i-video"/></svg>';
    btn.setAttribute('aria-label', 'Hint, watch a video for one more');
  }
}

/** Places one correct cat for free and lights it up. */
function applyHint() {
  if (!game) return;
  const spot = game.hint();
  if (!spot) return;
  playHint(); renderBoard();
  coachNotify({ type: 'cat', r: spot.row, c: spot.col });
  const el = cellEl(spot.row, spot.col);
  if (el) { el.classList.add('hintGlow'); setTimeout(() => el.classList.remove('hintGlow'), 2300); }
  if (game.isSolved()) finishLevel();
}

function onHintPressed() {
  if (!game || winPending || adPlaying) return;
  lastTap = null;
  if (subscriber || useFreeHint()) {
    applyHint();
    refreshHintBadge();
    return;
  }
  $('hintAdCat').innerHTML = mascotSvg(96);
  $('hintAdOverlay').classList.remove('hidden');
}

async function watchForHint() {
  const btn = $('btnHintAdWatch') as HTMLButtonElement;
  btn.disabled = true;
  const g = game;
  const earned = await earnReward();
  btn.disabled = false;
  $('hintAdOverlay').classList.add('hidden');
  if (earned && g && game === g && !winPending) applyHint();
}

async function watchForRevive() {
  const btn = $('btnFailRevive') as HTMLButtonElement;
  btn.disabled = true;
  const g = game;
  const earned = await earnReward();
  btn.disabled = false;
  if (!earned || !g || game !== g) {
    $('failText').textContent = 'The video didn’t finish, so no hearts this time. Watch it again, or start the puzzle over.';
    return;
  }
  g.revive();
  renderedLives = -1;
  winPending = false;
  $('failOverlay').classList.add('hidden');
  renderBoard();
  playCat(g.correctCount() || 1);
}

// ---------------------------------------------------------------- win moment
//
//  0.00s  last cat lands (its bell is the last note of the board's tune);
//         paws fade out
//  0.20s  cats hop in a diagonal wave, one jingle note per hop
//  0.55s  paw-print confetti bursts from the board
//  1.45s  win modal opens; confetti is cleaned up just after

const WIN_WAVE_START = 0.2; // s
const WIN_WAVE_SPAN = 0.6; // s from first hop to last hop
const WIN_CONFETTI_MS = 550;
const WIN_MODAL_MS = 1450;
const CONFETTI_TINTS = ['#ffb38a', '#b9a3f0', '#8fd6a8', '#8fc8f5', '#ff9db0', '#f5d76e'];

function clearCelebration() {
  winTimers.forEach((t) => clearTimeout(t));
  winTimers = [];
  $('board').classList.remove('celebrate');
  document.querySelectorAll('.confetti, .catHeart').forEach((n) => n.remove());
  $('winFx').innerHTML = '';
}

/** Starts the on-board wave; returns its timing for the jingle. */
function celebrateBoard(g: Game): { step: number; count: number } {
  const cats = g.board.solution
    .slice()
    .sort((a, b) => a.row + a.col - (b.row + b.col) || a.row - b.row);
  const count = cats.length;
  const step = count > 1 ? Math.min(0.12, WIN_WAVE_SPAN / (count - 1)) : 0;
  cats.forEach((p, i) =>
    cellEl(p.row, p.col)?.style.setProperty('--d', `${(WIN_WAVE_START + i * step).toFixed(3)}s`)
  );
  $('board').classList.add('celebrate');
  winTimers.push(window.setTimeout(burstConfetti, WIN_CONFETTI_MS));
  // As each cat lands its hop, a little heart floats up from it.
  cats.forEach((p, i) =>
    winTimers.push(window.setTimeout(() => {
      const cell = cellEl(p.row, p.col);
      if (!cell) return;
      const h = document.createElement('span');
      h.className = 'catHeart';
      h.setAttribute('aria-hidden', 'true');
      h.innerHTML = heartSvg(true);
      cell.appendChild(h);
    }, (WIN_WAVE_START + i * step + 0.15) * 1000))
  );
  return { step, count };
}

/** A four-point twinkle star, for glitter. */
function sparkleSvg(color: string, size: number): string {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">
    <path d="M12 1 Q13.4 10.6 23 12 Q13.4 13.4 12 23 Q10.6 13.4 1 12 Q10.6 10.6 12 1 Z" fill="${color}"/>
  </svg>`;
}

/** Glitter and paw prints for the win card: a burst from the card's centre,
 *  then a few slow risers. Purrfect wins get gold and more of it. */
function fillWinFx(purrfect: boolean) {
  const tints = purrfect
    ? ['#ffd35c', '#ffe9a3', '#ffb84d', '#ff9db0', '#fff6d6']
    : ['#ff9db0', '#c9b6ff', '#9fd8ff', '#a0e7b4', '#ffd6a5'];
  const burst = purrfect ? 28 : 18;
  const parts: string[] = [];
  for (let i = 0; i < burst; i++) {
    const a = i * 2.39996;
    const d = 140 + ((i * 37) % 120);
    const size = 12 + ((i * 7) % 14);
    const art = i % 3 === 0 ? pawSvg(tints[i % tints.length], size) : sparkleSvg(tints[i % tints.length], size);
    parts.push(`<span class="fxBurst" style="--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d * 0.8)}px;--rot:${(i * 47) % 180 - 90}deg;animation-delay:${((i % 5) * 0.03).toFixed(2)}s">${art}</span>`);
  }
  for (let i = 0; i < (purrfect ? 12 : 7); i++) {
    const size = 14 + ((i * 5) % 12);
    const art = i % 2 ? pawSvg(tints[i % tints.length], size) : sparkleSvg(tints[i % tints.length], size);
    parts.push(`<span class="fxRise" style="left:${(8 + ((i * 29) % 84))}%;animation-duration:${(5 + (i % 4)).toFixed(1)}s;animation-delay:${(0.4 + i * 0.35).toFixed(2)}s">${art}</span>`);
  }
  $('winFx').innerHTML = parts.join('');
}

/** Pastel paw prints flying out from the middle of the board. */
function burstConfetti() {
  const wrap = $('board').parentElement;
  if (!wrap) return;
  const w = wrap.clientWidth;
  const host = document.createElement('div');
  host.className = 'confetti';
  host.setAttribute('aria-hidden', 'true');
  host.innerHTML = Array.from({ length: 24 }, (_, i) => {
    const angle = i * 2.39996; // golden angle spreads them evenly
    const dist = w * (0.24 + ((i * 7) % 5) * 0.05);
    const dx = Math.round(Math.cos(angle) * dist);
    const dy = Math.round(Math.sin(angle) * dist * 0.85 + w * 0.06); // a little gravity
    const size = 16 + ((i * 5) % 12);
    const rot = ((i * 53) % 120) - 60;
    const delay = ((i % 4) * 0.04).toFixed(2);
    return `<span style="--dx:${dx}px;--dy:${dy}px;--rot:${rot}deg;margin:${-size / 2}px 0 0 ${-size / 2}px;animation-delay:${delay}s">
      ${i % 3 === 0
        ? sparkleSvg(CONFETTI_TINTS[i % CONFETTI_TINTS.length], size * 0.8)
        : pawSvg(CONFETTI_TINTS[i % CONFETTI_TINTS.length], size)}
    </span>`;
  }).join('');
  wrap.appendChild(host);
  winTimers.push(window.setTimeout(() => host.remove(), 1200));
}

function finishLevel() {
  const g = game!;
  winPending = true; // blocks all board input until the next level starts
  // Solved before the tutorial's last step: it's done, quietly.
  if (isCoachActive()) { stopCoach(true); markTutorialDone(g.ref.index); }
  clearCelebration();
  const { step, count } = celebrateBoard(g);
  playWin(WIN_WAVE_START, step, count);

  progress = recordWin(progress, g.ref.index, g.isPurrfect, TOTAL_LEVELS);
  saveProgress(progress);

  endActiveLevel();
  // Score for Arena leaderboards: 10 per solved level, +5 per purrfect.
  platform.score(solvedCount(progress) * 10 + cleanCount(progress) * 5);
  // Every level solved: no more content to play this session.
  if (solvedCount(progress) >= TOTAL_LEVELS) platform.gameEnd();

  const isLast = g.ref.index >= TOTAL_LEVELS - 1;
  const purrfect = g.isPurrfect;
  const noHints = !g.usedHint;
  const flawless = g.livesLost === 0 && !g.revived;
  $('winModal').classList.toggle('purrfect', purrfect);
  $('winCat').innerHTML = mascotSvg(96, worldCoat(g.ref.chapterIndex));
  $('winMedal').innerHTML = purrfect ? medalSvg(34) : '';
  // Letters bounce in one after another.
  const title = purrfect ? 'Purrfect!' : 'All cosy!';
  $('winTitle').setAttribute('aria-label', title);
  $('winTitle').innerHTML = [...title]
    .map((ch, i) => `<span aria-hidden="true" style="animation-delay:${(0.15 + i * 0.045).toFixed(3)}s">${ch === ' ' ? '&nbsp;' : ch}</span>`)
    .join('');
  const chips: string[] = [];
  if (noHints) chips.push(`<span class="winChip${purrfect ? ' gold' : ''}">${medalSvg(14)}No hints</span>`);
  if (flawless) chips.push(`<span class="winChip${purrfect ? ' gold' : ''}">${heartSvg(true)}No hearts lost</span>`);
  $('winChips').innerHTML = chips.join('');
  $('winText').textContent = isLast
    ? 'Every cat in the game has found its spot. Thanks for playing!'
    : purrfect
      ? 'Not a single slip. The cats are very impressed.'
      : noHints
        ? 'Solved all on your own! Keep every heart for a Purrfect.'
        : 'Every cat has a spot of its own.';
  ($('btnWinNext') as HTMLButtonElement).classList.toggle('hidden', isLast);

  winTimers.push(window.setTimeout(() => {
    // Skip if the player has left this board during the celebration.
    if (game === g && !$('screen-game').classList.contains('hidden')) {
      fillWinFx(purrfect);
      $('winOverlay').classList.remove('hidden');
    }
  }, WIN_MODAL_MS));
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
  // Every square the two cats rule out: their rows, columns, patches and the
  // squares touching them. That leaves 3 open squares for the other two cats.
  const blocked = new Set(['0,0', '0,2', '0,3', '1,0', '1,1', '1,2', '2,1', '2,2', '2,3', '3,0', '3,1']);

  let html = '';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const tone = pastel(regions[r][c]);
      const key = `${r},${c}`;
      const inner = cats.has(key)
        ? mascotSvg(26, tone.coat)
        : blocked.has(key)
          ? `<span class="no">${pawSvg(tone.ink, 14)}</span>`
          : '';
      html += `<div style="background:${tone.fill}">${inner}</div>`;
    }
  }
  $('demoBoard').innerHTML = html;

  // Rule icon for "cats never touch": two cat faces corner to corner, crossed out.
  const face = (x: number, y: number, coat: Coat) => mascotSvg(18, coat).replace('<svg ', `<svg x="${x}" y="${y}" `);
  $('htTouchIcon').innerHTML = `<svg viewBox="0 0 32 32" aria-hidden="true">
    <rect x="1" y="1" width="30" height="30" rx="6" fill="#fff4e6" stroke="#e8d9cc" stroke-width="1.5"/>
    <line x1="16" y1="1.5" x2="16" y2="30.5" stroke="#e8d9cc" stroke-width="1.2"/>
    <line x1="1.5" y1="16" x2="30.5" y2="16" stroke="#e8d9cc" stroke-width="1.2"/>
    ${face(-1, -1, COATS.lilac)}${face(15, 15, COATS.ginger)}
    <circle cx="16" cy="16" r="6.5" fill="#fff" stroke="#e0687f" stroke-width="2.4"/>
    <line x1="11.6" y1="20.4" x2="20.4" y2="11.6" stroke="#e0687f" stroke-width="2.4" stroke-linecap="round"/>
  </svg>`;
}

// ---------------------------------------------------------------- sound

/** Speaker buttons (title, map). In a level the menu button opens the same
 *  panel with the level tip and How to Play added on top. */
const SOUND_BUTTONS = ['btnSoundTitle', 'btnSoundMap'];

function refreshSoundButtons() {
  const on = sfxEnabled() || musicEnabled();
  ($('tglMusic')).setAttribute('aria-pressed', String(musicEnabled()));
  ($('tglSfx')).setAttribute('aria-pressed', String(sfxEnabled()));
  SOUND_BUTTONS.forEach((id) => {
    const btn = $(id);
    btn.title = 'Sound settings';
    btn.setAttribute('aria-label', 'Sound settings');
    btn.setAttribute('aria-haspopup', 'dialog');
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
  const index = game.ref.index;
  go(() => { $('failOverlay').classList.add('hidden'); startLevel(index); });
}

function init() {
  seedTitleFloat();
  renderDemoBoard();
  refreshSoundButtons();
  renderTitle();

  wireIris();
  $('btnPlay').addEventListener('click', () => { playTap(); go(() => startLevel(nextUnsolvedIndex())); });
  $('btnMap').addEventListener('click', () => { playTap(); go(() => show('map')); });

  document.querySelectorAll<HTMLElement>('[data-nav]').forEach((el) =>
    el.addEventListener('click', () => { playTap(); go(() => show(el.dataset.nav as Screen)); })
  );

  // How-to modal
  const openHowTo = () => { playTap(); $('howToOverlay').classList.remove('hidden'); };
  $('btnHowTo').addEventListener('click', openHowTo);


  // Level tip (the cat's speech bubble)
  wireTip();

  $('btnHowToClose').addEventListener('click', () => {
    playTap();
    $('howToOverlay').classList.add('hidden');
    $('btnReplayTutorial').classList.remove('hidden');
    const then = afterHowTo;
    afterHowTo = null;
    then?.();
  });
  // Replays level 1 with the guided steps (progress is unaffected).
  $('btnReplayTutorial').addEventListener('click', () => {
    playTap();
    $('howToOverlay').classList.add('hidden');
    $('failOverlay').classList.add('hidden');
    $('winOverlay').classList.add('hidden');
    go(() => startLevel(0, true));
  });

  // Tutorial coach and one-time notes
  wireCoach();
  $('note').addEventListener('click', hideNote);

  // Board controls
  wireBoardInput();
  $('btnUndo').addEventListener('click', () => {
    if (!game || winPending) return;
    lastTap = null;
    game.undo(); playLift(); renderBoard();
  });
  // Start over: first tap arms it ("Sure?"), a second tap within 3s clears
  // the board. Still undoable, and lost hearts stay lost as before.
  let resetArmed: number | null = null;
  const disarmReset = () => {
    if (resetArmed !== null) clearTimeout(resetArmed);
    resetArmed = null;
    $('btnReset').classList.remove('armed');
    $('btnReset').setAttribute('aria-label', 'Start over');
  };
  $('btnReset').addEventListener('click', () => {
    if (!game || winPending) return;
    lastTap = null;
    if (resetArmed === null) {
      playTap();
      $('btnReset').classList.add('armed');
      $('btnReset').setAttribute('aria-label', 'Tap again to clear the board');
      resetArmed = window.setTimeout(disarmReset, 3000);
      return;
    }
    disarmReset();
    game.reset(); playLift(); renderBoard();
  });
  $('btnHint').addEventListener('click', onHintPressed);
  $('btnHintAdWatch').addEventListener('click', () => { playTap(); void watchForHint(); });
  $('btnHintAdCancel').addEventListener('click', () => { playTap(); $('hintAdOverlay').classList.add('hidden'); });

  // Fail modal — inject sad mascot on open
  $('btnFailRevive').addEventListener('click', () => { playTap(); void watchForRevive(); });
  $('btnFailRetry').addEventListener('click', () => { playTap(); retryLevel(); });
  $('btnFailMap').addEventListener('click', () => {
    playTap(); go(() => { $('failOverlay').classList.add('hidden'); show('map'); });
  });
  // Pre-populate the fail cat now so it's ready
  const failCatEl = document.getElementById('failCat');
  if (failCatEl) failCatEl.innerHTML = mascotSvg(96);

  // Win modal
  // Leaving the win screen is the natural break for an interstitial.
  $('btnWinNext').addEventListener('click', async () => {
    if (adPlaying) return;
    playTap(); $('winOverlay').classList.add('hidden');
    await maybeInterstitial();
    const next = (game?.ref.index ?? 0) + 1;
    go(() => { if (next < TOTAL_LEVELS) startLevel(next); else show('map'); });
  });
  $('btnWinMap').addEventListener('click', async () => {
    if (adPlaying) return;
    playTap(); $('winOverlay').classList.add('hidden');
    await maybeInterstitial();
    go(() => show('map'));
  });

  // Sound: each speaker button opens a small panel with Music and Sounds.
  const panel = $('soundPanel');
  let panelOpener: HTMLElement | null = null;
  const closePanel = () => {
    if (panel.classList.contains('hidden')) return;
    panel.classList.add('hidden');
    panelOpener?.setAttribute('aria-expanded', 'false');
    panelOpener?.focus({ preventScroll: true });
    panelOpener = null;
  };
  [...SOUND_BUTTONS, 'btnMenuGame'].forEach((id) =>
    $(id).addEventListener('click', (e) => {
      e.stopPropagation();
      const btn = $(id);
      if (panelOpener === btn) { closePanel(); return; }
      playTap();
      // In a level the panel also offers the tip and How to Play.
      const inGame = id === 'btnMenuGame';
      $('panelGame').classList.toggle('hidden', !inGame);
      panel.setAttribute('aria-label', inGame ? 'Menu' : 'Sound settings');
      const r = btn.getBoundingClientRect();
      panel.style.top = `${Math.round(r.bottom + 8)}px`;
      panel.style.right = `${Math.max(8, Math.round(window.innerWidth - r.right))}px`;
      panel.classList.remove('hidden');
      panelOpener = btn;
      btn.setAttribute('aria-expanded', 'true');
      const first = inGame && !$('panelTip').classList.contains('hidden') ? 'panelTip' : inGame ? 'panelHowTo' : 'tglMusic';
      $(first).focus({ preventScroll: true });
    })
  );
  $('panelTip').addEventListener('click', () => { closePanel(); playTap(); showLevelTip(); });
  $('panelHowTo').addEventListener('click', () => { closePanel(); openHowTo(); });
  $('tglMusic').addEventListener('click', () => { setMusicEnabled(!musicEnabled()); refreshSoundButtons(); playTap(); });
  $('tglSfx').addEventListener('click', () => { setSfxEnabled(!sfxEnabled()); refreshSoundButtons(); playTap(); });
  panel.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', closePanel);
  window.addEventListener('resize', closePanel);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });

  // Audio may only start after the first interaction; this also starts the
  // music when effects are muted.
  const unlock = () => {
    unlockAudio();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if ($('screen-game').classList.contains('hidden')) return;
    if (isTipOpen()) return; // the tip handles its own keys
    if (e.key === 'r' || e.key === 'R') $('btnReset').click();
    if (e.key === 'z' || e.key === 'Z') $('btnUndo').click();
    if (e.key === 'h' || e.key === 'H') $('btnHint').click();
  });

  // Signing in mid-session: merge their cloud save with this device's, then
  // redraw whatever screen is showing. Signing out just stops cloud saves.
  platform.onAuthChange((signedIn) => {
    if (!signedIn) { setSignedOut(); return; }
    void (async () => {
      await resyncStorage();
      progress = loadProgress();
      loadSoundPref();
      subscriber = await platform.isSubscriber();
      refreshSoundButtons();
      refreshHintBadge();
      if (!$('screen-title').classList.contains('hidden')) renderTitle();
      if (!$('screen-map').classList.contains('hidden')) show('map');
    })();
  });

  // The Arena can pause the game (e.g. for its own overlays).
  platform.onPause(() => { document.body.classList.add('paused'); setAudioHold('paused', true); });
  platform.onResume(() => { document.body.classList.remove('paused'); setAudioHold('paused', false); });

  // The Arena resizes the embed with the window: keep the title fitted. The
  // board and map size themselves in CSS.
  window.addEventListener('resize', fitTitle);
  void document.fonts?.ready.then(fitTitle); // the web font changes text sizes

  show('title');
}

/** Connect to the platform and load saved data before anything is drawn,
 *  then tell the Arena the game is ready to be shown. */
async function boot() {
  console.info(`KittyDoku v${GAME_VERSION}`);
  platform = await createPlatform();
  await initStorage(platform);
  loadSoundPref();
  progress = loadProgress();
  subscriber = await platform.isSubscriber();
  init();
  platform.ready();
}

void boot();
