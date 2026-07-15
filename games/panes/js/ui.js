/**
 * ui.js — non-board UI: timer, modals, theme, win banner, daily controls.
 * Owns DOM references for everything outside the board frame.
 */

import { state } from "./state.js";
import {
  DAILY_LEVELS,
  todayKey, formatDayLabel, isFutureKey, keyToDate,
  loadProgress, isLevelComplete, isDayComplete, computeStreak, getLevelResult,
  buildCalendarMonth, LAUNCH_DATE_KEY, isBeforeLaunchKey,
} from "./daily.js";

// ─── DOM refs ────────────────────────────────────────────────────────

const elWin      = document.getElementById("win-banner");
const elWinTitle = document.getElementById("win-title");
const elSummary  = document.getElementById("win-summary");
const elWinNext  = document.getElementById("win-next");
const elLoading  = document.getElementById("loading-overlay");
const elHelp     = document.getElementById("help-overlay");
const elStats    = document.getElementById("stats-overlay");

// ─── Stats ──────────────────────────────────────────────────────────
// No live stat bar in the UI anymore — time and misses are still tracked
// in state (see state.js / game.js) purely to report a summary on the win
// screen, so there's nothing to repaint on every change.

export function updateStats() {
  // Intentionally a no-op hook, kept so game.js can call it unconditionally
  // without caring whether a visible stat bar exists.
}

// ─── Hint / Clear buttons ─────────────────────────────────────────────

const elBtnHint  = document.getElementById("btn-hint");
const elBtnClear = document.getElementById("btn-clear");

/** Disable Hint/Clear while viewing an already-completed (read-only) board. */
export function setControlsEnabled(enabled) {
  elBtnHint.disabled  = !enabled;
  elBtnClear.disabled = !enabled;
}

// ─── Timer ──────────────────────────────────────────────────────────
// Time is derived on demand from state.startedAt rather than ticking a
// visible clock every second — there's no stat bar to update live anymore.

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function startTimer() {
  // No-op: kept as a stable API for main.js. Elapsed time is computed
  // lazily from state.startedAt when the win screen needs it.
}

export function stopTimer() {
  // No-op — see startTimer.
}

export function currentTimeText() {
  if (!state.startedAt) return "0:00";
  return formatTime(Date.now() - state.startedAt);
}

// ─── Win banner ──────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {string} opts.title - heading text, e.g. "Solved" or "Day complete"
 * @param {string} [opts.nextLabel] - label for the primary button
 * @param {boolean} [opts.showNext] - whether to show the primary button at all
 */
export function showWin({ title = "Solved", nextLabel = "New puzzle", showNext = true } = {}) {
  const misses = state.misses;
  elSummary.textContent =
    `${currentTimeText()} · ${misses} miss${misses === 1 ? "" : "es"}`;
  elWinTitle.textContent = title;
  elWinNext.textContent  = nextLabel;
  elWinNext.hidden       = !showNext;
  elWin.hidden = false;
}

export function hideWin() {
  elWin.hidden = true;
}

// ─── Day-complete banner ──────────────────────────────────────────────
// Shown both the moment a player finishes the 3rd level of a day, and
// every time they revisit any level of a day that's already fully done.

const elDayComplete       = document.getElementById("day-complete-banner");
const elDayCompleteStreak = document.getElementById("day-complete-streak");
const elDayCompleteLevels = document.getElementById("day-complete-levels");
const elDayCompleteClose  = document.getElementById("day-complete-close");

function checkIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export function showDayComplete(dateKeyStr) {
  const progress = loadProgress();
  const streak   = computeStreak(progress);

  elDayCompleteStreak.textContent = streak.current > 1
    ? `${streak.current}-day streak`
    : "First day of a new streak";

  elDayCompleteLevels.innerHTML = DAILY_LEVELS.map(level => {
    const result = getLevelResult(progress, dateKeyStr, level.key);
    const meta   = result ? `${result.misses} miss${result.misses === 1 ? "" : "es"}` : "";
    return `
      <div class="day-complete-level-row">
        ${checkIcon()}
        <span class="day-complete-level-name">${level.name}</span>
        <span class="day-complete-level-meta">${meta}</span>
      </div>`;
  }).join("");

  hideWin();
  elDayComplete.hidden = false;
}

export function hideDayComplete() {
  elDayComplete.hidden = true;
}

export function bindDayCompleteClose(onClick) {
  elDayCompleteClose.addEventListener("click", onClick);
}

// ─── Loading overlay ─────────────────────────────────────────────────

export function showLoading() { elLoading.hidden = false; }
export function hideLoading() { elLoading.hidden = true;  }

// ─── Help modal ──────────────────────────────────────────────────────

export function showHelp() { elHelp.hidden = false; }
export function hideHelp() { elHelp.hidden = true;  }

// ─── Theme ───────────────────────────────────────────────────────────

const THEME_KEY = "panes-theme";

export function applyStoredTheme() {
  if (localStorage.getItem(THEME_KEY) === "dark") {
    document.documentElement.classList.add("dark");
  }
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
}

// ─── Day label (opens the calendar) ──────────────────────────────────

const elDayLabel   = document.getElementById("day-label");
const elBtnDayLabel = document.getElementById("btn-day-label");

export function renderDayNav(dateKeyStr) {
  elDayLabel.textContent = formatDayLabel(dateKeyStr);
}

export function bindDayLabel(onClick) {
  elBtnDayLabel.addEventListener("click", onClick);
}

// ─── Level pills ──────────────────────────────────────────────────────

const levelPillEls = Array.from(document.querySelectorAll(".level-pill"));

export function renderLevelPills(dateKeyStr, activeLevelKey) {
  const progress = loadProgress();
  levelPillEls.forEach(pill => {
    const key = pill.dataset.level;
    pill.classList.toggle("active",    key === activeLevelKey);
    pill.classList.toggle("completed", isLevelComplete(progress, dateKeyStr, key));
  });
}

export function bindLevelPills(onChange) {
  levelPillEls.forEach(pill => {
    pill.addEventListener("click", () => onChange(pill.dataset.level));
  });
}

// ─── Stats modal ──────────────────────────────────────────────────────

const elStatsCurrent = document.getElementById("stats-current-streak");
const elStatsBest     = document.getElementById("stats-best-streak");
const elStatsTotal     = document.getElementById("stats-total-days");
const elStatsClose     = document.getElementById("stats-close");
const elBtnStats       = document.getElementById("btn-stats");

export function showStats() {
  const progress = loadProgress();
  const streak   = computeStreak(progress);
  elStatsCurrent.textContent = String(streak.current);
  elStatsBest.textContent    = String(streak.best);
  elStatsTotal.textContent   = String(streak.totalDays);
  elStats.hidden = false;
}

export function hideStats() {
  elStats.hidden = true;
}

export function bindStatsModal() {
  elBtnStats.addEventListener("click", showStats);
  elStatsClose.addEventListener("click", hideStats);
  elStats.addEventListener("click", e => { if (e.target === elStats) hideStats(); });
}

// ─── Calendar modal ───────────────────────────────────────────────────

const elCalendar     = document.getElementById("calendar-overlay");
const elCalTitle     = document.getElementById("calendar-title");
const elCalGrid      = document.getElementById("calendar-grid");
const elBtnCalPrev   = document.getElementById("btn-cal-prev");
const elBtnCalNext   = document.getElementById("btn-cal-next");
const elCalClose     = document.getElementById("calendar-close");

let _calYear, _calMonth;      // month currently displayed in the grid
let _calSelectedKey = null;   // the day currently loaded in the game
let _calOnPick = null;

function renderCalendarGrid() {
  const progress = loadProgress();
  const today    = todayKey();
  const { label, weeks } = buildCalendarMonth(_calYear, _calMonth);

  elCalTitle.textContent = label;

  // Disable "next month" once the currently displayed month already
  // contains (or is after) the current real-world month.
  const todayDate = keyToDate(today);
  const isCurrentOrFutureMonth =
    _calYear > todayDate.getFullYear() ||
    (_calYear === todayDate.getFullYear() && _calMonth >= todayDate.getMonth());
  elBtnCalNext.disabled = isCurrentOrFutureMonth;

  // Disable "prev month" once the displayed month already contains (or is
  // before) the launch month — nothing earlier is playable.
  const launchDate = keyToDate(LAUNCH_DATE_KEY);
  const isLaunchOrEarlierMonth =
    _calYear < launchDate.getFullYear() ||
    (_calYear === launchDate.getFullYear() && _calMonth <= launchDate.getMonth());
  elBtnCalPrev.disabled = isLaunchOrEarlierMonth;

  elCalGrid.innerHTML = "";
  weeks.flat().forEach(key => {
    const cell = document.createElement("button");
    cell.className = "calendar-cell";
    if (!key) {
      cell.disabled = true;
      cell.className += " calendar-cell-empty";
    } else {
      cell.textContent = String(keyToDate(key).getDate());
      const future     = isFutureKey(key, today);
      const beforeLaunch = isBeforeLaunchKey(key);
      const disabled    = future || beforeLaunch;
      const complete    = isDayComplete(progress, key);
      const isToday     = key === today;
      const isSelected  = key === _calSelectedKey;
      cell.disabled = disabled;
      cell.classList.toggle("calendar-cell-complete", complete);
      cell.classList.toggle("calendar-cell-today",    isToday);
      cell.classList.toggle("calendar-cell-selected", isSelected);
      cell.classList.toggle("calendar-cell-future",   disabled);
      if (!disabled) {
        cell.addEventListener("click", () => {
          hideCalendar();
          _calOnPick?.(key);
        });
      }
    }
    elCalGrid.appendChild(cell);
  });
}

export function showCalendar(selectedKeyStr, onPick) {
  const d = keyToDate(selectedKeyStr);
  _calYear  = d.getFullYear();
  _calMonth = d.getMonth();
  _calSelectedKey = selectedKeyStr;
  _calOnPick = onPick;
  renderCalendarGrid();
  elCalendar.hidden = false;
}

export function hideCalendar() {
  elCalendar.hidden = true;
}

export function bindCalendar() {
  elBtnCalPrev.addEventListener("click", () => {
    if (elBtnCalPrev.disabled) return;
    _calMonth--;
    if (_calMonth < 0) { _calMonth = 11; _calYear--; }
    renderCalendarGrid();
  });
  elBtnCalNext.addEventListener("click", () => {
    if (elBtnCalNext.disabled) return;
    _calMonth++;
    if (_calMonth > 11) { _calMonth = 0; _calYear++; }
    renderCalendarGrid();
  });
  elCalClose.addEventListener("click", hideCalendar);
  elCalendar.addEventListener("click", e => { if (e.target === elCalendar) hideCalendar(); });
}
