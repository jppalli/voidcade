import type { Store } from '../platform/storage';
import type { Orientation, Placement, Size } from './types';

export interface SavedPuzzle {
  placed: Placement[];
  solved: boolean;
  /** Local date (YYYY-MM-DD) on which the puzzle was solved. Streaks only count solves made on the puzzle's own day. */
  solvedOn?: string;
  /** Active play time in milliseconds, up to the solve. */
  ms?: number;
}

export type Theme = 'light' | 'dark';
export type DayRecord = Partial<Record<string, SavedPuzzle>>;
export type Days = Record<string, DayRecord>;

export interface SoundPrefs {
  sfx: boolean;
  music: boolean;
}

interface State {
  v: 1;
  theme?: Theme;
  seenHowTo?: boolean;
  sound: SoundPrefs;
  days: Days;
}

/** Days kept for the archive and the statistics. */
const KEEP_DAYS = 1000;
const KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

function isPlacement(x: unknown): x is Placement {
  const p = x as Placement;
  return (
    !!p &&
    typeof p.tile === 'string' &&
    Number.isInteger(p.row) &&
    Number.isInteger(p.col) &&
    [0, 1, 2, 3].includes(p.orientation as Orientation)
  );
}

/** Saved game state. Anything unreadable or out of date is dropped; this never throws. */
export class Progress {
  private state: State = { v: 1, sound: { sfx: true, music: true }, days: {} };

  constructor(private readonly store: Store, today: Date) {
    try {
      const raw = this.store.read();
      const parsed = raw ? (JSON.parse(raw) as Partial<State>) : null;
      if (parsed && parsed.v === 1 && parsed.days && typeof parsed.days === 'object') {
        this.state = {
          v: 1,
          theme: parsed.theme === 'dark' || parsed.theme === 'light' ? parsed.theme : undefined,
          seenHowTo: parsed.seenHowTo === true,
          sound: { sfx: parsed.sound?.sfx !== false, music: parsed.sound?.music !== false },
          days: {},
        };
        for (const [day, sizes] of Object.entries(parsed.days)) {
          if (!this.isRecent(day, today)) continue;
          for (const [size, v] of Object.entries(sizes ?? {})) {
            if (!v || !Array.isArray(v.placed)) continue;
            const saved: SavedPuzzle = { placed: v.placed.filter(isPlacement), solved: v.solved === true };
            if (typeof v.solvedOn === 'string' && KEY.test(v.solvedOn)) saved.solvedOn = v.solvedOn;
            if (typeof v.ms === 'number' && Number.isFinite(v.ms) && v.ms >= 0) saved.ms = Math.round(v.ms);
            (this.state.days[day] ??= {})[size] = saved;
          }
        }
      }
    } catch {
      this.state = { v: 1, sound: { sfx: true, music: true }, days: {} };
    }
  }

  private isRecent(key: string, today: Date): boolean {
    const m = KEY.exec(key);
    if (!m) return false;
    const age = (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(+m[1], +m[2] - 1, +m[3])) / 86_400_000;
    return age <= KEEP_DAYS;
  }

  private persist(): void {
    this.store.write(JSON.stringify(this.state));
  }

  get(day: string, size: Size): SavedPuzzle | null {
    return this.state.days[day]?.[String(size)] ?? null;
  }

  set(day: string, size: Size, value: SavedPuzzle): void {
    (this.state.days[day] ??= {})[String(size)] = value;
    this.persist();
  }

  /** Read-only view of everything saved, for the archive and statistics. */
  get days(): Readonly<Days> {
    return this.state.days;
  }

  get theme(): Theme | undefined {
    return this.state.theme;
  }

  setTheme(theme: Theme): void {
    this.state.theme = theme;
    this.persist();
  }

  get seenHowTo(): boolean {
    return this.state.seenHowTo === true;
  }

  markHowToSeen(): void {
    this.state.seenHowTo = true;
    this.persist();
  }

  get sound(): SoundPrefs {
    return { ...this.state.sound };
  }

  setSound(prefs: SoundPrefs): void {
    this.state.sound = { ...prefs };
    this.persist();
  }
}