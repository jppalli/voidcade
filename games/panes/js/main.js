/**
 * main.js — boot + event wiring only.
 * No game logic, no DOM manipulation beyond wiring button listeners.
 */

import { state } from "./state.js";
import { initGame, startPuzzle, loadDailyPuzzle, giveHint, clearBoard } from "./game.js";
import { AudioManager } from "./audio.js";
import {
  updateStats, startTimer, stopTimer, showWin, hideWin,
  showDayComplete, hideDayComplete, bindDayCompleteClose,
  showLoading, hideLoading, showHelp, hideHelp,
  renderDayNav, bindDayLabel,
  renderLevelPills, bindLevelPills,
  bindStatsModal,
  showCalendar, bindCalendar,
  setControlsEnabled,
} from "./ui.js";
import {
  nextLevel, todayKey,
  loadProgress, recordLevelResult, isDayComplete, isLevelComplete, firstIncompleteLevel,
} from "./daily.js";

// ─── DOM refs ─────────────────────────────────────────────────────────

const boardEl      = document.getElementById("board");
const btnHint      = document.getElementById("btn-hint");
const btnClear     = document.getElementById("btn-clear");
const btnHelp      = document.getElementById("btn-help");
const btnMute      = document.getElementById("btn-mute");
const helpClose    = document.getElementById("help-close");
const helpOverlay  = document.getElementById("help-overlay");
const winNext      = document.getElementById("win-next");

// ─── Audio ────────────────────────────────────────────────────────────
// Same bootstrap pattern as Stackward: the AudioContext can only start
// after a user gesture, so unlock + kick off the ambient loop on the first
// interaction anywhere on the page.
const audio = new AudioManager();
const kickAudio = () => {
  audio.unlock();
  audio.startMusic();
  window.removeEventListener('pointerdown', kickAudio);
  window.removeEventListener('keydown', kickAudio);
};
window.addEventListener('pointerdown', kickAudio);
window.addEventListener('keydown', kickAudio);

function reflectMuteButton(muted) {
  btnMute.classList.toggle('muted', muted);
  btnMute.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
}
reflectMuteButton(audio.muted);
btnMute.addEventListener('click', () => {
  reflectMuteButton(audio.toggleMute());
});

// ─── Local UI state ─────────────────────────────────────────────────────

let viewingDateKey = todayKey(); // the day currently shown in the daily panel

// ─── Game event callbacks ─────────────────────────────────────────────

function onStatsChange() {
  updateStats();
}

function onWin(result) {
  stopTimer();
  handleDailyWin(result);
}

function onMiss() {
  // no-op hook, kept for symmetry / future use
}

// ─── Daily win flow ─────────────────────────────────────────────────────

function handleDailyWin(result) {
  const progress = recordLevelResult(loadProgress(), state.dailyDateKey, state.dailyLevelKey, result);
  renderLevelPills(viewingDateKey, state.dailyLevelKey);

  const dayDone = isDayComplete(progress, state.dailyDateKey);

  if (dayDone) {
    audio.dayComplete();
    showDayComplete(state.dailyDateKey);
    return;
  }

  // Not done yet — figure out what to send the player to next. Prefer the
  // immediate next level in sequence, but if that's already complete (or
  // this was the last level and others were skipped), fall back to the
  // first remaining incomplete level so "Next" is never a dead end.
  const seqNext = nextLevel(state.dailyLevelKey);
  const target = seqNext && !isLevelComplete(progress, state.dailyDateKey, seqNext.key)
    ? seqNext
    : firstIncompleteLevel(progress, state.dailyDateKey);

  showWin({ title: "Solved", nextLabel: `Next: ${target.name}`, showNext: true });
}

winNext.addEventListener("click", () => {
  const progress = loadProgress();
  const target = firstIncompleteLevel(progress, state.dailyDateKey);
  loadDaily(state.dailyDateKey, target.key);
});

// ─── Puzzle flow ──────────────────────────────────────────────────────

function launchPuzzle(puzzle, { revealSolution = false } = {}) {
  hideWin();
  stopTimer();
  startPuzzle(puzzle, { revealSolution });
  setControlsEnabled(!revealSolution);
  if (!revealSolution) startTimer();
}

function loadDaily(dateKeyStr, levelKey) {
  state.mode          = "daily";
  state.dailyDateKey  = dateKeyStr;
  state.dailyLevelKey = levelKey;
  viewingDateKey      = dateKeyStr;

  renderDayNav(dateKeyStr);
  renderLevelPills(dateKeyStr, levelKey);

  const progress = loadProgress();

  // Already completed? Show the solved board as-is instead of resetting
  // it back to blank — revisiting a finished level shouldn't undo it.
  const alreadyDone = isLevelComplete(progress, dateKeyStr, levelKey);

  showLoading();
  setTimeout(() => {
    const puzzle = loadDailyPuzzle(dateKeyStr, levelKey);
    hideLoading();
    if (!puzzle) return;
    launchPuzzle(puzzle, { revealSolution: alreadyDone });

    // If the whole day is already done, lead with the day-complete summary
    // rather than the plain solved board, no matter which level was opened.
    if (isDayComplete(progress, dateKeyStr)) {
      showDayComplete(dateKeyStr);
    }
  }, 30);
}

// ─── Button wiring ────────────────────────────────────────────────────

bindDayLabel(() => {
  showCalendar(viewingDateKey, (pickedKey) => {
    const levelKey = firstIncompleteLevel(loadProgress(), pickedKey).key;
    loadDaily(pickedKey, levelKey);
  });
});
bindCalendar();

bindLevelPills((levelKey) => {
  loadDaily(viewingDateKey, levelKey);
});

bindDayCompleteClose(hideDayComplete);

btnHint.addEventListener("click", giveHint);
btnClear.addEventListener("click", clearBoard);

btnHelp.addEventListener("click",  showHelp);
helpClose.addEventListener("click", hideHelp);
helpOverlay.addEventListener("click", e => { if (e.target === helpOverlay) hideHelp(); });

bindStatsModal();

document.addEventListener("keydown", e => {
  if (e.key === "Escape") { hideHelp(); }
});

// ─── Boot ─────────────────────────────────────────────────────────────

initGame(boardEl, { onStatsChange, onWin, onMiss, audio });

const startLevel = firstIncompleteLevel(loadProgress(), viewingDateKey).key;
loadDaily(viewingDateKey, startLevel);
