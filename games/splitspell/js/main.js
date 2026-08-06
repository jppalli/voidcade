import { Game } from './game.js';
import {
  playGameOver,
  playMiss,
  playTap,
  playWordComplete,
  playWrong,
  setSoundEnabled,
  soundEnabled,
} from './audio.js';

const $ = (id) => document.getElementById(id);

const scoreEl = $('score');
const bestEl = $('best');
const livesEl = $('lives');
const muteBtn = $('mute');
const overlay = $('overlay');
const overlayTitle = $('overlay-title');
const overlaySub = $('overlay-sub');
const overlayBtn = $('overlay-btn');

const topWordCard = $('topWordCard');
const bottomWordCard = $('bottomWordCard');
const topWordEl = $('topWord');
const bottomWordEl = $('bottomWord');

const lane = $('lane');
const fallToken = $('fallToken');
const fallLetter = $('fallLetter');
const arrowUp = document.querySelector('.laneArrow-up');
const arrowDown = document.querySelector('.laneArrow-down');

const game = new Game();

// ---------------------------------------------------------------- rendering

/** Renders a word with its blank highlighted, one <span> per letter. */
function renderWord(container, word, blankIndex, target) {
  container.innerHTML = '';
  const chars = word.split('');
  chars.forEach((ch, i) => {
    const span = document.createElement('span');
    span.className = 'ch';
    if (i === blankIndex) {
      span.classList.add('blank', target === 'top' ? 'top-target' : 'bottom-target');
      span.textContent = '_';
    } else {
      span.classList.add('filled');
      span.textContent = ch;
    }
    container.appendChild(span);
  });
}

function renderLives(lives, maxLives) {
  livesEl.innerHTML = Array.from({ length: maxLives }, (_, i) =>
    `<svg viewBox="0 0 24 24" width="18" height="18">
       <path d="M12 20.5s-7.5-4.6-7.5-9.6a4.4 4.4 0 0 1 7.5-3.1 4.4 4.4 0 0 1 7.5 3.1c0 5-7.5 9.6-7.5 9.6Z"
         fill="${i < lives ? '#ff9db0' : 'none'}"
         stroke="${i < lives ? '#ff9db0' : '#3a4160'}"
         stroke-width="1.8"/>
     </svg>`
  ).join('');
}

function renderAll(g) {
  scoreEl.textContent = String(g.score);
  bestEl.textContent = String(g.best);
  renderLives(g.lives, 3);

  renderWord(topWordEl, g.topDisplay(), g.topBlankIndex(), 'top');
  renderWord(bottomWordEl, g.bottomDisplay(), g.bottomBlankIndex(), 'bottom');

  if (g.falling) {
    fallLetter.textContent = g.falling.letter;
    fallToken.classList.remove('hidden');
    fallToken.classList.toggle('target-top', g.falling.target === 'top');
    fallToken.classList.toggle('target-bottom', g.falling.target === 'bottom');
    arrowUp.classList.toggle('active-up', g.falling.target === 'top');
    arrowDown.classList.toggle('active-down', g.falling.target === 'bottom');
  }
}

// ---------------------------------------------------------------- animation loop

let rafId = null;
let lastTime = 0;
let laneHeight = 0;
let tokenHalf = 28;

function updateLaneMetrics() {
  laneHeight = lane.clientHeight;
  tokenHalf = fallToken.offsetHeight / 2 || 28;
}

function positionToken() {
  if (!game.falling) return;
  const progress = game.fallProgress();
  const travel = laneHeight - tokenHalf * 2;
  fallToken.style.top = `${8 + progress * Math.max(0, travel - 16)}px`;
}

function frame(now) {
  const dt = lastTime ? now - lastTime : 16;
  lastTime = now;

  if (game.state === 'playing') {
    game.tick(dt);
    positionToken();
  }

  rafId = requestAnimationFrame(frame);
}

function startLoop() {
  lastTime = 0;
  if (!rafId) rafId = requestAnimationFrame(frame);
}

function stopLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

// ---------------------------------------------------------------- game event wiring

game.onUpdate = (g) => renderAll(g);

// These fire *before* game._emit() runs renderAll(), so we snapshot the
// letter/target that's resolving right now and flash a short-lived ghost
// token in that exact spot — otherwise the flash animation would play on
// top of whatever letter game.onUpdate has already swapped in.
game.onWordComplete = (side, word, comboLevel) => {
  playWordComplete(comboLevel);
  const card = side === 'top' ? topWordCard : bottomWordCard;
  card.classList.remove('celebrate');
  void card.offsetWidth; // restart animation
  card.classList.add('celebrate');
  spawnGhostToken('resolved-correct');
};

game.onWrongSwipe = () => {
  playWrong();
  spawnGhostToken('resolved-wrong');
};

game.onMiss = () => {
  playMiss();
  spawnGhostToken('resolved-miss');
};

game.onGameOver = () => {
  playGameOver();
  stopLoop();
  showGameOver();
};

/**
 * Clones the currently-visible falling token into a short-lived "ghost"
 * element at the exact same spot, then plays the resolve animation on the
 * clone. This runs synchronously inside the onWordComplete/onWrongSwipe/
 * onMiss callbacks — which fire *before* the game emits its next state
 * update — so the clone always shows the letter that actually resolved,
 * never the next letter that's about to replace it on screen.
 */
function spawnGhostToken(cls) {
  if (fallToken.classList.contains('hidden')) return;
  const ghost = fallToken.cloneNode(true);
  ghost.removeAttribute('id');
  ghost.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id')); // drop #fallLetter's id too
  ghost.classList.add('ghostToken', cls);
  ghost.style.top = fallToken.style.top;
  lane.appendChild(ghost);
  setTimeout(() => ghost.remove(), 340);
}

// ---------------------------------------------------------------- overlays

function showStart() {
  overlayTitle.textContent = 'SplitSpell';
  overlaySub.textContent = 'Swipe up or down to send the letter to the word that needs it.';
  overlayBtn.textContent = 'Play';
  overlay.classList.remove('hidden');
}

function showGameOver() {
  overlayTitle.textContent = 'Game Over';
  overlaySub.innerHTML = `
    <span class="stats-row" style="display:flex;justify-content:center;gap:28px;margin-bottom:4px;">
      <span style="display:flex;flex-direction:column;align-items:center;">
        <span style="font-size:24px;font-weight:900;color:#e8ecf8;">${game.score}</span>
        <span style="font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#6f7994;">Score</span>
      </span>
      <span style="display:flex;flex-direction:column;align-items:center;">
        <span style="font-size:24px;font-weight:900;color:#e8ecf8;">${game.best}</span>
        <span style="font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#6f7994;">Best</span>
      </span>
    </span>`;
  overlayBtn.textContent = 'Play again';
  overlay.classList.remove('hidden');
}

overlayBtn.addEventListener('click', () => {
  playTap();
  overlay.classList.add('hidden');
  updateLaneMetrics();
  game.start();
  startLoop();
});

// ---------------------------------------------------------------- input

function attemptSwipe(direction) {
  if (game.state !== 'playing') return;
  game.swipe(direction);
}

// Keyboard (desktop)
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    e.preventDefault();
    attemptSwipe('up');
  } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    e.preventDefault();
    attemptSwipe('down');
  } else if (e.key === 'm' || e.key === 'M') {
    toggleMute();
  }
});

// Click top-half/bottom-half of the stage (desktop fallback)
const stage = $('stage');
stage.addEventListener('click', (e) => {
  if (game.state !== 'playing') return;
  const rect = stage.getBoundingClientRect();
  const relY = e.clientY - rect.top;
  attemptSwipe(relY < rect.height / 2 ? 'up' : 'down');
});

// Swipe (touch) — track vertical delta, threshold to decide direction
let touchStartY = null;
let touchStartX = null;

stage.addEventListener(
  'touchstart',
  (e) => {
    if (game.state !== 'playing') return;
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
  },
  { passive: true }
);

stage.addEventListener(
  'touchend',
  (e) => {
    if (touchStartY === null || game.state !== 'playing') return;
    const touch = e.changedTouches[0];
    const dy = touch.clientY - touchStartY;
    const dx = touch.clientX - touchStartX;
    touchStartY = null;
    touchStartX = null;

    const SWIPE_THRESHOLD = 24;
    // Ignore mostly-horizontal gestures
    if (Math.abs(dy) < SWIPE_THRESHOLD || Math.abs(dx) > Math.abs(dy)) {
      // Treat as a tap: route by which half of the stage was touched
      const rect = stage.getBoundingClientRect();
      const relY = touch.clientY - rect.top;
      attemptSwipe(relY < rect.height / 2 ? 'up' : 'down');
      return;
    }
    attemptSwipe(dy < 0 ? 'up' : 'down');
  },
  { passive: true }
);

// ---------------------------------------------------------------- sound toggle

function refreshMuteIcon() {
  muteBtn.classList.toggle('muted', !soundEnabled());
  muteBtn.querySelector('.icon-on').style.display = soundEnabled() ? '' : 'none';
  muteBtn.querySelector('.icon-off').style.display = soundEnabled() ? 'none' : '';
}

function toggleMute() {
  setSoundEnabled(!soundEnabled());
  refreshMuteIcon();
  if (soundEnabled()) playTap();
}

muteBtn.addEventListener('click', toggleMute);

// ---------------------------------------------------------------- resize

window.addEventListener('resize', updateLaneMetrics);

// ---------------------------------------------------------------- init

refreshMuteIcon();
renderLives(3, 3);
updateLaneMetrics();
showStart();
