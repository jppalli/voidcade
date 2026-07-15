import { Application, Container, Graphics } from 'pixi.js';
import gsap from 'gsap';
import { Block, BLOCK_HEIGHT } from './Block.js';
import { DebrisField } from './Debris.js';
import { ParticleBurst } from './ParticleBurst.js';
import { MilestoneMarker } from './MilestoneMarker.js';
import { createParticleTexture } from './textures.js';
import { hslToHex } from './utils.js';
import { save, commitSave } from './save.js';
import {
  defaultMods,
  rollPowerups,
  getPowerupDef,
  POWERUP_INTERVAL,
  DURATION_SECONDS,
  COOLDOWN_SECONDS,
} from './powerups.js';
import { upgradeValue } from './upgrades.js';

const MIN_WIDTH = 20;
const MAX_WIDTH_CAP = 400;
const BASE_WIDTH = 300; // starting width of the tower (ground + first blocks)
const BASE_SPEED = 3.1;
const SPEED_GROWTH = 0.045;
const MAX_SPEED_MULT = 2.6;
const PERFECT_FRACTION = 0.94;
// The swinging block sits one BLOCK_HEIGHT above the tower top, plus a tiny
// 2px gap, so while it moves it reads as a distinct piece resting just above
// the stack (a hair of space, not overlapping). Landing is handled separately
// in dropBlock() (`top.y - BLOCK_HEIGHT`) and always sits flush.
const HOVER_GAP = BLOCK_HEIGHT + 2;
const ANCHOR_Y_FRAC = 0.42;
// How far past the screen edge a block spawns/vanishes, so it visibly
// slides in from off-screen rather than popping in at the boundary.
const OFFSCREEN_SPAWN_GAP = 60;
const REROLL_BASE_COST = 15;
const REROLL_COST_GROWTH = 1.6;
// Cap on simultaneously-active powerups so the late game can't snowball into
// invincibility by stacking a full defensive loadout.
const MAX_ACTIVE_POWERUPS = 3;
// Zones give the endless climb texture & milestones: every ZONE_SIZE floors
// the palette shifts and a gentle mechanic twist cycles in.
const ZONE_SIZE = 25;
const ZONE_TYPES = [
  { name: 'CALM', wind: 0, speedMult: 1 },
  { name: 'DRIFT', wind: 0.5, speedMult: 1 },     // constant sideways push
  { name: 'RUSH', wind: 0, speedMult: 1.18 },     // faster blocks
];

export class Game {
  constructor(hostEl, ui, audio) {
    this.hostEl = hostEl;
    this.ui = ui;
    this.audio = audio || null;
    this.app = null;
    this.world = null;
    this.bgLayer = null;
    this.state = 'menu';
    this.blocks = [];
    this.moving = null;
    this.combo = 0;
    this.score = 0;   // points (perfects worth more) - the headline metric
    this.floors = 0;  // blocks placed - drives speed, zones, milestones
    this.zoneIndex = 0;
    this.zoneWind = 0;
    this.zoneSpeedMult = 1;
    this.coinsThisRun = 0;
    this.scrollY = 0;
    this.scrollTarget = 0;
    this.effectiveMaxWidth = BASE_WIDTH;
    this.runMaxWidthCap = MAX_WIDTH_CAP;
    this.mods = defaultMods();
    this.lastMilestone = 0;
    // Time-based powerups: {id, remaining} where `remaining` is seconds left,
    // ticked down every frame in update(). Distinct from permanent blessings,
    // which last the whole run.
    this.activePowerups = [];
    this.powerupCooldowns = {}; // id -> seconds remaining until available again
    this._rerollCount = 0;
    // Free shields granted at run start by the Reinforce upgrade (count).
    this.freeShields = 0;
    this.toastText = null;
    this.toastLife = 0;
    this.cameraShakeMag = 0;
    this.cameraShakeT = 0;
    this._bgHue = 230;
    this._lastPaintedHue = -1;
    this._lastPaintedW = -1;
    this._lastPaintedH = -1;
  }

  async init() {
    const app = new Application();
    await app.init({
      resizeTo: this.hostEl,
      backgroundAlpha: 1,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    this.app = app;
    this.hostEl.appendChild(app.canvas);

    this.bg = this._makeBackground();
    app.stage.addChild(this.bg);

    this.world = new Container();
    app.stage.addChild(this.world);

    this.debris = new DebrisField();
    this.world.addChild(this.debris.container);

    const particleTex = createParticleTexture(app.renderer);
    this.burst = new ParticleBurst(particleTex);
    this.world.addChild(this.burst.container);

    this.blocksLayer = new Container();
    this.world.addChild(this.blocksLayer);

    // Precision Guide overlay: a target outline projected above the tower.
    this.guideGfx = new Graphics();
    this.guideGfx.visible = false;
    this.world.addChild(this.guideGfx);

    this.milestoneMarker = new MilestoneMarker();
    this.world.addChild(this.milestoneMarker);

    app.canvas.style.touchAction = 'none';
    app.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.onAction();
    });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.onAction();
      }
    });

    app.ticker.add((ticker) => this.update(ticker.deltaMS / 1000));
  }

  _makeBackground() {
    const g = new Graphics();
    this._bgHue = 230;
    return g;
  }

  _paintBackground() {
    // Each zone gets its own colour band, with a gentle drift within the zone.
    const targetHue = 205 + this.zoneIndex * 45 + Math.min((this.floors % ZONE_SIZE) * 0.6, 15);
    this._bgHue += (targetHue - this._bgHue) * 0.05;
    if (Math.abs(this._lastPaintedHue - this._bgHue) < 0.3 &&
        this._lastPaintedW === this.W && this._lastPaintedH === this.H) {
      return;
    }
    this._lastPaintedHue = this._bgHue;
    this._lastPaintedW = this.W;
    this._lastPaintedH = this.H;

    const hue = this._bgHue;
    const color = hslToHex(hue, 38, 12);
    this.bg.clear();
    this.bg.rect(0, 0, this.W, this.H).fill({ color });
  }

  get W() { return this.app.screen.width; }
  get H() { return this.app.screen.height; }

  // -----------------------------------------------------------
  // Run lifecycle
  // -----------------------------------------------------------
  startRun() {
    this._clearAll();

    gsap.killTweensOf(this.world);
    gsap.killTweensOf(this.world.scale);
    this.combo = 0;
    this.score = 0;
    this.floors = 0;
    this.zoneIndex = 0;
    this._applyZone(0);
    this.scrollY = 0;
    this.scrollTarget = 0;
    this.world.x = 0;
    this.world.y = 0;
    this.world.scale.set(1, 1);
    this.lastMilestone = 0;
    this.activePowerups = [];
    this.powerupCooldowns = {};
    this._rerollCount = 0;
    this._pausedForPowerup = false;

    // --- Permanent upgrades: applied automatically every run ---
    this.coinsThisRun = 0;
    // Reinforce: start with N free shields (each saves one miss/collapse).
    this.freeShields = upgradeValue(save, 'reinforce') || 0;
    // Foundation: wider base + higher growth ceiling.
    const foundationWidth = upgradeValue(save, 'foundation') || 0;
    this.runMaxWidthCap = MAX_WIDTH_CAP + foundationWidth;
    const baseWidthForRun = BASE_WIDTH + foundationWidth;
    this.effectiveMaxWidth = Math.min(baseWidthForRun, this.runMaxWidthCap);

    this.recomputeMods();

    // Ground must not start wider than the growth cap, or the first perfect
    // drop would clamp (and visibly shrink) the block down to effectiveMaxWidth.
    const groundW = Math.min(this.W * 0.7, this.effectiveMaxWidth);
    const groundWorldY = this.H - 140;
    this.groundWorldY = groundWorldY;
    const ground = new Block({ x: this.W / 2 - groundW / 2, y: groundWorldY, w: groundW, hue: 200 });
    this.blocksLayer.addChild(ground);
    this.blocks.push(ground);

    this.spawnMoving(ground);
    this.updateMilestoneMarker();

    this.state = 'playing';
    this.ui.onStateChange('playing');
    this.ui.updateScore(0);
    this.ui.updateCombo(0);
    this.ui.updateCoinsHud(save.coins + this.coinsThisRun);
    this.ui.updateShields(this.shieldCount());
    this.ui.updateActivePowerups(this.getActivePowerupView());
  }

  /** Position the dashed milestone line at the next powerup floor so the
   *  player can see it coming as the tower climbs toward it. */
  updateMilestoneMarker() {
    const nextMilestoneFloor = (this.lastMilestone + 1) * POWERUP_INTERVAL;
    // Each floor raises the tower top by BLOCK_HEIGHT from the ground.
    const markerY = this.groundWorldY - nextMilestoneFloor * BLOCK_HEIGHT;
    this.milestoneMarker.setSpan(this.W, nextMilestoneFloor);
    this.milestoneMarker.y = markerY;
    this.milestoneMarker.visible = true;
  }

  _clearAll() {
    for (const b of this.blocks) {
      this.blocksLayer.removeChild(b);
      b.destroy({ children: true });
    }
    this.blocks = [];
    if (this.moving) {
      gsap.killTweensOf(this.moving);
      this.blocksLayer.removeChild(this.moving);
      this.moving.destroy({ children: true });
      this.moving = null;
    }
    for (const d of this.debris.pieces) {
      this.debris.container.removeChild(d);
      d.destroy({ children: true });
    }
    this.debris.pieces = [];
  }

  /** Every code path that removes the current moving block funnels through
   *  here for consistency. */
  _destroyMoving() {
    const moving = this.moving;
    if (!moving) return;
    gsap.killTweensOf(moving);
    this.blocksLayer.removeChild(moving);
    moving.destroy({ children: true });
    this.moving = null;
  }

  spawnMoving(topBlock) {
    // Slow-Mo damps the floor-based ramp so it stays slow as you climb,
    // then the flat speedMult scales the whole thing down further.
    const ramp = this.floors * SPEED_GROWTH * (1 - this.mods.speedRampDamp);
    let speedMult = Math.min(1 + ramp, MAX_SPEED_MULT);
    speedMult *= this.mods.speedMult;
    speedMult *= this.zoneSpeedMult; // RUSH zones speed blocks up
    // Momentum: reward a clean streak (5+) with breathing room - blocks swing
    // slower while your combo is high. Standalone effect (no longer depends on
    // Growth Spurt), and synergises with Second Wind keeping the streak alive.
    if (this.mods.comboSlowmo && this.combo >= 5) speedMult *= 0.7;
    const speed = BASE_SPEED * speedMult;
    const dir = Math.random() < 0.5 ? -1 : 1;
    // Spawn just off-screen on the side it's coming FROM, so it visibly
    // slides into view at the SAME constant per-frame speed as the rest of
    // its travel - no separate fast-in tween, so the entrance never feels
    // like a different, faster jolt than the swing itself. The gap is kept
    // small (not "fully off-screen") specifically so the approach is brief
    // and readable rather than a long, hard-to-predict slide, and so early
    // floors (where speed is intentionally slow) don't leave the block
    // invisible for a noticeable moment after Play.
    const startX = dir === 1
      ? -topBlock.blockW - OFFSCREEN_SPAWN_GAP
      : this.W + OFFSCREEN_SPAWN_GAP;
    const hue = (topBlock.hue + 26) % 360;

    const moving = new Block({ x: startX, y: topBlock.y - HOVER_GAP, w: topBlock.blockW, hue });
    moving.setGlow(true);
    this.blocksLayer.addChild(moving);
    this.moving = moving;
    this._movingDir = dir;
    this._movingSpeed = speed;
  }

  onAction() {
    // Ignore taps while the powerup-choice overlay is up (state === 'powerup')
    // or on menu/gameover screens; only live gameplay responds to drops.
    if (this.state === 'playing') this.dropBlock();
  }

  dropBlock() {
    const top = this.blocks[this.blocks.length - 1];
    const moving = this.moving;
    const overlapLeft = Math.max(moving.x, top.x);
    const overlapRight = Math.min(moving.x + moving.blockW, top.x + top.blockW);
    const overlapWidth = overlapRight - overlapLeft;

    // Magnet widens the perfect-catch window on top of Steady Hands, so
    // near-misses get rescued into a centered perfect.
    const perfectThresh = PERFECT_FRACTION - this.mods.perfectThreshBonus - this.mods.magnetSnap;
    const fraction = overlapWidth / moving.blockW;

    if (overlapWidth <= 0) {
      this.handleMiss();
      return;
    }

    let newW, newX, isPerfect;

    if (fraction >= perfectThresh) {
      isPerfect = true;
      // Growth on a perfect drop is NOT default - it only happens with the
      // Growth Spurt powerup active (growAmountBonus). Growth Spurt now scales
      // its own bonus up with your perfect streak (this streak scaling used to
      // be the separate Momentum powerup, folded in here). With no growth
      // powerup, a perfect just snaps the block back to full width, zero cut.
      let grow = this.mods.growAmountBonus;
      if (grow > 0) {
        const streakBonus = Math.min(Math.floor(this.combo / 3) * 0.3, 1.5);
        grow *= (1 + streakBonus);
      }
      // Cap growth at the lower of the skill-earned ceiling and the current
      // (blessing + active powerup) hard cap, but never shrink below current width.
      const hardCap = this.runMaxWidthCap + this.mods.maxWidthCapExtra;
      const cap = Math.max(Math.min(this.effectiveMaxWidth, hardCap), top.blockW);
      newW = Math.min(top.blockW + grow, cap);
      newX = top.x + (top.blockW - newW) / 2;
      this.combo++;
      this._spawnPerfectBurst(top);
      if (grow > 0 && this.combo % 5 === 0) this.effectiveMaxWidth = Math.min(this.effectiveMaxWidth + 14, hardCap);
    } else {
      isPerfect = false;
      // Skill gradient: the base cut is the physical overlap, but a CLOSE
      // drop (just outside the perfect window) recovers half of what it would
      // have lost - so precision is rewarded on every drop, not just perfects.
      // Feather Fall adds a flat recovery on top. Width can never exceed the
      // block below (recovery, never growth).
      const isClose = fraction >= perfectThresh - 0.15;
      const lost = moving.blockW - overlapWidth;
      let recovered = lost * this.mods.cutReduction;
      if (isClose) recovered += (lost - recovered) * 0.5;
      newW = Math.min(overlapWidth + recovered, top.blockW);
      const overlapCenter = (overlapLeft + overlapRight) / 2;
      newX = Math.max(top.x, Math.min(overlapCenter - newW / 2, top.x + top.blockW - newW));
      // Second Wind: keep a fraction of the combo instead of zeroing it.
      this.combo = Math.floor(this.combo * this.mods.comboKeepFrac);

      if (moving.x < overlapLeft) {
        this.debris.spawn(moving.x, moving.y - BLOCK_HEIGHT, overlapLeft - moving.x, BLOCK_HEIGHT, moving.hue, -1);
      }
      if (moving.x + moving.blockW > overlapRight) {
        this.debris.spawn(overlapRight, moving.y - BLOCK_HEIGHT, (moving.x + moving.blockW) - overlapRight, BLOCK_HEIGHT, moving.hue, 1);
      }
      this.triggerShake(Math.min(6, (1 - fraction) * 14));
    }

    if (newW < MIN_WIDTH) {
      if (this.hasShield()) {
        this.consumeShield();
        newW = Math.min(this.effectiveMaxWidth * 0.65, top.blockW + 40);
        newX = top.x + (top.blockW - newW) / 2;
        this.showToast('SHIELD USED');
        if (this.audio) this.audio.shield();
        this.ui.updateShields(this.shieldCount());
      } else {
        this.debris.spawn(newX, top.y - BLOCK_HEIGHT, newW, BLOCK_HEIGHT, moving.hue, 0);
        this.triggerShake(12);
        this._destroyMoving();
        this.endRun();
        return;
      }
    }

    const newBlock = new Block({ x: newX, y: top.y - BLOCK_HEIGHT, w: newW, hue: moving.hue });
    this.blocksLayer.addChild(newBlock);
    this.blocks.push(newBlock);

    this._destroyMoving();

    // little squash/stretch landing juice, punchier on a perfect drop
    const squashX = isPerfect ? 1.18 : 1.1;
    const squashY = isPerfect ? 0.76 : 0.85;
    newBlock.scale.set(squashX, squashY);
    gsap.to(newBlock.scale, { x: 1, y: 1, duration: isPerfect ? 0.28 : 0.2, ease: 'back.out(2.4)' });

    if (isPerfect) {
      newBlock.flashPerfect();
      if (this.audio) this.audio.perfect(this.combo);
      if (this.combo >= 2) this.showToast(`PERFECT x${this.combo}`, 'perfect');
      else this.showToast('PERFECT', 'perfect');
    } else if (fraction >= perfectThresh - 0.15) {
      // close call: didn't land perfect but was near the window
      newBlock.flashClose();
      if (this.audio) this.audio.close();
      this.showToast('CLOSE', 'close');
    } else if (this.audio) {
      this.audio.drop();
    }

    this.floors++;
    // Score is now simply floors — one per block placed, no perfect bonus.
    // Perfect drops are rewarded with extra coins instead (see coinGain below).
    this.score = this.floors;

    const comboBonus = Math.floor(this.combo / 3);
    // Perfect drops earn extra coins (base bonus + combo scaling).
    // Fortune upgrade multiplies everything. This is where precision pays off
    // in the coin economy rather than inflating the floor counter.
    let coinGain = (1 + comboBonus + this.mods.coinFlatBonus) * this.mods.coinMult;
    if (isPerfect) coinGain += this.mods.perfectCoinBonus + 1 + Math.floor(this.combo / 5);
    coinGain = Math.round(coinGain);
    this.coinsThisRun += coinGain;

    this.ui.updateScore(this.score);
    this.ui.updateCoinsHud(save.coins + this.coinsThisRun, coinGain, newBlock);
    this.ui.updateCombo(this.combo);
    this.updateScrollTarget();
    this._checkZone();

    if (this.checkMilestone()) return; // pauses run, defers spawnMoving until resume
    this.updateMilestoneMarker();
    this.spawnMoving(newBlock);
  }

  handleMiss() {
    if (this.hasShield()) {
      this.consumeShield();
      this.ui.updateShields(this.shieldCount());
      const top = this.blocks[this.blocks.length - 1];
      const newW = Math.min(this.effectiveMaxWidth * 0.65, top.blockW);
      const newBlock = new Block({ x: top.x + (top.blockW - newW) / 2, y: top.y - BLOCK_HEIGHT, w: newW, hue: this.moving.hue });
      this.blocksLayer.addChild(newBlock);
      this.blocks.push(newBlock);

      this._destroyMoving();

      this.combo = 0;
      this.floors++;
      this.score = this.floors;
      this.ui.updateScore(this.score);
      this.ui.updateCombo(0);
      this.updateScrollTarget();
      this.showToast('SHIELD USED');
      if (this.audio) this.audio.shield();
      this._checkZone();
      if (this.checkMilestone()) return;
      this.updateMilestoneMarker();
      this.spawnMoving(newBlock);
      return;
    }
    const moving = this.moving;
    this.debris.spawn(moving.x, moving.y - BLOCK_HEIGHT, moving.blockW, BLOCK_HEIGHT, moving.hue, this._movingDir);
    this.triggerShake(10);
    this._destroyMoving();
    this.endRun();
  }

  // -----------------------------------------------------------
  // Shields: sourced from the Reinforce upgrade (free shields at run start)
  // and/or the Guardian Shield powerup (temporary, banked until used).
  // -----------------------------------------------------------
  hasShield() {
    return this.freeShields > 0 || this.activePowerups.some((p) => p.id === 'shield');
  }

  shieldCount() {
    return this.freeShields + (this.activePowerups.some((p) => p.id === 'shield') ? 1 : 0);
  }

  consumeShield() {
    // Spend the temporary powerup shield first (frees its active slot), then
    // fall back to the permanent Reinforce shields.
    const idx = this.activePowerups.findIndex((p) => p.id === 'shield');
    if (idx >= 0) {
      this.activePowerups.splice(idx, 1);
      this.powerupCooldowns.shield = COOLDOWN_SECONDS;
      this.recomputeMods();
      this.ui.updateActivePowerups(this.getActivePowerupView());
    } else if (this.freeShields > 0) {
      this.freeShields--;
    }
  }

  // -----------------------------------------------------------
  // Powerup milestones: every POWERUP_INTERVAL floors, pause and offer
  // a choice of 3 time-limited roguelite powerups. Active/cooling-down
  // powerups are excluded from the offer pool.
  // -----------------------------------------------------------
  checkMilestone() {
    const milestone = Math.floor(this.floors / POWERUP_INTERVAL);
    if (milestone > this.lastMilestone) {
      this.lastMilestone = milestone;
      this.state = 'powerup';
      this._rerollCount = 0;
      if (this.audio) this.audio.powerupOpen();
      const choices = rollPowerups(3, this._powerupExcludeIds());
      this.ui.showPowerupChoice(choices, (chosen) => this.applyPowerup(chosen));
      return true;
    }
    return false;
  }

  _powerupExcludeIds() {
    const active = this.activePowerups.map((p) => p.id);
    const cooling = Object.keys(this.powerupCooldowns).filter((id) => this.powerupCooldowns[id] > 0);
    return [...active, ...cooling];
  }

  /** Cost to reroll the current powerup choice, escalating per reroll within
   *  the same milestone. */
  rerollCost() {
    const base = REROLL_BASE_COST * Math.pow(REROLL_COST_GROWTH, this._rerollCount);
    return Math.round(base);
  }

  /** Attempt to spend coins to reroll the powerup choice. Returns
   *  { choices } on success, or null if the player can't afford it. */
  tryRerollPowerups() {
    const cost = this.rerollCost();
    if (save.coins < cost) return null;
    save.coins -= cost;
    commitSave();
    this._rerollCount++;
    const choices = rollPowerups(3, this._powerupExcludeIds());
    this.ui.updateCoinsHud(save.coins + this.coinsThisRun);
    return { choices };
  }

  /** Tick every active powerup's remaining time down by dt (real seconds of
   *  play), moving any that hit zero onto cooldown. Cooldowns tick down too,
   *  regardless of game state, so waiting matters. Called every frame. */
  _tickPowerupTimers(dt) {
    let changed = false;

    for (let i = this.activePowerups.length - 1; i >= 0; i--) {
      const ap = this.activePowerups[i];
      ap.remaining -= dt;
      if (ap.remaining <= 0) {
        this.activePowerups.splice(i, 1);
        this.powerupCooldowns[ap.id] = COOLDOWN_SECONDS;
        changed = true;
      }
    }

    for (const id of Object.keys(this.powerupCooldowns)) {
      if (this.powerupCooldowns[id] > 0) {
        this.powerupCooldowns[id] -= dt;
        if (this.powerupCooldowns[id] <= 0) delete this.powerupCooldowns[id];
      }
    }

    if (changed) {
      this.recomputeMods();
      // Guardian Shield may have just expired - keep the HUD shield count in sync.
      this.ui.updateShields(this.shieldCount());
    }
    // Refresh every frame (not just on expiry) so the depleting-ring
    // animation on each active-powerup icon updates smoothly.
    this.ui.updateActivePowerups(this.getActivePowerupView());
  }

  /** Rebuild `this.mods` from scratch: permanent upgrade effects as the
   *  baseline, then every currently active (non-expired) powerup layered on. */
  recomputeMods() {
    this.mods = defaultMods();

    // Permanent upgrades form the run's baseline, before powerups layer on top.
    const steady = upgradeValue(save, 'steadyhand');
    if (steady) this.mods.perfectThreshBonus += steady;
    const fortune = upgradeValue(save, 'fortune');
    if (fortune) this.mods.coinMult *= fortune;
    const tempo = upgradeValue(save, 'tempo');
    if (tempo) this.mods.speedRampDamp = Math.max(this.mods.speedRampDamp, tempo);

    for (const ap of this.activePowerups) {
      const def = getPowerupDef(ap.id);
      if (def) def.apply(this.mods);
    }
  }

  /** Data for the active-powerups HUD strip: name/icon, seconds remaining,
   *  and the fraction of total duration still left (for a depleting ring). */
  getActivePowerupView() {
    return this.activePowerups.map((ap) => {
      const def = getPowerupDef(ap.id);
      const remaining = Math.max(0, ap.remaining);
      return {
        id: ap.id,
        name: def ? def.name : ap.id,
        icon: def ? def.icon : 'dash',
        secondsLeft: Math.ceil(remaining),
        fraction: Math.max(0, Math.min(1, remaining / DURATION_SECONDS)),
      };
    });
  }

  applyPowerup(powerup) {
    if (this.audio) this.audio.powerupPick();

    const existing = this.activePowerups.find((ap) => ap.id === powerup.id);
    if (existing) {
      existing.remaining = DURATION_SECONDS;
    } else {
      // Enforce the simultaneous-active cap: if full, evict the powerup with
      // the least time left (it goes on cooldown) to make room for the new one.
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

    const top = this.blocks[this.blocks.length - 1];
    if (powerup.id === 'widebase') {
      // immediate one-time width boost, on top of the (now active) cap increase
      const hardCap = this.runMaxWidthCap + this.mods.maxWidthCapExtra;
      const newW = Math.min(top.blockW + 40, hardCap);
      const newX = top.x + (top.blockW - newW) / 2;
      top.setWidth(newW);
      top.x = newX;
      this.effectiveMaxWidth = Math.max(this.effectiveMaxWidth, newW);
    }

    this.ui.updateShields(this.shieldCount());
    this.ui.updateActivePowerups(this.getActivePowerupView());
    this.state = 'playing';
    this.updateMilestoneMarker();
    this.spawnMoving(top);
  }

  endRun() {
    this.state = 'gameover';
    this.milestoneMarker.visible = false;
    this.guideGfx.visible = false;
    if (this.audio) this.audio.gameOver();

    this._zoomOutToShowTower();

    let isNewBest = false;
    if (this.score > save.best) {
      save.best = this.score;
      isNewBest = true;
    }
    save.coins += this.coinsThisRun;
    commitSave();

    // Hold on the zoomed-out view of the whole pile for a beat before the
    // game-over panel slides in, so the player gets to take it in.
    setTimeout(() => {
      this.ui.onStateChange('gameover');
      this.ui.showGameOver({
        score: this.score,
        coinsEarned: this.coinsThisRun,
        isNewBest,
      });
    }, 3000);
  }

  /** Animate the camera out to frame the entire built tower, ground to top,
   *  as a reveal moment after the run ends. */
  _zoomOutToShowTower() {
    const top = this.blocks[this.blocks.length - 1];
    const towerTopY = top.y - BLOCK_HEIGHT;
    const towerBottomY = this.groundWorldY;
    const towerHeight = Math.max(towerBottomY - towerTopY, BLOCK_HEIGHT);
    const towerCenterY = (towerBottomY + towerTopY) / 2;

    // Fit the tower within 75% of the viewport height; never zoom in past 1x.
    const targetScale = Math.min(1, (this.H * 0.75) / towerHeight);
    const targetWorldY = this.H / 2 - towerCenterY * targetScale;
    const targetWorldX = (this.W / 2) * (1 - targetScale);

    // Slow, eased pull-back so the reveal of the whole pile feels deliberate.
    gsap.killTweensOf(this.world);
    gsap.killTweensOf(this.world.scale);
    gsap.to(this.world.scale, { x: targetScale, y: targetScale, duration: 2.2, ease: 'power3.inOut' });
    gsap.to(this.world, { x: targetWorldX, y: targetWorldY, duration: 2.2, ease: 'power3.inOut' });
  }

  goToMenu() {
    this.state = 'menu';
    this.ui.onStateChange('menu');
  }

  // -----------------------------------------------------------
  // Effects
  // -----------------------------------------------------------
  _spawnPerfectBurst(topBlock) {
    const cx = topBlock.x + topBlock.blockW / 2;
    const cy = topBlock.y - BLOCK_HEIGHT;
    const tint = 0xffe08a;
    this.burst.burst(cx, cy, tint, 18);
  }

  triggerShake(mag) {
    this.cameraShakeMag = Math.max(this.cameraShakeMag, mag);
    this.cameraShakeT = 0.25;
  }

  showToast(text, variant) {
    this.ui.showToast(text, variant);
  }

  // -----------------------------------------------------------
  // Zones: every ZONE_SIZE floors the palette shifts and a mild mechanic
  // twist (drift / rush) cycles in, giving the endless climb milestones.
  // -----------------------------------------------------------
  _applyZone(index) {
    const t = ZONE_TYPES[index % ZONE_TYPES.length];
    this.zoneSpeedMult = t.speedMult;
    // Randomize the drift direction each zone so it's not predictable.
    this.zoneWind = t.wind ? (Math.random() < 0.5 ? -t.wind : t.wind) : 0;
  }

  _checkZone() {
    const z = Math.floor(this.floors / ZONE_SIZE);
    if (z > this.zoneIndex) {
      this.zoneIndex = z;
      this._applyZone(z);
      const t = ZONE_TYPES[z % ZONE_TYPES.length];
      this.showToast(`ZONE ${z + 1} · ${t.name}`, 'zone');
      this.triggerShake(6);
    }
  }

  /** Precision Guide: outline the exact footprint where a perfect drop lands
   *  (the top block's span), projected up at the swinging block's height. */
  _updateGuide() {
    const g = this.guideGfx;
    if (!this.mods.showGuide || this.state !== 'playing' || !this.moving || this.blocks.length === 0) {
      if (g.visible) g.visible = false;
      return;
    }
    const top = this.blocks[this.blocks.length - 1];
    const y = this.moving.y - BLOCK_HEIGHT;
    g.clear();
    // target footprint outline
    g.rect(top.x, y, top.blockW, BLOCK_HEIGHT).stroke({ width: 2, color: 0x7dffd4, alpha: 0.5 });
    // guide rails dropping down onto the tower top
    g.rect(top.x, y + BLOCK_HEIGHT, 2, top.y - BLOCK_HEIGHT - (y + BLOCK_HEIGHT)).fill({ color: 0x7dffd4, alpha: 0.25 });
    g.rect(top.x + top.blockW - 2, y + BLOCK_HEIGHT, 2, top.y - BLOCK_HEIGHT - (y + BLOCK_HEIGHT)).fill({ color: 0x7dffd4, alpha: 0.25 });
    g.visible = true;
  }

  updateScrollTarget() {
    // world.y is a downward-positive offset added to every child's y.
    // We only want to start pushing the camera up (world.y > 0) once the
    // top block has climbed above the anchor line; never scroll the other way.
    const top = this.blocks[this.blocks.length - 1];
    const anchorY = this.H * ANCHOR_Y_FRAC;
    this.scrollTarget = Math.max(0, anchorY - top.y);
  }

  // -----------------------------------------------------------
  // Update loop
  // -----------------------------------------------------------
  update(dt) {
    dt = Math.min(dt, 0.05);

    // Once a run ends, the camera is driven entirely by the zoom-out tween
    // in _zoomOutToShowTower(); skip the normal follow-camera math so it
    // doesn't fight (and snap back over) that animation every frame.
    if (this.state === 'gameover') {
      this.debris.update(-this.scrollY + this.H + 100);
      this.burst.update();
      if (this.bg) this._paintBackground();
      return;
    }

    // Powerup/cooldown timers only advance during live play - NOT while the
    // powerup-choice overlay is up - so reading the cards doesn't burn your
    // active powerups' remaining time.
    if (this.state === 'playing') {
      this._tickPowerupTimers(dt);
    }

    this.scrollY += (this.scrollTarget - this.scrollY) * Math.min(1, dt * 6);

    let shakeX = 0, shakeY = 0;
    if (this.cameraShakeT > 0) {
      this.cameraShakeT -= dt;
      shakeX = (Math.random() - 0.5) * this.cameraShakeMag;
      shakeY = (Math.random() - 0.5) * this.cameraShakeMag;
    }
    this.cameraShakeMag *= 0.9;
    this.world.y = this.scrollY + shakeY;
    this.world.x = shakeX;

    if (this.state === 'playing' && this.moving) {
      // DRIFT zones add a constant sideways push (this.zoneWind) on top of the
      // swing, so the player has to compensate for the current.
      this.moving.x += this._movingDir * this._movingSpeed + this.zoneWind;
      // No bounce: the block crosses the screen once. If it fully exits the
      // far edge without being dropped, that's a miss - same outcome as
      // dropping into a gap, just triggered by running out of screen instead
      // of tapping too early/late.
      const exitedRight = this._movingDir === 1 && this.moving.x > this.W + OFFSCREEN_SPAWN_GAP;
      const exitedLeft = this._movingDir === -1 && this.moving.x + this.moving.blockW < -OFFSCREEN_SPAWN_GAP;
      if (exitedRight || exitedLeft) {
        this.handleMiss();
      }
    }

    this._updateGuide();

    this.debris.update(-this.scrollY + this.H + 100);
    this.burst.update();

    // background hue drift with score
    if (this.bg) this._paintBackground();
  }
}
