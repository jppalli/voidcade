import { WORDS_BY_LENGTH } from './words.js';
import { levelAt } from './levels.js';

const CORPUS = new Set(Object.values(WORDS_BY_LENGTH).flat());

/**
 * Core game state for a single Wordbloom level. No DOM here — main.js reads
 * this and renders it.
 *
 * The player traces a path across the letter ring (tap-by-tap or drag) to
 * spell a word. A word is accepted if:
 *   - it's 3+ letters,
 *   - every letter used is a distinct ring position (no tile reused within
 *     one trace — standard word-search rule),
 *   - it hasn't already been found this level,
 *   - it's in the curated corpus (WORDS_BY_LENGTH).
 *
 * Required words (from the level data) are the win condition. Any other
 * valid corpus word found along the way is a bonus, tracked separately for
 * the star rating but never required.
 */
export class Game {
  constructor(levelIndex) {
    this.ref = levelAt(levelIndex);
    this.foundRequired = new Set();
    this.foundBonus = new Set();
    this.path = []; // array of ring indices, current in-progress trace
    this.mistakes = 0;
  }

  get letters() {
    return this.ref.letters;
  }

  get requiredWords() {
    return this.ref.required;
  }

  get requiredTotal() {
    return this.ref.required.length;
  }

  get requiredFoundCount() {
    return this.foundRequired.size;
  }

  get isComplete() {
    return this.foundRequired.size === this.ref.required.length;
  }

  /** Current in-progress trace as a string, e.g. "TEA". */
  currentWord() {
    return this.path.map((i) => this.letters[i]).join('');
  }

  /** Adds a ring position to the current trace. No-op if already used in this trace. */
  extend(ringIndex) {
    if (this.path.includes(ringIndex)) return false;
    this.path.push(ringIndex);
    return true;
  }

  /** Removes the last tile from the current trace (undo-last, e.g. drag backtrack). */
  retreatTo(length) {
    this.path = this.path.slice(0, Math.max(0, length));
  }

  clearTrace() {
    this.path = [];
  }

  /**
   * Commits the current trace as a submitted word. Returns one of:
   * 'required' | 'bonus' | 'repeat' | 'invalid' | 'too-short'
   */
  submit() {
    const word = this.currentWord();
    const result = this._classify(word);
    if (result === 'required') this.foundRequired.add(word);
    if (result === 'bonus') this.foundBonus.add(word);
    if (result === 'invalid' || result === 'too-short') this.mistakes++;
    this.clearTrace();
    return { word, result };
  }

  _classify(word) {
    if (word.length < 3) return 'too-short';
    if (this.foundRequired.has(word) || this.foundBonus.has(word)) return 'repeat';
    if (this.ref.required.includes(word)) return 'required';
    if (CORPUS.has(word)) return 'bonus';
    return 'invalid';
  }

  /** All bonus words findable in this ring, for the post-level summary. */
  allPossibleBonusWords() {
    const source = this.ref.source;
    const superCounts = letterCounts(source);
    const required = new Set(this.ref.required);
    const out = [];
    for (const w of CORPUS) {
      if (w === source || required.has(w)) continue;
      if (w.length < 3 || w.length >= source.length) continue;
      if (isSubsetOf(letterCounts(w), superCounts)) out.push(w);
    }
    return out.sort();
  }

  /** Star rating: 1 star for clearing required words, +1 for zero mistakes,
   *  +1 for finding at least half of the available bonus words. */
  starsEarned() {
    if (!this.isComplete) return 0;
    let stars = 1;
    if (this.mistakes === 0) stars++;
    const possibleBonus = this.allPossibleBonusWords();
    if (possibleBonus.length === 0 || this.foundBonus.size >= Math.ceil(possibleBonus.length / 2)) {
      stars++;
    }
    return stars;
  }
}

function letterCounts(word) {
  const m = new Map();
  for (const ch of word) m.set(ch, (m.get(ch) || 0) + 1);
  return m;
}

function isSubsetOf(subCounts, superCounts) {
  for (const [ch, n] of subCounts) {
    if ((superCounts.get(ch) || 0) < n) return false;
  }
  return true;
}
