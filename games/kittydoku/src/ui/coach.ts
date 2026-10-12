import { playTap } from '../audio/sound';

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

/** Place the dim hole, ring, paw and caption around the current target. */
function layout() {
  const s = steps[index];
  if (!s) return;
  const dim = $('coachDim');
  const ring = $('coachRing');
  const hand = $('coachHand');
  const tip = $('coachTip');
  const el = current;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (s.marks) {
    // Squares glow on the board itself; the caption sits above the board.
    dim.classList.add('hidden');
    ring.classList.add('hidden');
    hand.classList.add('hidden');
    const board = document.getElementById('board')?.getBoundingClientRect();
    const above = !!board && board.top > 130;
    tip.classList.toggle('above', above);
    tip.classList.toggle('below', !above);
    tip.style.left = `${vw / 2}px`;
    tip.style.top = `${board ? (above ? board.top - 12 : board.bottom + 12) : vh * 0.2}px`;
    return;
  }

  if (!el) {
    // No target: caption floats over the board's upper part.
    const board = document.getElementById('board')?.getBoundingClientRect();
    dim.classList.add('hidden');
    ring.classList.add('hidden');
    hand.classList.add('hidden');
    const y = board ? board.top + board.height * 0.18 : vh * 0.3;
    tip.classList.remove('below', 'above');
    tip.style.left = `${vw / 2}px`;
    tip.style.top = `${y}px`;
    return;
  }

  const r = el.getBoundingClientRect();
  const pad = 6;
  const L = Math.max(0, r.left - pad);
  const T = Math.max(0, r.top - pad);
  const R = Math.min(vw, r.right + pad);
  const B = Math.min(vh, r.bottom + pad);

  dim.classList.toggle('hidden', !s.dim);
  // A donut: the whole screen with the target cut out. It's also what blocks
  // taps elsewhere, since clip-path limits where it can be hit.
  dim.style.clipPath =
    `polygon(0 0, ${vw}px 0, ${vw}px ${vh}px, 0 ${vh}px, 0 0, ` +
    `${L}px ${T}px, ${L}px ${B}px, ${R}px ${B}px, ${R}px ${T}px, ${L}px ${T}px)`;

  ring.classList.remove('hidden');
  Object.assign(ring.style, { left: `${L}px`, top: `${T}px`, width: `${R - L}px`, height: `${B - T}px` });

  hand.classList.toggle('hidden', !s.gesture);
  hand.dataset.gesture = s.gesture ?? '';
  hand.style.left = `${r.left + r.width * 0.55}px`;
  hand.style.top = `${r.top + r.height * 0.55}px`;

  // Caption above the target if there's room, otherwise below.
  const above = r.top > 110;
  tip.classList.toggle('above', above);
  tip.classList.toggle('below', !above);
  tip.style.left = `${Math.min(vw - 16, Math.max(16, r.left + r.width / 2))}px`;
  tip.style.top = `${above ? r.top - 14 : r.bottom + 14 + (s.gesture ? 34 : 0)}px`;
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
  current = s.target?.() ?? null;
  $('coachCaption').textContent = s.caption;
  $('coachSub').textContent = s.sub ?? '';
  $('coachSub').classList.toggle('hidden', !s.sub);
  $('coachCount').classList.add('hidden');
  paintMarks();

  const tip = $('coachTip');
  tip.classList.remove('pop');
  void tip.offsetWidth;
  tip.classList.add('pop');

  s.onEnter?.();
  // Let the board settle (e.g. a cat landing) before measuring.
  requestAnimationFrame(layout);
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
  stopCoach();
  cb?.();
}

export function startCoach(script: CoachStep[], opts: { onDone?: () => void } = {}) {
  stopCoach();
  if (!script.length) return;
  steps = script;
  onDoneCb = opts.onDone ?? null;
  $('coach').classList.remove('hidden');
  $('coach').classList.toggle('still', reducedMotion());
  show(0);
}

/** Hide without running onDone (e.g. leaving the level). */
export function stopCoach() {
  clearHold();
  document.querySelectorAll('.coachMark, .coachKeep').forEach((n) => n.classList.remove('coachMark', 'coachKeep'));
  document.getElementById('board')?.classList.remove('coachFocus');
  index = -1;
  steps = [];
  current = null;
  onDoneCb = null;
  $('coach').classList.add('hidden');
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
  $('coachTip').addEventListener('click', tapOn);
  window.addEventListener('resize', () => { if (index >= 0) layout(); });
}
