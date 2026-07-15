import { Application, Container, Graphics } from 'pixi.js';
import gsap from 'gsap';
import { Bubble, COLORS, BUBBLE_R } from './Bubble.js';
import { Grid, HEX_W, HEX_H } from './Grid.js';
import { AimLine } from './AimLine.js';
import { hslToHex } from './utils.js';
import { save, commitSave } from './save.js';
import {
  defaultMods, rollPowerups, getPowerupDef,
  WAVE_INTERVAL, DURATION_SECONDS, COOLDOWN_SECONDS,
} from './powerups.js';
import { upgradeValue } from './upgrades.js';

const MAX_ACTIVE_POWERUPS = 3;
const REROLL_BASE_COST    = 15;
const REROLL_COST_GROWTH  = 1.6;
const INITIAL_ROWS        = 5;
const GRID_COLS           = 9;
const BALL_SPEED          = 620; // px/sec
const CANNON_OFFSET       = 90; // px above bottom edge
const MIN_ANGLE_DEG       = 15; // min angle from horizontal
const DANGER_ROW_FRAC     = 0.8; // fraction of screen height = game over
// Roguelite charge: popping bubbles fills a meter. When full, you pick a
// powerup — decoupled from wave clears so it comes up far more often and
// scales with how aggressively you're clearing. Only the directly-matched
// pop counts (not the floating-bubble chain bonus), so a single lucky big
// cascade can't fill it in one shot.
const CHARGE_MAX          = 28;  // matched bubbles popped to fill the meter

export class Game {
  constructor(hostEl, ui, audio) {
    this.hostEl = hostEl;
    this.ui = ui;
    this.audio = audio || null;
    this.app = null;
    this.world = null;
    this.state = 'menu'; // menu | aiming | shooting | popping | powerup | gameover
    this.score = 0;
    this.wave = 0;
    this.combo = 0;
    this.coinsThisRun = 0;
    this.colorCount = 3;
    this.activePowerups = [];
    this.powerupCooldowns = {};
    this._rerollCount = 0;
    this.mods = defaultMods();
    this.cameraShakeMag = 0;
    this.cameraShakeT   = 0;
    this._bgHue = 220;
    this._lastPaintedHue = -1;
    this._lastPaintedW = -1;
    this._lastPaintedH = -1;
    // aiming state
    this._aimAngle = -Math.PI / 2;
    this._isPointerDown = false;
    // shooting state
    this._balls = []; // flying balls: {bubble, dx, dy, bounces}
    // queued next ball
    this._nextColorIdx = 0;
    this._shotQueue = []; // extra balls queued for cluster shot
    this._fireCooldown = 0;
    // pop animation
    this._popTickers = [];
    // grid
    this.grid = null;
    this.gridLayer = null;
    // playfield walls (computed per run in startRun)
    this.wallLeft = 0;
    this.wallRight = 0;
    // roguelite charge meter
    this._charge = 0;
  }

  get W() { return this.app.screen.width; }
  get H() { return this.app.screen.height; }
  get cannonX() { return this.W / 2; }
  get cannonY() { return this.H - CANNON_OFFSET; }
  get dangerY()  { return this.H * DANGER_ROW_FRAC; }
  // Ball-center bounce limits: keep the whole bubble inside the walls.
  get ballMinX() { return this.wallLeft + BUBBLE_R; }
  get ballMaxX() { return this.wallRight - BUBBLE_R; }

  async init() {
    const app = new Application();
    await app.init({ resizeTo: this.hostEl, antialias: true, resolution: Math.min(window.devicePixelRatio||1,2), autoDensity: true });
    this.app = app;
    this.hostEl.appendChild(app.canvas);

    this.bg = new Graphics();
    app.stage.addChild(this.bg);

    this.world = new Container();
    app.stage.addChild(this.world);

    // Walls layer (drawn behind bubbles)
    this.wallsGfx = new Graphics();
    this.world.addChild(this.wallsGfx);

    // Grid layer (bubbles)
    this.gridLayer = new Container();
    this.world.addChild(this.gridLayer);

    // Aim line layer (above grid, below cannon)
    this.aimLine = new AimLine(this.world);

    // Cannon graphics
    this.cannonGfx = new Graphics();
    this.world.addChild(this.cannonGfx);

    // Next-bubble preview drawn on cannon
    this._nextPreviewBubble = new Bubble(0);
    this.world.addChild(this._nextPreviewBubble);

    app.canvas.style.touchAction = 'none';
    app.canvas.addEventListener('pointermove',  (e) => this._onPointerMove(e));
    app.canvas.addEventListener('pointerdown',  (e) => this._onPointerDown(e));
    app.canvas.addEventListener('pointerup',    (e) => this._onPointerUp(e));
    app.canvas.addEventListener('pointerleave', ()  => this._onPointerLeave());

    app.ticker.add((ticker) => this.update(ticker.deltaMS / 1000));
  }

  // ── Input ─────────────────────────────────────────────────────────────

  _pointerAngle(e) {
    const rect = this.app.canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (this.W / rect.width);
    const py = (e.clientY - rect.top)  * (this.H / rect.height);
    let angle = Math.atan2(py - this.cannonY, px - this.cannonX);
    // Clamp to upward angles only, leaving MIN_ANGLE_DEG from horizontal
    const minRad = (MIN_ANGLE_DEG * Math.PI) / 180;
    const maxLeft  = -Math.PI + minRad;
    const maxRight = -minRad;
    angle = Math.max(maxLeft, Math.min(maxRight, angle));
    // If pointing downward, clamp to nearest valid angle
    if (angle > 0 || angle < -Math.PI) angle = -Math.PI / 2;
    return angle;
  }

  _onPointerMove(e) {
    if (this.state !== 'aiming') return;
    this._aimAngle = this._pointerAngle(e);
    this._drawCannon();
    const bounces = 2 + (upgradeValue(save, 'steady') || 0) + (this.mods.bounceCount - 1);
    this.aimLine.draw(this.cannonX, this.cannonY, this._aimAngle, bounces, this.ballMinX, this.ballMaxX, HEX_H / 2, this.dangerY);
  }

  _onPointerDown(e) {
    if (this.state !== 'aiming') return;
    this._isPointerDown = true;
    this._aimAngle = this._pointerAngle(e);
    this.aimLine.show();
    this._drawCannon();
    this._onPointerMove(e);
  }

  _onPointerUp(e) {
    if (!this._isPointerDown) return;
    this._isPointerDown = false;
    this.aimLine.hide();
    if (this.state === 'aiming') this._fire();
  }

  _onPointerLeave() {
    this.aimLine.hide();
    this._isPointerDown = false;
  }

  // ── Run lifecycle ────────────────────────────────────────────────────

  startRun() {
    if (this.grid) this.grid.destroy();
    this._balls.forEach(b => { this.world.removeChild(b.bubble); b.bubble.destroy({children:true}); });
    this._balls = [];
    this._popTickers = [];
    this._shotQueue = [];
    this.score = 0; this.wave = 0; this.combo = 0; this.coinsThisRun = 0;
    // 5 colors from the start, not 3 — with only 3 colors and 6 hex
    // neighbors per bubble, huge same-color clusters form almost by
    // accident, making every board trivially easy to clear.
    this.colorCount = 5;
    this.activePowerups = []; this.powerupCooldowns = {}; this._rerollCount = 0;
    this.mods = defaultMods();
    this._fireCooldown = 0;

    gsap.killTweensOf(this.world);
    this.world.scale.set(1); this.world.x = 0; this.world.y = 0;

    // Permanent upgrade: extra-shot queue start
    const extraShots = Math.floor(upgradeValue(save, 'extra') || 0);
    this._applyUpgradesToMods();

    // Compute grid layout + playfield walls. Odd rows are offset right by
    // half a cell (hex stagger), so the grid's actual rightmost extent is
    // one full HEX_W/2 further right than the even-row columns alone would
    // suggest. The walls must clear that offset plus the bubble radius on
    // both sides, or the odd-row edge bubbles render outside the wall line.
    const marginX = Math.floor((this.W - GRID_COLS * HEX_W) / 2);
    const marginY = HEX_H;
    const wallGap = 2; // small visual clearance beyond the bubble edge
    this.wallLeft  = marginX - BUBBLE_R - wallGap;
    this.wallRight = marginX + (GRID_COLS - 1) * HEX_W + HEX_W / 2 + BUBBLE_R + wallGap;
    this.grid = new Grid(this.gridLayer, GRID_COLS, INITIAL_ROWS, marginX, marginY, this.colorCount);

    this._charge = 0;
    this.ui.updateCharge(0);
    this._drawWalls();

    this._nextColorIdx = Math.floor(Math.random() * this.colorCount);
    this._updateNextPreview();
    this._drawCannon();
    this.aimLine.hide();

    this.state = 'aiming';
    this.ui.onStateChange('playing');
    this.ui.updateScore(0);
    this.ui.updateCombo(0);
    this.ui.updateCoinsHud(save.coins + this.coinsThisRun);
    this.ui.updateActivePowerups(this.getActivePowerupView());
  }

  goToMenu() {
    this.state = 'menu';
    this.ui.onStateChange('menu');
  }

  _applyUpgradesToMods() {
    this.mods = defaultMods();
    const fortune = upgradeValue(save, 'fortune');
    if (fortune) this.mods.coinMult *= fortune;
    const bigger = upgradeValue(save, 'bigger');
    if (bigger) this.mods.popRadiusBonus += bigger;
    const reload = upgradeValue(save, 'reload');
    if (reload) this.mods.fireCooldownBonus = reload;
    for (const ap of this.activePowerups) {
      const def = getPowerupDef(ap.id);
      if (def) def.apply(this.mods);
    }
  }

  recomputeMods() { this._applyUpgradesToMods(); }

  // ── Shooting ─────────────────────────────────────────────────────────

  _fire() {
    if (this._fireCooldown > 0) return;
    this.state = 'shooting';
    const angle = this._aimAngle;
    const count = this.mods.shotCount;

    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.18; // radians spread per ball
      const a = angle + spread;
      const b = new Bubble(this._nextColorIdx, true);
      b.x = this.cannonX; b.y = this.cannonY;
      this.world.addChild(b);
      this._balls.push({ bubble: b, dx: Math.cos(a), dy: Math.sin(a),
        bounces: this.mods.bounceCount, colorIdx: this._nextColorIdx });
    }

    if (this.audio) this.audio.shoot();
    this._fireCooldown = 0.22 - (this.mods.fireCooldownBonus || 0);

    // Prepare next ball
    this._nextColorIdx = Math.floor(Math.random() * this.colorCount);
    this._updateNextPreview();
    this._drawCannon();
  }

  _updateNextPreview() {
    if (this._nextPreviewBubble) {
      this.world.removeChild(this._nextPreviewBubble);
      this._nextPreviewBubble.destroy({ children: true });
    }
    this._nextPreviewBubble = new Bubble(this._nextColorIdx, true);
    this._nextPreviewBubble.x = this.cannonX;
    this._nextPreviewBubble.y = this.cannonY;
    this._nextPreviewBubble.alpha = 0.85;
    this.world.addChild(this._nextPreviewBubble);
    this.ui.updateNextPreview(this._nextColorIdx);
  }

  // ── Ball movement and collision ──────────────────────────────────────

  _moveBalls(dt) {
    const dist = BALL_SPEED * dt;
    const minX = this.ballMinX, maxX = this.ballMaxX;

    for (let i = this._balls.length - 1; i >= 0; i--) {
      const ball = this._balls[i];
      const { bubble } = ball;

      bubble.x += ball.dx * dist;
      bubble.y += ball.dy * dist;

      // Wall bounce — ricochet off the playfield walls, flashing the wall.
      if (bubble.x <= minX && ball.dx < 0) {
        bubble.x = minX; ball.dx = -ball.dx;
        this._flashWall('left');
        if (this.audio) this.audio.wallHit();
      }
      if (bubble.x >= maxX && ball.dx > 0) {
        bubble.x = maxX; ball.dx = -ball.dx;
        this._flashWall('right');
        if (this.audio) this.audio.wallHit();
      }

      // Hit top wall
      if (bubble.y <= HEX_H) {
        bubble.y = HEX_H;
        this._landBall(i);
        continue;
      }

      // Check collision with grid bubbles
      const { row, col } = this.grid.pixelToCell(bubble.x, bubble.y);
      let landed = false;
      // Check the candidate cell and all its neighbors
      const candidates = [{ row, col }, ...this.grid.neighbors(row, col)];
      for (const cand of candidates) {
        const existing = this.grid.get(cand.row, cand.col);
        if (!existing) continue;
        const { x: cx, y: cy } = this.grid.cellCenter(cand.row, cand.col);
        const dx = bubble.x - cx, dy = bubble.y - cy;
        if (Math.sqrt(dx*dx + dy*dy) < BUBBLE_R * 1.8) {
          // Ghost powerup: pass through non-matching
          if (this.mods.ghost && !existing.isStone && existing.colorIdx !== ball.colorIdx) continue;
          this._landBall(i);
          landed = true;
          break;
        }
      }
      if (landed) continue;

      // Fell below cannon (safety)
      if (bubble.y > this.H + 50) {
        this.world.removeChild(bubble); bubble.destroy({ children: true });
        this._balls.splice(i, 1);
      }
    }
  }

  _landBall(ballIdx) {
    const ball = this._balls[ballIdx];
    const { bubble } = ball;

    // Find best empty cell near landing position
    const { row, col } = this._findPlacementCell(bubble.x, bubble.y);

    this._balls.splice(ballIdx, 1);
    this.world.removeChild(bubble);

    if (!this.grid.inBounds(row, col) && row < 0) {
      // Above grid top — land in row 0
      bubble.destroy({ children: true });
    } else {
      this.grid.place(row < 0 ? 0 : row, Math.max(0, Math.min(col, GRID_COLS-1)), bubble);
      if (this.audio) this.audio.land();
      this._tryPop(row < 0 ? 0 : row, Math.max(0, Math.min(col, GRID_COLS-1)), ball.colorIdx);
    }

    // Return to aiming when all balls have landed
    if (this._balls.length === 0 && this.state === 'shooting') {
      this.state = 'aiming';
    }
  }

  _findPlacementCell(px, py) {
    // Try the direct cell first, then spiral neighbors to find empty
    const base = this.grid.pixelToCell(px, py);
    const candidates = [base, ...this.grid.neighbors(base.row, base.col)
      .sort((a, b) => {
        const ca = this.grid.cellCenter(a.row, a.col);
        const cb = this.grid.cellCenter(b.row, b.col);
        const da = (ca.x-px)**2 + (ca.y-py)**2;
        const db = (cb.x-px)**2 + (cb.y-py)**2;
        return da - db;
      })
    ];
    for (const c of candidates) {
      if (this.grid.inBounds(c.row, c.col) && !this.grid.get(c.row, c.col)) return c;
    }
    return base;
  }

  // ── Pop logic ─────────────────────────────────────────────────────────

  _tryPop(row, col, colorIdx) {
    let connected = this.grid.findConnected(row, col);

    // Color wipe: remove all same-color bubbles in grid
    if (this.mods.colorWipe) {
      const allSame = [];
      for (let r = 0; r < this.grid.cells.length; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const b = this.grid.get(r, c);
          if (b && b.colorIdx === colorIdx) allSame.push({ row: r, col: c });
        }
      }
      connected = allSame;
    }

    // Bomb radius: include extra shell of neighbors
    if (this.mods.bombRadius > 0 && connected.length >= 3) {
      const extra = new Set(connected.map(c => `${c.row},${c.col}`));
      for (let shell = 0; shell < this.mods.bombRadius; shell++) {
        const frontier = [...connected];
        for (const cell of frontier) {
          for (const nb of this.grid.neighbors(cell.row, cell.col)) {
            const key = `${nb.row},${nb.col}`;
            if (!extra.has(key) && this.grid.get(nb.row, nb.col)) {
              extra.add(key); connected.push(nb);
            }
          }
        }
      }
    }

    // popRadiusBonus (Big Bang upgrade): only kicks in on clusters of 5+,
    // so it rewards big matches instead of trivializing every 3-pop.
    if (this.mods.popRadiusBonus > 0 && connected.length >= 5) {
      const extra = new Set(connected.map(c => `${c.row},${c.col}`));
      for (let shell = 0; shell < this.mods.popRadiusBonus; shell++) {
        const frontier = [...connected];
        for (const cell of frontier) {
          for (const nb of this.grid.neighbors(cell.row, cell.col)) {
            const key = `${nb.row},${nb.col}`;
            if (!extra.has(key) && this.grid.get(nb.row, nb.col) && !this.grid.get(nb.row, nb.col).isStone) {
              extra.add(key); connected.push(nb);
            }
          }
        }
      }
    }

    const MIN_POP = 3;
    if (connected.length < MIN_POP) {
      this.combo = 0;
      this.ui.updateCombo(0);
      this._checkDanger();
      return;
    }

    // Remove matched bubbles and animate
    const removed = this.grid.remove(connected);
    this.combo++;
    if (this.audio) {
      if (removed.length >= 5) this.audio.popLarge(removed.length);
      else this.audio.popSmall();
    }
    this._animatePop(removed);

    // Check for floating bubbles
    const floating = this.grid.findFloating();
    if (floating.length) {
      const floatRemoved = this.grid.remove(floating);
      if (this.audio) this.audio.drop();
      setTimeout(() => this._animatePop(floatRemoved, true), 120);
    }

    const totalPopped = removed.length + floating.length;
    const comboBonus = Math.floor(this.combo / 4);
    // Coins scale off the direct match only, at half rate for the bonus
    // floating-bubble chain — a lucky 20-bubble cascade shouldn't fund the
    // whole upgrade shop in one pop.
    let coinGain = Math.round((removed.length + floating.length * 0.5 + comboBonus) * this.mods.coinMult);
    this.coinsThisRun += coinGain;
    this.score += totalPopped * 10 + comboBonus * 5;

    if (this.combo >= 2) this.ui.showToast(`COMBO x${this.combo}`, 'perfect');
    this.ui.updateScore(this.score);
    this.ui.updateCombo(this.combo);
    this.ui.updateCoinsHud(save.coins + this.coinsThisRun, coinGain);

    this.triggerShake(Math.min(8, totalPopped * 0.6));

    // Fill the roguelite charge meter with only the directly matched pop —
    // floating-bubble cascades don't count, so a single big lucky chain
    // can't instantly max the meter.
    this._charge += removed.length;
    const chargeReady = this._charge >= CHARGE_MAX;

    // Wave clear still refills the board and ramps difficulty, but no longer
    // gates powerups — those come from the charge meter now.
    if (this.grid.isEmpty()) this._waveClear();

    if (chargeReady && this.state !== 'gameover') {
      this._charge -= CHARGE_MAX;
      this.ui.updateCharge(Math.min(1, this._charge / CHARGE_MAX));
      this._offerPowerup();
    } else {
      this.ui.updateCharge(Math.min(1, this._charge / CHARGE_MAX));
      if (this.state !== 'gameover') this._checkDanger();
    }
  }

  /** Pause and present a 3-powerup roguelite choice (charge meter full). */
  _offerPowerup() {
    this.state = 'powerup';
    this._rerollCount = 0;
    if (this.audio) this.audio.powerupOpen();
    const choices = rollPowerups(3, this._powerupExcludeIds());
    this.ui.showPowerupChoice(choices, (chosen) => this.applyPowerup(chosen));
  }

  _animatePop(bubbles, isFalling = false) {
    for (const b of bubbles) {
      if (!b || !b.parent) continue;
      if (isFalling) {
        gsap.to(b, { y: b.y + 120, alpha: 0, duration: 0.4, ease: 'power1.in',
          onComplete: () => { if (b.parent) { b.parent.removeChild(b); b.destroy({children:true}); } }
        });
      } else {
        gsap.to(b.scale, { x: 1.5, y: 1.5, duration: 0.12, yoyo: true, repeat: 1 });
        gsap.to(b, { alpha: 0, duration: 0.25, delay: 0.12,
          onComplete: () => { if (b.parent) { b.parent.removeChild(b); b.destroy({children:true}); } }
        });
      }
    }
  }

  // ── Wave management ─────────────────────────────────────────────────

  _waveClear() {
    this.wave++;
    if (this.audio) this.audio.waveClear();
    this.ui.showToast(`WAVE ${this.wave}!`, 'zone');

    // Ramp color count as waves climb, capped at all 6 available colors.
    if (this.wave % 4 === 0) this.colorCount = Math.min(6, this.colorCount + 1);

    // Descend grid — new row added at top, existing rows push down
    if (!this.mods.freezeWaves) {
      this.grid._fillRows(INITIAL_ROWS, 0);
      this._resetGridPositions();
    }

    // Powerups are driven by the charge meter now, not wave count — so a
    // wave clear just returns to aiming (the charge check in _tryPop may
    // still open a powerup this same landing if the meter filled).
    if (this.state !== 'powerup') this.state = 'aiming';
  }

  _resetGridPositions() {
    for (let r = 0; r < this.grid.cells.length; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const b = this.grid.get(r, c);
        if (b) {
          const { x, y } = this.grid.cellCenter(r, c);
          b.x = x; b.y = y;
        }
      }
    }
  }

  _checkDanger() {
    if (this.grid.hasBubbleBelowRow(Math.floor(this.H * DANGER_ROW_FRAC / HEX_H))) {
      this.endRun();
    }
  }

  endRun() {
    this.state = 'gameover';
    if (this.audio) this.audio.gameOver();
    this._balls.forEach(b => { this.world.removeChild(b.bubble); b.bubble.destroy({children:true}); });
    this._balls = [];
    let isNewBest = false;
    if (this.score > save.best) { save.best = this.score; isNewBest = true; }
    save.coins += this.coinsThisRun;
    commitSave();
    setTimeout(() => {
      this.ui.onStateChange('gameover');
      this.ui.showGameOver({ score: this.score, coinsEarned: this.coinsThisRun, isNewBest });
    }, 1200);
  }

  // ── Powerups ─────────────────────────────────────────────────────────

  _powerupExcludeIds() {
    return [
      ...this.activePowerups.map(p => p.id),
      ...Object.keys(this.powerupCooldowns).filter(id => this.powerupCooldowns[id] > 0),
    ];
  }

  rerollCost() {
    return Math.round(REROLL_BASE_COST * Math.pow(REROLL_COST_GROWTH, this._rerollCount));
  }

  tryRerollPowerups() {
    const cost = this.rerollCost();
    if (save.coins < cost) return null;
    save.coins -= cost;
    commitSave();
    this._rerollCount++;
    this.ui.updateCoinsHud(save.coins + this.coinsThisRun);
    return { choices: rollPowerups(3, this._powerupExcludeIds()) };
  }

  applyPowerup(powerup) {
    if (this.audio) this.audio.powerupPick();
    const existing = this.activePowerups.find(p => p.id === powerup.id);
    if (existing) {
      existing.remaining = DURATION_SECONDS;
    } else {
      if (this.activePowerups.length >= MAX_ACTIVE_POWERUPS) {
        let minIdx = 0;
        for (let i = 1; i < this.activePowerups.length; i++) {
          if (this.activePowerups[i].remaining < this.activePowerups[minIdx].remaining) minIdx = i;
        }
        const evicted = this.activePowerups.splice(minIdx, 1)[0];
        this.powerupCooldowns[evicted.id] = COOLDOWN_SECONDS;
      }
      this.activePowerups.push({ id: powerup.id, remaining: DURATION_SECONDS });
    }
    this.recomputeMods();
    this.ui.updateActivePowerups(this.getActivePowerupView());
    this.state = 'aiming';
  }

  getActivePowerupView() {
    return this.activePowerups.map(ap => {
      const def = getPowerupDef(ap.id);
      return { id: ap.id, name: def?.name||ap.id, icon: def?.icon||'dash',
        fraction: Math.max(0, Math.min(1, ap.remaining / DURATION_SECONDS)) };
    });
  }

  _tickPowerupTimers(dt) {
    let changed = false;
    for (let i = this.activePowerups.length - 1; i >= 0; i--) {
      this.activePowerups[i].remaining -= dt;
      if (this.activePowerups[i].remaining <= 0) {
        this.powerupCooldowns[this.activePowerups[i].id] = COOLDOWN_SECONDS;
        this.activePowerups.splice(i, 1);
        changed = true;
      }
    }
    for (const id of Object.keys(this.powerupCooldowns)) {
      this.powerupCooldowns[id] -= dt;
      if (this.powerupCooldowns[id] <= 0) delete this.powerupCooldowns[id];
    }
    if (changed) this.recomputeMods();
    this.ui.updateActivePowerups(this.getActivePowerupView());
  }

  // ── Visuals ─────────────────────────────────────────────────────────

  _drawWalls() {
    const g = this.wallsGfx;
    g.clear();
    const top = HEX_H / 2;
    const bottom = this.dangerY;
    // Neon vertical walls with a soft inner glow band.
    for (const x of [this.wallLeft, this.wallRight]) {
      g.moveTo(x, top).lineTo(x, bottom).stroke({ color: 0x7dffd4, width: 3, alpha: 0.55 });
      g.moveTo(x, top).lineTo(x, bottom).stroke({ color: 0x7dffd4, width: 8, alpha: 0.10 });
    }
    // Top wall / ceiling the bubbles hang from.
    g.moveTo(this.wallLeft, top).lineTo(this.wallRight, top).stroke({ color: 0x7dffd4, width: 3, alpha: 0.55 });
    g.moveTo(this.wallLeft, top).lineTo(this.wallRight, top).stroke({ color: 0x7dffd4, width: 8, alpha: 0.10 });
  }

  /** Brief bright flash on the wall the ball just bounced off. */
  _flashWall(side) {
    const x = side === 'left' ? this.wallLeft : this.wallRight;
    const flash = new Graphics();
    flash.moveTo(x, HEX_H / 2).lineTo(x, this.dangerY).stroke({ color: 0xffffff, width: 4, alpha: 0.9 });
    this.world.addChild(flash);
    gsap.to(flash, { alpha: 0, duration: 0.3, ease: 'power2.out',
      onComplete: () => { if (flash.parent) flash.parent.removeChild(flash); flash.destroy(); } });
  }

  _drawCannon() {
    const g = this.cannonGfx;
    g.clear();
    const cx = this.cannonX, cy = this.cannonY;
    const len = 38, w = 11;
    const angle = this._aimAngle;
    const ex = cx + Math.cos(angle) * len;
    const ey = cy + Math.sin(angle) * len;
    // Barrel
    g.moveTo(cx, cy).lineTo(ex, ey).stroke({ color: 0x7dffd4, width: w, cap: 'round', alpha: 0.9 });
    // Base circle
    g.circle(cx, cy, 16).fill({ color: 0x1a1a2e });
    g.circle(cx, cy, 16).stroke({ color: 0x7dffd4, width: 2 });
  }

  _paintBackground() {
    const targetHue = 215 + this.wave * 8;
    this._bgHue += (targetHue - this._bgHue) * 0.03;
    if (Math.abs(this._lastPaintedHue - this._bgHue) < 0.3 &&
        this._lastPaintedW === this.W && this._lastPaintedH === this.H) return;
    this._lastPaintedHue = this._bgHue;
    this._lastPaintedW = this.W; this._lastPaintedH = this.H;
    this.bg.clear();
    this.bg.rect(0, 0, this.W, this.H).fill({ color: hslToHex(this._bgHue % 360, 35, 9) });
    // Danger zone indicator — faint red tint at bottom
    this.bg.rect(0, this.dangerY, this.W, this.H - this.dangerY)
      .fill({ color: 0xff2222, alpha: 0.04 });
    // Separator line
    this.bg.moveTo(0, this.dangerY).lineTo(this.W, this.dangerY)
      .stroke({ color: 0xff2222, width: 1, alpha: 0.2 });
  }

  triggerShake(mag) {
    this.cameraShakeMag = Math.max(this.cameraShakeMag, mag);
    this.cameraShakeT = 0.2;
  }

  showToast(text, variant) { this.ui.showToast(text, variant); }

  // ── Update loop ──────────────────────────────────────────────────────

  update(dt) {
    dt = Math.min(dt, 0.05);
    this._paintBackground();

    if (this.state === 'gameover' || this.state === 'menu') return;

    if (this.state === 'aiming' || this.state === 'shooting') {
      this._tickPowerupTimers(dt);
    }

    if (this._fireCooldown > 0) this._fireCooldown -= dt;

    if (this.state === 'shooting' && this._balls.length > 0) {
      this._moveBalls(dt);
      if (this._balls.length === 0) this.state = 'aiming';
    }

    // Camera shake
    if (this.cameraShakeT > 0) {
      this.cameraShakeT -= dt;
      this.world.x = (Math.random() - 0.5) * this.cameraShakeMag;
      this.world.y = (Math.random() - 0.5) * this.cameraShakeMag;
    } else {
      this.world.x = 0; this.world.y = 0;
      this.cameraShakeMag *= 0.9;
    }
  }
}
