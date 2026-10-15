/**
 * How the game fits its frame.
 *
 * - Desktop, tablets and embeds (the Arkadium Arena / Sandbox): the game is
 *   laid out at one fixed design size and the whole thing is scaled to fit
 *   the frame, centred, with a bit of "wall" around the board if the shapes
 *   differ. It always looks the same, just bigger or smaller.
 * - Phones and portrait frames: the layout adapts to the screen instead
 *   (a fixed landscape design would be far too small there).
 *
 * Everything (screens, cards, effects) lives inside #stage, which always has
 * a transform, so position:fixed children are placed relative to the stage.
 * Layout switches are classes on <html> (wide / short / tiny / narrow) rather
 * than media queries, because in stage mode the real viewport size is not
 * the size the game is laid out at. `--app-w` / `--app-h` replace vw / vh.
 *
 * ?layout=stage or ?layout=fluid forces a mode (for testing).
 */

export const DESIGN_W = 1024;
export const DESIGN_H = 720;

let scale = 1;
let staged = false;

const stage = () => document.getElementById('stage')!;

export function stageEl(): HTMLElement { return stage(); }
export function stageHeight(): number { return staged ? DESIGN_H : window.innerHeight; }
export function isStaged(): boolean { return staged; }

/** A phone: touch first, and a small short side. */
function isPhone(): boolean {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  return coarse && Math.min(screen.width, screen.height) < 600;
}

function decide(w: number, h: number): boolean {
  const forced = new URLSearchParams(location.search).get('layout');
  if (forced === 'stage') return true;
  if (forced === 'fluid') return false;
  return !isPhone() && w / h >= 1;
}

export function layoutStage() {
  const w = window.innerWidth, h = window.innerHeight;
  const el = stage();
  const root = document.documentElement;
  staged = decide(w, h);
  root.classList.toggle('staged', staged);
  if (staged) {
    scale = Math.min(w / DESIGN_W, h / DESIGN_H);
    const x = (w - DESIGN_W * scale) / 2, y = (h - DESIGN_H * scale) / 2;
    el.style.width = `${DESIGN_W}px`;
    el.style.height = `${DESIGN_H}px`;
    el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    root.style.setProperty('--app-w', `${DESIGN_W}px`);
    root.style.setProperty('--app-h', `${DESIGN_H}px`);
    // The design size is roomy and landscape: always the two-column layout.
    for (const [c, on] of [['wide', true], ['short', false], ['tiny', false], ['narrow', false]] as const) root.classList.toggle(c, on);
  } else {
    scale = 1;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.transform = 'translate(0, 0)'; // still a containing block for fixed children
    root.style.setProperty('--app-w', `${w}px`);
    root.style.setProperty('--app-h', `${h}px`);
    root.classList.toggle('wide', w / h >= 9 / 8 && w >= 600);
    root.classList.toggle('short', h <= 640);
    root.classList.toggle('tiny', h <= 560);
    root.classList.toggle('narrow', w <= 420);
  }
}

/** A viewport rect (getBoundingClientRect) in stage coordinates. */
export function toStage(r: DOMRect): { left: number; top: number; right: number; bottom: number; width: number; height: number } {
  const s = stage().getBoundingClientRect();
  const left = (r.left - s.left) / scale, top = (r.top - s.top) / scale;
  const width = r.width / scale, height = r.height / scale;
  return { left, top, width, height, right: left + width, bottom: top + height };
}

export function stageWidth(): number { return staged ? DESIGN_W : window.innerWidth; }

export function initStage() {
  layoutStage();
  window.addEventListener('resize', layoutStage);
}
