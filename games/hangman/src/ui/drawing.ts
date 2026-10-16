/**
 * The chalk drawing: the frame is always there (faint), and every miss draws
 * one more line of the figure. The figure has a face that gets more worried
 * as the misses pile up, wobbles when a new line lands, and shrugs if the
 * word is lost. Solving the word lets it off the hook: the rope is rubbed
 * out and a happy stick figure waves from the ground.
 *
 * Lines are SVG paths with pathLength=1, so CSS can "draw" each one by
 * animating its dash offset; the shared #chalk filter gives the chalk edge.
 */

export const FRAME = [
  'M18 206 L128 206',   // ground
  'M48 206 L48 18',     // post
  'M44 18 L146 18',     // beam
  'M48 52 L82 18',      // brace
];
export const ROPE = 'M140 18 L140 46';
/** Order matters: one part per miss. */
export const FIGURE = [
  'M140 46 a16 16 0 1 0 0.01 0',  // head
  'M140 78 L140 134',             // body
  'M140 94 L118 118',             // left arm
  'M140 94 L162 118',             // right arm
  'M140 134 L122 172',            // left leg
  'M140 134 L158 172',            // right leg
];
/** Faces on the hanging head (centre 140,62), one shown at a time. */
export const FACES: Record<string, string> = {
  calm: 'M134 59 v0.5 M146 59 v0.5 M135 68 Q140 70 145 68',
  unsure: 'M134 59 v0.5 M146 59 v0.5 M135 69 L145 67',
  // Brows rise toward the middle (worried, not cross).
  worried: 'M131 56 Q133.5 54.5 136 53 M149 56 Q146.5 54.5 144 53 M134 60 v0.5 M146 60 v0.5 M136 69 Q140 66 144 69',
  // Worried plus a sweat drop by the temple.
  sweaty: 'M131 56 Q133.5 54.5 136 53 M149 56 Q146.5 54.5 144 53 M134 60 v0.5 M146 60 v0.5 M137 69 a3 2.4 0 1 0 6 0 a3 2.4 0 1 0 -6 0 M156 52 q3 5 0 7 q-3 -2 0 -7',
  oops: 'M131 57 l5 4 M136 57 l-5 4 M144 57 l5 4 M149 57 l-5 4 M136 69 Q140 66 144 69',
};
/** The free figure, standing on the ground with both arms up. */
export const HAPPY = [
  'M168 92 a14 14 0 1 0 0.01 0',
  'M168 120 L168 168',
  'M168 134 L148 108',
  'M168 134 L188 108',
  'M168 168 L154 205',
  'M168 168 L182 205',
  'M161 109 Q168 116 175 109',     // smile
  'M162.5 101 v0.5 M173.5 101 v0.5', // eyes
];

const path = (d: string, cls: string) =>
  `<path d="${d}" pathLength="1" class="${cls}"/>`;

export function mountDrawing(host: HTMLElement) {
  host.innerHTML = `<svg viewBox="0 0 210 220" class="drawing" role="img" aria-label="Hangman drawing">
    <g filter="url(#chalk)" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <g class="frame">${FRAME.map((d) => path(d, 'ln on')).join('')}</g>
      <g class="rope">${path(ROPE, 'ln on')}</g>
      <g class="figure">
        ${FIGURE.map((d, i) => path(d, `ln part p${i}`)).join('')}
        <g class="faces">${Object.entries(FACES).map(([k, d]) => `<path d="${d}" class="face f-${k}"/>`).join('')}</g>
      </g>
      <g class="happy">${HAPPY.map((d, i) => path(d, `ln hp h${i}`)).join('')}</g>
    </g>
  </svg>`;
}

function svg(): SVGSVGElement | null {
  return document.querySelector<SVGSVGElement>('svg.drawing');
}

function face(s: SVGSVGElement, name: string | null) {
  s.querySelectorAll('.face').forEach((f) => f.classList.toggle('on', !!name && f.classList.contains(`f-${name}`)));
}

/** Expression for a number of lines drawn (the head is line 1). */
function faceFor(n: number): string | null {
  if (n < 1) return null;
  if (n <= 2) return 'calm';
  if (n === 3) return 'unsure';
  if (n === 4) return 'worried';
  return 'sweaty';
}

let shown = 0;

/** Show the first `n` figure lines. A newly added line draws itself in and
 *  the figure gives a nervous wobble. */
export function setParts(n: number) {
  const s = svg(); if (!s) return;
  s.classList.remove('won', 'lost');
  s.querySelectorAll<SVGPathElement>('.part').forEach((p, i) => p.classList.toggle('on', i < n));
  face(s, faceFor(n));
  if (n > shown && !s.classList.contains('instant')) {
    const fig = s.querySelector('.figure')!;
    fig.classList.remove('nudge');
    void s.getBoundingClientRect();
    fig.classList.add('nudge');
  }
  shown = n;
}

export function drawingWon() {
  const s = svg(); if (!s) return;
  s.classList.add('won');
}

/** Lost: dizzy X eyes, and the figure shrugs before the board is wiped. */
export function drawingLost() {
  const s = svg(); if (!s) return;
  face(s, 'oops');
  s.classList.add('lost');
}

/** Blank figure for a new word (lines go without animating). */
export function resetDrawing() {
  const s = svg(); if (!s) return;
  s.classList.add('instant');
  shown = 0;
  setParts(0);
  s.querySelector('.figure')?.classList.remove('nudge');
  void s.getBoundingClientRect();
  requestAnimationFrame(() => s.classList.remove('instant'));
}
