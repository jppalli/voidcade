/**
 * Small shared effects: sparkles and floating text for purchases, and the open and close
 * animation of the full-screen panels (shop, barn, collection).
 */
export type Point = { x: number; y: number };
export const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const COLORS = ['#ffd24a', '#ff9eb5', '#9fe08a', '#8fd3f4', '#ffffff'];
export const center = (el: Element): Point => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};
const at = (x: number, y: number, s: number, rot = 0) => `translate(${x}px,${y}px) translate(-50%,-50%) scale(${s}) rotate(${rot}deg)`;

/** A ring of little stars that fly out and fade. */
export function burst(from: Point, n = 14, colors: string[] = COLORS) {
  if (reduced) return;
  for (let i = 0; i < n; i++) {
    const el = document.createElement('i');
    el.className = 'spark';
    el.style.background = colors[i % colors.length];
    document.body.append(el);
    const ang = (i / n) * Math.PI * 2 + Math.random() * 0.6,
      d = 46 + Math.random() * 56,
      s = 0.7 + Math.random() * 0.8,
      x = from.x + Math.cos(ang) * d,
      y = from.y + Math.sin(ang) * d - 14;
    const a = el.animate(
      [
        { transform: at(from.x, from.y, 0, 0), opacity: 1 },
        { transform: at(x, y, s, 140), opacity: 1, offset: 0.55 },
        { transform: at(x, y + 34, 0, 260), opacity: 0 },
      ],
      { duration: 750 + Math.random() * 350, easing: 'cubic-bezier(.2,.7,.4,1)' },
    );
    a.onfinish = () => el.remove();
  }
}

/** Text that floats up from a point and fades ("-30", "+3 bales", "Built!"). */
export function floatText(from: Point, text: string, cls = '') {
  if (reduced) return;
  const el = document.createElement('b');
  el.className = `float-text ${cls}`.trim();
  el.textContent = text;
  document.body.append(el);
  const a = el.animate(
    [
      { transform: at(from.x, from.y + 6, 0.6), opacity: 0 },
      { transform: at(from.x, from.y - 16, 1.1), opacity: 1, offset: 0.25 },
      { transform: at(from.x, from.y - 64, 1), opacity: 0 },
    ],
    { duration: 1100, easing: 'ease-out' },
  );
  a.onfinish = () => el.remove();
}

/** Which row of a panel a button sits in. Read it before the panel is redrawn. */
export const rowIndex = (root: HTMLElement, btn: HTMLElement) => Array.from(root.querySelectorAll('.shop-row')).indexOf(btn.closest('.shop-row') as Element);

/** After a purchase and the redraw: the row pops, sparkles fly, and the balance shows what was spent. */
export function celebrate(root: HTMLElement, idx: number, spent = 0) {
  const row = root.querySelectorAll<HTMLElement>('.shop-row')[idx];
  if (row) {
    row.classList.add('bought');
    window.setTimeout(() => row.classList.remove('bought'), 900);
    burst(center(row.querySelector('.buy, .maxed, .art') ?? row));
  }
  const bal = root.querySelector<HTMLElement>('.shop-balance');
  if (bal && spent > 0) {
    bal.classList.remove('spent');
    void bal.offsetWidth;
    bal.classList.add('spent');
    floatText(center(bal), `-${spent}`, 'spend');
  }
}

/** Runs a redraw of a panel and keeps whatever was scrolled where it was. */
export function keepScroll(root: HTMLElement, redraw: () => void) {
  const kept: [number, number, number][] = [];
  root.querySelectorAll<HTMLElement>('*').forEach((e, i) => {
    if (e.scrollTop > 0 || e.scrollLeft > 0) kept.push([i, e.scrollTop, e.scrollLeft]);
  });
  redraw();
  if (!kept.length) return;
  const all = root.querySelectorAll<HTMLElement>('*');
  for (const [i, top, left] of kept)
    if (all[i]) {
      all[i].scrollTop = top;
      all[i].scrollLeft = left;
    }
}

/** Shows a full-screen panel with a fade and a pop. */
export function openOverlay(el: HTMLElement) {
  el.classList.remove('hidden', 'closing');
  el.classList.add('enter');
  window.setTimeout(() => el.classList.remove('enter'), 520);
}

/** Hides a full-screen panel after a short fade. */
export function closeOverlay(el: HTMLElement) {
  if (reduced) {
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('enter');
  el.classList.add('closing');
  window.setTimeout(() => {
    if (!el.classList.contains('closing')) return;
    el.classList.remove('closing');
    el.classList.add('hidden');
  }, 230);
}
