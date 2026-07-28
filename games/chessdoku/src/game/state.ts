import { CHAPTERS, LEVELS, levelsOfChapter } from './levels';
import { computeConflicts, ruleViolations } from './rules';
import type { Board, Conflicts, Level, PieceType } from './types';

const SAVE_KEY = 'chessdoku-progress-v4'; // v4: Pawns chapter shifted all level indexes

/** How many completed levels of a chapter unlock the next chapter. */
const CHAPTER_GATE = 3;

// ---------------------------------------------------------------- progress

class Progress {
  done = new Set<number>();

  constructor() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { done?: number[] };
        for (const i of parsed.done ?? []) {
          if (Number.isInteger(i) && i >= 0 && i < LEVELS.length) this.done.add(i);
        }
      }
    } catch { /* corrupted save — start fresh */ }
  }

  save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ done: [...this.done] }));
    } catch { /* storage unavailable */ }
  }

  markDone(index: number): void {
    this.done.add(index);
    this.save();
  }

  doneInChapter(ch: number): number {
    return levelsOfChapter(ch).filter(x => this.done.has(x.index)).length;
  }

  chapterUnlocked(ch: number): boolean {
    if (ch === 0) return true;
    const prev = levelsOfChapter(ch - 1);
    return this.doneInChapter(ch - 1) >= Math.min(CHAPTER_GATE, prev.length);
  }

  chapterCleared(ch: number): boolean {
    return this.doneInChapter(ch) === levelsOfChapter(ch).length;
  }

  levelUnlocked(index: number): boolean {
    const level = LEVELS[index];
    if (!this.chapterUnlocked(level.ch)) return false;
    const inCh = levelsOfChapter(level.ch);
    const pos = inCh.findIndex(x => x.index === index);
    return pos === 0 || this.done.has(inCh[pos - 1].index);
  }

  /** First unlocked, not-yet-done level — where "Continue" jumps to. */
  nextLevel(): number {
    for (let i = 0; i < LEVELS.length; i++) {
      if (!this.done.has(i) && this.levelUnlocked(i)) return i;
    }
    return 0;
  }

  totalDone(): number {
    return this.done.size;
  }
}

export const progress = new Progress();

// ---------------------------------------------------------------- game state

export interface GameEvents {
  onBoardChange: (game: Game) => void;
  onIllegal: (message: string) => void;
  onWin: (game: Game) => void;
}

export class Game {
  level!: Level;
  levelIndex = 0;
  board: Board = [];
  blocked = new Set<number>();
  remaining = new Map<PieceType, number>();
  selected: PieceType | null = null;
  conflicts: Conflicts = { pairs: [], cells: new Set() };
  ruleBad = new Set<number>();
  won = false;

  constructor(private events: GameEvents) {}

  load(index: number): void {
    this.levelIndex = index;
    this.level = LEVELS[index];
    const n = this.level.size;
    this.board = Array.from({ length: n }, () => Array<null>(n).fill(null));
    this.blocked = new Set((this.level.blocked ?? []).map(([r, c]) => r * n + c));
    for (const g of this.level.given ?? []) this.board[g.r][g.c] = { p: g.p, given: true };
    this.remaining = new Map(Object.entries(this.level.pieces) as [PieceType, number][]);
    this.selected = [...this.remaining.keys()][0] ?? null;
    this.won = false;
    this.refresh();
  }

  reset(): void {
    this.load(this.levelIndex);
  }

  select(p: PieceType): void {
    if ((this.remaining.get(p) ?? 0) > 0) {
      this.selected = p;
      this.events.onBoardChange(this);
    }
  }

  /** Handle a click on cell (r, c): place, remove, or reject. */
  tap(r: number, c: number): void {
    const n = this.level.size;
    if (this.won || this.blocked.has(r * n + c)) return;
    const occ = this.board[r][c];
    if (occ) {
      if (occ.given) {
        this.events.onIllegal('That piece is fixed — it cannot be moved.');
        return;
      }
      this.remaining.set(occ.p, (this.remaining.get(occ.p) ?? 0) + 1);
      this.board[r][c] = null;
      if (!this.selected || (this.remaining.get(this.selected) ?? 0) === 0) this.selected = occ.p;
    } else {
      if (!this.selected || (this.remaining.get(this.selected) ?? 0) <= 0) {
        const avail = [...this.remaining.entries()].find(([, n2]) => n2 > 0);
        if (!avail) return;
        this.selected = avail[0];
      }
      this.board[r][c] = { p: this.selected, given: false };
      this.remaining.set(this.selected, this.remaining.get(this.selected)! - 1);
      if ((this.remaining.get(this.selected) ?? 0) === 0) {
        const next = [...this.remaining.entries()].find(([, n2]) => n2 > 0);
        if (next) this.selected = next[0];
      }
    }
    this.refresh();
  }

  piecesLeft(): number {
    let total = 0;
    for (const n of this.remaining.values()) total += n;
    return total;
  }

  chapterLabel(): string {
    const ch = CHAPTERS[this.level.ch];
    const inCh = levelsOfChapter(this.level.ch);
    const pos = inCh.findIndex(x => x.index === this.levelIndex) + 1;
    return `${ch.glyph} ${ch.name} · Level ${pos} of ${inCh.length}`;
  }

  private refresh(): void {
    this.conflicts = computeConflicts(this.level.size, this.blocked, this.board);
    this.ruleBad = this.level.rule ? ruleViolations(this.level, this.board) : new Set();
    this.events.onBoardChange(this);
    if (!this.won && this.piecesLeft() === 0 && this.conflicts.cells.size === 0 && this.ruleBad.size === 0) {
      this.won = true;
      progress.markDone(this.levelIndex);
      this.events.onWin(this);
    }
  }
}
