// Neon Dodge core loop. Plain Canvas2D, no framework - deliberately the
// simplest possible "real game" to validate the monorepo + shared ads
// package end to end. 3 lanes, obstacles fall from the top, tap/arrow keys
// switch lanes, survive as long as possible.
import { save, commitSave } from './save.js';

const LANES = 3;
const PLAYER_SIZE = 34;
const OBSTACLE_SIZE = 34;
const BASE_FALL_SPEED = 220; // px/sec
const SPEED_GROWTH_PER_SEC = 4; // px/sec, added every second survived
const SPAWN_INTERVAL_START = 950; // ms between obstacle spawns
const SPAWN_INTERVAL_MIN = 420;
const SPAWN_TIGHTEN_PER_SEC = 6; // ms shaved off spawn interval per second

export class Game {
  constructor(canvas, ui, adManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = ui;
    this.adManager = adManager || null;

    this.state = 'menu'; // 'menu' | 'playing' | 'gameover'
    this.lane = 1;
    this.targetLane = 1;
    this.playerX = 0;
    this.obstacles = [];
    this.particles = [];
    this.score = 0;
    this.elapsed = 0;
    this.spawnTimer = 0;
    this.spawnInterval = SPAWN_INTERVAL_START;
    this.fallSpeed = BASE_FALL_SPEED;
    this.continuesUsedThisRun = 0;
    this._laneX = [0, 0, 0];

    this._resize();
    window.addEventListener('resize', () => this._resize());

    canvas.addEventListener('pointerdown', (e) => this._onPointer(e));
    window.addEventListener('keydown', (e) => this._onKey(e));

    this._lastTime = 0;
    requestAnimationFrame((t) => this._loop(t));
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = this.canvas.clientWidth;
    this.H = this.canvas.clientHeight;
    this.canvas.width = this.W * dpr;
    this.canvas.height = this.H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const laneW = this.W / LANES;
    this._laneX = Array.from({ length: LANES }, (_, i) => laneW * (i + 0.5));
    this.playerX = this._laneX[this.lane];
  }

  // -----------------------------------------------------------
  _onPointer(e) {
    if (this.state !== 'playing') return;
    const x = e.clientX;
    if (x < this.W / 2) this._moveLane(-1);
    else this._moveLane(1);
  }

  _onKey(e) {
    if (this.state !== 'playing') return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') this._moveLane(-1);
    if (e.code === 'ArrowRight' || e.code === 'KeyD') this._moveLane(1);
  }

  _moveLane(dir) {
    this.targetLane = Math.max(0, Math.min(LANES - 1, this.targetLane + dir));
  }

  // -----------------------------------------------------------
  startRun() {
    this.state = 'playing';
    this.lane = 1;
    this.targetLane = 1;
    this.playerX = this._laneX[1];
    this.obstacles = [];
    this.particles = [];
    this.score = 0;
    this.elapsed = 0;
    this.spawnTimer = 0;
    this.spawnInterval = SPAWN_INTERVAL_START;
    this.fallSpeed = BASE_FALL_SPEED;
    this.continuesUsedThisRun = 0;
    this.ui.onStateChange('playing');
    this.ui.updateScore(0);
  }

  goToMenu() {
    this.state = 'menu';
    this.ui.onStateChange('menu');
  }

  /** Called by the UI after a successful rewarded-ad watch: clears nearby
   *  obstacles and resumes play instead of ending the run. */
  continueRun() {
    this.continuesUsedThisRun++;
    // Clear any obstacle close enough to be an immediate re-collision.
    this.obstacles = this.obstacles.filter((o) => o.y < this.H * 0.4);
    this.state = 'playing';
    this.ui.onStateChange('playing');
  }

  endRun() {
    this.state = 'gameover';
    let isNewBest = false;
    if (this.score > save.best) {
      save.best = this.score;
      isNewBest = true;
    }
    commitSave();
    this.ui.onStateChange('gameover');
    this.ui.showGameOver({ score: this.score, isNewBest });

    // Frequency-capped between-run interstitial; AdManager decides whether
    // enough time/runs have passed to actually show one.
    if (this.adManager) {
      this.adManager.maybeShowInterstitial({ title: 'Back to the arcade in a moment' });
    }
  }

  // -----------------------------------------------------------
  _spawnObstacle() {
    const lane = Math.floor(Math.random() * LANES);
    this.obstacles.push({
      lane,
      x: this._laneX[lane],
      y: -OBSTACLE_SIZE,
      hue: 300 + Math.random() * 60,
    });
  }

  _update(dt) {
    if (this.state !== 'playing') return;

    this.elapsed += dt;
    this.fallSpeed = BASE_FALL_SPEED + this.elapsed * SPEED_GROWTH_PER_SEC;
    this.spawnInterval = Math.max(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_START - this.elapsed * SPAWN_TIGHTEN_PER_SEC);

    // lane easing
    this.lane = this.targetLane;
    const targetX = this._laneX[this.lane];
    this.playerX += (targetX - this.playerX) * Math.min(1, dt * 12);

    // spawn
    this.spawnTimer += dt * 1000;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this._spawnObstacle();
    }

    // move obstacles + collide
    const playerY = this.H - 90;
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.y += this.fallSpeed * dt;

      const dx = Math.abs(o.x - this.playerX);
      const dy = Math.abs(o.y - playerY);
      if (dx < (PLAYER_SIZE + OBSTACLE_SIZE) / 2.6 && dy < (PLAYER_SIZE + OBSTACLE_SIZE) / 2.6) {
        this._spawnHitParticles(o.x, o.y, o.hue);
        this.obstacles.splice(i, 1);
        this.endRun();
        return;
      }

      if (o.y > this.H + OBSTACLE_SIZE) {
        this.obstacles.splice(i, 1);
        this.score += 1;
        this.ui.updateScore(this.score);
      }
    }

    // particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += 0.3;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.03;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  _spawnHitParticles(x, y, hue) {
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        hue,
      });
    }
  }

  _render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);

    // background
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, this.W, this.H);

    // lane dividers
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 1; i < LANES; i++) {
      const x = (this.W / LANES) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.H);
      ctx.stroke();
    }

    // obstacles
    for (const o of this.obstacles) {
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = `hsl(${o.hue}, 90%, 62%)`;
      ctx.shadowColor = `hsl(${o.hue}, 100%, 65%)`;
      ctx.shadowBlur = 16;
      ctx.fillRect(-OBSTACLE_SIZE / 2, -OBSTACLE_SIZE / 2, OBSTACLE_SIZE, OBSTACLE_SIZE);
      ctx.restore();
    }
    ctx.shadowBlur = 0;

    // player
    if (this.state === 'playing' || this.state === 'gameover') {
      const playerY = this.H - 90;
      ctx.save();
      ctx.translate(this.playerX, playerY);
      ctx.fillStyle = '#7dffd4';
      ctx.shadowColor = '#7dffd4';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 0, PLAYER_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;
    }

    // particles
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = `hsl(${p.hue}, 90%, 65%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _loop(t) {
    const dt = this._lastTime ? Math.min((t - this._lastTime) / 1000, 0.05) : 0;
    this._lastTime = t;
    this._update(dt);
    this._render();
    requestAnimationFrame((tt) => this._loop(tt));
  }
}
