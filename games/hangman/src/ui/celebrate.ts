/**
 * Celebrations, all drawn in chalk:
 *  - wordDone: the letters hop in a wave and a little burst of chalk stars
 *    pops out of the word;
 *  - levelDone: chalk confetti rains over the whole board.
 * Reduced motion keeps the colour change only (no flying pieces).
 */

const CHALK = ['#f6e27a', '#ffadb9', '#a8e2b0', '#a9d4ff', '#f4f1e8', '#d7c2ff'];
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const starSvg = (fill: string, size: number) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="M12 2.5l2.6 6.4 6.9.5-5.3 4.4 1.7 6.7L12 16.8 6.1 20.5l1.7-6.7L2.5 9.4l6.9-.5z" fill="${fill}"/></svg>`;

/** Letters hop one after another; chalk stars burst from the word. */
export function wordDone(phrase: HTMLElement) {
  // Waits a moment so the last letter finishes writing itself in first.
  phrase.querySelectorAll<HTMLElement>('.tile:not(.punct)').forEach((t, i) => {
    t.classList.remove('cheer');
    t.style.setProperty('--cd', `${220 + i * 45}ms`);
    void t.offsetWidth;
    t.classList.add('cheer');
  });
  if (reduced()) return;
  burst(phrase, 16, 0.9);
}

/** Chalk stars flying out from the middle of an element. */
export function burst(from: HTMLElement, count: number, spread = 1) {
  const r = from.getBoundingClientRect();
  const layer = document.createElement('div');
  layer.className = 'fxLayer';
  layer.setAttribute('aria-hidden', 'true');
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const reach = Math.max(90, r.width * 0.6) * spread;
  layer.innerHTML = Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + (i % 2) * 0.3;
    const d = reach * (0.55 + ((i * 37) % 45) / 100);
    const size = 16 + ((i * 7) % 14);
    return `<span class="fxStar" style="left:${cx}px;top:${cy}px;--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d * 0.7)}px;--rot:${(i * 53) % 180}deg;animation-delay:${(i % 4) * 25}ms">${starSvg(CHALK[i % CHALK.length], size)}</span>`;
  }).join('');
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 1300);
}

/** Chalk confetti over the whole board: short chalk dashes and stars. */
export function levelDone() {
  if (reduced()) return;
  const layer = document.createElement('div');
  layer.className = 'fxLayer';
  layer.setAttribute('aria-hidden', 'true');
  const pieces: string[] = [];
  for (let i = 0; i < 46; i++) {
    const left = (i * 61) % 100;
    const delay = ((i * 37) % 70) / 100;
    const dur = 2.1 + ((i * 13) % 9) / 10;
    const drift = ((i * 29) % 80) - 40;
    const color = CHALK[i % CHALK.length];
    const body = i % 4 === 0
      ? starSvg(color, 16 + (i % 3) * 4)
      : `<i style="background:${color};width:${6 + (i % 3) * 2}px;height:${16 + (i % 4) * 4}px"></i>`;
    pieces.push(`<span class="fxConfetti" style="left:${left}%;--drift:${drift}px;--spin:${((i % 2) ? 1 : -1) * (180 + (i * 41) % 360)}deg;animation-duration:${dur}s;animation-delay:${delay}s">${body}</span>`);
  }
  layer.innerHTML = pieces.join('');
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 3600);
}
