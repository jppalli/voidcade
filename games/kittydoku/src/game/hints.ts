import { getItem, registerMerge, setItem } from '../platform/storage';

/**
 * Free hints: a few per day, refilled each local calendar day. Once they run
 * out, a hint costs a short rewarded video (or nothing for subscribers).
 */
export const FREE_HINTS_PER_DAY = 3;

const KEY = 'kittydoku-hints';

interface HintState {
  /** local date (YYYY-MM-DD) the count belongs to */
  day: string;
  used: number;
}

function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function read(): HintState {
  try {
    const s = JSON.parse(getItem(KEY) ?? '') as HintState;
    if (s.day === today() && Number.isFinite(s.used)) return s;
  } catch {
    /* missing or broken: fresh day */
  }
  return { day: today(), used: 0 };
}

/** Two copies of today's count (device and cloud): keep the higher one, so
 *  signing in or switching devices can't refill the day's free hints. */
registerMerge(KEY, (local, remote) => {
  const parse = (raw: string): HintState => {
    try {
      const s = JSON.parse(raw) as HintState;
      return s.day === today() && Number.isFinite(s.used) ? s : { day: today(), used: 0 };
    } catch {
      return { day: today(), used: 0 };
    }
  };
  return JSON.stringify({ day: today(), used: Math.max(parse(local).used, parse(remote).used) });
});

export function freeHintsLeft(): number {
  return Math.max(0, FREE_HINTS_PER_DAY - read().used);
}

/** Spend one free hint. Returns false if none are left today. */
export function useFreeHint(): boolean {
  const s = read();
  if (s.used >= FREE_HINTS_PER_DAY) return false;
  setItem(KEY, JSON.stringify({ day: s.day, used: s.used + 1 }));
  return true;
}
