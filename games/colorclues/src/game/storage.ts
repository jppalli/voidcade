import "./legacy";   // carries pre-rename saves over; must run before the read below

const KEY = "colorclues-progress-v1";
const MUTE_KEY = "colorclues-muted";

export interface Result {
  /** 3 = flawless, dropping with mistakes and hints used. */
  rating: number;
  mistakes: number;
  hints: number;
}

type Progress = Record<string, Result>;

function read(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Progress) : {};
  } catch {
    return {};
  }
}

function write(p: Progress) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode */ }
}

let progress = read();

export const resultFor = (id: string): Result | undefined => progress[id];
export const isCleared = (id: string) => progress[id] !== undefined;
export const clearedCount = () => Object.keys(progress).length;

export function recordWin(id: string, result: Result) {
  const previous = progress[id];
  if (!previous || result.rating > previous.rating) {
    progress = { ...progress, [id]: result };
    write(progress);
  }
}

export function resetProgress() {
  progress = {};
  write(progress);
}

export function ratingFor(mistakes: number, hints: number) {
  if (mistakes === 0 && hints === 0) return 3;
  if (mistakes + hints <= 2) return 2;
  return 1;
}

export const isMuted = () => localStorage.getItem(MUTE_KEY) === "1";
export const setMuted = (m: boolean) => {
  try { localStorage.setItem(MUTE_KEY, m ? "1" : "0"); } catch { /* ignore */ }
};
