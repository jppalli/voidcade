// Persistence layer - localStorage save/load for coins, best score, and the
// permanent upgrade levels (bought with coins, always active every run).
const SAVE_KEY = 'stackward_save_v2';

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) throw new Error('no save');
    const data = JSON.parse(raw);
    return {
      coins: data.coins || 0,
      best: data.best || 0,
      // permanent upgrade levels: id -> level (0..MAX_LEVEL). The only
      // meta-progression store now (no consumables, unlocks, or reward tiers).
      upgrades: (data.upgrades && typeof data.upgrades === 'object') ? data.upgrades : {},
    };
  } catch (e) {
    return { coins: 0, best: 0, upgrades: {} };
  }
}

function persistSave(save) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

export const save = loadSave();

export function commitSave() {
  persistSave(save);
}
