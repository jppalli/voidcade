/**
 * Visual effects built on the Web Animations API. Every effect adds short-lived elements to a host
 * element and removes them when finished. Callers decide whether to play them (reduced motion).
 */

const CONFETTI_COLORS = ['#E8A33D', '#FCE7B8', '#5E9C76', '#D9503F', '#3F7FC1', '#F6E7CF', '#B58AD6'];

type Shape = 'dot' | 'chip' | 'ribbon' | 'star';

const SHAPES: Shape[] = ['dot', 'chip', 'chip', 'ribbon', 'star'];

function piece(shape: Shape, color: string, size: number): HTMLElement {
  const node = document.createElement('div');
  node.className = 'fx-piece';
  node.style.background = color;
  if (shape === 'dot') {
    node.style.width = node.style.height = `${size}px`;
    node.style.borderRadius = '50%';
  } else if (shape === 'chip') {
    node.style.width = `${size}px`;
    node.style.height = `${size * 0.6}px`;
    node.style.borderRadius = '2px';
  } else if (shape === 'ribbon') {
    node.style.width = `${size * 0.35}px`;
    node.style.height = `${size * 1.6}px`;
    node.style.borderRadius = '2px';
  } else {
    node.style.width = node.style.height = `${size * 1.2}px`;
    node.style.background = color;
    node.style.clipPath = 'polygon(50% 0, 62% 36%, 100% 38%, 70% 60%, 80% 100%, 50% 76%, 20% 100%, 30% 60%, 0 38%, 38% 36%)';
  }
  return node;
}

export interface ConfettiOptions {
  count?: number;
  /** Launch cone in degrees, centred on `angle`. */
  spread?: number;
  /** Direction in degrees. -90 is straight up. */
  angle?: number;
  /** Distance travelled, in px, before gravity. */
  power?: number;
  gravity?: number;
  duration?: number;
  size?: number;
}

/** A burst of paper confetti that rises, tumbles and falls. */
export function confetti(host: HTMLElement, x: number, y: number, options: ConfettiOptions = {}): void {
  const { count = 28, spread = 360, angle = -90, power = 140, gravity = 220, duration = 1400, size = 9 } = options;
  for (let i = 0; i < count; i++) {
    const node = piece(SHAPES[i % SHAPES.length], CONFETTI_COLORS[i % CONFETTI_COLORS.length], size * (0.7 + Math.random() * 0.7));
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    host.append(node);

    const theta = ((angle + (Math.random() - 0.5) * spread) * Math.PI) / 180;
    const distance = power * (0.45 + Math.random() * 0.75);
    const dx = Math.cos(theta) * distance;
    const peakY = Math.sin(theta) * distance;
    const endY = peakY + gravity * (0.7 + Math.random() * 0.6);
    const spin = (Math.random() - 0.5) * 900;
    const flutter = (Math.random() - 0.5) * 40;
    const life = duration * (0.8 + Math.random() * 0.5);

    const animation = node.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg) scale(0.4)', opacity: 1, offset: 0 },
        { transform: `translate(${dx * 0.7}px, ${peakY}px) rotate(${spin * 0.4}deg) scale(1)`, opacity: 1, offset: 0.35, easing: 'cubic-bezier(.4,0,.9,.6)' },
        { transform: `translate(${dx + flutter}px, ${endY}px) rotate(${spin}deg) scale(0.9)`, opacity: 0, offset: 1 },
      ],
      { duration: life, easing: 'cubic-bezier(.1,.7,.3,1)', fill: 'forwards' },
    );
    animation.onfinish = () => node.remove();
  }
}

/** A soft ring that expands from a point, used to punctuate a set completing. */
export function ring(host: HTMLElement, x: number, y: number, size: number, color = '#FCE7B8'): void {
  const node = document.createElement('div');
  node.className = 'fx-ring';
  node.style.left = `${x - size / 2}px`;
  node.style.top = `${y - size / 2}px`;
  node.style.width = node.style.height = `${size}px`;
  node.style.borderColor = color;
  host.append(node);
  const animation = node.animate(
    [
      { transform: 'scale(0.35)', opacity: 0.9 },
      { transform: 'scale(1.9)', opacity: 0 },
    ],
    { duration: 650, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' },
  );
  animation.onfinish = () => node.remove();
}

/** Text that floats up from a point and fades, e.g. the name of a completed set. */
export function floatLabel(host: HTMLElement, x: number, y: number, text: string): void {
  const node = document.createElement('div');
  node.className = 'fx-label';
  node.textContent = text;
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
  host.append(node);
  const animation = node.animate(
    [
      { transform: 'translate(-50%, 6px) scale(0.7)', opacity: 0, offset: 0 },
      { transform: 'translate(-50%, -14px) scale(1.06)', opacity: 1, offset: 0.2 },
      { transform: 'translate(-50%, -22px) scale(1)', opacity: 1, offset: 0.7 },
      { transform: 'translate(-50%, -52px) scale(1)', opacity: 0, offset: 1 },
    ],
    { duration: 1500, easing: 'ease-out', fill: 'forwards' },
  );
  animation.onfinish = () => node.remove();
}

/**
 * A golden thread that winds around a rectangle and ties off with a small bow.
 * Drawn as an SVG stroke whose dash offset is animated.
 */
export function threadTie(host: HTMLElement, x: number, y: number, w: number, h: number): void {
  const pad = 6;
  const radius = Math.min(w, h) * 0.09 + pad;
  const width = w + pad * 2;
  const height = h + pad * 2;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'fx-thread');
  svg.setAttribute('viewBox', `0 0 ${width} ${height + 26}`);
  svg.style.left = `${x - pad}px`;
  svg.style.top = `${y - pad - 22}px`;
  svg.style.width = `${width}px`;
  svg.style.height = `${height + 26}px`;
  svg.style.position = 'absolute';

  const frame = document.createElementNS(svgNS, 'rect');
  frame.setAttribute('x', '2');
  frame.setAttribute('y', '24');
  frame.setAttribute('width', String(width - 4));
  frame.setAttribute('height', String(height - 4));
  frame.setAttribute('rx', String(radius));
  frame.setAttribute('fill', 'none');
  frame.setAttribute('stroke', '#E8A33D');
  frame.setAttribute('stroke-width', '4');
  frame.setAttribute('stroke-linecap', 'round');
  frame.setAttribute('stroke-dasharray', '10 7');
  const length = 2 * (width + height) - 8 + 2 * Math.PI * radius;
  frame.style.filter = 'drop-shadow(0 0 6px #fce7b8)';

  const bow = document.createElementNS(svgNS, 'path');
  const cx = width / 2;
  bow.setAttribute('d', `M${cx} 24 C ${cx - 8} 4, ${cx - 26} 6, ${cx - 20} 20 C ${cx - 16} 28, ${cx - 4} 26, ${cx} 24 C ${cx + 4} 26, ${cx + 16} 28, ${cx + 20} 20 C ${cx + 26} 6, ${cx + 8} 4, ${cx} 24 Z`);
  bow.setAttribute('fill', '#E8A33D');
  bow.setAttribute('stroke', '#9A6614');
  bow.setAttribute('stroke-width', '2');
  bow.setAttribute('stroke-linejoin', 'round');
  bow.style.transformOrigin = `${cx}px 24px`;
  bow.style.opacity = '0';

  svg.append(frame, bow);
  host.append(svg);

  const draw = frame.animate(
    [{ strokeDashoffset: length * 0.5, opacity: 0.2 }, { strokeDashoffset: 0, opacity: 1 }],
    { duration: 420, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'forwards' },
  );
  void draw;
  bow.animate(
    [
      { transform: 'scale(0) rotate(-30deg)', opacity: 0, offset: 0 },
      { transform: 'scale(1.25) rotate(6deg)', opacity: 1, offset: 0.6 },
      { transform: 'scale(1) rotate(0deg)', opacity: 1, offset: 1 },
    ],
    { duration: 380, delay: 320, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'forwards' },
  );
  const out = svg.animate(
    [
      { opacity: 1, transform: 'translateY(0) scale(1)' },
      { opacity: 0, transform: 'translateY(-10px) scale(1.06)' },
    ],
    { duration: 380, delay: 900, easing: 'ease-in', fill: 'forwards' },
  );
  out.onfinish = () => svg.remove();
}

/** Counts a number up in `el` over `ms`, with an ease-out curve. */
export function countUp(node: HTMLElement, from: number, to: number, ms = 800, format: (n: number) => string = (n) => String(n)): void {
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - t, 3);
    node.textContent = format(Math.round(from + (to - from) * eased));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** Restarts a one-shot CSS class animation on an element. */
export function replay(node: Element, className: string): void {
  node.classList.remove(className);
  void (node as HTMLElement).offsetWidth;
  node.classList.add(className);
}
