import { playTap, playTypeBlip } from '../audio/sound';
import { mascotSvg, type Coat } from '../render/art';

export interface TipOptions {
  /** small heading above the text (default "A little tip") */
  title?: string;
  /** coat of the cat doing the talking (default: the lilac mascot) */
  coat?: Coat;
  onClose?: () => void;
}

/**
 * Level tips, spoken by the mascot: a speech bubble docked at the bottom of
 * the screen whose text types itself out with a soft blip. The board stays
 * visible behind a light scrim.
 *
 * Tapping anywhere while it types finishes the text at once; tapping again
 * (or "Got it", or Escape) closes it. With reduced motion the text appears
 * instantly. Screen readers get the full text in one go via #tipFull.
 */

const CHAR_MS = 24; // ~40 characters per second
const COMMA_PAUSE_MS = 140;
const STOP_PAUSE_MS = 260;
/** Blip on every Nth letter so the sound reads as speech, not a rattle. */
const BLIP_EVERY = 2;

const $ = (id: string) => document.getElementById(id) as HTMLElement;

let text = '';
let shown = 0;
let typing = false;
let timer: number | null = null;
let letters = 0;
let onCloseCb: (() => void) | null = null;
let returnFocus: HTMLElement | null = null;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function isTipOpen(): boolean {
  return !$('tipOverlay').classList.contains('hidden');
}

function paint() {
  $('tipTyped').textContent = text.slice(0, shown);
  $('tipRest').textContent = text.slice(shown);
}

function setTyping(on: boolean) {
  typing = on;
  $('tipOverlay').classList.toggle('typing', on);
  $('tipHintText').textContent = on ? 'Tap anywhere to skip' : '';
  $('btnTipClose').textContent = on ? 'Skip' : 'Got it';
}

function step() {
  timer = null;
  if (shown >= text.length) {
    setTyping(false);
    return;
  }
  const ch = text[shown];
  shown++;
  paint();

  if (/[\p{L}\p{N}]/u.test(ch)) {
    letters++;
    if (letters % BLIP_EVERY === 1) playTypeBlip();
  }

  let delay = CHAR_MS;
  if (ch === ',' || ch === ';' || ch === ':') delay = COMMA_PAUSE_MS;
  else if (ch === '.' || ch === '!' || ch === '?') delay = STOP_PAUSE_MS;
  timer = window.setTimeout(step, delay);
}

function finishTyping() {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  shown = text.length;
  paint();
  setTyping(false);
}

/** Show a tip. `onClose` runs once, when the player dismisses it. */
export function openTip(tipText: string, opts: TipOptions = {}) {
  closeTip(false);
  text = tipText;
  shown = 0;
  letters = 0;
  onCloseCb = opts.onClose ?? null;
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  $('tipTitle').textContent = opts.title ?? 'A little tip';
  $('tipCat').innerHTML = mascotSvg(84, opts.coat);
  $('tipFull').textContent = tipText;

  const overlay = $('tipOverlay');
  overlay.classList.remove('hidden');
  // Restart the entrance animation each time it opens.
  overlay.classList.remove('entering');
  void overlay.offsetWidth;
  overlay.classList.add('entering');

  $('btnTipClose').focus({ preventScroll: true });

  if (reducedMotion()) {
    finishTyping();
  } else {
    paint();
    setTyping(true);
    // Let the bubble pop in before the first letter.
    timer = window.setTimeout(step, 320);
  }
}

/** Hide the tip. `notify` false skips the onClose callback (used when a new
 *  level replaces the current one). */
export function closeTip(notify = true) {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  setTyping(false);
  const overlay = $('tipOverlay');
  if (overlay.classList.contains('hidden')) return;
  overlay.classList.add('hidden');
  const cb = onCloseCb;
  onCloseCb = null;
  if (returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
  returnFocus = null;
  if (notify && cb) cb();
}

/** First tap finishes the typing; the next one closes. */
function advance() {
  if (typing) finishTyping();
  else {
    playTap();
    closeTip();
  }
}

export function wireTip() {
  $('tipScrim').addEventListener('click', advance);
  $('tipBubble').addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('#btnTipClose')) return;
    advance();
  });
  $('btnTipClose').addEventListener('click', advance);
  $('tipCat').addEventListener('click', advance);

  window.addEventListener('keydown', (e) => {
    if (!isTipOpen()) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeTip();
    } else if (e.key === 'Tab') {
      // Only one control in the dialog: keep focus on it.
      e.preventDefault();
      $('btnTipClose').focus();
    }
  });
}
