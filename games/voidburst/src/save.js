// Same pattern as Stackward: module-level singleton, mutate + commitSave().
const SAVE_KEY = 'voidburst_save_v1';

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) throw new Error('no save');
    const data = JSON.parse(raw);
    return {
      coins: data.coins || 0,
      best: data.best || 0,
      upgrades: (data.upgrades && typeof data.upgrades === 'object') ? data.upgrades : {},
    };
  } catch {
    return { coins: 0, best: 0, upgrades: {} };
  }
}

export const save = loadSave();

export function commitSave() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}
