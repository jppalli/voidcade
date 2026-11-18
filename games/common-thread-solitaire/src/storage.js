import { economy } from "./content/economy.js";

var PROFILE_KEY = "commonthread.profile.v1",
  SESSION_KEY = "commonthread.session.v1";
function defaultProfile() {
  return {
    v: 1,
    coins: economy.startCoins,
    hints: economy.startHints,
    wilds: economy.startWilds,
    journeyLevel: 1,
    journeyStars: {},
    streak: 0,
    bestStreak: 0,
    daily: {},
    dailyChests: {},
    tutorialDone: !1,
    stats: {
      wins: 0,
      setsCleared: 0,
      biggestBatch: 0,
      gamesStarted: 0,
    },
    settings: {
      sfx: !0,
      music: !0,
      largePrint: !1,
      reducedMotion:
        typeof matchMedia < "u" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches,
      leftHanded: !1,
      reviewMode: !1,
    },
  };
}
function readStorage(t) {
  try {
    return localStorage.getItem(t);
  } catch {
    return null;
  }
}
function writeStorage(t, e) {
  try {
    if (e === null) localStorage.removeItem(t);
    else localStorage.setItem(t, e);
  } catch {}
}
function loadProfile() {
  let t = readStorage(PROFILE_KEY),
    e = defaultProfile();
  if (!t) return e;
  try {
    let s = JSON.parse(t);
    return {
      ...e,
      ...s,
      settings: {
        ...e.settings,
        ...(s.settings ?? {}),
      },
      stats: {
        ...e.stats,
        ...(s.stats ?? {}),
      },
    };
  } catch {
    return e;
  }
}
function saveProfile(t) {
  writeStorage(PROFILE_KEY, JSON.stringify(t));
}
function resetProgress() {
  (writeStorage(PROFILE_KEY, null), writeStorage(SESSION_KEY, null));
}
function saveSession(t) {
  writeStorage(SESSION_KEY, t === null ? null : JSON.stringify(t));
}
function loadSession() {
  let t = readStorage(SESSION_KEY);
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}
function dateKey(t = new Date()) {
  let e = String(t.getMonth() + 1).padStart(2, "0"),
    s = String(t.getDate()).padStart(2, "0");
  return `${t.getFullYear()}-${e}-${s}`;
}
export {
  PROFILE_KEY,
  SESSION_KEY,
  defaultProfile,
  readStorage,
  writeStorage,
  loadProfile,
  saveProfile,
  resetProgress,
  saveSession,
  loadSession,
  dateKey,
};
