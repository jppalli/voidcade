import { Game, MAX_LIVES } from './game.js';
import { COLORS, LEVELS } from './levels.js';

// ---------------------------------------------------------------- state

let game = null;
let selectedColor = 0;
let flagMode = false;
let wrongTimer = null;

// ---------------------------------------------------------------- DOM refs

const $ = id => document.getElementById(id);
const boardEl   = $('board');
const livesEl   = $('lives');
const levelName = $('levelName');
const colorBtns = [0,1,2].map(i => $(`colorBtn${i}`));
const flagBtn   = $('flagBtn');
const paintBtn  = $('paintBtn');
const nextBtn   = $('nextBtn');
const retryBtn  = $('retryBtn');
const levelSel  = $('levelSelect');

// ---------------------------------------------------------------- init

function initLevel(index) {
  clearTimeout(wrongTimer);
  game = new Game(index);
  game.setUpdateCallback(renderAll);
  selectedColor = 0;
  flagMode = false;
  updateModeButtons();
  buildGrid();
  renderAll(game);
  hideMsgPanel();
}

// Populate level selector
LEVELS.forEach((lvl, i) => {
  const opt = document.createElement('option');
  opt.value = i;
  opt.textContent = `${i + 1}. ${lvl.name}`;
  levelSel.appendChild(opt);
});
levelSel.addEventListener('change', () => initLevel(Number(levelSel.value)));
initLevel(0);

// ---------------------------------------------------------------- grid

function buildGrid() {
  boardEl.innerHTML = '';
  const size = game.size;
  boardEl.style.setProperty('--size', size);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement('button');
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.setAttribute('aria-label', `Row ${r+1} Col ${c+1}`);

      // Single tap: paint or flag
      cell.addEventListener('click', () => onCellTap(r, c));
      // Double tap: auto-flag for 0-clue cells
      cell.addEventListener('dblclick', e => { e.preventDefault(); onCellDbl(r, c); });

      boardEl.appendChild(cell);
    }
  }
}

function cellEl(r, c) {
  return boardEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
}

// ---------------------------------------------------------------- rendering

function renderAll(g) {
  levelName.textContent = g.levelName;
  renderLives(g.lives);
  for (let r = 0; r < g.size; r++) {
    for (let c = 0; c < g.size; c++) {
      renderCell(g, r, c);
    }
  }
  if (g.isGameOver() && !g.solved) showMsg('game-over');
  else if (g.solved) showMsg('win');
}

function renderLives(lives) {
  livesEl.innerHTML = Array.from({ length: MAX_LIVES }, (_, i) =>
    `<svg viewBox="0 0 24 24" width="22" height="22">
       <path d="M12 20.5s-7.5-4.6-7.5-9.6a4.4 4.4 0 0 1 7.5-3.1 4.4 4.4 0 0 1 7.5 3.1c0 5-7.5 9.6-7.5 9.6Z"
         fill="${i < lives ? '#f4631e' : 'none'}"
         stroke="${i < lives ? '#f4631e' : '#ccc'}"
         stroke-width="1.8"/>
     </svg>`
  ).join('');
}

function renderCell(g, r, c) {
  const el = cellEl(r, c);
  if (!el) return;
  const state = g.cell(r, c);

  // Reset classes
  el.className = 'cell';
  el.innerHTML = '';

  if (state.solved) {
    const col = COLORS[state.clueColor];
    el.style.background = col.hex;
    el.classList.add('solved');

    if (state.showClue) {
      const num = document.createElement('span');
      num.className = 'clue-num';
      num.textContent = state.clueValue;
      el.appendChild(num);
    }
    return;
  }

  // Unsolved: show flags and/or wrong-guess flash
  el.style.background = '';

  if (state.playerColor !== null) {
    // Wrong guess flash
    const col = COLORS[state.playerColor];
    el.style.background = col.hex;
    el.classList.add('wrong-flash');
  }

  // Render flag marks (one per flagged color, stacked as small colored ×)
  if (state.flags.size > 0) {
    const flagsWrap = document.createElement('div');
    flagsWrap.className = 'flags';
    for (const fColor of state.flags) {
      const mark = document.createElement('span');
      mark.className = 'flag-mark';
      mark.style.color = COLORS[fColor].hex;
      mark.textContent = '✕';
      flagsWrap.appendChild(mark);
    }
    el.appendChild(flagsWrap);
  }
}

// ---------------------------------------------------------------- interactions

function onCellTap(r, c) {
  if (!game || game.solved || game.isGameOver()) return;
  const state = game.cell(r, c);
  if (state.solved) return;

  if (flagMode) {
    game.toggleFlag(r, c, selectedColor);
  } else {
    const result = game.paint(r, c, selectedColor);
    if (result === 'wrong') {
      clearTimeout(wrongTimer);
      wrongTimer = setTimeout(() => {
        game.clearWrongGuess(r, c);
      }, 700);
    }
  }
}

function onCellDbl(r, c) {
  if (!game) return;
  const state = game.cell(r, c);
  if (state.solved && state.clueValue === 0) {
    game.autoFlag(r, c);
  }
}

// ---------------------------------------------------------------- controls

colorBtns.forEach((btn, i) => {
  btn.style.background = COLORS[i].hex;
  btn.addEventListener('click', () => {
    selectedColor = i;
    flagMode = false;
    updateModeButtons();
  });
});

flagBtn.addEventListener('click', () => {
  flagMode = true;
  updateModeButtons();
});

paintBtn.addEventListener('click', () => {
  flagMode = false;
  updateModeButtons();
});

function updateModeButtons() {
  colorBtns.forEach((b, i) => b.classList.toggle('active', i === selectedColor && !flagMode));
  flagBtn.classList.toggle('active', flagMode);
  paintBtn.classList.toggle('active', !flagMode);
}

// ---------------------------------------------------------------- message panel

function showMsg(type) {
  $('msgPanel').classList.remove('hidden');
  if (type === 'win') {
    $('msgTitle').textContent = 'Solved!';
    $('msgSub').textContent = 'Every cell is the right color.';
    nextBtn.classList.toggle('hidden', game.levelIndex >= game.totalLevels - 1);
    retryBtn.textContent = 'Play again';
  } else {
    $('msgTitle').textContent = 'Out of lives';
    $('msgSub').textContent = 'Try again?';
    nextBtn.classList.add('hidden');
    retryBtn.textContent = 'Retry';
  }
}

function hideMsgPanel() {
  $('msgPanel').classList.add('hidden');
}

nextBtn.addEventListener('click', () => {
  levelSel.value = game.levelIndex + 1;
  initLevel(game.levelIndex + 1);
});

retryBtn.addEventListener('click', () => initLevel(game.levelIndex));
