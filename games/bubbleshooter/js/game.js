import {
  W, H, COLS, R, ROW_H, MAX_ROWS,
  SHOOTER_X, SHOOTER_Y, DANGER_Y,
  PROJECTILE_SPEED, SHOTS_PER_DROP, MATCH_MIN, AIM_LIMIT,
  COLORS, colorsForLevel, rowsForLevel,
} from './config.js';
import { Grid } from './grid.js';
import { Particles } from './particles.js';
import {
  defaultMods, rollPowerups, getPowerupDef,
  CHARGE_MAX, CHARGE_PER_LEVEL, PER_SHOT_CHARGE_CAP, CHARGE_READY_DELAY,
  POWERUP_DURATION, MAX_ACTIVE,
} from './powerups.js';

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

    this.state = 'menu'; // menu | playing | paused | clearing | dying | levelclear | gameover | powerup
    this.time = 0;
    this.level = 1;
    this.score = 0;
    this.combo = 0;

    this.ceilingY = 0;
    this.targetCeilingY = 0;
    this.shotsLeft = SHOTS_PER_DROP;

    this.aimAngle = 0;
    this.aimPoint = null; // logical pointer pos while aiming
    this.projectiles = []; // multiple in flight when Wide Shot is active
    this.current = 0;
    this.next = 1;
    this.recoil = 0;
    this.swapPulse = 0;

    // --- Roguelite layer (charge meter → powerup choice, ported from
    // Voidburst but reworked around this engine's own mechanics) ---
    this.mods = defaultMods();
    this.activePowerups = []; // [{ id, remaining }]
    this.charge = 0;
    this._pendingPowerupChoice = null;
    this._chargeReadyTimer = 0; // counts down after the meter fills, before the modal opens

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
    // Roguelite state resets per run, not per level — powerups picked
    // mid-run persist across level clears until they time out.
    this.mods = defaultMods();
    this.activePowerups = [];
    this.charge = 0;
    this.ui.updateCharge(0);
    this.ui.updateActivePowerups([]);
    this.startLevel();
  }

  startLevel() {
    this.grid = new Grid();
    this.particles.clear();
    this.popAnims = [];
    this.fallers = [];
    this.projectiles = [];
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

  /* ---------------- Roguelite charge / powerups ---------------- */

  /** Meter requirement rises gently with level, so powerups don't arrive
   *  at a constant clip once boards (and cascades) get bigger. */
  chargeRequired() {
    return CHARGE_MAX + (this.level - 1) * CHARGE_PER_LEVEL;
  }

  addCharge(n) {
    if (this.charge >= this.chargeRequired()) return; // already banked, waiting on modal/delay
    // Cap how much a single shot can contribute — a huge cascade still
    // feels great (score, combo text, screen shake all scale with it
    // uncapped), but it can't alone jump the meter from empty to full.
    // Filling the bar should read as "a handful of good shots in a row".
    const gain = Math.min(n, PER_SHOT_CHARGE_CAP);
    this.charge = Math.min(this.chargeRequired(), this.charge + gain);
    this.ui.updateCharge(this.charge / this.chargeRequired());
    if (this.charge >= this.chargeRequired() && this._chargeReadyTimer <= 0) {
      // Don't cut straight to the modal — let the pop/cascade that just
      // filled the meter finish playing out first, and flag the meter as
      // "ready" so the HUD can visibly celebrate for a beat.
      this._chargeReadyTimer = CHARGE_READY_DELAY;
      this.ui.setChargeReady(true);
      this.sound.chargeReady?.();
    }
  }

  offerPowerup() {
    this._prePowerupState = this.state;
    this.state = 'powerup';
    this.ui.setChargeReady(false);
    this._pendingPowerupChoice = rollPowerups(3, this.activePowerups.map((p) => p.id));
    this.sound.levelUp();
    this.ui.showPowerupChoice(this._pendingPowerupChoice, (chosen) => this.choosePowerup(chosen));
  }

  choosePowerup(powerup) {
    const existing = this.activePowerups.find((p) => p.id === powerup.id);
    if (existing) {
      existing.remaining = POWERUP_DURATION;
    } else {
      if (this.activePowerups.length >= MAX_ACTIVE) {
        // Evict whichever active powerup has the least time left.
        let minIdx = 0;
        for (let i = 1; i < this.activePowerups.length; i++) {
          if (this.activePowerups[i].remaining < this.activePowerups[minIdx].remaining) minIdx = i;
        }
        this.activePowerups.splice(minIdx, 1);
      }
      this.activePowerups.push({ id: powerup.id, remaining: POWERUP_DURATION });
    }
    this.recomputeMods();
    this.charge = 0;
    this._chargeReadyTimer = 0;
    this.ui.updateCharge(0);
    this.ui.updateActivePowerups(this.getActivePowerupView());
    this.ui.hideOverlay();
    this.sound.click();
    this.state = this._prePowerupState || 'playing';
  }

  recomputeMods() {
    this.mods = defaultMods();
    for (const ap of this.activePowerups) {
      const def = getPowerupDef(ap.id);
      if (def) def.apply(this.mods);
    }
  }

  getActivePowerupView() {
    return this.activePowerups.map((ap) => {
      const def = getPowerupDef(ap.id);
      return {
        id: ap.id,
        name: def?.name || ap.id,
        icon: def?.icon || 'coin',
        fraction: Math.max(0, Math.min(1, ap.remaining / POWERUP_DURATION)),
      };
    });
  }

  tickPowerups(dt) {
    if (!this.activePowerups.length) return;
    let changed = false;
    for (let i = this.activePowerups.length - 1; i >= 0; i--) {
      this.activePowerups[i].remaining -= dt;
      if (this.activePowerups[i].remaining <= 0) {
        this.activePowerups.splice(i, 1);
        changed = true;
      }
    }
    if (changed) this.recomputeMods();
    this.ui.updateActivePowerups(this.getActivePowerupView());
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
    if (this.state !== 'playing' || this.projectiles.length) return;
    [this.current, this.next] = [this.next, this.current];
    this.swapPulse = 1;
    this.sound.swap();
  }

  fire() {
    if (this.state !== 'playing' || this.projectiles.length) return;
    const a = this.aimAngle;
    const count = this.mods.shotCount;
    const speed = PROJECTILE_SPEED * this.mods.speedMult; // Slo-Mo Aim
    // Wide Shot fires a small spread instead of a single straight shot;
    // with count 1 this collapses to exactly the original behavior.
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.16;
      const sa = Math.max(-AIM_LIMIT, Math.min(AIM_LIMIT, a + spread));
      this.projectiles.push({
        x: SHOOTER_X + Math.sin(sa) * (R + 6),
        y: SHOOTER_Y - Math.cos(sa) * (R + 6),
        vx: Math.sin(sa) * speed,
        vy: -Math.cos(sa) * speed,
        color: this.current,
        rainbow: this.mods.rainbow,
      });
    }
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

  /** Advance every in-flight ball (usually 1, up to 3 with Wide Shot). */
  updateProjectile(dt) {
    if (!this.projectiles.length) return;

    // Iterate backwards since landing/removal splices out of the array.
    for (let idx = this.projectiles.length - 1; idx >= 0; idx--) {
      const p = this.projectiles[idx];
      const speed = Math.hypot(p.vx, p.vy) || PROJECTILE_SPEED;
      const dist = speed * dt;
      const steps = Math.max(1, Math.ceil(dist / (R * 0.4)));
      const stepT = dt / steps;
      let landed = false;
      for (let i = 0; i < steps; i++) {
        // Velocity is re-read every substep so a mid-frame wall bounce
        // changes direction immediately (otherwise the ball rides the wall).
        p.x += p.vx * stepT;
        p.y += p.vy * stepT;
        if (p.x < R) { p.x = 2 * R - p.x; p.vx = -p.vx; this.sound.bounce(); }
        else if (p.x > W - R) { p.x = 2 * (W - R) - p.x; p.vx = -p.vx; this.sound.bounce(); }
        if (this.hitsGrid(p.x, p.y)) {
          this.landProjectile(idx);
          landed = true;
          break;
        }
        if (p.y < -R * 2 || p.y > H + R * 2) { // safety net
          this.projectiles.splice(idx, 1);
          landed = true;
          break;
        }
      }
      if (landed) continue;
    }
  }

  landProjectile(idx) {
    const p = this.projectiles[idx];
    this.projectiles.splice(idx, 1);
    const cell = this.findSnapCell(p.x, p.y);
    if (!cell) return; // board is somehow unreachable — drop the shot

    // Rainbow Ball: morph to whichever occupied neighbor color is most
    // common around the landing spot, so it always joins the biggest
    // group available rather than keeping its original fired color.
    let landColor = p.color;
    if (p.rainbow) {
      const tally = new Map();
      for (const [nc, nr] of this.grid.neighbors(cell.col, cell.row)) {
        const nCell = this.grid.get(nc, nr);
        if (nCell) tally.set(nCell.color, (tally.get(nCell.color) || 0) + 1);
      }
      let bestColor = null, bestCount = 0;
      for (const [color, count] of tally) {
        if (count > bestCount) { bestCount = count; bestColor = color; }
      }
      if (bestColor !== null) landColor = bestColor;
    }

    this.grid.set(cell.col, cell.row, { color: landColor, wobble: null });
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
    let cluster = this.grid.matchCluster(col, row);
    const matchMin = this.mods.matchMinOverride ?? MATCH_MIN;
    let points = 0;
    let popped = 0;
    let dropped = 0;

    if (cluster.length >= matchMin) {
      // Color Bomb: escalate to every bubble of this color on the board.
      if (this.mods.colorWipe) {
        const targetColor = this.grid.get(col, row).color;
        const all = [];
        this.grid.forEach((cell, c, r) => { if (cell.color === targetColor) all.push([c, r]); });
        cluster = all;
      }
      // Big Bang: on clusters of 5+, pull in one extra ring of same-color
      // neighbors per stacked application (rarely more than 1-2 in practice).
      if (this.mods.popRadiusBonus > 0 && cluster.length >= 5) {
        const seen = new Set(cluster.map(([c, r]) => c + ',' + r));
        for (let shell = 0; shell < this.mods.popRadiusBonus; shell++) {
          const frontier = [...cluster];
          for (const [c, r] of frontier) {
            for (const [nc, nr] of this.grid.neighbors(c, r)) {
              const key = nc + ',' + nr;
              const cell = this.grid.get(nc, nr);
              if (cell && !seen.has(key)) { seen.add(key); cluster.push([nc, nr]); }
            }
          }
        }
      }

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
      points = Math.round((popped * 10 + dropped * 25) * mult * this.mods.scoreMult);
      this.addScore(points);

      // Charge meter fills with the directly-matched pop only — not the
      // floating-bubble bonus drop — so one lucky big cascade can't max it
      // in a single shot. Same rule Voidburst used, ported over.
      this.addCharge(popped);

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
      // The powerup modal (if the charge meter also maxed on this same
      // shot) opens on a short delay via _chargeReadyTimer in update(), so
      // it naturally arrives after this — whatever state is active when it
      // fires gets captured as _prePowerupState and restored afterward.
      this.triggerLevelClear();
      return;
    }

    // Ceiling pressure — Freeze powerup suspends the advance entirely.
    this.shotsLeft--;
    if (this.shotsLeft <= 0) {
      this.shotsLeft = SHOTS_PER_DROP;
      if (!this.mods.freezeCeiling) {
        this.targetCeilingY += ROW_H;
        this.sound.drop();
        this.shake = Math.max(this.shake, 2.5);
      }
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

    if (this.state === 'menu' || this.state === 'paused' || this.state === 'powerup') return;

    // Once the meter is full, count down a short grace period before the
    // choice modal actually opens — lets the cascade/particles that just
    // filled it finish playing out instead of a hard cut.
    if (this._chargeReadyTimer > 0) {
      this._chargeReadyTimer -= dt;
      if (this._chargeReadyTimer <= 0) {
        this._chargeReadyTimer = 0;
        this.offerPowerup();
      }
    }

    // Active powerups tick down in real time during live play only — not
    // while the choice modal is up, so reading the cards doesn't burn the
    // timer on whatever's already active.
    this.tickPowerups(dt);

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

    if (this.state === 'playing' && !this.projectiles.length && this.aimPoint) {
      this.renderTrajectory(ctx);
    }

    for (const p of this.projectiles) {
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
    if ((this.state === 'playing' || this.state === 'paused') || this.projectiles.length) {
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
