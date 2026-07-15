/**
 * daily.js — pure logic for the daily challenge: dates, level definitions,
 * localStorage-backed progress, and streak calculation.
 *
 * Nothing here touches the DOM, so it's straightforward to unit test and
 * safe to import from both game.js and the UI layer.
 */

// ─── The 3 daily levels ─────────────────────────────────────────────────

export const DAILY_LEVELS = [
  { key: "easy",   number: 1, name: "Easy",   size: 5, difficulty: "easy"   },
  { key: "medium", number: 2, name: "Medium", size: 7, difficulty: "medium" },
  { key: "hard",   number: 3, name: "Hard",   size: 9, difficulty: "hard"   },
];

export function levelByKey(key) {
  return DAILY_LEVELS.find(l => l.key === key) ?? DAILY_LEVELS[0];
}

export function nextLevel(key) {
  const idx = DAILY_LEVELS.findIndex(l => l.key === key);
  return DAILY_LEVELS[idx + 1] ?? null;
}

// ─── Date helpers (local time, zero-padded ISO-ish keys: YYYY-MM-DD) ───

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function dateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function keyToDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey() {
  return dateKey(new Date());
}

export function addDays(key, delta) {
  const d = keyToDate(key);
  d.setDate(d.getDate() + delta);
  return dateKey(d);
}

/** Number of days from `aKey` to `bKey` (positive if b is after a). */
export function daysBetween(aKey, bKey) {
  const a = keyToDate(aKey);
  const b = keyToDate(bKey);
  return Math.round((b - a) / 86400000);
}

export function isFutureKey(key, todayKeyStr = todayKey()) {
  return daysBetween(todayKeyStr, key) > 0;
}

// Nothing before this date is playable — the daily challenge starts here.
// Today and every day after keeps working forever since puzzles are
// generated deterministically on demand (no pre-authored content to run
// out of), but the past is capped so browsing doesn't go back indefinitely.
export const LAUNCH_DATE_KEY = "2026-01-01";

export function isBeforeLaunchKey(key) {
  return daysBetween(LAUNCH_DATE_KEY, key) < 0;
}

/**
 * Builds a month grid for the calendar picker.
 * Returns { label, year, month, weeks } where weeks is an array of 7-length
 * rows, each cell either a "YYYY-MM-DD" key or null (padding outside the
 * month, so the grid always lines up under Sun..Sat headers).
 */
export function buildCalendarMonth(year, month) {
  const first        = new Date(year, month, 1);
  const startDow     = first.getDay(); // 0 = Sunday
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= totalDaysInMonth; d++) cells.push(dateKey(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return {
    label: first.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    year,
    month,
    weeks,
  };
}

export function formatDayLabel(key, todayKeyStr = todayKey()) {
  const diff = daysBetween(key, todayKeyStr); // today - key
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return keyToDate(key).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─── Progress storage ───────────────────────────────────────────────────
// Shape: { "2026-07-01": { easy: {completed,misses,timeMs,completedAt}, medium: {...}, hard: {...} }, ... }

const PROGRESS_KEY = "panes-daily-progress-v1";

export function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — fail silently,
    // the game still works, it just won't remember progress across reloads.
  }
}

export function getLevelResult(progress, dateKeyStr, levelKey) {
  return progress[dateKeyStr]?.[levelKey] ?? null;
}

export function isLevelComplete(progress, dateKeyStr, levelKey) {
  return !!getLevelResult(progress, dateKeyStr, levelKey)?.completed;
}

export function isDayComplete(progress, dateKeyStr) {
  return DAILY_LEVELS.every(l => isLevelComplete(progress, dateKeyStr, l.key));
}

/** First level in a day that isn't complete yet; falls back to the last level. */
export function firstIncompleteLevel(progress, dateKeyStr) {
  return DAILY_LEVELS.find(l => !isLevelComplete(progress, dateKeyStr, l.key))
      ?? DAILY_LEVELS[DAILY_LEVELS.length - 1];
}

/** Records a win. Keeps the best (lowest-miss) attempt if replayed. */
export function recordLevelResult(progress, dateKeyStr, levelKey, result) {
  const day = progress[dateKeyStr] ?? (progress[dateKeyStr] = {});
  const prev = day[levelKey];
  if (!prev || !prev.completed || result.misses < prev.misses) {
    day[levelKey] = {
      completed: true,
      misses: result.misses,
      timeMs: result.timeMs,
      completedAt: Date.now(),
    };
  }
  saveProgress(progress);
  return progress;
}

// ─── Streaks ─────────────────────────────────────────────────────────────

/**
 * current: consecutive fully-completed days ending today (or yesterday, if
 *          today hasn't been played yet — the streak isn't broken until a
 *          full day passes with nothing completed).
 * best:    longest consecutive run ever recorded.
 * totalDays: count of fully-completed days, all-time.
 */
export function computeStreak(progress, todayKeyStr = todayKey()) {
  const completedDates = Object.keys(progress)
    .filter(k => isDayComplete(progress, k))
    .sort();

  if (completedDates.length === 0) return { current: 0, best: 0, totalDays: 0 };

  let best = 1, run = 1;
  for (let i = 1; i < completedDates.length; i++) {
    run = daysBetween(completedDates[i - 1], completedDates[i]) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }

  const completedSet = new Set(completedDates);
  let cursor = todayKeyStr;
  if (!completedSet.has(cursor)) {
    cursor = addDays(cursor, -1);
    if (!completedSet.has(cursor)) {
      return { current: 0, best, totalDays: completedDates.length };
    }
  }

  let current = 0;
  while (completedSet.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  return { current, best: Math.max(best, current), totalDays: completedDates.length };
}
