import {
  playCat,
  playLift,
  playPaw,
  playTap,
  playUnhappy,
  playWin,
  setSoundEnabled,
  soundEnabled,
} from './audio/sound';
import { TOTAL_LEVELS, allLevels, levelAt, type LevelRef } from './game/levels';
import {
  loadProgress,
  recordWin,
  saveProgress,
  solvedCount,
  type Progress,
} from './game/progress';
import { Game } from './game/state';
import { catSvg, mascotSvg, pastel, pawSvg } from './render/art';
import { renderMap, scrollToFrontier } from './ui/map';

type Screen = 'title' | 'map' | 'game';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

let progress: Progress = loadProgress();
let game: Game | null = null;
let winPending = false;

// ---------------------------------------------------------------- screens

function show(screen: Screen) {
  (['title', 'map', 'game'] as Screen[]).forEach((s) => {
    const el = $(`screen-${s}`);
    el.classList.toggle('hidden', s !== screen);
    if (s === screen) {
      el.classList.remove('entering');
      void el.offsetWidth;
      el.classList.add('entering');
    }
  });
  if (screen === 'map') {
    renderMap(progress, startLevel);
    requestAnimationFrame(scrollToFrontier);
  }
  if (screen === 'title') renderTitle();
  window.scrollTo({ top: 0 });
}

// ---------------------------------------------------------------- title

function renderTitle() {
  $('titleCat').innerHTML = mascotSvg(92);
  const done = solvedCount(progress);
  $('titleProgress').textContent =
    done === 0 ? `${TOTAL_LEVELS} cosy puzzles` : `${done} / ${TOTAL_LEVELS} solved`;
  $('btnPlay').textContent = done === 0 ? 'Play' : 'Continue';
}

/** Slow-drifting paw prints behind the title card. */
function seedTitleFloat() {
  const host = $('titleFloat');
  const tints = ['#ffd6a5', '#d7c7ff', '#b8ebc8', '#ffc9d9', '#bfe3ff'];
  host.innerHTML = Array.from({ length: 11 }, (_, i) => {
    const left = Math.round((i * 137) % 96);
    const size = 20 + ((i * 7) % 22);
    const dur = 20 + ((i * 5) % 16);
    const delay = -(i * 3.3).toFixed(1);
    return `<span style="left:${left}%;bottom:-10vh;animation-duration:${dur}s;animation-delay:${delay}s">
      ${pawSvg(tints[i % tints.length], size)}
    </span>`;
  }).join('');
}

// ---------------------------------------------------------------- game

function startLevel(index: number) {
  const ref = levelAt(index);
  if (!ref) return;
  game = new Game(ref);
  winPending = false;

  $('gameTitle').firstChild!.textContent = ref.chapter.name;
  $('gameSub').textContent = `Level ${ref.levelInChapter + 1} · ${ref.size}×${ref.size}`;

  const tipBar = $('tipBar');
  tipBar.classList.toggle('hidden', !ref.tip);
  if (ref.tip) $('tipText').textContent = ref.tip;

  buildBoard(ref);
  renderBoard();
  show('game');
}

function buildBoard(ref: LevelRef) {
  const board = $('board');
  board.style.gridTemplateColumns = `repeat(${ref.size}, 1fr)`;
  board.style.gridTemplateRows = `repeat(${ref.size}, 1fr)`;

  const g = game!;
  board.innerHTML = '';

  for (let r = 0; r < ref.size; r++) {
    for (let c = 0; c < ref.size; c++) {
      const region = g.regionAt(r, c);
      const tone = pastel(region);
      const cell = document.createElement('button');
      cell.className = 'cell';
      cell.dataset.r = String(r);
      cell.dataset.c = String(c);
      cell.style.setProperty('--cell', tone.fill);
      cell.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}`);

      // Thick dark edges only where this cell meets a *different* patch, so the
      // patch shapes read clearly. All four go in one box-shadow — separate
      // rules would each overwrite the others.
      const edges: string[] = [];
      const same = (rr: number, cc: number) =>
        rr >= 0 && rr < ref.size && cc >= 0 && cc < ref.size && g.regionAt(rr, cc) === region;
      if (!same(r - 1, c)) edges.push('inset 0 3px 0 0 var(--ink)');
      if (!same(r + 1, c)) edges.push('inset 0 -3px 0 0 var(--ink)');
      if (!same(r, c - 1)) edges.push('inset 3px 0 0 0 var(--ink)');
      if (!same(r, c + 1)) edges.push('inset -3px 0 0 0 var(--ink)');
      // Faint separators inside a patch, listed last so the thick patch edges
      // above paint over them.
      edges.push('inset 0 -1px 0 0 rgba(74,59,52,0.16)');
      edges.push('inset -1px 0 0 0 rgba(74,59,52,0.16)');
      cell.style.boxShadow = edges.join(', ');

      cell.addEventListener('click', () => onCellClick(r, c));
      board.appendChild(cell);
    }
  }
}

function cellEl(r: number, c: number): HTMLElement | null {
  return $('board').querySelector<HTMLElement>(`[data-r="${r}"][data-c="${c}"]`);
}

function renderBoard() {
  const g = game!;
  const size = g.size;
  const unhappy = g.unhappyCats();
  const catPx = Math.max(22, Math.round(320 / size));
  const pawPx = Math.max(12, Math.round(150 / size));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const el = cellEl(r, c);
      if (!el) continue;
      const mark = g.marks[r][c];
      const tone = pastel(g.regionAt(r, c));

      const wasUnhappy = el.classList.contains('unhappy');
      const isUnhappy = unhappy.has(`${r},${c}`);

      if (mark === 'cat') {
        // Only rebuild when the contents actually change, so the pop animation
        // doesn't replay on every unrelated re-render.
        if (!el.querySelector('.catWrap')) {
          el.innerHTML = `<span class="catWrap">${catSvg(tone.ink, catPx)}</span>`;
        }
      } else if (mark === 'paw') {
        if (!el.querySelector('.pawMark')) {
          el.innerHTML = `<span class="pawMark">${pawSvg(tone.ink, pawPx)}</span>`;
        }
      } else if (el.innerHTML !== '') {
        el.innerHTML = '';
      }

      if (isUnhappy !== wasUnhappy) el.classList.toggle('unhappy', isUnhappy);
    }
  }

  // Cat counter dots
  $('catCount').innerHTML = Array.from(
    { length: size },
    (_, i) => `<i class="${i < g.correctCount() ? 'on' : ''}"></i>`
  ).join('');

  ($('btnUndo') as HTMLButtonElement).disabled = !g.canUndo;
}

function onCellClick(r: number, c: number) {
  const g = game;
  if (!g || winPending) return;

  const next = g.cycle(r, c);
  renderBoard();

  if (next === 'cat') {
    // A cat that breaks a rule mews softly instead of costing anything.
    if (g.unhappyCats().has(`${r},${c}`)) playUnhappy();
    else playCat();
  } else if (next === 'paw') {
    playPaw();
  } else {
    playLift();
  }

  if (g.isSolved()) finishLevel();
}

function finishLevel() {
  const g = game!;
  winPending = true;
  playWin();

  progress = recordWin(progress, g.ref.index, !g.usedHint, TOTAL_LEVELS);
  saveProgress(progress);

  const isLast = g.ref.index >= TOTAL_LEVELS - 1;
  $('winCat').innerHTML = mascotSvg(96);
  $('winTitle').textContent = g.usedHint ? 'All cosy!' : 'Purrfect!';
  $('winText').textContent = isLast
    ? 'Every cat in the game has found its spot. Thanks for playing!'
    : g.usedHint
      ? 'Every cat has a spot of its own. Try the next one without a hint for a gold star.'
      : 'Solved with no hints — gold star earned.';
  ($('btnWinNext') as HTMLButtonElement).classList.toggle('hidden', isLast);

  setTimeout(() => $('winOverlay').classList.remove('hidden'), 520);
}

// ---------------------------------------------------------------- how to play

function renderDemoBoard() {
  // Two legally placed cats on a 4x4, with faded paws on every square their
  // adjacency rules out — the "no touching" rule is easier to see than to read.
  const regions = [
    [0, 0, 1, 1],
    [0, 2, 2, 1],
    [3, 3, 2, 1],
    [3, 3, 2, 2],
  ];
  const cats = new Set(['0,1', '2,0']);
  const blocked = new Set(['0,0', '0,2', '1,0', '1,1', '1,2', '2,1', '3,0', '3,1']);

  let html = '';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const tone = pastel(regions[r][c]);
      const key = `${r},${c}`;
      const inner = cats.has(key)
        ? catSvg(tone.ink, 26)
        : blocked.has(key)
          ? `<span class="no">${pawSvg(tone.ink, 14)}</span>`
          : '';
      html += `<div style="background:${tone.fill}">${inner}</div>`;
    }
  }
  $('demoBoard').innerHTML = html;
}

// ---------------------------------------------------------------- sound

function refreshSoundButtons() {
  const on = soundEnabled();
  ['btnSoundTitle', 'btnSoundMap', 'btnSoundGame'].forEach((id) => {
    const btn = $(id);
    btn.classList.toggle('off', !on);
    btn.innerHTML = `<svg class="icon"><use href="#${on ? 'i-sound-on' : 'i-sound-off'}"/></svg>`;
  });
}

// ---------------------------------------------------------------- wiring

function nextUnsolvedIndex(): number {
  const refs = allLevels();
  const next = refs.find((r) => !progress.results[r.index]?.solved && r.index <= progress.unlocked);
  return next ? next.index : Math.min(progress.unlocked, TOTAL_LEVELS - 1);
}

function init() {
  seedTitleFloat();
  renderDemoBoard();
  refreshSoundButtons();
  renderTitle();

  $('btnPlay').addEventListener('click', () => {
    playTap();
    startLevel(nextUnsolvedIndex());
  });
  $('btnMap').addEventListener('click', () => {
    playTap();
    show('map');
  });

  // Nav buttons (data-nav="title" / "map" / "game")
  document.querySelectorAll<HTMLElement>('[data-nav]').forEach((el) =>
    el.addEventListener('click', () => {
      playTap();
      show(el.dataset.nav as Screen);
    })
  );

  // How-to modal
  const openHowTo = () => {
    playTap();
    $('howToOverlay').classList.remove('hidden');
  };
  $('btnHowTo').addEventListener('click', openHowTo);
  $('btnHelpGame').addEventListener('click', openHowTo);
  $('btnHowToClose').addEventListener('click', () => {
    playTap();
    $('howToOverlay').classList.add('hidden');
  });

  // Board controls
  $('btnUndo').addEventListener('click', () => {
    if (!game || winPending) return;
    game.undo();
    playLift();
    renderBoard();
  });
  $('btnReset').addEventListener('click', () => {
    if (!game || winPending) return;
    game.reset();
    playLift();
    renderBoard();
  });
  $('btnHint').addEventListener('click', () => {
    if (!game || winPending) return;
    const spot = game.hint();
    if (!spot) return;
    playCat();
    renderBoard();
    const el = cellEl(spot.row, spot.col);
    if (el) {
      el.classList.add('hintGlow');
      setTimeout(() => el.classList.remove('hintGlow'), 2300);
    }
    if (game.isSolved()) finishLevel();
  });

  // Win modal
  $('btnWinNext').addEventListener('click', () => {
    playTap();
    $('winOverlay').classList.add('hidden');
    const next = (game?.ref.index ?? 0) + 1;
    if (next < TOTAL_LEVELS) startLevel(next);
    else show('map');
  });
  $('btnWinMap').addEventListener('click', () => {
    playTap();
    $('winOverlay').classList.add('hidden');
    show('map');
  });

  // Sound toggles — three buttons covering title / map / game screens
  ['btnSoundTitle', 'btnSoundMap', 'btnSoundGame'].forEach((id) =>
    $(id).addEventListener('click', () => {
      setSoundEnabled(!soundEnabled());
      refreshSoundButtons();
      playTap();
    })
  );

  // Keyboard shortcuts in the game screen
  window.addEventListener('keydown', (e) => {
    if ($('screen-game').classList.contains('hidden')) return;
    if (e.key === 'r' || e.key === 'R') $('btnReset').click();
    if (e.key === 'z' || e.key === 'Z') $('btnUndo').click();
    if (e.key === 'h' || e.key === 'H') $('btnHint').click();
  });

  show('title');
}

init();
