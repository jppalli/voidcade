import { CHAPTERS, TOTAL_LEVELS, allLevels, levelAt } from './levels.js';
import { Game } from './game.js';
import { loadProgress, recordWin, saveProgress, solvedCount, totalStars } from './progress.js';
import {
  playBonusFound,
  playInvalid,
  playLevelComplete,
  playPick,
  playRelease,
  playRequiredFound,
  playTap,
  setSoundEnabled,
  soundEnabled,
} from './audio.js';

const app = document.getElementById('app');

function h(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild;
}

const icon = {
  back: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>`,
  star: `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 2.5l3.09 6.26 6.91 1-5 4.87 1.18 6.87L12 18.27 5.82 21.5 7 14.63l-5-4.87 6.91-1z"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`,
  sparkle: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/></svg>`,
  shuffle: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18h3.5a3 3 0 0 0 2.4-1.2l7-9.6A3 3 0 0 1 17.3 6H22"/><path d="M2 6h3.5a3 3 0 0 1 2.4 1.2l.7.95"/><path d="M17.3 18a3 3 0 0 0 2.4-1.2l.3-.4"/><path d="M22 6l-3.5-3M22 6l-3.5 3M22 18l-3.5-3M22 18l-3.5 3"/></svg>`,
  sound: `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9.5 9.5 0 0 1 0 13"/></svg>`,
  soundOff: `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none"/><line x1="16" y1="9" x2="22" y2="15"/><line x1="22" y1="9" x2="16" y2="15"/></svg>`,
  check: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  back2: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12H4M10 6l-6 6 6 6"/></svg>`,
};

const starRow = (n, max = 3) =>
  Array.from({ length: max }, (_, i) => `<span class="starDot ${i < n ? 'on' : ''}">${icon.star}</span>`).join('');

let progress = loadProgress();
let cleanupCurrent = null;

function show(screen, cleanup) {
  cleanupCurrent?.();
  cleanupCurrent = cleanup ?? null;
  app.replaceChildren(screen);
  window.scrollTo({ top: 0 });
}

// ---------------------------------------------------------------- sound toggle

function refreshSoundButtons(root) {
  const on = soundEnabled();
  root.querySelectorAll('[data-sound]').forEach((btn) => {
    btn.classList.toggle('off', !on);
    btn.innerHTML = on ? icon.sound : icon.soundOff;
  });
}

// ---------------------------------------------------------------- title screen

function showTitle() {
  const solved = solvedCount(progress);
  const stars = totalStars(progress);
  const screen = h(`
    <section class="screen title">
      <div class="titleCard">
        <div class="titleBloom">${bloomMark(72)}</div>
        <h1>Word<span>bloom</span></h1>
        <p class="tag">Trace the ring. Find every word. No timer, no rush.</p>
        <button class="btn primary big" data-play>${solved === 0 ? 'Start' : 'Continue'}</button>
        ${solved > 0 ? `<p class="titleProgress">${solved} / ${TOTAL_LEVELS} blooms &middot; ${stars} stars</p>` : ''}
        <div class="titleRow">
          <button class="btn ghost" data-help>How to play</button>
          <button class="btn ghost iconOnly" data-sound title="Toggle sound">${icon.sound}</button>
        </div>
        <a class="voidcadeLink" href="../../">&larr; Back to Voidcade</a>
      </div>
    </section>`);

  screen.querySelector('[data-play]').addEventListener('click', () => {
    playTap();
    showSelect();
  });
  screen.querySelector('[data-help]').addEventListener('click', () => {
    playTap();
    showHelp();
  });
  refreshSoundButtons(screen);
  screen.querySelector('[data-sound]').addEventListener('click', () => {
    setSoundEnabled(!soundEnabled());
    refreshSoundButtons(screen);
    if (soundEnabled()) playTap();
  });

  show(screen);
}

function bloomMark(size) {
  return `
    <svg viewBox="0 0 100 100" width="${size}" height="${size}">
      <circle cx="50" cy="28" r="15" fill="#3f97a8"/>
      <circle cx="72" cy="41" r="15" fill="#e2735f"/>
      <circle cx="72" cy="65" r="15" fill="#6fb56f"/>
      <circle cx="50" cy="78" r="15" fill="#9b8ad1"/>
      <circle cx="28" cy="65" r="15" fill="#3f97a8"/>
      <circle cx="28" cy="41" r="15" fill="#e2735f"/>
      <circle cx="50" cy="52" r="17" fill="#e0a638"/>
    </svg>`;
}

function modal(inner, { dismissable = true } = {}) {
  const wrap = h(`<div class="scrim"><div class="modal">${inner}</div></div>`);
  const close = () => {
    wrap.classList.add('out');
    setTimeout(() => wrap.remove(), 180);
  };
  if (dismissable) {
    wrap.addEventListener('click', (ev) => { if (ev.target === wrap) close(); });
  }
  document.body.appendChild(wrap);
  return { wrap, close };
}

function showHelp() {
  const { wrap, close } = modal(`
    <h2>How to play</h2>
    <div class="rules">
      <p>Every level gives you a ring of letters. Drag across the ring (or tap
         letters one at a time) to spell a word, then release &mdash; or press
         the checkmark &mdash; to submit it.</p>
      <p>Each level has a short list of <b>required words</b>. Find them all to
         clear the bloom. Any other real word you spell along the way counts as
         a <b>bonus</b> &mdash; not required, just extra credit.</p>
      <p>No timer, no lives. Take your time.</p>
      <h3>Stars</h3>
      <p>1 star for clearing the required words. A 2nd for doing it with no
         invalid submissions. A 3rd for finding a good share of the bonus words
         hiding in the ring too.</p>
    </div>
    <button class="btn primary" data-close>Got it</button>`);
  wrap.querySelector('[data-close]').addEventListener('click', close);
}

// ---------------------------------------------------------------- level select

function showSelect() {
  const screen = h(`
    <section class="screen select">
      <header class="bar">
        <button class="iconBtn" data-back>${icon.back}</button>
        <div class="barTitle">
          <h2>Your garden</h2>
          <p>${solvedCount(progress)} / ${TOTAL_LEVELS} solved</p>
        </div>
        <button class="iconBtn" data-sound>${icon.sound}</button>
      </header>
      <div class="scroll">
        <div class="chapterList"></div>
      </div>
    </section>`);

  const listEl = screen.querySelector('.chapterList');
  const levels = allLevels();

  CHAPTERS.forEach((chapter, chapterIndex) => {
    const chLevels = levels.filter((l) => l.chapterIndex === chapterIndex);
    const doneInCh = chLevels.filter((l) => progress.results[l.index]?.solved).length;
    const firstIndex = chLevels[0].index;
    const chapterUnlocked = firstIndex === 0 || progress.results[firstIndex - 1]?.solved;

    const card = h(`
      <div class="chapterCard${chapterUnlocked ? '' : ' locked'}">
        <div class="chapterHead" style="--accent:${chapter.accent}">
          <span class="chDot"></span>
          <span class="chText">
            <span class="chName">${chapter.name}</span>
            <span class="chSub">${chapterUnlocked ? `${doneInCh} / ${chLevels.length} &middot; ${chapter.blurb}` : 'Clear the previous garden to unlock'}</span>
          </span>
          ${chapterUnlocked ? '' : `<span class="chLock">${icon.lock}</span>`}
        </div>
        <div class="levelGrid"></div>
      </div>`);

    const grid = card.querySelector('.levelGrid');
    chLevels.forEach((lvl) => {
      const result = progress.results[lvl.index];
      const unlocked = lvl.index === 0 || progress.results[lvl.index - 1]?.solved;
      const isNext = unlocked && !result?.solved;
      const btn = h(`
        <button class="levelNode ${result?.solved ? 'done' : isNext ? 'next' : unlocked ? 'open' : 'locked'}">
          ${unlocked
            ? `<span class="lnNum">${lvl.levelInChapter + 1}</span>
               <span class="lnStars">${starRow(result?.stars ?? 0)}</span>`
            : icon.lock}
        </button>`);
      if (unlocked) {
        btn.addEventListener('click', () => { playTap(); startLevel(lvl.index); });
      } else {
        btn.disabled = true;
      }
      grid.appendChild(btn);
    });

    listEl.appendChild(card);
  });

  screen.querySelector('[data-back]').addEventListener('click', () => { playTap(); showTitle(); });
  refreshSoundButtons(screen);
  screen.querySelector('[data-sound]').addEventListener('click', () => {
    setSoundEnabled(!soundEnabled());
    refreshSoundButtons(screen);
    if (soundEnabled()) playTap();
  });

  show(screen);

  // Scroll to the first not-yet-solved chapter card
  const nextCard = listEl.querySelector('.chapterCard:not(.locked) .levelNode.next')?.closest('.chapterCard');
  if (nextCard) {
    requestAnimationFrame(() => nextCard.scrollIntoView({ block: 'center' }));
  }
}

// ---------------------------------------------------------------- play screen

const RING_COLORS = ['#3f97a8', '#e2735f', '#6fb56f', '#9b8ad1', '#e0a638', '#c9573f', '#4a90a4'];

function startLevel(levelIndex) {
  const ref = levelAt(levelIndex);
  const game = new Game(levelIndex);
  let shuffleOrder = ref.letters.slice();
  let isDragging = false;
  let pointerDownAt = null;
  let finished = false;

  const screen = h(`
    <section class="screen play">
      <header class="bar">
        <button class="iconBtn" data-back>${icon.back}</button>
        <div class="barTitle">
          <h2>${ref.chapter.name}</h2>
          <p>Bloom ${ref.levelInChapter + 1} &middot; ${game.requiredFoundCount} / ${game.requiredTotal} found</p>
        </div>
        <button class="iconBtn" data-shuffle title="Shuffle ring">${icon.shuffle}</button>
      </header>

      <div class="playBody">
        <div class="wordList"></div>

        <div class="ringWrap">
          <svg class="ringLines"></svg>
          <div class="ringCenter">
            <span class="ringWord"></span>
            <div class="ringActions">
              <button class="ringBtn back2" data-undo title="Remove last letter">${icon.back2}</button>
              <button class="ringBtn enter" data-enter title="Submit word">${icon.check}</button>
            </div>
          </div>
          <div class="ringTiles"></div>
        </div>

        <div class="bonusPanel">
          <span class="bonusLabel">${icon.sparkle} Bonus words</span>
          <div class="bonusChips"></div>
        </div>
      </div>
    </section>`);

  const wordListEl = screen.querySelector('.wordList');
  const ringTilesEl = screen.querySelector('.ringTiles');
  const ringLinesEl = screen.querySelector('.ringLines');
  const ringWordEl = screen.querySelector('.ringWord');
  const bonusChipsEl = screen.querySelector('.bonusChips');
  const bonusPanelEl = screen.querySelector('.bonusPanel');
  const progressText = screen.querySelector('.barTitle p');

  function renderWordList() {
    wordListEl.innerHTML = ref.required
      .map((word) => {
        const found = game.foundRequired.has(word);
        return `<div class="wordRow ${found ? 'found' : ''}">
          ${word.split('').map((ch, i) =>
            `<span class="wl-cell${found ? ' filled' : ''}" style="--d:${i * 0.04}s">${found ? ch : ''}</span>`
          ).join('')}
        </div>`;
      })
      .join('');
  }

  function renderBonus() {
    bonusPanelEl.classList.toggle('empty', game.foundBonus.size === 0);
    bonusChipsEl.innerHTML = [...game.foundBonus]
      .map((w) => `<span class="bonusChip">${w}</span>`)
      .join('');
  }

  const ringWrapEl = screen.querySelector('.ringWrap');

  /** Tile centres, in the ringWrap's own px space. Read from the live element
   *  so the layout stays correct at the small-screen size and after a resize. */
  function ringPositions() {
    const n = shuffleOrder.length;
    const box = ringWrapEl.clientWidth || 260;
    const centre = box / 2;
    // Leave room for the tile radius plus its border so nothing clips.
    const radius = centre - (box < 250 ? 25 : 30);
    const positions = [];
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      positions.push({
        x: centre + radius * Math.cos(angle),
        y: centre + radius * Math.sin(angle),
      });
    }
    return positions;
  }

  let positions = [];

  function renderRing() {
    positions = ringPositions();
    ringTilesEl.innerHTML = '';
    shuffleOrder.forEach((letter, i) => {
      const p = positions[i];
      const tile = h(`<button class="ringTile" style="left:${p.x}px;top:${p.y}px" data-ring-index="${i}">
        <span>${letter}</span>
      </button>`);
      ringTilesEl.appendChild(tile);
    });
    syncSelection();
  }

  function syncSelection() {
    ringTilesEl.querySelectorAll('.ringTile').forEach((tile) => {
      const i = Number(tile.dataset.ringIndex);
      tile.classList.toggle('selected', game.path.includes(i));
    });
    ringWordEl.textContent = game.currentWord() || '';
    ringWordEl.classList.toggle('placeholder', game.path.length === 0);
    if (game.path.length === 0) ringWordEl.textContent = 'Trace a word';
    drawLines();
  }

  function drawLines() {
    if (game.path.length < 2) {
      ringLinesEl.innerHTML = '';
      return;
    }
    const pts = game.path.map((i) => positions[i]);
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    ringLinesEl.innerHTML = `<path d="${d}" fill="none" stroke="#3f97a8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/>`;
  }

  function tileAtPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    const tile = el?.closest?.('.ringTile');
    if (!tile || !ringTilesEl.contains(tile)) return null;
    return Number(tile.dataset.ringIndex);
  }

  function addLetter(i) {
    if (game.extend(i)) {
      playPick(game.path.length);
      syncSelection();
    }
  }

  function removeLast() {
    if (game.path.length === 0) return;
    game.retreatTo(game.path.length - 1);
    playRelease();
    syncSelection();
  }

  function clearTrace() {
    game.clearTrace();
    playRelease();
    syncSelection();
  }

  function submitTrace() {
    if (game.path.length === 0) return;
    const { result } = game.submit();
    syncSelection();

    if (result === 'required') {
      playRequiredFound();
      renderWordList();
      flashRing('good');
      progressText.textContent = `Bloom ${ref.levelInChapter + 1} \u00b7 ${game.requiredFoundCount} / ${game.requiredTotal} found`;
      if (game.isComplete) {
        setTimeout(() => finishLevel(), 480);
      }
    } else if (result === 'bonus') {
      playBonusFound();
      renderBonus();
      flashRing('good');
    } else {
      playInvalid();
      flashRing('bad');
    }
  }

  function flashRing(kind) {
    const el = screen.querySelector('.ringCenter');
    el.classList.remove('flash-good', 'flash-bad');
    void el.offsetWidth;
    el.classList.add(kind === 'good' ? 'flash-good' : 'flash-bad');
  }

  function shuffleRing() {
    for (let i = shuffleOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffleOrder[i], shuffleOrder[j]] = [shuffleOrder[j], shuffleOrder[i]];
    }
    // Re-map the in-progress path (by letter identity, not index) since tile
    // indices just changed meaning.
    const activeLetters = game.path.map((i) => ref.letters[i]);
    game.clearTrace();
    renderRing();
    activeLetters.forEach((letter) => {
      const newIndex = shuffleOrder.indexOf(letter);
      if (newIndex >= 0) game.extend(newIndex);
    });
    syncSelection();
  }

  // ---- pointer handling: drag-trace, or tap-to-build + explicit submit ----

  ringTilesEl.addEventListener('pointerdown', (ev) => {
    const tile = ev.target.closest('.ringTile');
    if (!tile) return;
    isDragging = false;
    pointerDownAt = { x: ev.clientX, y: ev.clientY };
    addLetter(Number(tile.dataset.ringIndex));
    ringTilesEl.setPointerCapture?.(ev.pointerId);
  });

  ringTilesEl.addEventListener('pointermove', (ev) => {
    if (pointerDownAt === null) return;
    const dx = ev.clientX - pointerDownAt.x;
    const dy = ev.clientY - pointerDownAt.y;
    if (!isDragging && Math.hypot(dx, dy) > 10) isDragging = true;
    if (!isDragging) return;
    const i = tileAtPoint(ev.clientX, ev.clientY);
    if (i !== null && !game.path.includes(i)) addLetter(i);
  });

  // Bound to window so a drag that ends outside the ring still resolves.
  // Removed in this screen's cleanup — otherwise every level start would
  // stack another listener holding a stale Game.
  const onPointerUp = () => {
    if (pointerDownAt === null) return;
    pointerDownAt = null;
    if (isDragging) {
      isDragging = false;
      submitTrace();
    }
  };
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  screen.querySelector('[data-undo]').addEventListener('click', () => removeLast());
  screen.querySelector('[data-enter]').addEventListener('click', () => submitTrace());
  screen.querySelector('[data-shuffle]').addEventListener('click', () => { playTap(); shuffleRing(); });
  screen.querySelector('[data-back]').addEventListener('click', () => { playTap(); showSelect(); });

  const onKeydown = (ev) => {
    if (ev.key === 'Enter') submitTrace();
    else if (ev.key === 'Backspace') removeLast();
    else if (ev.key === 'Escape') clearTrace();
  };
  window.addEventListener('keydown', onKeydown);

  function finishLevel() {
    if (finished) return;
    finished = true;
    playLevelComplete();
    const stars = game.starsEarned();
    progress = recordWin(progress, ref.index, stars, TOTAL_LEVELS);
    saveProgress(progress);
    showWin(ref, stars, game);
  }

  // Re-place the tiles if the viewport changes size, since their positions are
  // derived from the ring's measured width.
  const onResize = () => renderRing();
  window.addEventListener('resize', onResize);

  show(screen, () => {
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    window.removeEventListener('resize', onResize);
  });

  // Rendered after show() so the ring can measure itself — the positions are
  // read from the live element, which has no width until it's attached.
  renderWordList();
  renderRing();
  renderBonus();
}

function showWin(ref, stars, game) {
  const isLast = ref.index >= TOTAL_LEVELS - 1;
  const possibleBonus = game.allPossibleBonusWords();
  const { wrap, close } = modal(`
    <div class="winMark">${bloomMark(64)}</div>
    <h2>Bloom complete!</h2>
    <div class="winStars">${starRow(stars)}</div>
    <p class="winText">
      ${game.foundBonus.size > 0
        ? `Found ${game.foundBonus.size}${possibleBonus.length ? ` of ${possibleBonus.length}` : ''} bonus word${game.foundBonus.size === 1 ? '' : 's'} too.`
        : possibleBonus.length ? `${possibleBonus.length} bonus word${possibleBonus.length === 1 ? '' : 's'} were hiding in there &mdash; try again for extra stars.` : 'Every word in this ring, found.'}
    </p>
    <div class="winActions">
      ${isLast ? '' : '<button class="btn primary" data-next>Next bloom</button>'}
      <button class="btn ${isLast ? 'primary' : 'ghost'}" data-map>Garden map</button>
    </div>`, { dismissable: false });

  wrap.querySelector('[data-next]')?.addEventListener('click', () => {
    playTap();
    close();
    startLevel(ref.index + 1);
  });
  wrap.querySelector('[data-map]').addEventListener('click', () => {
    playTap();
    close();
    showSelect();
  });
}

// ---------------------------------------------------------------- init

showTitle();
