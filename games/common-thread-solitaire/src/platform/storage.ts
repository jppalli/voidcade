import { CONFIG } from '../config';
import type { GameSave } from '../engine/game';

export interface Settings {
  sfx: boolean;
  music: boolean;
  largePrint: boolean;
  reducedMotion: boolean;
  leftHanded: boolean;
  reviewMode: boolean;
}

export interface Profile {
  v: number;
  coins: number;
  hints: number;
  wilds: number;
  journeyLevel: number;
  /** Best (most moves left) per journey level, keyed "j1", "j2", ... */
  journeyStars: Record<string, number>;
  streak: number;
  bestStreak: number;
  daily: Record<string, { done: boolean; movesLeft?: number }>;
  dailyChests: Record<string, number[]>;
  tutorialDone: boolean;
  stats: { wins: number; setsCleared: number; biggestBatch: number; gamesStarted: number };
  settings: Settings;
}


const PROFILE_KEY = "commonthread.profile.v1";
const SESSION_KEY = "commonthread.session.v1";
function defaultProfile(): Profile {
  return {
    v: 1,
    coins: CONFIG.startCoins,
    hints: CONFIG.startHints,
    wilds: CONFIG.startWilds,
    journeyLevel: 1,
    journeyStars: {},
    streak: 0,
    bestStreak: 0,
    daily: {},
    dailyChests: {},
    tutorialDone: false,
    stats: {
      wins: 0,
      setsCleared: 0,
      biggestBatch: 0,
      gamesStarted: 0
    },
    settings: {
      sfx: true,
      music: true,
      largePrint: false,
      reducedMotion: typeof matchMedia < "u" && matchMedia("(prefers-reduced-motion: reduce)").matches,
      leftHanded: false,
      reviewMode: false
    }
  };
}
function storageGet(t: string): string | null {
  try {
    return localStorage.getItem(t);
  } catch {
    return null;
  }
}
function storageSet(t: string, e: string | null): void {
  try {
    if (e === null) localStorage.removeItem(t);else localStorage.setItem(t, e);
  } catch {}
}
export function loadProfile(): Profile {
  let t = storageGet(PROFILE_KEY),
    e = defaultProfile();
  if (!t) return e;
  try {
    let s = JSON.parse(t);
    return {
      ...e,
      ...s,
      settings: {
        ...e.settings,
        ...(s.settings ?? {})
      },
      stats: {
        ...e.stats,
        ...(s.stats ?? {})
      }
    };
  } catch {
    return e;
  }
}
export function saveProfile(t: Profile): void {
  storageSet(PROFILE_KEY, JSON.stringify(t));
}
export function resetStorage() {
  storageSet(PROFILE_KEY, null);
  storageSet(SESSION_KEY, null);
}
export function saveSession(t: GameSave | null): void {
  storageSet(SESSION_KEY, t === null ? null : JSON.stringify(t));
}
export function loadSession(): GameSave | null {
  let t = storageGet(SESSION_KEY);
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}
export function dateKey(t = new Date()): string {
  let e = String(t.getMonth() + 1).padStart(2, "0"),
    s = String(t.getDate()).padStart(2, "0");
  return `${t.getFullYear()}-${e}-${s}`;
}
