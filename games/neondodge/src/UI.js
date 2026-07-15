import { save } from './save.js';

export class UI {
  constructor(adManager) {
    this.adManager = adManager || null;
    this.el = {
      score: document.getElementById('score'),
      bestVal: document.getElementById('bestVal'),
      menu: document.getElementById('menu'),
      menuBestVal: document.getElementById('menuBestVal'),
      playBtn: document.getElementById('playBtn'),
      gameover: document.getElementById('gameover'),
      finalScore: document.getElementById('finalScore'),
      newBestBadge: document.getElementById('newBestBadge'),
      watchAdBtn: document.getElementById('watchAdBtn'),
      retryBtn: document.getElementById('retryBtn'),
      menuBtn: document.getElementById('menuBtn'),
      tapHint: document.getElementById('tapHint'),
    };
    this.game = null;
    this._usedContinueThisRun = false;
  }

  attachGame(game) {
    this.game = game;
    const startFresh = () => {
      this._usedContinueThisRun = false;
      game.startRun();
    };
    this.el.playBtn.addEventListener('click', startFresh);
    this.el.retryBtn.addEventListener('click', startFresh);
    this.el.menuBtn.addEventListener('click', () => game.goToMenu());
    this.el.watchAdBtn.addEventListener('click', () => this._onWatchAd());
    this.syncMenuStats();
  }

  async _onWatchAd() {
    if (!this.adManager || this._usedContinueThisRun) return;
    this.el.watchAdBtn.disabled = true;
    const result = await this.adManager.showRewarded({ rewardLabel: 'Watch to continue your run.' });
    this.el.watchAdBtn.disabled = false;
    if (result.completed) {
      this._usedContinueThisRun = true;
      this.game.continueRun();
    }
  }

  onStateChange(state) {
    if (state === 'playing') {
      this.el.menu.classList.add('hidden');
      this.el.gameover.classList.add('hidden');
      this.el.tapHint.classList.remove('hidden');
      setTimeout(() => this.el.tapHint.classList.add('hidden'), 2500);
    } else if (state === 'menu') {
      this.el.gameover.classList.add('hidden');
      this.el.tapHint.classList.add('hidden');
      this.el.menu.classList.remove('hidden');
      this.syncMenuStats();
    } else if (state === 'gameover') {
      this.el.tapHint.classList.add('hidden');
    }
  }

  updateScore(score) {
    this.el.score.textContent = score;
  }

  showGameOver({ score, isNewBest }) {
    this.el.finalScore.textContent = score;
    this.el.newBestBadge.classList.toggle('hidden', !isNewBest);
    // Offer the rewarded continue only once per run, and only if the
    // provider actually has an ad ready.
    const canOfferContinue = !this._usedContinueThisRun && this.adManager && this.adManager.isRewardedReady();
    this.el.watchAdBtn.classList.toggle('hidden', !canOfferContinue);
    this.el.gameover.classList.remove('hidden');
    this.syncMenuStats();
  }

  syncMenuStats() {
    this.el.bestVal.textContent = save.best;
    this.el.menuBestVal.textContent = save.best;
  }
}
