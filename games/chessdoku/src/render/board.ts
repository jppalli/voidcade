import type { Game } from '../game/state';
import { GLYPHS } from '../game/types';
import type { PieceType } from '../game/types';

interface PieceVisual {
  p: PieceType;
  given: boolean;
  bornAt: number; // ms timestamp for the drop-in animation
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
}

const COLORS = {
  frame: '#4a4160',
  frameEdge: '#332c48',
  light: '#efd9b4',
  dark: '#b58863',
  blocked: '#3a3547',
  crack: 'rgba(0,0,0,0.35)',
  boxLine: '#2e2740',
  piece: '#241f30',
  pieceGiven: '#5a4a92',
  conflict: '#e0455a',
  conflictFill: 'rgba(224,69,90,0.30)',
  ruleFill: 'rgba(232,161,60,0.28)',
  hover: 'rgba(0,0,0,0.18)',
  select: 'rgba(232,182,76,0.55)',
};

const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

export class BoardRenderer {
  private ctx: CanvasRenderingContext2D;
  private size = 4;          // cells per side
  private cell = 64;         // CSS px per cell
  private pad = 10;          // frame thickness in CSS px
  private pieces = new Map<number, PieceVisual>();
  private particles: Particle[] = [];
  private hover: { r: number; c: number } | null = null;
  private game: Game | null = null;
  private shakeUntil = 0;
  private raf = 0;
  private dpr = Math.max(1, window.devicePixelRatio || 1);

  constructor(
    private canvas: HTMLCanvasElement,
    private onTap: (r: number, c: number) => void,
  ) {
    this.ctx = canvas.getContext('2d')!;
    canvas.addEventListener('pointermove', e => {
      const cellHit = this.hitTest(e);
      this.hover = cellHit;
      canvas.style.cursor = cellHit ? 'pointer' : 'default';
    });
    canvas.addEventListener('pointerleave', () => { this.hover = null; });
    canvas.addEventListener('pointerdown', e => {
      const cellHit = this.hitTest(e);
      if (cellHit) this.onTap(cellHit.r, cellHit.c);
    });
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
  }

  /** Bind to a (re)loaded game; resets visuals and sizes the canvas. */
  attach(game: Game): void {
    this.game = game;
    this.size = game.level.size;
    const holder = this.canvas.parentElement!;
    const avail = Math.min(holder.clientWidth, 620);
    this.cell = Math.max(44, Math.min(72, Math.floor((avail - this.pad * 2) / this.size)));
    const px = this.size * this.cell + this.pad * 2;
    this.canvas.width = px * this.dpr;
    this.canvas.height = px * this.dpr;
    this.canvas.style.width = `${px}px`;
    this.canvas.style.height = `${px}px`;
    this.pieces.clear();
    this.particles = [];
    this.sync(false);
  }

  /** Diff game board against visuals so new pieces animate in. */
  sync(animate = true): void {
    if (!this.game) return;
    // a level load fires board-change before attach() resizes us; attach() re-syncs
    if (this.game.level.size !== this.size) return;
    const now = performance.now();
    const seen = new Set<number>();
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const occ = this.game.board[r][c];
        const k = r * this.size + c;
        if (!occ) continue;
        seen.add(k);
        const existing = this.pieces.get(k);
        if (!existing || existing.p !== occ.p) {
          this.pieces.set(k, { p: occ.p, given: occ.given, bornAt: animate ? now : now - 1000 });
        }
      }
    }
    for (const k of [...this.pieces.keys()]) {
      if (!seen.has(k)) this.pieces.delete(k);
    }
  }

  shake(): void {
    this.shakeUntil = performance.now() + 350;
  }

  /** Celebration burst from every placed piece. */
  celebrate(): void {
    const golds = ['#e8b64c', '#ffe9b0', '#e0455a', '#4cc276', '#cfc4f0'];
    for (const [k] of this.pieces) {
      const r = Math.floor(k / this.size);
      const c = k % this.size;
      const cx = this.pad + (c + 0.5) * this.cell;
      const cy = this.pad + (r + 0.5) * this.cell;
      for (let i = 0; i < 14; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 60 + Math.random() * 160;
        this.particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 60,
          life: 0,
          maxLife: 0.9 + Math.random() * 0.7,
          size: 2 + Math.random() * 3.5,
          color: golds[Math.floor(Math.random() * golds.length)],
        });
      }
    }
  }

  private hitTest(e: PointerEvent): { r: number; c: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - this.pad;
    const y = e.clientY - rect.top - this.pad;
    const c = Math.floor(x / this.cell);
    const r = Math.floor(y / this.cell);
    if (r < 0 || r >= this.size || c < 0 || c >= this.size) return null;
    return { r, c };
  }

  // ------------------------------------------------------------- rendering

  private lastTime = 0;

  private loop(now: number): void {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.draw(now, dt);
    this.raf = requestAnimationFrame(this.loop);
  }

  private draw(now: number, dt: number): void {
    const { ctx } = this;
    const game = this.game;
    if (!game) return;
    const n = this.size;
    const px = n * this.cell + this.pad * 2;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, px, px);

    // conflict shake
    if (now < this.shakeUntil) {
      const t = (this.shakeUntil - now) / 350;
      ctx.translate(Math.sin(now * 0.09) * 3 * t, 0);
    }

    // frame
    ctx.fillStyle = COLORS.frameEdge;
    this.roundRect(ctx, 0, 0, px, px, 10);
    ctx.fill();
    ctx.fillStyle = COLORS.frame;
    this.roundRect(ctx, 2, 2, px - 4, px - 4, 8);
    ctx.fill();

    // squares
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const x = this.pad + c * this.cell;
        const y = this.pad + r * this.cell;
        const k = r * n + c;
        if (game.blocked.has(k)) {
          this.drawBlocked(x, y, k);
          continue;
        }
        ctx.fillStyle = (r + c) % 2 ? COLORS.dark : COLORS.light;
        ctx.fillRect(x, y, this.cell, this.cell);
        // subtle top-light gradient for depth
        const grad = ctx.createLinearGradient(x, y, x, y + this.cell);
        grad.addColorStop(0, 'rgba(255,255,255,0.10)');
        grad.addColorStop(0.25, 'rgba(255,255,255,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.07)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, this.cell, this.cell);

        if (game.conflicts.cells.has(k)) {
          const pulse = 0.75 + 0.25 * Math.sin(now * 0.008);
          ctx.globalAlpha = pulse;
          ctx.fillStyle = COLORS.conflictFill;
          ctx.fillRect(x, y, this.cell, this.cell);
          ctx.globalAlpha = 1;
        }
        if (game.ruleBad.has(k)) {
          ctx.fillStyle = COLORS.ruleFill;
          ctx.fillRect(x, y, this.cell, this.cell);
        }
        if (this.hover && this.hover.r === r && this.hover.c === c && !game.board[r][c]) {
          ctx.fillStyle = COLORS.hover;
          ctx.beginPath();
          ctx.arc(x + this.cell / 2, y + this.cell / 2, this.cell * 0.18, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // sudoku box lines
    if (game.level.rule === 'box') {
      const bh = game.level.boxH!;
      const bw = game.level.boxW!;
      ctx.strokeStyle = COLORS.boxLine;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      for (let c = bw; c < n; c += bw) {
        const x = this.pad + c * this.cell;
        ctx.beginPath();
        ctx.moveTo(x, this.pad + 2);
        ctx.lineTo(x, this.pad + n * this.cell - 2);
        ctx.stroke();
      }
      for (let r = bh; r < n; r += bh) {
        const y = this.pad + r * this.cell;
        ctx.beginPath();
        ctx.moveTo(this.pad + 2, y);
        ctx.lineTo(this.pad + n * this.cell - 2, y);
        ctx.stroke();
      }
    }

    // attack lines (under pieces)
    if (game.conflicts.pairs.length) {
      ctx.strokeStyle = COLORS.conflict;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.setLineDash([7, 7]);
      ctx.lineDashOffset = -(now * 0.02) % 14;
      ctx.globalAlpha = 0.85;
      for (const [r1, c1, r2, c2] of game.conflicts.pairs) {
        ctx.beginPath();
        ctx.moveTo(this.pad + (c1 + 0.5) * this.cell, this.pad + (r1 + 0.5) * this.cell);
        ctx.lineTo(this.pad + (c2 + 0.5) * this.cell, this.pad + (r2 + 0.5) * this.cell);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // pieces
    for (const [k, vis] of this.pieces) {
      const r = Math.floor(k / n);
      const c = k % n;
      const age = (now - vis.bornAt) / 180;
      const t = Math.min(1, age);
      const scale = t >= 1 ? 1 : 0.4 + 0.6 * easeOutBack(t);
      const inConflict = game.conflicts.cells.has(k);
      this.drawPiece(r, c, vis, scale, inConflict, now);
    }

    // particles
    if (this.particles.length) {
      for (const p of this.particles) {
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 240 * dt;
        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        if (alpha <= 0) continue;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      this.particles = this.particles.filter(p => p.life < p.maxLife);
    }
  }

  private drawBlocked(x: number, y: number, seed: number): void {
    const { ctx } = this;
    ctx.fillStyle = COLORS.blocked;
    ctx.fillRect(x, y, this.cell, this.cell);
    // deterministic crack lines per cell
    ctx.strokeStyle = COLORS.crack;
    ctx.lineWidth = 2;
    const rnd = (i: number): number => {
      const v = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453;
      return v - Math.floor(v);
    };
    ctx.beginPath();
    let cx = x + rnd(0) * this.cell;
    let cy = y + 2;
    ctx.moveTo(cx, cy);
    for (let i = 1; i <= 4; i++) {
      cx = x + rnd(i) * this.cell;
      cy = y + (i / 4) * (this.cell - 4) + 2;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 2, y + rnd(7) * this.cell);
    ctx.lineTo(x + this.cell * 0.5 + rnd(8) * this.cell * 0.4, y + rnd(9) * this.cell);
    ctx.stroke();
  }

  private drawPiece(
    r: number,
    c: number,
    vis: PieceVisual,
    scale: number,
    inConflict: boolean,
    now: number,
  ): void {
    const { ctx } = this;
    const cx = this.pad + (c + 0.5) * this.cell;
    const cy = this.pad + (r + 0.5) * this.cell;
    const fontSize = this.cell * 0.72 * scale;

    // ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + this.cell * 0.28, this.cell * 0.26 * scale, this.cell * 0.09 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = `${fontSize}px "Segoe UI Symbol", "Segoe UI", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let color = vis.given ? COLORS.pieceGiven : COLORS.piece;
    if (inConflict) {
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.012);
      color = pulse > 0.5 ? COLORS.conflict : '#a3243a';
    }
    ctx.shadowColor = 'rgba(255,255,255,0.3)';
    ctx.shadowOffsetY = 1.5;
    ctx.shadowBlur = 1;
    ctx.fillStyle = color;
    ctx.fillText(GLYPHS[vis.p], cx, cy + this.cell * 0.02);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, rad: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }
}
