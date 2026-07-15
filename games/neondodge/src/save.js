// Minimal persistence: just a best score. Deliberately simple since this
// game exists to validate the monorepo + shared-ads pattern, not to carry
// its own meta-progression system.
const SAVE_KEY = 'neondodge_save_v1';

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) throw new Error('no save');
    const data = JSON.parse(raw);
    return { best: data.best || 0 };
  } catch (e) {
    return { best: 0 };
  }
}

export const save = loadSave();

export function commitSave() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}
