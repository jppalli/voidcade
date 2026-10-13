import { pawSvg } from '../render/art';

/**
 * Screen-to-screen "iris" transition, like an old cartoon: the current
 * screen closes into a warm cream circle (soft, feathered edge) around the
 * spot you tapped, a faint pink paw appears, then it opens on the next screen.
 *
 * The swap happens while the pink fully covers the frame, so whatever the
 * swap renders (new board, map, title) is never seen half-built. Taps are
 * blocked for the whole transition. Reduced motion: no iris, just the swap
 * (the screens' own fade-in still plays).
 */

const CLOSE_MS = 480;
const HOLD_MS = 120;
export const IRIS_OPEN_MS = 620;
/** Soft, feathered edge (px) so the circle never reads as a hard cut. */
const FEATHER = 28;

let overlay: HTMLDivElement | null = null;
let paw: HTMLSpanElement | null = null;
let busy = false;
let lastTap = { x: 0, y: 0, at: 0 };

/** True while a transition is running (callers use it to hold back pop-ups). */
export function irisBusy(): boolean { return busy; }

/** Remembers where the player last pressed, so the circle closes around it. */
export function wireIris(): void {
  window.addEventListener('pointerdown', (e) => {
    lastTap = { x: e.clientX, y: e.clientY, at: performance.now() };
  }, { capture: true, passive: true });
}

function ensureOverlay(): HTMLDivElement {
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'iris hidden';
  overlay.setAttribute('aria-hidden', 'true');
  paw = document.createElement('span');
  paw.className = 'irisPaw';
  paw.innerHTML = pawSvg('#f6bfca', 46);
  overlay.appendChild(paw);
  document.body.appendChild(overlay);
  return overlay;
}

// Gentle sine curves: no sudden snap at either end.
const easeIn = (t: number) => 1 - Math.cos((t * Math.PI) / 2);
const easeOut = (t: number) => Math.sin((t * Math.PI) / 2);

function setHole(el: HTMLElement, x: number, y: number, r: number) {
  // Transparent inside the circle (the screen shows through), pink outside.
  const mask = `radial-gradient(circle at ${x}px ${y}px, transparent ${r}px, #000 ${r + FEATHER}px)`;
  el.style.maskImage = mask;
  el.style.setProperty('-webkit-mask-image', mask);
}

function animate(ms: number, step: (t: number) => void): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      step(t);
      if (t < 1) requestAnimationFrame(frame); else resolve();
    };
    requestAnimationFrame(frame);
  });
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Close, run `swap` (show the next screen), open. A second call while one is
 * running is ignored, so double-taps can't stack two transitions.
 */
export async function irisTo(swap: () => void): Promise<void> {
  if (busy) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { swap(); return; }
  busy = true;
  const el = ensureOverlay();
  const w = window.innerWidth;
  const h = window.innerHeight;
  // Close around the tap if it was just now (a button), else the centre.
  const recent = performance.now() - lastTap.at < 1500;
  const x = recent ? lastTap.x : w / 2;
  const y = recent ? lastTap.y : h / 2;
  // Big enough to clear the farthest corner.
  const maxR = Math.hypot(Math.max(x, w - x), Math.max(y, h - y)) + FEATHER + 4;

  paw!.style.left = `${x}px`;
  paw!.style.top = `${y}px`;
  paw!.classList.remove('pop', 'out');
  setHole(el, x, y, maxR);
  el.classList.remove('hidden');

  try {
    // Ends at -FEATHER so the soft edge closes fully over the centre too.
    const lerp = (k: number) => -FEATHER + (maxR + FEATHER) * k;
    await animate(CLOSE_MS, (t) => setHole(el, x, y, lerp(1 - easeIn(t))));
    void paw!.offsetWidth;
    paw!.classList.add('pop');
    swap();
    await wait(HOLD_MS);
    // Open from the same spot, like a cartoon iris; the paw shrinks away.
    paw!.classList.add('out');
    await animate(IRIS_OPEN_MS, (t) => setHole(el, x, y, lerp(easeOut(t))));
  } finally {
    el.classList.add('hidden');
    paw!.classList.remove('pop', 'out');
    busy = false;
  }
}
