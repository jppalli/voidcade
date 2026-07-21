import { W, H } from './config.js';
import { Sound } from './audio.js';
import { Game } from './game.js';
import { renderIcon } from './icons.js';

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
const chargeBar = document.getElementById('chargeBar');
const chargeBarFill = document.getElementById('chargeBarFill');
const activePowerupsHud = document.getElementById('activePowerups');
const powerupModal = document.getElementById('powerupModal');
const powerupList = document.getElementById('powerupList');

let overlayAction = null;
let onChoosePowerup = null;
const apNodes = {};

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

  /** Roguelite charge meter — fills as bubbles pop, full = powerup pick. */
  updateCharge(fraction) {
    if (!chargeBarFill) return;
    chargeBarFill.style.width = `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;
    if (chargeBar) chargeBar.classList.toggle('full', fraction >= 1);
  },

  /** Brief "ready" celebration on the meter during the delay between it
   *  filling and the choice modal actually opening — gives the cascade
   *  that filled it a beat to finish before cutting to the modal. */
  setChargeReady(ready) {
    if (chargeBar) chargeBar.classList.toggle('ready', ready);
  },

  /** 3-card powerup choice modal. */
  showPowerupChoice(choices, onChoose) {
    onChoosePowerup = onChoose;
    powerupList.innerHTML = '';
    choices.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'powerup-card';
      card.innerHTML = `<div class="icon">${renderIcon(p.icon, '#f6b545', 26)}</div><div class="name">${p.name}</div><div class="desc">${p.desc}</div>`;
      card.addEventListener('click', () => {
        powerupModal.classList.add('hidden');
        sound.click();
        onChoosePowerup(p);
      });
      powerupList.appendChild(card);
    });
    powerupModal.classList.remove('hidden');
  },

  /** Active-powerup strip: small ring icons with a depleting timer arc. */
  updateActivePowerups(list) {
    if (!activePowerupsHud) return;
    if (!list.length) {
      activePowerupsHud.classList.add('hidden');
      activePowerupsHud.innerHTML = '';
      for (const k of Object.keys(apNodes)) delete apNodes[k];
      return;
    }
    activePowerupsHud.classList.remove('hidden');
    const seen = new Set(list.map((p) => p.id));
    for (const id of Object.keys(apNodes)) {
      if (!seen.has(id)) { apNodes[id].el.remove(); delete apNodes[id]; }
    }
    const RADIUS = 14, CIRC = 2 * Math.PI * RADIUS;
    list.forEach((p) => {
      let node = apNodes[p.id];
      if (!node) {
        const el = document.createElement('div');
        el.className = 'active-powerup';
        el.title = p.name;
        el.innerHTML = `<svg viewBox="0 0 34 34" width="34" height="34"><circle class="ap-track" cx="17" cy="17" r="${RADIUS}" /><circle class="ap-bar" cx="17" cy="17" r="${RADIUS}" stroke-dasharray="${CIRC}" transform="rotate(-90 17 17)" /></svg><span class="ap-icon">${renderIcon(p.icon, '#f6b545', 15)}</span>`;
        activePowerupsHud.appendChild(el);
        node = { el, bar: el.querySelector('.ap-bar') };
        apNodes[p.id] = node;
      }
      node.bar.style.strokeDashoffset = String(CIRC * (1 - p.fraction));
      node.bar.classList.toggle('low', p.fraction < 0.25);
    });
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
