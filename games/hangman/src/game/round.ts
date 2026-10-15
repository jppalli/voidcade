import { lettersOf, type Entry } from './words';

/** Six misses: head, body, two arms, two legs. */
export const MAX_MISSES = 6;

export type GuessResult = 'hit' | 'miss' | 'repeat';

/** One word or phrase being guessed. */
export class Round {
  readonly entry: Entry;
  readonly letters: Set<string>;
  readonly guessed = new Set<string>();
  /** Letters revealed by hints (also in `guessed`). */
  readonly hinted = new Set<string>();
  misses = 0;
  maxMisses = MAX_MISSES;
  /** A second chance (one extra miss) has been used. */
  revived = false;

  constructor(entry: Entry) {
    this.entry = entry;
    this.letters = lettersOf(entry.text);
  }

  guess(ch: string): GuessResult {
    if (this.guessed.has(ch) || this.over) return 'repeat';
    this.guessed.add(ch);
    if (this.letters.has(ch)) return 'hit';
    this.misses++;
    return 'miss';
  }

  isRevealed(ch: string): boolean {
    return this.guessed.has(ch);
  }

  get solved(): boolean {
    for (const ch of this.letters) if (!this.guessed.has(ch)) return false;
    return true;
  }

  get lost(): boolean {
    return !this.solved && this.misses >= this.maxMisses;
  }

  get over(): boolean {
    return this.solved || this.misses >= this.maxMisses;
  }

  get missesLeft(): number {
    return Math.max(0, this.maxMisses - this.misses);
  }

  /** Reveals the hidden letter that fills the most blanks. */
  hint(): string | null {
    if (this.over) return null;
    const counts = new Map<string, number>();
    for (const ch of this.entry.text) {
      if (this.letters.has(ch) && !this.guessed.has(ch)) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    }
    let best: string | null = null;
    for (const [ch, n] of counts) if (!best || n > counts.get(best)!) best = ch;
    if (!best) return null;
    this.guessed.add(best);
    this.hinted.add(best);
    return best;
  }

  /** Second chance after the last miss: rub out the last line. */
  revive() {
    this.revived = true;
    this.maxMisses = this.misses + 1;
  }

}
