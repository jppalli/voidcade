import { W, H } from './config.js';
import { Sound } from './audio.js';
import { Game } from './game.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const stage = document.getElementById('stage');

/* ---------------- Canvas sizing (DPR-aware, letterboxed) ---------------- */

let renderScale = 1;

function resize() {
  const availW = stage.clientWidth;
  const availH = stage.clientHeight;
  const fit = Math.min(availW / W, availH / H);
  const cssW = Math.max(1, Math.floor(W * fit));
  const cssH = Math.max(1, Math.floor(H * fit));
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  renderScale = canvas.width / W;
}

new ResizeObserver(resize).observe(stage);
resize();

/* ---------------- HUD / overlay wiring ---------------- */

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelEl = document.getElementById('level');
const overlayEl = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlaySub = document.getElementById('overlay-sub');
const overlayBtn = document.getElementById('overlay-btn');
const muteBtn = document.getElementById('mute');

let overlayAction = null;

const ui = {
  updateScore(score, best) {
    scoreEl.textContent = score.toLocaleString();
    bestEl.textContent = best.toLocaleString();
  },
  updateLevel(level) {
    levelEl.textContent = level;
  },
  showOverlay({ title, sub, btn, onClick }) {
    overlayTitle.textContent = title;
    overlaySub.textContent = sub;
    overlayBtn.textContent = btn;
    overlayAction = onClick;
    overlayEl.classList.remove('hidden');
  },
  hideOverlay() {
    overlayEl.classList.add('hidden');
    overlayAction = null;
  },
};

const sound = new Sound();
const game = new Game(sound, ui);

overlayBtn.addEventListener('click', () => {
  sound.init();
  sound.click();
  if (overlayAction) overlayAction();
});

function refreshMuteBtn() {
  muteBtn.classList.toggle('off', sound.muted);
}

muteBtn.addEventListener('click', () => {
  sound.init();
  sound.setMuted(!sound.muted);
  refreshMuteBtn();
});
refreshMuteBtn();

/* ---------------- Pointer input ---------------- */

function logicalPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * W,
    y: ((e.clientY - rect.top) / rect.height) * H,
  };
}

canvas.addEventListener('pointermove', (e) => {
  const { x, y } = logicalPos(e);
  game.pointerMove(x, y);
});

canvas.addEventListener('pointerdown', (e) => {
  sound.init();
  const { x, y } = logicalPos(e);
  game.pointerMove(x, y);
  e.preventDefault();
});

canvas.addEventListener('pointerup', (e) => {
  const { x, y } = logicalPos(e);
  game.pointerUp(x, y);
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

/* ---------------- Keyboard ---------------- */

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  switch (e.code) {
    case 'Space':
      e.preventDefault();
      sound.init();
      game.swap();
      break;
    case 'KeyP':
    case 'Escape':
      game.togglePause();
      break;
    case 'KeyM':
      sound.init();
      sound.setMuted(!sound.muted);
      refreshMuteBtn();
      break;
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') game.togglePause();
});

/* ---------------- Main loop ---------------- */

let last = performance.now();

// Debug/test handle (also handy in devtools)
window.__bs = { game, sound, canvas, ctx, renderFrame: () => {
  ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  game.render(ctx);
} };

function loop(now) {
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;
  game.update(dt);
  ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  game.render(ctx);
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
