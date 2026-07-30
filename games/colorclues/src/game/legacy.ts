/**
 * The game was called Color Sweeper until it was renamed to Color Clues, and
 * its saved data was keyed on the old name. Anyone mid-journey would silently
 * lose their progress, their daily streak and their sound setting on the
 * rename, so the old keys are carried across once and then removed.
 *
 * This lives in its own module, with no imports, and is imported for its side
 * effect by *every* module that reads storage. ES modules run once and in
 * dependency order, so that guarantees the move happens before the first read
 * no matter which store happens to be imported first — which is the bug this
 * would otherwise have: `daily.ts` is imported before `storage.ts`, so a
 * migration living in `storage.ts` would run too late for the daily data.
 *
 * Safe to delete once no one is running a build from before the rename.
 */
const MOVES: [string, string][] = [
  ["colorsweeper-progress-v1", "colorclues-progress-v1"],
  ["colorsweeper-daily-v1", "colorclues-daily-v1"],
  ["colorsweeper-muted", "colorclues-muted"],
];

for (const [from, to] of MOVES) {
  try {
    // Never clobber data already saved under the new name.
    if (localStorage.getItem(to) !== null) continue;
    const value = localStorage.getItem(from);
    if (value === null) continue;
    localStorage.setItem(to, value);
    localStorage.removeItem(from);
  } catch {
    /* private mode, or storage disabled — there is nothing to carry over */
  }
}

export {};
