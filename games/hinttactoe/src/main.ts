import { sound } from './audio/sound';
import { Game, scoreboard } from './game/state';
import { randomGrid } from './game/grids';
import { chooseAiAnswer, chooseAiMove } from './game/ai';
import type { GameMode } from './game/types';
import { BoardRenderer } from './render/board';
import {
  clearPrompt, promptForCell, renderGridName, renderTitleScoreboard, renderTurn,
  renderWin, showOverlay, showScreen, showStatus, syncSoundButtons,
} from './ui/screens';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

let selectedCell: number | null = null;
let aiThinking = false;

const game = new Game({
  onBoardChange: g => {
    renderer.sync(g);
    renderTurn(g);
    maybeTriggerAi();
  },
  onWrong: (g, index) => {
    sound.wrong();
    renderer.shake(index);
    showStatus('Not on the list — turn passes.', 'bad');
    selectedCell = null;
    renderer.select(null, g);
    setTimeout(() => clearPrompt(g), 900);
  },
  onWin: (g, win) => {
    // the placement sound for this move already plays via submitAnswer's
    // (or the AI move's) 'placed' outcome handling — just layer the win
    // fanfare on top.
    setTimeout(() => sound.win(), 120);
    renderer.celebrate(win);
    renderWin(win, g);
    setTimeout(() => showOverlay('winOverlay', true), 700);
  },
  onDraw: g => {
    sound.draw();
    renderWin(null, g);
    setTimeout(() => showOverlay('winOverlay', true), 500);
  },
});

const renderer = new BoardRenderer(
  $('boardCells'),
  $('colHeaders'),
  $('rowHeaders'),
  index => selectCell(index),
);

function selectCell(index: number): void {
  if (game.isOver() || game.isAiTurn()) return;
  if (game.cellAt(index) !== null) return;
  selectedCell = index;
  renderer.select(index, game);
  promptForCell(game, index);
}

/**
 * If it's the computer's turn, waits a beat (so the move doesn't feel
 * instant/robotic) then picks a cell via minimax and a random accepted
 * answer for that cell, and plays it through the same attempt() path a
 * human move takes.
 */
function maybeTriggerAi(): void {
  if (!game.isAiTurn() || aiThinking) return;
  aiThinking = true;
  setTimeout(() => {
    aiThinking = false;
    if (!game.isAiTurn()) return; // round may have been reset/left mid-delay
    const index = chooseAiMove(game.board, 'O');
    const answer = chooseAiAnswer(game, index);
    const outcome = game.attempt(index, answer);
    if (outcome.kind === 'placed') sound.place('O');
    // refresh the prompt line (e.g. "thinking…" -> back to the human's cue)
    // now that the move has resolved; skipped if a win/draw modal is queued.
    if (!game.isOver()) clearPrompt(game);
  }, 700);
}

function cancelSelection(): void {
  selectedCell = null;
  renderer.select(null, game);
  clearPrompt(game);
}

function submitAnswer(): void {
  if (selectedCell === null) return;
  const input = $<HTMLInputElement>('answerInput');
  const answer = input.value;
  if (!answer.trim()) return;
  const index = selectedCell;
  const playerBefore = game.current;
  const outcome = game.attempt(index, answer);
  if (outcome.kind === 'placed') {
    sound.place(playerBefore);
    showStatus('Correct!', 'good');
    selectedCell = null;
    setTimeout(() => renderer.select(null, game), 10);
    setTimeout(() => clearPrompt(game), 550);
  }
  // 'wrong' handled via events.onWrong (fires from within game.attempt)
}

function startRound(freshGrid = true, mode: GameMode = game.mode): void {
  aiThinking = false;
  game.newRound(freshGrid ? randomGrid() : game.grid, mode);
  renderGridName(game);
  renderer.attach(game);
  renderTurn(game);
  clearPrompt(game);
  selectedCell = null;
}

function goTitle(): void {
  renderTitleScoreboard();
  showScreen('title');
}

function goGame(mode: GameMode): void {
  showScreen('game');
  startRound(true, mode);
}

// ---- static button wiring ----

$('btnPlayPvp').addEventListener('click', () => goGame('pvp'));
$('btnPlayAi').addEventListener('click', () => goGame('ai'));
$('btnHowTo').addEventListener('click', () => showOverlay('howToOverlay', true));
$('btnHowToClose').addEventListener('click', () => showOverlay('howToOverlay', false));
$('btnNewGrid').addEventListener('click', () => startRound(true));

document.querySelectorAll<HTMLElement>('[data-nav]').forEach(btn => {
  btn.addEventListener('click', () => {
    const nav = btn.dataset.nav;
    if (nav === 'title') goTitle();
  });
});

for (const id of ['btnSoundTitle', 'btnSoundGame']) {
  $(id).addEventListener('click', () => syncSoundButtons(sound.toggleMute()));
}

$('btnCancelSelect').addEventListener('click', cancelSelection);

$<HTMLFormElement>('answerForm').addEventListener('submit', e => {
  e.preventDefault();
  submitAnswer();
});

$('btnWinTitle').addEventListener('click', () => {
  showOverlay('winOverlay', false);
  goTitle();
});
$('btnWinAgain').addEventListener('click', () => {
  showOverlay('winOverlay', false);
  startRound(true);
});

// generic click sound for buttons that don't manage their own audio
document.body.addEventListener('click', e => {
  const t = e.target as HTMLElement;
  if (t.closest('.btn, .iconBtn')) sound.uiClick();
});

// keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!$('winOverlay').classList.contains('hidden')) return;
    if (!$('howToOverlay').classList.contains('hidden')) {
      showOverlay('howToOverlay', false);
    } else if (selectedCell !== null) {
      cancelSelection();
    } else if (!$('screen-game').classList.contains('hidden')) {
      goTitle();
    }
  }
});

// dev-only handle for debugging
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__hinttactoe = { game, renderer, scoreboard };
}

// ---- boot ----
syncSoundButtons(sound.muted);
renderTitleScoreboard();
goTitle();
