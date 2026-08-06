/**
 * Word + blank generator for SplitSpell.
 *
 * The core fairness guarantee: whenever two words are active at once (one on
 * top, one on bottom), their required letters must be DIFFERENT. This means
 * every falling letter unambiguously belongs to exactly one side — the
 * challenge is purely "did you notice which word needs it and swipe the
 * right way," never "I have the right letter but sent it the wrong place
 * because both sides wanted the same thing."
 */
import { WORDS_BY_LENGTH } from './words.js';

/**
 * @typedef {Object} ActiveWord
 * @property {string} word - the full solution word, e.g. "APPLE"
 * @property {number} blankIndex - index of the letter currently blanked
 * @property {string} display - array-friendly representation with '_' at the blank
 */

/** Picks a random word of the given length, avoiding a specific exclusion set. */
function pickWord(length, excludeWords) {
  const pool = WORDS_BY_LENGTH[length];
  if (!pool || pool.length === 0) return null;
  const candidates = pool.filter((w) => !excludeWords.has(w));
  const list = candidates.length > 0 ? candidates : pool; // fall back if exhausted
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Creates a fresh ActiveWord: picks a word, blanks one random letter.
 * @param {number} length
 * @param {Set<string>} excludeWords - words currently in play (avoid immediate repeats)
 * @param {string|null} forbiddenLetter - if set, the blanked letter must NOT equal this
 */
function createActiveWord(length, excludeWords, forbiddenLetter) {
  // Try a handful of word/blank combinations until we find one whose
  // required letter differs from the forbidden one. With 458 words across
  // 4 buckets this resolves almost always on the first or second try.
  for (let attempt = 0; attempt < 20; attempt++) {
    const word = pickWord(length, excludeWords);
    if (!word) return null;
    const blankIndex = Math.floor(Math.random() * word.length);
    const requiredLetter = word[blankIndex];
    if (forbiddenLetter === null || requiredLetter !== forbiddenLetter) {
      return { word, blankIndex, requiredLetter };
    }
  }
  return null; // caller should handle (extremely rare with this word list size)
}

export class WordPairGenerator {
  constructor() {
    /** @type {ActiveWord|null} */
    this.top = null;
    /** @type {ActiveWord|null} */
    this.bottom = null;
    this.recentWords = new Set(); // avoid immediate repeats
  }

  _remember(word) {
    this.recentWords.add(word);
    // Keep the exclusion window small so we don't starve the pool
    if (this.recentWords.size > 12) {
      const first = this.recentWords.values().next().value;
      this.recentWords.delete(first);
    }
  }

  /** Length to use for a new word, scaling with difficulty tier (1-4). */
  static lengthForTier(tier) {
    if (tier <= 1) return 3 + Math.floor(Math.random() * 2); // 3-4
    if (tier === 2) return 4 + Math.floor(Math.random() * 2); // 4-5
    if (tier === 3) return 4 + Math.floor(Math.random() * 3); // 4-6
    return 5 + Math.floor(Math.random() * 2); // 5-6
  }

  /** Populates both top and bottom with fresh words. Call once at game start. */
  initBoth(tier = 1) {
    this.top = createActiveWord(WordPairGenerator.lengthForTier(tier), this.recentWords, null);
    this._remember(this.top.word);
    this.bottom = createActiveWord(
      WordPairGenerator.lengthForTier(tier),
      this.recentWords,
      this.top.requiredLetter
    );
    this._remember(this.bottom.word);
  }

  /** Replaces the top word with a new one, avoiding the bottom's required letter. */
  refreshTop(tier = 1) {
    const forbidden = this.bottom ? this.bottom.requiredLetter : null;
    this.top = createActiveWord(WordPairGenerator.lengthForTier(tier), this.recentWords, forbidden);
    this._remember(this.top.word);
  }

  /** Replaces the bottom word with a new one, avoiding the top's required letter. */
  refreshBottom(tier = 1) {
    const forbidden = this.top ? this.top.requiredLetter : null;
    this.bottom = createActiveWord(WordPairGenerator.lengthForTier(tier), this.recentWords, forbidden);
    this._remember(this.bottom.word);
  }

  /**
   * Generates the next falling letter: randomly targets either the top or
   * bottom word's required letter. Returns { letter, target: 'top'|'bottom' }.
   */
  nextFallingLetter() {
    const targetTop = Math.random() < 0.5;
    const active = targetTop ? this.top : this.bottom;
    return { letter: active.requiredLetter, target: targetTop ? 'top' : 'bottom' };
  }

  /** Display string for a word, e.g. "A_PLE" with the blank shown as '_'. */
  static display(activeWord) {
    if (!activeWord) return '';
    const chars = activeWord.word.split('');
    chars[activeWord.blankIndex] = '_';
    return chars.join('');
  }
}
