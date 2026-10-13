import { playTap } from '../audio/sound';
import { mascotSvg, type Coat } from '../render/art';

/**
 * Tutorial coach, "show, don't tell":
 *  - the screen dims except one hole around the thing to use (and only that
 *    thing can be tapped), with a pulsing ring on it;
 *  - an animated paw acts out the gesture (tap, double-tap, drag);
 *  - a caption of a few words sits right next to it, no typing effect;
 *  - steps move on by themselves: when the player does the thing, after a
 *    short moment, or on a tap. A small "Skip" stays in the corner.
 */

export type CoachEvent = { type: 'cat' | 'paw'; r: number; c: number };
export type Gesture = 'tap' | 'double' | 'drag';

export interface CoachStep {
  caption: string;
  /** What to point at; omit for a caption over the board. */
  target?: () => Element | null;
  /** Dim everything else and only let the target be tapped. */
  dim?: boolean;
  /** Animated paw acting out what to do. */
  gesture?: Gesture;
  /** Leave the step when the player does this (return true). */
  until?: (e: CoachEvent) => boolean;
  /** Otherwise leave after this long (ms); tapping also moves on. */
  hold?: number;
  /** Runs when the step appears (e.g. paws rippling across the board). */
  onEnter?: () => void;
  /** Smaller explanation under the caption. */
  sub?: string;
  /** Board squares the player should act on: they glow, the rest of the
   *  board dims. Re-read after every action, so finished ones stop glowing. */
  marks?: () => Element[];
  /** Squares to keep bright (not dimmed) during a marks step, e.g. the cat. */
  keep?: () => Element[];
  /** Shown as "N left" next to the caption. */
  counter?: () => number;
  /** Skip this step when its situation hasn't come up. */
  skipIf?: () => boolean;
  /** Caption worked out when the step appears (after `target`). */
  captionFn?: () => string;
  /** Longest text `captionFn` can produce, used to size the dock up front. */
  sizeHint?: string;
}

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let steps: CoachStep[] = [];
let index = -1;
let onDoneCb: (() => void) | null = null;
let holdTimer: number | null = null;
let current: Element | null = null;

export function isCoachActive(): boolean {
  return index >= 0;
}

function clearHold() {
  if (holdTimer !== null) clearTimeout(holdTimer);
  holdTimer = null;
}

/** Place the ring and the paw on the current target. The words live in the
 *  dock under the board (see show()), so nothing floats over the board. */
function layout() {
  const s = steps[index];
  if (!s) return;
  const dim = $('coachDim');
  const ring = $('coachRing');
  const hand = $('coachHand');
  const el = current;

  if (!el || s.marks) {
    dim.classList.add('hidden');
    ring.classList.add('hidden');
    hand.classList.add('hidden');
    return;
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const r = el.getBoundingClientRect();
  const pad = 4;
  const L = Math.max(0, r.left - pad);
  const T = Math.max(0, r.top - pad);
  const R = Math.min(vw, r.right + pad);
  const B = Math.min(vh, r.bottom + pad);

  dim.classList.toggle('hidden', !s.dim);
  dim.style.clipPath =
    `polygon(0 0, ${vw}px 0, ${vw}px ${vh}px, 0 ${vh}px, 0 0, ` +
    `${L}px ${T}px, ${L}px ${B}px, ${R}px ${B}px, ${R}px ${T}px, ${L}px ${T}px)`;

  ring.classList.remove('hidden');
  Object.assign(ring.style, { left: `${L}px`, top: `${T}px`, width: `${R - L}px`, height: `${B - T}px` });

  hand.classList.toggle('hidden', !s.gesture);
  hand.dataset.gesture = s.gesture ?? '';
  hand.style.left = `${r.left + r.width * 0.55}px`;
  hand.style.top = `${r.top + r.height * 0.55}px`;
}

/** Fill the dock with one step's words (caption, sub, counter). */
function fillDock(caption: string, sub: string | undefined, count: string) {
  $('coachCaption').textContent = caption;
  $('coachSub').textContent = sub ?? '';
  $('coachSub').classList.toggle('hidden', !sub);
  $('coachCount').textContent = count;
  $('coachCount').classList.toggle('hidden', !count);
}

/** The board is sized by the room left under it, so a dock that grows or
 *  shrinks between steps would make the board jump. Measure every step's
 *  words once and hold the dock at the tallest, so the board stays put. */
function lockDockHeight() {
  const dock = $('coachDock');
  dock.style.minHeight = '';
  let tallest = 0;
  for (const s of steps) {
    fillDock(s.sizeHint || s.caption, s.sub, s.counter ? '99 left' : '');
    tallest = Math.max(tallest, dock.offsetHeight);
  }
  dock.style.minHeight = `${tallest}px`;
}

/** Measure again once the board has resized around the dock. */
function relayout() {
  requestAnimationFrame(() => requestAnimationFrame(layout));
}

/** Glow the squares still to do, dim the rest of the board. */
function paintMarks() {
  const s = steps[index];
  document.querySelectorAll('.coachMark, .coachKeep').forEach((n) => n.classList.remove('coachMark', 'coachKeep'));
  const board = document.getElementById('board');
  board?.classList.toggle('coachFocus', !!s?.marks);
  if (!s?.marks) return;
  s.marks().forEach((n) => n.classList.add('coachMark'));
  s.keep?.().forEach((n) => n.classList.add('coachKeep'));
  const n = s.counter?.();
  $('coachCount').textContent = n ? `${n} left` : '';
  $('coachCount').classList.toggle('hidden', !n);
}

function show(i: number) {
  clearHold();
  index = i;
  const s = steps[i];
  if (!s) { finish(); return; }
  if (s.skipIf?.()) { show(i + 1); return; }
  current = s.target?.() ?? null;
  fillDock(s.captionFn?.() || s.caption, s.sub, '');
  paintMarks();

  // The cat "says" each new line: the bubble pops, the cat bobs.
  const dock = $('coachDock');
  dock.classList.remove('pop');
  void dock.offsetWidth;
  dock.classList.add('pop');

  s.onEnter?.();
  // Let the board settle (a cat landing, the dock resizing it) before measuring.
  relayout();
  if (current instanceof HTMLElement && current.classList.contains('cell')) {
    current.tabIndex = 0;
    current.focus({ preventScroll: true });
  }
  if (!s.until) holdTimer = window.setTimeout(() => next(), s.hold ?? 3200);
}

function next() {
  if (index < 0) return;
  show(index + 1);
}

function finish() {
  const cb = onDoneCb;
  stopCoach(true);
  cb?.();
}

const boardWrap = () => document.querySelector<HTMLElement>('#screen-game .boardWrap');

/** Let the board size itself from the free space again. */
function unfreezeBoard() {
  const wrap = boardWrap();
  if (wrap) wrap.style.flex = '';
}

export function startCoach(script: CoachStep[], opts: { onDone?: () => void; coat?: Coat } = {}) {
  stopCoach();
  if (!script.length) return;
  steps = script;
  onDoneCb = opts.onDone ?? null;
  $('coachDockCat').innerHTML = mascotSvg(56, opts.coat);
  $('coach').classList.remove('hidden');
  $('coach').classList.toggle('still', reducedMotion());
  // The dock takes the buttons' place under the board while it talks.
  $('coachDock').classList.remove('hidden');
  $('screen-game').classList.add('coaching');
  lockDockHeight();
  show(0);
}

/** Hide without running onDone (e.g. leaving the level).
 *  `keepBoard`: the player stays on this board (the tutorial just ended, or
 *  they solved it), so hold the board at its size while the buttons take the
 *  dock's place, instead of it jumping mid-play or mid-celebration. Starting
 *  any level (or leaving) releases it. */
export function stopCoach(keepBoard = false) {
  const wasActive = index >= 0;
  const wrap = boardWrap();
  const before = wrap?.clientHeight ?? 0;
  if (!keepBoard) unfreezeBoard();
  clearHold();
  document.querySelectorAll('.coachMark, .coachKeep').forEach((n) => n.classList.remove('coachMark', 'coachKeep'));
  document.getElementById('board')?.classList.remove('coachFocus');
  index = -1;
  steps = [];
  current = null;
  onDoneCb = null;
  $('coach').classList.add('hidden');
  $('coachDock').classList.add('hidden');
  $('coachDock').style.minHeight = '';
  $('screen-game').classList.remove('coaching');
  if (keepBoard && wasActive && wrap && before > 0) {
    // Same frame, before any paint: measure the natural size with the
    // buttons back, and keep the smaller of the two (never overflow).
    const after = wrap.clientHeight;
    wrap.style.flex = `0 0 ${Math.min(before, after)}px`;
  }
}

/** The game reports what the player did; a waiting step may move on. */
export function coachNotify(e: CoachEvent) {
  if (index < 0) return;
  const s = steps[index];
  if (s?.marks) paintMarks(); // the square just marked stops glowing
  if (!s?.until?.(e)) return;
  const at = index;
  // Hide the pointer straight away, move on after the action has landed.
  $('coachHand').classList.add('hidden');
  $('coachRing').classList.add('hidden');
  $('coachDim').classList.add('hidden');
  window.setTimeout(() => { if (index === at) next(); }, 500);
}

export function wireCoach() {
  $('btnCoachSkip').addEventListener('click', () => { playTap(); finish(); });
  // Steps that don't wait for an action also move on with a tap.
  const tapOn = () => { const s = steps[index]; if (s && !s.until) next(); };
  $('coachDim').addEventListener('click', tapOn);
  $('coachDock').addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('#btnCoachSkip')) return;
    tapOn();
  });
  window.addEventListener('resize', () => {
    if (index < 0) { unfreezeBoard(); return; } // a frozen size is stale now
    // Text wraps differently at the new width: re-measure, then restore this step.
    const s = steps[index];
    const caption = $('coachCaption').textContent ?? '';
    const count = $('coachCount').textContent ?? '';
    lockDockHeight();
    fillDock(caption, s?.sub, count);
    relayout();
  });
}
