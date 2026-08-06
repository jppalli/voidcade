import { WordPairGenerator } from './wordgen.js';
import {
  MAX_LIVES,
  comboMultiplier,
  durationForTier,
  tierForScore,
  SCORE_PER_LETTER,
} from './config.js';

/**
 * @typedef {'idle'|'falling'|'resolved'} LetterPhase
 */

/**
 * Core game state machine for SplitSpell. No DOM/rendering here — main.js
 * reads this state and draws it. Time-driven via an external tick(dt) call
 * so the renderer controls the animation loop (requestAnimationFrame).
 */
export class Game {
  constructor() {
    this.gen = new WordPairGenerator();
    this.score = 0;
    this.best = Number(localStorage.getItem('splitspell-best') || 0);
    this.lives = MAX_LIVES;
    this.streak = 0;
    this.tier = 1;
    this.state = 'menu'; // 'menu' | 'playing' | 'gameover'

    /** Current falling letter, or null between spawns. */
    this.falling = null; // { letter, target, elapsedMs, durationMs }

    this.onUpdate = null; // callback(game) fired on any state change
    this.onWordComplete = null; // callback(side: 'top'|'bottom', word: string, comboLevel: number)
    this.onWrongSwipe = null; // callback()
    this.onMiss = null; // callback(side)
    this.onGameOver = null; // callback()
  }

  start() {
    this.score = 0;
    this.lives = MAX_LIVES;
    this.streak = 0;
    this.tier = 1;
    this.state = 'playing';
    this.gen.initBoth(this.tier);
    this._spawnNext();
    this._emit();
  }

  _emit() {
    this.onUpdate?.(this);
  }

  _spawnNext() {
    const { letter, target } = this.gen.nextFallingLetter();
    this.falling = {
      letter,
      target,
      elapsedMs: 0,
      durationMs: durationForTier(this.tier),
    };
  }

  /** Advance the falling letter's timer. Call every animation frame with delta ms. */
  tick(dtMs) {
    if (this.state !== 'playing' || !this.falling) return;
    this.falling.elapsedMs += dtMs;
    if (this.falling.elapsedMs >= this.falling.durationMs) {
      this._resolveMiss();
    }
  }

  /** Falling letter reaches the bottom of its travel without being swiped. */
  _resolveMiss() {
    const side = this.falling.target;
    this.streak = 0;
    this.onMiss?.(side);
    this._spawnNext();
    this._emit();
  }

  /**
   * Player swipes up or down. Returns true if the swipe was correct.
   * @param {'up'|'down'} direction
   */
  swipe(direction) {
    if (this.state !== 'playing' || !this.falling) return false;
    const target = direction === 'up' ? 'top' : 'bottom';
    const correct = target === this.falling.target;

    // Clear the falling letter immediately so the tick loop can't re-resolve
    // this same letter as a miss while a spawn is pending/delayed.
    this.falling = null;

    if (correct) {
      this._applyCorrectSwipe(target);
    } else {
      this._applyWrongSwipe();
    }
    return correct;
  }

  _applyCorrectSwipe(side) {
    const active = side === 'top' ? this.gen.top : this.gen.bottom;

    active.blankIndex = -1; // mark filled; display() shows the full word momentarily
    this.streak++;

    const comboLevel = this.streak >= 12 ? 2 : this.streak >= 7 ? 1 : 0;
    const mult = comboMultiplier(this.streak);
    const gained = Math.round(active.word.length * SCORE_PER_LETTER * mult);
    this.score += gained;
    this.tier = tierForScore(this.score);

    if (this.score > this.best) {
      this.best = this.score;
      localStorage.setItem('splitspell-best', String(this.best));
    }

    this.onWordComplete?.(side, active.word, comboLevel, gained);
    this._emit(); // let the renderer show the completed word for a beat

    // Replace the completed word with a fresh one on the same side, after a
    // short delay so the player actually sees what they just spelled. Guard
    // against a game-over/restart happening during that delay.
    const genAtCall = this.gen;
    setTimeout(() => {
      if (this.state !== 'playing' || this.gen !== genAtCall) return;
      if (side === 'top') this.gen.refreshTop(this.tier);
      else this.gen.refreshBottom(this.tier);
      this._spawnNext();
      this._emit();
    }, 550);
  }

  _applyWrongSwipe() {
    this.streak = 0;
    this.lives = Math.max(0, this.lives - 1);
    this.onWrongSwipe?.();

    if (this.lives <= 0) {
      this.state = 'gameover';
      this.onGameOver?.();
      this._emit();
      return;
    }

    this._spawnNext();
    this._emit();
  }

  /** 0..1 progress of the current falling letter toward its deadline. */
  fallProgress() {
    if (!this.falling) return 0;
    return Math.min(1, this.falling.elapsedMs / this.falling.durationMs);
  }

  topDisplay() {
    return this.gen.top ? this.gen.top.word : '';
  }

  bottomDisplay() {
    return this.gen.bottom ? this.gen.bottom.word : '';
  }

  topBlankIndex() {
    return this.gen.top ? this.gen.top.blankIndex : -1;
  }

  bottomBlankIndex() {
    return this.gen.bottom ? this.gen.bottom.blankIndex : -1;
  }
}
