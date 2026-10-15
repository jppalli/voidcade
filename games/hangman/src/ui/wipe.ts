/**
 * Screen-to-screen "eraser" wipe: a chalk-dusty sweep of board covers the
 * screen, the next screen is swapped in underneath, and the sweep carries on
 * off the other side. Taps are blocked while it runs; reduced motion just
 * swaps.
 */

const IN_MS = 300;
const OUT_MS = 380;

let el: HTMLDivElement | null = null;
let busy = false;

export function wipeBusy(): boolean { return busy; }

function overlay(): HTMLDivElement {
  if (el) return el;
  el = document.createElement('div');
  el.className = 'wipe hidden';
  el.setAttribute('aria-hidden', 'true');
  // A felt board eraser rides the leading edge; chalk dust trails behind it.
  el.innerHTML = '<span class="wipeDust"></span><span class="eraser"><i class="eraserTop"></i><i class="eraserFelt"></i></span>';
  document.body.appendChild(el);
  return el;
}

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function wipeTo(swap: () => void): Promise<void> {
  if (busy) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { swap(); return; }
  busy = true;
  const o = overlay();
  try {
    o.className = 'wipe start';
    await frame(); await frame();
    o.className = 'wipe cover';
    await wait(IN_MS);
    swap();
    await frame();
    o.className = 'wipe leave';
    await wait(OUT_MS);
  } finally {
    o.className = 'wipe hidden';
    busy = false;
  }
}
