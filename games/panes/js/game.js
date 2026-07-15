/**
 * game.js — core game logic.
 * Knows about state and calls renderer for side-effects.
 * Does not reference DOM elements directly.
 */

import {
  state, resetForNewPuzzle, regionAt, isCellFree, nextRegionColor,
  rectFromDrag, rectCells, rectArea, validateDragRect
} from "./state.js";
import {
  buildBoard,
  applyRegionStyling,
  removeRegionStyling,
  repaintRegionBorders,
  animateRegionLock,
  animateShakeRect,
  burstConfetti,
} from "./renderer.js";
import { attachInput } from "./input.js";
import { generatePuzzle } from "./generator.js";
import { mulberry32, seedFromDateString } from "./rng.js";
import { levelByKey } from "./daily.js";

// ─── Game actions ──────────────────────────────────────────────────────

let _boardEl        = null;
let _onStatsChange  = null;   // () => void — re-render stats bar
let _onWin          = null;   // (result) => void, result = { misses, timeMs }
let _onMiss         = null;   // () => void
let _audio          = null;   // AudioManager instance, or null if none provided

export function initGame(boardEl, callbacks) {
  _boardEl       = boardEl;
  _onStatsChange = callbacks.onStatsChange;
  _onWin         = callbacks.onWin;
  _onMiss        = callbacks.onMiss;
  _audio         = callbacks.audio || null;
}

/**
 * @param {object} puzzle
 * @param {object} [opts]
 * @param {boolean} [opts.revealSolution] - if true, immediately fills the
 *   board with its true solution instead of starting blank, and marks it
 *   solved without firing the win flow. Used when a player revisits a
 *   daily level they've already completed, so it doesn't reset to empty.
 */
export function startPuzzle(puzzle, { revealSolution = false } = {}) {
  resetForNewPuzzle(puzzle);
  buildBoard(_boardEl);
  attachInput(_boardEl, {
    onCommit: commitRegion,
    onRemove: removeRegionAt,
    onMiss:   handleMiss,
  });

  if (revealSolution) {
    state.solutionRects.forEach((sol, clueIndex) => {
      const region = {
        top: sol.top, left: sol.left, bottom: sol.bottom, right: sol.right,
        clueIndex, color: nextRegionColor(),
      };
      state.regions.push(region);
      applyRegionStyling(region);
    });
    repaintRegionBorders();
    state.solved   = true;  // prevents checkWin from re-firing the win flow
    state.readOnly = true;  // locks the board: no drag, no hint, no clear
  }

  _boardEl.classList.toggle("read-only", revealSolution);
  _onStatsChange?.();
}

export function commitRegion(rect, clueIndex, { silent = false } = {}) {
  if (state.readOnly) return;
  const region = { ...rect, clueIndex, color: nextRegionColor() };
  state.regions.push(region);
  applyRegionStyling(region);
  repaintRegionBorders();
  animateRegionLock(region);
  if (!silent) _audio?.place();
  _onStatsChange?.();
  checkWin();
}

export function removeRegionAt(r, c) {
  if (state.readOnly) return;
  const region = regionAt(r, c);
  if (!region) return;
  removeRegionStyling(region);
  state.regions = state.regions.filter(reg => reg !== region);
  repaintRegionBorders();
  _audio?.remove();
  _onStatsChange?.();
}

function handleMiss(rect) {
  state.misses += 1;
  animateShakeRect(rect);
  _audio?.miss();
  _onStatsChange?.();
  _onMiss?.();
}

function checkWin() {
  if (state.solved) return;
  const totalCells = state.width * state.height;
  const covered    = state.regions.reduce((s, r) => s + rectArea(r), 0);
  if (state.regions.length === state.clues.length && covered === totalCells) {
    state.solved = true;
    const timeMs = state.startedAt ? Date.now() - state.startedAt : 0;
    _audio?.win();
    _onWin?.({ misses: state.misses, timeMs });
    burstConfetti(_boardEl.parentElement);
  }
}

// ─── Hint / Clear ──────────────────────────────────────────────────────

export function giveHint() {
  if (state.solved || state.readOnly) return;
  const idx = state.clues.findIndex(
    (_, i) => !state.regions.some(r => r.clueIndex === i)
  );
  if (idx === -1) return;
  const sol = state.solutionRects.find(r => r.clue === state.clues[idx]);
  if (!sol) return;
  _audio?.hint();
  commitRegion({ top: sol.top, left: sol.left, bottom: sol.bottom, right: sol.right }, idx, { silent: true });
}

export function clearBoard() {
  if (state.readOnly) return;
  for (const region of [...state.regions]) removeRegionStyling(region);
  state.regions = [];
  state.misses  = 0;
  // Un-solve so a manual clear (e.g. replaying an already-completed level
  // to improve your score) can trigger the win flow again.
  state.solved  = false;
  repaintRegionBorders();
  _audio?.clear();
  _onStatsChange?.();
}

// ─── Puzzle loading ────────────────────────────────────────────────────

function buildPuzzle(width, height, rng, difficulty) {
  return (
    generatePuzzle({ width, height, rng, difficulty, maxAttempts: 120 }) ??
    generatePuzzle({ width, height, rng, difficulty: "easy", maxAttempts: 200 })
  );
}

/**
 * Deterministic puzzle for a given calendar day + level. Same dateKey +
 * levelKey always produces the identical puzzle for every player, and
 * replaying an old day reproduces exactly what shipped that day.
 */
export function loadDailyPuzzle(dateKeyStr, levelKey) {
  const level = levelByKey(levelKey);
  const seed  = seedFromDateString(`panes-daily-${dateKeyStr}-${levelKey}`);
  const rng   = mulberry32(seed);
  return buildPuzzle(level.size, level.size, rng, level.difficulty);
}
