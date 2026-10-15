/**
 * The chalk drawing: the frame is always there (faint), and every miss draws
 * one more line of the figure. Solving the word lets the figure off the hook:
 * the rope is rubbed out and a happy stick figure waves from the ground.
 *
 * Lines are SVG paths with pathLength=1, so CSS can "draw" each one by
 * animating its dash offset, and a turbulence filter gives the chalk edge.
 */

const FRAME = [
  'M18 206 L128 206',   // ground
  'M48 206 L48 18',     // post
  'M44 18 L146 18',     // beam
  'M48 52 L82 18',      // brace
];
const ROPE = 'M140 18 L140 46';
/** Order matters: one part per miss. */
const FIGURE = [
  'M140 46 a16 16 0 1 0 0.01 0',  // head
  'M140 78 L140 134',             // body
  'M140 94 L118 118',             // left arm
  'M140 94 L162 118',             // right arm
  'M140 134 L122 172',            // left leg
  'M140 134 L158 172',            // right leg
];
/** The free figure, standing on the ground with both arms up. */
const HAPPY = [
  'M168 92 a14 14 0 1 0 0.01 0',
  'M168 120 L168 168',
  'M168 134 L148 108',
  'M168 134 L188 108',
  'M168 168 L154 205',
  'M168 168 L182 205',
  'M161 109 Q168 116 175 109',     // smile
];

const path = (d: string, cls: string) =>
  `<path d="${d}" pathLength="1" class="${cls}"/>`;

export function mountDrawing(host: HTMLElement) {
  host.innerHTML = `<svg viewBox="0 0 210 220" class="drawing" role="img" aria-label="Hangman drawing">
    <defs>
      <filter id="chalk" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="d"/>
        <feComponentTransfer in="n" result="grain"><feFuncA type="table" tableValues="0.55 1"/></feComponentTransfer>
        <feComposite in="d" in2="grain" operator="in"/>
      </filter>
    </defs>
    <g filter="url(#chalk)" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <g class="frame">${FRAME.map((d) => path(d, 'ln on')).join('')}</g>
      <g class="rope">${path(ROPE, 'ln on')}</g>
      <g class="figure">${FIGURE.map((d, i) => path(d, `ln part p${i}`)).join('')}</g>
      <g class="happy">${HAPPY.map((d, i) => path(d, `ln hp h${i}`)).join('')}</g>
    </g>
  </svg>`;
}

function svg(): SVGSVGElement | null {
  return document.querySelector<SVGSVGElement>('svg.drawing');
}

/** Show the first `n` figure lines (a newly added one draws itself in). */
export function setParts(n: number) {
  const s = svg(); if (!s) return;
  s.classList.remove('won', 'lost');
  s.querySelectorAll<SVGPathElement>('.part').forEach((p, i) => p.classList.toggle('on', i < n));
}

export function drawingWon() {
  const s = svg(); if (!s) return;
  s.classList.add('won');
}

export function drawingLost() {
  const s = svg(); if (!s) return;
  s.classList.add('lost');
}

/** Blank figure for a new word (lines go without animating). */
export function resetDrawing() {
  const s = svg(); if (!s) return;
  s.classList.add('instant');
  setParts(0);
  void s.getBoundingClientRect();
  requestAnimationFrame(() => s.classList.remove('instant'));
}
