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
const panelMark = document.querySelector('.panelMark');

const topWordCard = $('topWordCard');
const bottomWordCard = $('bottomWordCard');
const topWordEl = $('topWord');
const bottomWordEl = $('bottomWord');

const lane = $('lane');
const laneTrack = $('laneTrack');

const game = new Game();

// The DOM node for the currently-live falling letter. Rebuilt on every new
// spawn (tracked by game.falling.id) so the horizontal travel animation
// always starts fresh from the correct edge.
let tokenEl = null;
let tokenForId = null;

// ---------------------------------------------------------------- rendering

/** Renders a word with its blank highlighted, one <span> per letter. */
function renderWord(container, word, blankIndex) {
  container.innerHTML = '';
  word.split('').forEach((ch, i) => {
    const span = document.createElement('span');
    span.className = 'ch';
    if (i === blankIndex) {
      span.classList.add('blank');
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
         fill="${i < lives ? '#e2735f' : 'none'}"
         stroke="${i < lives ? '#e2735f' : '#d8c3b2'}"
         stroke-width="1.8"/>
     </svg>`
  ).join('');
}

function renderAll(g) {
  scoreEl.textContent = String(g.score);
  bestEl.textContent = String(g.best);
  renderLives(g.lives, 3);

  renderWord(topWordEl, g.topDisplay(), g.topBlankIndex());
  renderWord(bottomWordEl, g.bottomDisplay(), g.bottomBlankIndex());

  syncToken(g);
}

/** Creates or updates the on-screen token to match game.falling. */
function syncToken(g) {
  if (!g.falling) return;

  if (g.falling.id !== tokenForId) {
    // A genuinely new letter — replace the DOM node so the spawn-in
    // animation and starting edge are correct.
    if (tokenEl) tokenEl.remove();
    tokenEl = document.createElement('div');
    tokenEl.className = 'fallToken spawn-in';
    tokenEl.textContent = g.falling.letter;
    laneTrack.appendChild(tokenEl);
    tokenForId = g.falling.id;

    // Force layout so the browser registers the starting position before
    // we animate `left` on the next frame.
    const startLeft = g.falling.fromLeft ? -8 : 108;
    tokenEl.style.left = `${startLeft}%`;
    void tokenEl.offsetWidth;
    requestAnimationFrame(() => tokenEl.classList.add('travelling'));
  }

  tokenEl.classList.toggle('target-up', g.falling.target === 'top');
  tokenEl.classList.toggle('target-down', g.falling.target === 'bottom');
}

function removeLiveToken() {
  if (tokenEl) {
    tokenEl.remove();
    tokenEl = null;
    tokenForId = null;
  }
}

// ---------------------------------------------------------------- animation loop

let rafId = null;
let lastTime = 0;

function positionToken() {
  if (!game.falling || !tokenEl) return;
  const progress = game.fallProgress();
  const fromLeft = game.falling.fromLeft;
  // Travel from -8% to 108% (or the reverse), so the token fully clears the
  // lane on both ends before despawning/resolving.
  const start = fromLeft ? -8 : 108;
  const end = fromLeft ? 108 : -8;
  const left = start + (end - start) * progress;
  tokenEl.style.left = `${left}%`;
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
// current token into a frozen "ghost" clone and play the resolve animation
// on that — otherwise the animation could play on top of a letter that's
// already been replaced by the next spawn.
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
  removeLiveToken();
  showGameOver();
};

function spawnGhostToken(cls) {
  if (!tokenEl) return;
  const ghost = tokenEl.cloneNode(true);
  ghost.classList.remove('spawn-in', 'travelling');
  ghost.classList.add('ghostToken', cls);
  ghost.style.left = tokenEl.style.left;
  laneTrack.appendChild(ghost);
  setTimeout(() => ghost.remove(), 380);
  removeLiveToken();
}

// ---------------------------------------------------------------- overlays

function showStart() {
  panelMark.classList.remove('hidden');
  overlayTitle.textContent = 'SplitSpell';
  overlaySub.textContent = 'Letters drift by. Swipe up or down to send each one to the word that needs it.';
  overlayBtn.textContent = 'Play';
  overlay.classList.remove('hidden');
}

function showGameOver() {
  panelMark.classList.add('hidden');
  overlayTitle.textContent = 'Game Over';
  overlaySub.innerHTML = `
    <span class="stats-row">
      <span class="item">
        <span class="n">${game.score}</span>
        <span class="l">Score</span>
      </span>
      <span class="item">
        <span class="n">${game.best}</span>
        <span class="l">Best</span>
      </span>
    </span>`;
  overlayBtn.textContent = 'Play again';
  overlay.classList.remove('hidden');
}

overlayBtn.addEventListener('click', () => {
  playTap();
  overlay.classList.add('hidden');
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

// Click top-half/bottom-half of the board (desktop fallback)
const board = $('board');
board.addEventListener('click', (e) => {
  if (game.state !== 'playing') return;
  const rect = board.getBoundingClientRect();
  const relY = e.clientY - rect.top;
  attemptSwipe(relY < rect.height / 2 ? 'up' : 'down');
});

// Swipe (touch) — track vertical delta, threshold to decide direction
let touchStartY = null;
let touchStartX = null;

board.addEventListener(
  'touchstart',
  (e) => {
    if (game.state !== 'playing') return;
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
  },
  { passive: true }
);

board.addEventListener(
  'touchend',
  (e) => {
    if (touchStartY === null || game.state !== 'playing') return;
    const touch = e.changedTouches[0];
    const dy = touch.clientY - touchStartY;
    const dx = touch.clientX - touchStartX;
    touchStartY = null;
    touchStartX = null;

    const SWIPE_THRESHOLD = 24;
    if (Math.abs(dy) < SWIPE_THRESHOLD || Math.abs(dx) > Math.abs(dy)) {
      // Too small / too horizontal to be a swipe — treat as a tap, routed
      // by which half of the board was touched.
      const rect = board.getBoundingClientRect();
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

// ---------------------------------------------------------------- init

refreshMuteIcon();
renderLives(3, 3);
showStart();
