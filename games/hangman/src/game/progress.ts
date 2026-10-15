import { getItem, registerMerge, setItem } from '../platform/storage';
import { TOTAL_LEVELS } from './words';

const KEY = 'hangman-progress';
const ENDLESS_KEY = 'hangman-endless';

export interface Progress {
  version: 1;
  /** Highest level index that can be played (0-based). */
  unlocked: number;
  /** Best stars per level index (1-3). */
  stars: Record<number, number>;
  /** How to Play has been shown once. */
  seenHowTo: boolean;
}

const fresh = (): Progress => ({ version: 1, unlocked: 0, stars: {}, seenHowTo: false });

function parse(raw: string | null): Progress {
  try {
    const p = JSON.parse(raw ?? '') as Progress;
    if (p && p.version === 1 && typeof p.unlocked === 'number') {
      return { ...fresh(), ...p, stars: { ...(p.stars ?? {}) } };
    }
  } catch { /* fresh */ }
  return fresh();
}

/** Device and cloud copies: the furthest unlock and the best stars win. */
registerMerge(KEY, (a, b) => {
  const x = parse(a), y = parse(b);
  const stars: Record<number, number> = { ...x.stars };
  for (const [k, v] of Object.entries(y.stars)) stars[Number(k)] = Math.max(stars[Number(k)] ?? 0, v);
  return JSON.stringify({ version: 1, unlocked: Math.max(x.unlocked, y.unlocked), stars, seenHowTo: x.seenHowTo || y.seenHowTo });
});
registerMerge(ENDLESS_KEY, (a, b) => String(Math.max(Number(a) || 0, Number(b) || 0)));

export function loadProgress(): Progress { return parse(getItem(KEY)); }
export function saveProgress(p: Progress) { setItem(KEY, JSON.stringify(p)); }

/** Record a solved level: keep the best stars and open the next one. */
export function recordSolve(p: Progress, index: number, stars: number): Progress {
  const next: Progress = { ...p, stars: { ...p.stars, [index]: Math.max(p.stars[index] ?? 0, stars) } };
  next.unlocked = Math.min(TOTAL_LEVELS - 1, Math.max(p.unlocked, index + 1));
  return next;
}

export const solvedCount = (p: Progress) => Object.keys(p.stars).length;
export const starCount = (p: Progress) => Object.values(p.stars).reduce((a, b) => a + b, 0);

/** First level without stars that's open, else the last unlocked. */
export function nextLevel(p: Progress): number {
  for (let i = 0; i <= p.unlocked; i++) if (!p.stars[i]) return i;
  return p.unlocked;
}

export function bestEndless(): number { return Number(getItem(ENDLESS_KEY)) || 0; }
export function saveBestEndless(score: number): boolean {
  if (score <= bestEndless()) return false;
  setItem(ENDLESS_KEY, String(score));
  return true;
}
