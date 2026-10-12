import { getItem, registerMerge, setItem } from '../platform/storage';

const STORAGE_KEY = 'kittydoku-progress-v1';

export interface LevelResult {
  solved: boolean;
  /** Purrfect: solved with no hints and no hearts lost */
  clean: boolean;
}

export interface Progress {
  /** save format version (see VERSION) */
  version: number;
  /** highest level index the player may open */
  unlocked: number;
  results: Record<number, LevelResult>;
  /** level indexes whose tip the player has already read */
  seenTips: number[];
  /** chapter ids whose welcome the cat has already given */
  seenIntros: string[];
}

/**
 * Save format version. v1 was the original 30-level game; v2 is the
 * 100-level layout (10 worlds x 10), where level numbers point at different
 * puzzles, so v1 saves are converted on load.
 */
const VERSION = 2;

function empty(): Progress {
  return { version: VERSION, unlocked: 0, results: {}, seenTips: [], seenIntros: [] };
}

/**
 * v1 -> v2: keep the player's place rather than their exact levels. If they
 * had solved N of the old levels, the first N new levels count as solved
 * (keeping their purrfect flags in order) and the next one is open. World
 * welcomes stay seen; level tips moved, so those reset.
 */
function migrateV1(old: Partial<Progress>): Progress {
  const solvedOld = Object.entries(old.results ?? {})
    .filter(([, r]) => r?.solved)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, r]) => r);
  const results: Record<number, LevelResult> = {};
  solvedOld.forEach((r, i) => { results[i] = { solved: true, clean: !!r.clean }; });
  return {
    ...empty(),
    unlocked: Math.max(solvedOld.length, 0),
    results,
    seenIntros: Array.isArray(old.seenIntros) ? old.seenIntros : [],
  };
}

/** Read a saved progress string (any version) as current-format progress. */
function parseProgress(raw: string | null): { p: Progress; migrated: boolean } {
  try {
    if (!raw) return { p: empty(), migrated: false };
    const parsed = JSON.parse(raw) as Partial<Progress>;
    if (parsed.version !== VERSION) return { p: migrateV1(parsed), migrated: true };
    return { p: { ...empty(), ...parsed }, migrated: false };
  } catch {
    return { p: empty(), migrated: false };
  }
}

export function loadProgress(): Progress {
  const { p, migrated } = parseProgress(getItem(STORAGE_KEY));
  if (migrated) saveProgress(p);
  return p;
}

/**
 * Combine two saves (this device and the cloud) so nothing is ever lost:
 * a level counts as solved, or purrfect, if it is in either; the furthest
 * unlocked level wins; seen tips and welcomes are combined.
 */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const results: Record<number, LevelResult> = { ...a.results };
  for (const [k, r] of Object.entries(b.results)) {
    const i = Number(k);
    const prev = results[i];
    results[i] = { solved: !!(prev?.solved || r.solved), clean: !!(prev?.clean || r.clean) };
  }
  return {
    version: VERSION,
    unlocked: Math.max(a.unlocked, b.unlocked),
    results,
    seenTips: [...new Set([...(a.seenTips ?? []), ...(b.seenTips ?? [])])],
    seenIntros: [...new Set([...(a.seenIntros ?? []), ...(b.seenIntros ?? [])])],
  };
}

registerMerge(STORAGE_KEY, (local, remote) =>
  JSON.stringify(mergeProgress(parseProgress(local).p, parseProgress(remote).p))
);

export function saveProgress(p: Progress) {
  setItem(STORAGE_KEY, JSON.stringify(p));
}

export function recordWin(p: Progress, index: number, clean: boolean, totalLevels: number): Progress {
  const prev = p.results[index];
  const results = {
    ...p.results,
    // Never take a Purrfect away on a less tidy replay.
    [index]: { solved: true, clean: prev?.clean || clean },
  };
  return {
    ...p,
    unlocked: Math.max(p.unlocked, Math.min(index + 1, totalLevels - 1)),
    results,
  };
}

export function hasSeenTip(p: Progress, index: number): boolean {
  return Array.isArray(p.seenTips) && p.seenTips.includes(index);
}

export function markTipSeen(p: Progress, index: number): Progress {
  if (hasSeenTip(p, index)) return p;
  return { ...p, seenTips: [...(p.seenTips ?? []), index] };
}

export function solvedCount(p: Progress): number {
  return Object.values(p.results).filter((r) => r.solved).length;
}

export function cleanCount(p: Progress): number {
  return Object.values(p.results).filter((r) => r.solved && r.clean).length;
}

export function hasSeenIntro(p: Progress, chapterId: string): boolean {
  return Array.isArray(p.seenIntros) && p.seenIntros.includes(chapterId);
}

export function markIntroSeen(p: Progress, chapterId: string): Progress {
  if (hasSeenIntro(p, chapterId)) return p;
  return { ...p, seenIntros: [...(p.seenIntros ?? []), chapterId] };
}
