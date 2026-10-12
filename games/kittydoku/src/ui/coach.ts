import { playTap, playTypeBlip } from '../audio/sound';
import { mascotSvg, type Coat } from '../render/art';

/**
 * Tutorial coach: the world's cat talks the player through a few steps while
 * the board stays playable. Unlike the tip bubble there's no scrim; one square
 * or button gets a soft spotlight, and a step can wait for the player to do
 * the thing (place a cat, leave a paw) before moving on.
 *
 * The bubble docks at the top of the screen, or the bottom when the thing it
 * points at is up top, so it never covers what it's talking about.
 */

export type CoachEvent = { type: 'cat' | 'paw'; r: number; c: number };

export interface CoachStep {
  text: string;
  /** Elements to spotlight (a pulsing ring). */
  spot?: () => Element[];
  /** Board squares to softly light up (a row, a column, the squares around a cat). */
  lanes?: () => Element[];
  /** Leave the step on an event (return true), or on the Next button if omitted. */
  until?: (e: CoachEvent) => boolean;
  /** Small line under the text while waiting, e.g. "Double-tap the glowing square". */
  doThis?: string;
}

const CHAR_MS = 22;
const PAUSE_MS = 200;
const $ = (id: string) => document.getElementById(id) as HTMLElement;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let steps: CoachStep[] = [];
let index = -1;
let onDoneCb: (() => void) | null = null;
let typeTimer: number | null = null;
let typing = false;
let marked: Element[] = [];

export function isCoachActive(): boolean {
  return index >= 0;
}

function clearMarks() {
  marked.forEach((el) => el.classList.remove('coachSpot', 'coachLane'));
  marked = [];
}

function typeOut(text: string) {
  if (typeTimer !== null) clearTimeout(typeTimer);
  const typed = $('coachTyped');
  const rest = $('coachRest');
  $('coachFull').textContent = text;
  if (reducedMotion()) {
    typed.textContent = text;
    rest.textContent = '';
    typing = false;
    return;
  }
  let shown = 0;
  let letters = 0;
  typing = true;
  const tick = () => {
    typeTimer = null;
    if (shown >= text.length) { typing = false; return; }
    const ch = text[shown++];
    typed.textContent = text.slice(0, shown);
    rest.textContent = text.slice(shown);
    if (/[\p{L}\p{N}]/u.test(ch) && ++letters % 2 === 1) playTypeBlip();
    typeTimer = window.setTimeout(tick, /[.!?,]/.test(ch) ? PAUSE_MS : CHAR_MS);
  };
  typed.textContent = '';
  rest.textContent = text;
  typeTimer = window.setTimeout(tick, 220);
}

function finishTyping() {
  if (typeTimer !== null) clearTimeout(typeTimer);
  typeTimer = null;
  typing = false;
  const text = $('coachFull').textContent ?? '';
  $('coachTyped').textContent = text;
  $('coachRest').textContent = '';
}

/** Dock the bubble away from whatever it is pointing at. */
function dock(targets: Element[]) {
  const box = $('coach');
  if (!targets.length) { box.classList.remove('dockBottom'); return; }
  const top = Math.min(...targets.map((t) => t.getBoundingClientRect().top));
  box.classList.toggle('dockBottom', top < window.innerHeight * 0.4);
}

function show(i: number) {
  clearMarks();
  index = i;
  const s = steps[i];
  if (!s) { finish(); return; }

  const spots = s.spot?.() ?? [];
  const lanes = s.lanes?.() ?? [];
  spots.forEach((el) => el.classList.add('coachSpot'));
  lanes.forEach((el) => el.classList.add('coachLane'));
  marked = [...spots, ...lanes];
  dock([...spots, ...lanes]);

  const waiting = !!s.until;
  $('coachDo').textContent = waiting ? (s.doThis ?? '') : '';
  $('coachDo').classList.toggle('hidden', !waiting || !s.doThis);
  $('btnCoachNext').classList.toggle('hidden', waiting);
  $('btnCoachNext').textContent = i === steps.length - 1 ? 'Let’s play' : 'Next';
  $('coachStep').textContent = `${i + 1} / ${steps.length}`;

  const box = $('coach');
  box.classList.remove('entering');
  void box.offsetWidth;
  box.classList.add('entering');
  typeOut(s.text);
}

function finish() {
  const cb = onDoneCb;
  stopCoach();
  cb?.();
}

/** Start a tutorial. `onDone` runs when the last step is passed or it's skipped. */
export function startCoach(script: CoachStep[], opts: { coat?: Coat; title?: string; onDone?: () => void } = {}) {
  stopCoach();
  if (!script.length) return;
  steps = script;
  onDoneCb = opts.onDone ?? null;
  $('coachCat').innerHTML = mascotSvg(64, opts.coat);
  $('coachTitle').textContent = opts.title ?? 'Learning the ropes';
  $('coach').classList.remove('hidden');
  show(0);
}

/** Hide without running onDone (e.g. leaving the level). */
export function stopCoach() {
  if (typeTimer !== null) clearTimeout(typeTimer);
  typeTimer = null;
  clearMarks();
  index = -1;
  steps = [];
  onDoneCb = null;
  $('coach').classList.add('hidden');
}

/** The game reports what the player did; a waiting step may move on. */
export function coachNotify(e: CoachEvent) {
  if (index < 0) return;
  const s = steps[index];
  if (s?.until?.(e)) {
    // A short beat so the player sees their action land first.
    const at = index;
    window.setTimeout(() => { if (index === at) show(at + 1); }, 450);
  }
}

export function wireCoach() {
  $('btnCoachNext').addEventListener('click', () => {
    if (typing) { finishTyping(); return; }
    playTap();
    show(index + 1);
  });
  $('btnCoachSkip').addEventListener('click', () => { playTap(); finish(); });
  // Tapping the bubble text finishes the typing early.
  $('coachText').addEventListener('click', () => { if (typing) finishTyping(); });
  // Keep spotlights in the right place: re-dock on resize.
  window.addEventListener('resize', () => { if (index >= 0) dock(marked); });
}
