import {
  W, H, COLS, R, ROW_H, MAX_ROWS,
  SHOOTER_X, SHOOTER_Y, DANGER_Y,
  PROJECTILE_SPEED, SHOTS_PER_DROP, MATCH_MIN, AIM_LIMIT,
  COLORS, colorsForLevel, rowsForLevel,
} from './config.js';
import { Grid } from './grid.js';
import { Particles } from './particles.js';

const TAU = Math.PI * 2;
const HIT_DIST = R * 1.8;
const NEXT_X = SHOOTER_X + 84;
const NEXT_Y = SHOOTER_Y + 6;

/* ---------- Pre-rendered bubble sprites (crisp gradients, cheap to draw) ---------- */

const SPRITE_SIZE = 96;
const spriteCache = [];

function bubbleSprite(colorIdx) {
  if (spriteCache[colorIdx]) return spriteCache[colorIdx];
  const c = COLORS[colorIdx];
  const s = SPRITE_SIZE;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const g = cv.getContext('2d');
  const cx = s / 2, cy = s / 2, r = s / 2 - 2;

  // Body
  const grad = g.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.1, cx, cy, r);
  grad.addColorStop(0, c.light);
  grad.addColorStop(0.45, c.base);
  grad.addColorStop(1, c.dark);
  g.fillStyle = grad;
  g.beginPath();
  g.arc(cx, cy, r, 0, TAU);
  g.fill();

  // Inner rim light at the bottom (backscatter)
  const rim = g.createRadialGradient(cx, cy + r * 0.5, r * 0.3, cx, cy + r * 0.2, r);
  rim.addColorStop(0, 'rgba(255,255,255,0)');
  rim.addColorStop(0.85, 'rgba(255,255,255,0)');
  rim.addColorStop(1, 'rgba(255,255,255,0.22)');
  g.fillStyle = rim;
  g.beginPath();
  g.arc(cx, cy, r, 0, TAU);
  g.fill();

  // Specular highlight
  g.save();
  g.translate(cx - r * 0.38, cy - r * 0.42);
  g.rotate(-0.5);
  const spec = g.createRadialGradient(0, 0, 0, 0, 0, r * 0.42);
  spec.addColorStop(0, 'rgba(255,255,255,0.95)');
  spec.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = spec;
  g.beginPath();
  g.ellipse(0, 0, r * 0.42, r * 0.28, 0, 0, TAU);
  g.fill();
  g.restore();

  spriteCache[colorIdx] = cv;
  return cv;
}

function drawBubble(ctx, colorIdx, x, y, radius = R, alpha = 1) {
  const s = radius * 2 * (SPRITE_SIZE / (SPRITE_SIZE - 4));
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.drawImage(bubbleSprite(colorIdx), x - s / 2, y - s / 2, s, s);
  if (alpha < 1) ctx.globalAlpha = 1;
}

const randInt = (n) => Math.floor(Math.random() * n);

/* ================================ Game ================================ */

export class Game {
  /**
   * @param sound Sound instance
   * @param ui    { updateScore, updateLevel, showOverlay({title,sub,btn,onClick}), hideOverlay }
   */
  constructor(sound, ui) {
    this.sound = sound;
    this.ui = ui;
    this.grid = new Grid();
    this.particles = new Particles();
    this.best = Number(localStorage.getItem('bs-best') || 0);

    this.state = 'menu'; // menu | playing | paused | clearing | dying | levelclear | gameover
    this.time = 0;
    this.level = 1;
    this.score = 0;
    this.combo = 0;

    this.ceilingY = 0;
    this.targetCeilingY = 0;
    this.shotsLeft = SHOTS_PER_DROP;

    this.aimAngle = 0;
    this.aimPoint = null; // logical pointer pos while aiming
    this.projectile = null;
    this.current = 0;
    this.next = 1;
    this.recoil = 0;
    this.swapPulse = 0;

    this.popAnims = [];
    this.fallers = [];
    this.shake = 0;
    this.flash = 0;
    this.stateTimer = 0;

    // Decorative drifting background bubbles
    this.bgBubbles = Array.from({ length: 14 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 8 + Math.random() * 26,
      v: 6 + Math.random() * 14,
      a: 0.03 + Math.random() * 0.06,
    }));

    this.ui.updateScore(this.score, this.best);
    this.ui.updateLevel(this.level);
    this.showMenu();
  }

  /* ---------------- State / flow ---------------- */

  showMenu() {
    this.state = 'menu';
    this.ui.showOverlay({
      title: 'Bubble Shooter',
      sub: 'Pop groups of three or more.\nClear the board before it reaches the line.',
      btn: 'Play',
      onClick: () => this.newGame(),
    });
  }

  newGame() {
    this.score = 0;
    this.combo = 0;
    this.level = 1;
    this.startLevel();
  }

  startLevel() {
    this.grid = new Grid();
    this.particles.clear();
    this.popAnims = [];
    this.fallers = [];
    this.projectile = null;
    this.ceilingY = 0;
    this.targetCeilingY = 0;
    this.shotsLeft = SHOTS_PER_DROP;
    this.recoil = 0;
    this.shake = 0;
    this.flash = 0;

    const numColors = colorsForLevel(this.level);
    const rows = rowsForLevel(this.level);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < COLS; col++) {
        let color;
        const left = col > 0 ? this.grid.get(col - 1, row) : null;
        const up = row > 0 ? this.grid.get(col, row - 1) : null;
        if (left && Math.random() < 0.35) color = left.color;
        else if (up && Math.random() < 0.3) color = up.color;
        else color = randInt(numColors);
        this.grid.set(col, row, { color, wobble: null });
      }
    }

    this.current = this.pickColor();
    this.next = this.pickColor();
    this.ui.updateScore(this.score, this.best);
    this.ui.updateLevel(this.level);
    this.ui.hideOverlay();
    this.state = 'playing';
  }

  pickColor() {
    const used = this.grid.colorsInUse();
    if (used.length === 0) return randInt(colorsForLevel(this.level));
    return used[randInt(used.length)];
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.ui.showOverlay({
        title: 'Paused',
        sub: 'Press P or Esc to resume.',
        btn: 'Resume',
        onClick: () => {
          this.state = 'playing';
          this.ui.hideOverlay();
        },
      });
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this.ui.hideOverlay();
    }
  }

  addScore(points) {
    this.score += points;
    if (this.score > this.best) {
      this.best = this.score;
      localStorage.setItem('bs-best', String(this.best));
    }
    this.ui.updateScore(this.score, this.best);
  }

  triggerLevelClear() {
    this.state = 'clearing';
    this.stateTimer = 1.0;
    const bonus = 500 + this.level * 250;
    this.addScore(bonus);
    this.particles.text(W / 2, H / 2 - 60, `BOARD CLEAR  +${bonus}`, { size: 24, color: '#f6b545' });
    this.flash = 0.35;
    this.sound.levelUp();
  }

  triggerGameOver() {
    this.state = 'dying';
    this.stateTimer = 1.7;
    this.sound.gameOver();
    this.shake = Math.max(this.shake, 7);
    // Every remaining bubble tumbles off the board.
    let i = 0;
    this.grid.forEach((cell, col, row) => {
      this.fallers.push({
        x: this.grid.cellX(col, row),
        y: this.ceilingY + this.grid.cellY(row),
        vx: (Math.random() - 0.5) * 160,
        vy: -60 - Math.random() * 120,
        color: cell.color,
        delay: i * 0.015 + Math.random() * 0.1,
        t: 0,
      });
      i++;
    });
    this.grid = new Grid();
  }

  /* ---------------- Input ---------------- */

  pointerMove(x, y) {
    if (this.state !== 'playing') return;
    this.aimPoint = { x, y };
    const dx = x - SHOOTER_X;
    const dy = y - SHOOTER_Y;
    if (dy < -8) {
      const a = Math.atan2(dx, -dy);
      this.aimAngle = Math.max(-AIM_LIMIT, Math.min(AIM_LIMIT, a));
    } else {
      // Pointer at/below the shooter: pin to the nearest side limit.
      this.aimAngle = dx >= 0 ? AIM_LIMIT : -AIM_LIMIT;
    }
  }

  pointerUp(x, y) {
    if (this.state !== 'playing') return;
    // Tap on the "next" bubble swaps instead of firing.
    if (Math.hypot(x - NEXT_X, y - NEXT_Y) < 30) {
      this.swap();
      return;
    }
    this.pointerMove(x, y);
    this.fire();
  }

  swap() {
    if (this.state !== 'playing' || this.projectile) return;
    [this.current, this.next] = [this.next, this.current];
    this.swapPulse = 1;
    this.sound.swap();
  }

  fire() {
    if (this.state !== 'playing' || this.projectile) return;
    const a = this.aimAngle;
    this.projectile = {
      x: SHOOTER_X + Math.sin(a) * (R + 6),
      y: SHOOTER_Y - Math.cos(a) * (R + 6),
      vx: Math.sin(a) * PROJECTILE_SPEED,
      vy: -Math.cos(a) * PROJECTILE_SPEED,
      color: this.current,
    };
    this.current = this.next;
    this.next = this.pickColor();
    this.recoil = 1;
    this.sound.shoot();
  }

  /* ---------------- Physics & resolution ---------------- */

  /** Nearest empty, connected cell to (x, y); never mutates. */
  findSnapCell(x, y) {
    const rowGuess = Math.round((y - this.ceilingY - R) / ROW_H);
    let best = null;
    let bestDist = Infinity;
    for (let row = Math.max(0, rowGuess - 2); row <= Math.min(MAX_ROWS - 1, rowGuess + 2); row++) {
      for (let col = 0; col < COLS; col++) {
        if (this.grid.get(col, row)) continue;
        if (row !== 0 && !this.grid.hasOccupiedNeighbor(col, row)) continue;
        const cx = this.grid.cellX(col, row);
        const cy = this.ceilingY + this.grid.cellY(row);
        const d = (cx - x) ** 2 + (cy - y) ** 2;
        if (d < bestDist) {
          bestDist = d;
          best = { col, row, x: cx, y: cy };
        }
      }
    }
    return best;
  }

  hitsGrid(x, y) {
    if (y <= this.ceilingY + R) return true;
    let hit = false;
    this.grid.forEach((cell, col, row) => {
      if (hit) return;
      const cx = this.grid.cellX(col, row);
      const cy = this.ceilingY + this.grid.cellY(row);
      if ((cx - x) ** 2 + (cy - y) ** 2 < HIT_DIST * HIT_DIST) hit = true;
    });
    return hit;
  }

  updateProjectile(dt) {
    const p = this.projectile;
    if (!p) return;
    const dist = PROJECTILE_SPEED * dt;
    const steps = Math.max(1, Math.ceil(dist / (R * 0.4)));
    const stepT = dt / steps;
    for (let i = 0; i < steps; i++) {
      // Velocity is re-read every substep so a mid-frame wall bounce
      // changes direction immediately (otherwise the ball rides the wall).
      p.x += p.vx * stepT;
      p.y += p.vy * stepT;
      if (p.x < R) { p.x = 2 * R - p.x; p.vx = -p.vx; this.sound.bounce(); }
      else if (p.x > W - R) { p.x = 2 * (W - R) - p.x; p.vx = -p.vx; this.sound.bounce(); }
      if (this.hitsGrid(p.x, p.y)) {
        this.landProjectile();
        return;
      }
      if (p.y < -R * 2 || p.y > H + R * 2) { // safety net
        this.projectile = null;
        return;
      }
    }
  }

  landProjectile() {
    const p = this.projectile;
    this.projectile = null;
    const cell = this.findSnapCell(p.x, p.y);
    if (!cell) return; // board is somehow unreachable — drop the shot
    this.grid.set(cell.col, cell.row, { color: p.color, wobble: null });
    this.sound.attach();
    this.rippleFrom(cell.col, cell.row, p);
    this.resolveLanding(cell.col, cell.row);
  }

  /** Small spring impulse on the neighbors of the landing cell. */
  rippleFrom(col, row, impact) {
    for (const [nc, nr] of this.grid.neighbors(col, row)) {
      const cell = this.grid.get(nc, nr);
      if (!cell) continue;
      const cx = this.grid.cellX(nc, nr);
      const cy = this.ceilingY + this.grid.cellY(nr);
      const dx = cx - impact.x;
      const dy = cy - impact.y;
      const len = Math.hypot(dx, dy) || 1;
      cell.wobble = { x: (dx / len) * 3.5, y: (dy / len) * 3.5, t: 0 };
    }
  }

  resolveLanding(col, row) {
    const landX = this.grid.cellX(col, row);
    const landY = this.ceilingY + this.grid.cellY(row);
    const cluster = this.grid.matchCluster(col, row);
    let points = 0;
    let popped = 0;
    let dropped = 0;

    if (cluster.length >= MATCH_MIN) {
      popped = cluster.length;
      cluster.forEach(([c, r], i) => {
        const delay = i * 0.05;
        this.popAnims.push({
          x: this.grid.cellX(c, r),
          y: this.ceilingY + this.grid.cellY(r),
          color: this.grid.get(c, r).color,
          burstAt: 0.06 + delay,
          t: 0,
        });
        this.sound.pop(i, 0.06 + delay);
        this.grid.remove(c, r);
      });

      const floating = this.grid.floatingClusters();
      dropped = floating.length;
      const fallDelay = 0.06 + popped * 0.05;
      floating.forEach(([c, r], i) => {
        const cell = this.grid.get(c, r);
        this.fallers.push({
          x: this.grid.cellX(c, r),
          y: this.ceilingY + this.grid.cellY(r),
          vx: (Math.random() - 0.5) * 120,
          vy: -40 - Math.random() * 80,
          color: cell.color,
          delay: fallDelay + i * 0.02,
          t: 0,
        });
        this.sound.fall(i, fallDelay + i * 0.02);
        this.grid.remove(c, r);
      });

      this.combo = Math.min(this.combo + 1, 6);
      const mult = Math.min(this.combo, 4);
      points = (popped * 10 + dropped * 25) * mult;
      this.addScore(points);

      const px = Math.max(40, Math.min(W - 40, landX));
      const py = Math.max(this.ceilingY + 30, landY - 10);
      this.particles.text(px, py, `+${points}`, {
        size: popped + dropped >= 8 ? 22 : 16,
        color: '#ffffff',
      });
      if (this.combo >= 2) {
        this.particles.text(px, py + 26, `COMBO ×${mult}`, { size: 14, color: '#f6b545' });
      }
      if (popped + dropped >= 6) {
        this.shake = Math.max(this.shake, Math.min(3 + (popped + dropped) * 0.4, 9));
        this.flash = 0.18;
      }
    } else {
      this.combo = 0;
    }

    // Keep the queue honest: only offer colors that still exist on the board.
    const used = new Set(this.grid.colorsInUse());
    if (used.size > 0) {
      if (!used.has(this.current)) this.current = this.pickColor();
      if (!used.has(this.next)) this.next = this.pickColor();
    }

    if (this.grid.isEmpty()) {
      this.triggerLevelClear();
      return;
    }

    // Ceiling pressure
    this.shotsLeft--;
    if (this.shotsLeft <= 0) {
      this.shotsLeft = SHOTS_PER_DROP;
      this.targetCeilingY += ROW_H;
      this.sound.drop();
      this.shake = Math.max(this.shake, 2.5);
    }

    // Danger check against where the ceiling is heading.
    const bottom = this.grid.bottomRow();
    if (bottom >= 0) {
      const lowest = this.targetCeilingY + this.grid.cellY(bottom) + R;
      if (lowest > DANGER_Y) this.triggerGameOver();
    }
  }

  /* ---------------- Trajectory preview ---------------- */

  computeTrajectory() {
    const pts = [];
    let x = SHOOTER_X + Math.sin(this.aimAngle) * (R + 6);
    let y = SHOOTER_Y - Math.cos(this.aimAngle) * (R + 6);
    let vx = Math.sin(this.aimAngle);
    let vy = -Math.cos(this.aimAngle);
    const step = R * 0.4;
    pts.push({ x, y });
    for (let i = 0; i < 400; i++) {
      x += vx * step;
      y += vy * step;
      if (x < R) { x = 2 * R - x; vx = -vx; }
      else if (x > W - R) { x = 2 * (W - R) - x; vx = -vx; }
      pts.push({ x, y });
      if (this.hitsGrid(x, y)) break;
      if (y < -R) break;
    }
    return pts;
  }

  /* ---------------- Update ---------------- */

  update(dt) {
    this.time += dt;

    for (const b of this.bgBubbles) {
      b.y -= b.v * dt;
      if (b.y < -b.r) {
        b.y = H + b.r;
        b.x = Math.random() * W;
      }
    }

    if (this.state === 'menu' || this.state === 'paused') return;

    // Smooth ceiling descent
    this.ceilingY += (this.targetCeilingY - this.ceilingY) * Math.min(1, dt * 5);

    // Bubble wobble springs
    this.grid.forEach((cell) => {
      if (cell.wobble) {
        cell.wobble.t += dt;
        if (cell.wobble.t > 0.7) cell.wobble = null;
      }
    });

    this.updateProjectile(dt);

    // Pop animations → particle bursts
    for (const a of this.popAnims) {
      a.t += dt;
      if (a.t >= a.burstAt && !a.burst) {
        a.burst = true;
        this.particles.burst(a.x, a.y, COLORS[a.color].base, 12);
        this.particles.ring(a.x, a.y, COLORS[a.color].light);
      }
    }
    this.popAnims = this.popAnims.filter((a) => !a.burst);

    // Falling bubbles
    for (const f of this.fallers) {
      f.t += dt;
      if (f.t < f.delay) continue;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy += 1500 * dt;
    }
    this.fallers = this.fallers.filter((f) => f.y < H + R * 2);

    this.particles.update(dt);
    this.shake *= Math.exp(-6 * dt);
    this.flash = Math.max(0, this.flash - dt * 1.4);
    this.recoil = Math.max(0, this.recoil - dt * 5);
    this.swapPulse = Math.max(0, this.swapPulse - dt * 4);

    // Deferred state transitions (let the animations finish first)
    if (this.state === 'clearing' || this.state === 'dying') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        if (this.state === 'clearing') {
          this.state = 'levelclear';
          this.level++;
          this.ui.showOverlay({
            title: `Level ${this.level - 1} Clear`,
            sub: `${this.score.toLocaleString()} points`,
            btn: 'Continue',
            onClick: () => this.startLevel(),
          });
        } else {
          this.state = 'gameover';
          const isBest = this.score >= this.best && this.score > 0;
          this.ui.showOverlay({
            title: 'Game Over',
            sub: `${this.score.toLocaleString()} points · level ${this.level}${isBest ? '\nNew personal best' : ''}`,
            btn: 'Play Again',
            onClick: () => this.newGame(),
          });
        }
      }
    }
  }

  /* ---------------- Render ---------------- */

  render(ctx) {
    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#101a33');
    bg.addColorStop(0.55, '#0c1226');
    bg.addColorStop(1, '#080c1a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    for (const b of this.bgBubbles) {
      ctx.globalAlpha = b.a;
      ctx.strokeStyle = '#8ab6ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Camera shake
    ctx.save();
    if (this.shake > 0.05) {
      ctx.translate((Math.random() - 0.5) * 2 * this.shake, (Math.random() - 0.5) * 2 * this.shake);
    }

    this.renderCeiling(ctx);
    this.renderDangerLine(ctx);

    // Grid bubbles
    this.grid.forEach((cell, col, row) => {
      let x = this.grid.cellX(col, row);
      let y = this.ceilingY + this.grid.cellY(row);
      if (cell.wobble) {
        const w = cell.wobble;
        const k = Math.sin(w.t * 22) * Math.exp(-w.t * 6);
        x += w.x * k;
        y += w.y * k;
      }
      drawBubble(ctx, cell.color, x, y);
    });

    // Popping bubbles (swell before bursting)
    for (const a of this.popAnims) {
      const k = Math.min(1, a.t / a.burstAt);
      drawBubble(ctx, a.color, a.x, a.y, R * (1 + 0.3 * k));
      ctx.globalAlpha = k * 0.45;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(a.x, a.y, R * (1 + 0.3 * k), 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Falling bubbles
    for (const f of this.fallers) {
      if (f.t >= f.delay) drawBubble(ctx, f.color, f.x, f.y);
      else drawBubble(ctx, f.color, f.x, f.y); // waiting to detach — still visible
    }

    if (this.state === 'playing' && !this.projectile && this.aimPoint) {
      this.renderTrajectory(ctx);
    }

    if (this.projectile) {
      const p = this.projectile;
      // Motion trail
      ctx.globalAlpha = 0.25;
      const nv = Math.hypot(p.vx, p.vy) || 1;
      drawBubble(ctx, p.color, p.x - (p.vx / nv) * R * 0.9, p.y - (p.vy / nv) * R * 0.9, R * 0.8);
      ctx.globalAlpha = 1;
      drawBubble(ctx, p.color, p.x, p.y);
    }

    this.renderShooter(ctx);
    this.particles.render(ctx);
    ctx.restore();

    if (this.flash > 0) {
      ctx.globalAlpha = this.flash;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  renderCeiling(ctx) {
    const y = this.ceilingY;
    if (y > 0) {
      ctx.fillStyle = 'rgba(10, 14, 34, 0.92)';
      ctx.fillRect(0, 0, W, y);
      // Subtle hatch so descent is visible
      ctx.strokeStyle = 'rgba(138, 182, 255, 0.07)';
      ctx.lineWidth = 1;
      for (let x = -H; x < W; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + y, y);
        ctx.stroke();
      }
    }
    // Edge bar with glow
    const grad = ctx.createLinearGradient(0, y - 6, 0, y + 3);
    grad.addColorStop(0, '#3b4a86');
    grad.addColorStop(1, '#232c58');
    ctx.fillStyle = grad;
    ctx.fillRect(0, Math.max(0, y - 6), W, y < 6 ? y + 3 : 9);
    ctx.fillStyle = 'rgba(138, 182, 255, 0.5)';
    ctx.fillRect(0, y + 1, W, 1.5);

    // Shots-until-drop pips
    const pipY = y + 12;
    for (let i = 0; i < SHOTS_PER_DROP; i++) {
      const filled = i < this.shotsLeft;
      ctx.globalAlpha = filled ? 0.85 : 0.2;
      ctx.fillStyle = filled ? (this.shotsLeft <= 2 ? '#ff6b7d' : '#8ab6ff') : '#8ab6ff';
      ctx.beginPath();
      ctx.arc(W - 14 - i * 11, pipY, 2.6, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  renderDangerLine(ctx) {
    const bottom = this.grid.bottomRow();
    const lowestY = bottom >= 0 ? this.ceilingY + this.grid.cellY(bottom) + R : 0;
    const near = lowestY > DANGER_Y - ROW_H * 2.5;
    const pulse = near ? 0.35 + 0.3 * Math.sin(this.time * 6) : 0.16;
    ctx.strokeStyle = near ? `rgba(255, 90, 110, ${pulse})` : `rgba(160, 175, 220, ${pulse})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = -this.time * 20;
    ctx.beginPath();
    ctx.moveTo(0, DANGER_Y);
    ctx.lineTo(W, DANGER_Y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  renderTrajectory(ctx) {
    const pts = this.computeTrajectory();
    if (pts.length < 2) return;
    const spacing = 17;
    const phase = (this.time * 90) % spacing;
    let acc = -phase;
    const c = COLORS[this.current];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
    let traveled = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const seg = Math.hypot(b.x - a.x, b.y - a.y);
      while (acc + spacing <= traveled + seg) {
        acc += spacing;
        const k = (acc - traveled) / seg;
        const x = a.x + (b.x - a.x) * k;
        const y = a.y + (b.y - a.y) * k;
        const fade = 1 - (acc / total) * 0.65;
        ctx.globalAlpha = Math.max(0.12, fade * 0.55);
        ctx.fillStyle = c.light;
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, TAU);
        ctx.fill();
      }
      traveled += seg;
    }
    ctx.globalAlpha = 1;

    // Ghost of the predicted landing cell
    const end = pts[pts.length - 1];
    const snap = this.findSnapCell(end.x, end.y);
    if (snap) {
      ctx.globalAlpha = 0.18 + 0.08 * Math.sin(this.time * 5);
      ctx.fillStyle = c.base;
      ctx.beginPath();
      ctx.arc(snap.x, snap.y, R - 1, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = c.light;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  renderShooter(ctx) {
    const x = SHOOTER_X, y = SHOOTER_Y;

    // Platform
    const base = ctx.createRadialGradient(x, y, 4, x, y, 40);
    base.addColorStop(0, '#2a355f');
    base.addColorStop(1, '#161d3d');
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.arc(x, y, 34, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(138, 182, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Barrel chevrons pointing along the aim
    if (this.state === 'playing' || this.state === 'paused') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(this.aimAngle);
      ctx.strokeStyle = 'rgba(238, 241, 255, 0.75)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let i = 0; i < 2; i++) {
        const d = 40 + i * 11;
        ctx.globalAlpha = 0.8 - i * 0.3;
        ctx.beginPath();
        ctx.moveTo(-7, -d + 7);
        ctx.lineTo(0, -d);
        ctx.lineTo(7, -d + 7);
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // Loaded bubble (with recoil kick)
    if ((this.state === 'playing' || this.state === 'paused') || this.projectile) {
      const kick = this.recoil * 6;
      const bx = x - Math.sin(this.aimAngle) * kick;
      const by = y + Math.cos(this.aimAngle) * kick;
      const pulse = 1 + this.swapPulse * 0.15;
      drawBubble(ctx, this.current, bx, by, R * pulse);
    }

    // Next bubble + label
    if (this.state === 'playing' || this.state === 'paused') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.arc(NEXT_X, NEXT_Y, 24, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(138, 182, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
      drawBubble(ctx, this.next, NEXT_X, NEXT_Y, R * (0.66 + this.swapPulse * 0.1));
      ctx.fillStyle = 'rgba(111, 121, 148, 0.95)';
      ctx.font = '800 8px "Nunito", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('N E X T', NEXT_X, NEXT_Y + 34);
    }
  }
}
