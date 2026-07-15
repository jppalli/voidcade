import gsap from 'gsap';
import { save, commitSave } from './save.js';
import { UPGRADES, upgradeLevel, nextLevelCost, MAX_LEVEL } from './upgrades.js';
import { renderIcon } from './icons.js';
import { COLORS } from './Bubble.js';

const UPGRADE_ICON_COLOR = '#7dd8ff';
const POWERUP_ICON_COLOR = '#ffd93d';
const COIN_ICON_COLOR    = '#ffd93d';

export class UI {
  constructor(audio) {
    this.audio = audio || null;
    this.game = null;
    this.el = {
      hud: document.getElementById('hud'),
      score: document.getElementById('score'),
      combo: document.getElementById('combo'),
      comboVal: document.getElementById('comboVal'),
      coinsHud: document.getElementById('coinsHud'),
      coinsHudVal: document.getElementById('coinsHudVal'),
      menu: document.getElementById('menu'),
      gameover: document.getElementById('gameover'),
      bestScoreVal: document.getElementById('bestScoreVal'),
      coinsMenuVal: document.getElementById('coinsMenuVal'),
      upgradeList: document.getElementById('upgradeList'),
      shopModal: document.getElementById('shopModal'),
      shopCoinsVal: document.getElementById('shopCoinsVal'),
      shopBtn: document.getElementById('shopBtn'),
      closeShopBtn: document.getElementById('closeShopBtn'),
      activePowerupsHud: document.getElementById('activePowerupsHud'),
      powerupModal: document.getElementById('powerupModal'),
      powerupList: document.getElementById('powerupList'),
      powerupWave: document.getElementById('powerupWave'),
      rerollBtn: document.getElementById('rerollBtn'),
      rerollCost: document.getElementById('rerollCost'),
      playBtn: document.getElementById('playBtn'),
      finalScore: document.getElementById('finalScore'),
      newBestBadge: document.getElementById('newBestBadge'),
      coinsEarnedVal: document.getElementById('coinsEarnedVal'),
      retryBtn: document.getElementById('retryBtn'),
      menuBtn: document.getElementById('menuBtn'),
      tapHint: document.getElementById('tapHint'),
      chargeBar: document.getElementById('chargeBar'),
      chargeBarFill: document.getElementById('chargeBarFill'),
      muteBtn: document.getElementById('muteBtn'),
      settingsBtn: document.getElementById('settingsBtn'),
      settingsModal: document.getElementById('settingsModal'),
      closeSettingsBtn: document.getElementById('closeSettingsBtn'),
      toggleMusic: document.getElementById('toggleMusic'),
      toggleSfx: document.getElementById('toggleSfx'),
      nextBubblePreview: document.getElementById('nextBubblePreview'),
    };
    document.querySelectorAll('[data-coin-icon]').forEach(el => {
      el.innerHTML = renderIcon('coin', COIN_ICON_COLOR, 15);
    });
  }

  attachGame(game) {
    this.game = game;
    this.el.playBtn.addEventListener('click', () => game.startRun());
    this.el.retryBtn.addEventListener('click', () => game.startRun());
    this.el.menuBtn.addEventListener('click', () => { game.goToMenu(); this.syncMenuStats(); this.renderUpgrades(); });
    this.el.shopBtn.addEventListener('click', () => { this.renderUpgrades(); this.el.shopModal.classList.remove('hidden'); });
    this.el.closeShopBtn.addEventListener('click', () => this.el.shopModal.classList.add('hidden'));
    if (this.el.muteBtn) {
      this.el.muteBtn.addEventListener('click', () => {
        const muted = this.audio ? this.audio.toggleMute() : false;
        this._reflectMuteButton(muted);
      });
    }
    this.el.settingsBtn.addEventListener('click', () => { this._syncSettingsToggles(); this.el.settingsModal.classList.remove('hidden'); });
    this.el.closeSettingsBtn.addEventListener('click', () => this.el.settingsModal.classList.add('hidden'));
    this.el.toggleMusic.addEventListener('click', () => { if (this.audio) { this.audio.setMusicEnabled(!this.audio.musicEnabled); this._syncSettingsToggles(); } });
    this.el.toggleSfx.addEventListener('click', () => { if (this.audio) { this.audio.setSfxEnabled(!this.audio.sfxEnabled); this._syncSettingsToggles(); } });
    this._reflectMuteButton(this.audio ? this.audio.muted : false);
    this.syncMenuStats(); this.renderUpgrades();
  }

  onStateChange(state) {
    if (state === 'playing') {
      this.el.menu.classList.add('hidden');
      this.el.gameover.classList.add('hidden');
      this.el.combo.classList.add('hidden');
      this.el.tapHint.classList.remove('hidden');
    } else if (state === 'menu') {
      this.el.gameover.classList.add('hidden');
      this.el.tapHint.classList.add('hidden');
      this.el.menu.classList.remove('hidden');
    } else if (state === 'gameover') {
      this.el.tapHint.classList.add('hidden');
      this.el.combo.classList.add('hidden');
      if (this.el.activePowerupsHud) this.el.activePowerupsHud.classList.add('hidden');
    }
  }

  updateScore(score) { this.el.score.textContent = score; }

  updateCoinsHud(total, coinGain = 0) {
    const prev = this._prevCoinsTotal || 0;
    this.el.coinsHudVal.textContent = total;
    if (total > prev) {
      const icon = this.el.coinsHud?.querySelector('.coinIcon');
      if (icon) { icon.classList.remove('coin-pop'); void icon.offsetWidth; icon.classList.add('coin-pop'); }
      gsap.fromTo(this.el.coinsHudVal, { scale: 1.3, color: '#ffd93d' }, { scale: 1, color: '#fff', duration: 0.3, ease: 'power1.out' });
      if (coinGain >= 3) {
        for (let i = 0; i < Math.min(coinGain, 5); i++) {
          setTimeout(() => { if (this.audio) this.audio.coinLand(i); }, i * 55 + 300);
        }
      }
    }
    this._prevCoinsTotal = total;
  }

  updateCombo(combo) {
    if (combo >= 2) {
      this.el.combo.classList.remove('hidden');
      this.el.comboVal.textContent = combo;
      gsap.fromTo(this.el.combo, { scale: 1.3 }, { scale: 1, duration: 0.2, ease: 'back.out(2)' });
    } else {
      this.el.combo.classList.add('hidden');
    }
  }

  updateCharge(fraction) {
    if (!this.el.chargeBarFill) return;
    this.el.chargeBarFill.style.width = `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;
    if (this.el.chargeBar) this.el.chargeBar.classList.toggle('full', fraction >= 1);
  }

  updateNextPreview(colorIdx) {
    const col = COLORS[colorIdx % COLORS.length];
    const hex = '#' + col.hex.toString(16).padStart(6, '0');
    if (this.el.nextBubblePreview) {
      this.el.nextBubblePreview.style.background = hex;
      this.el.nextBubblePreview.style.boxShadow = `0 0 12px ${hex}`;
    }
  }

  showToast(text, variant) {
    let toastEl = this._toastEl;
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'game-toast';
      document.getElementById('app').appendChild(toastEl);
      this._toastEl = toastEl;
    }
    toastEl.textContent = text;
    toastEl.className = 'game-toast' + (variant ? ` toast-${variant}` : '');
    gsap.killTweensOf(toastEl);
    gsap.fromTo(toastEl, { opacity: 1, y: 0, scale: 1.1 }, { opacity: 0, y: -28, scale: 1, duration: 1.0, ease: 'power1.out' });
  }

  showPowerupChoice(choices, onChoose) {
    this._onChoosePowerup = onChoose;
    if (this.el.powerupWave && this.game) this.el.powerupWave.textContent = this.game.wave;
    this._renderPowerupCards(choices);
    this._syncRerollButton();
    gsap.fromTo(this.el.powerupModal, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    this.el.powerupModal.classList.remove('hidden');
    if (this.el.rerollBtn && !this.el.rerollBtn.dataset.bound) {
      this.el.rerollBtn.dataset.bound = '1';
      this.el.rerollBtn.addEventListener('click', () => {
        if (!this.game) return;
        const result = this.game.tryRerollPowerups();
        if (!result) { gsap.fromTo(this.el.rerollBtn, { x: -4 }, { x: 4, duration: 0.08, repeat: 3, yoyo: true, clearProps: 'x' }); return; }
        if (this.audio) this.audio.powerupOpen();
        this._renderPowerupCards(result.choices); this._syncRerollButton();
      });
    }
  }

  _renderPowerupCards(choices) {
    this.el.powerupList.innerHTML = '';
    choices.forEach(p => {
      const card = document.createElement('div');
      card.className = 'powerup-card';
      card.innerHTML = `<div class="icon">${renderIcon(p.icon, POWERUP_ICON_COLOR, 28)}</div><div class="name">${p.name}</div><div class="desc">${p.desc}</div>`;
      card.addEventListener('click', () => { this.el.powerupModal.classList.add('hidden'); this._onChoosePowerup(p); });
      this.el.powerupList.appendChild(card);
    });
  }

  _syncRerollButton() {
    if (!this.el.rerollBtn || !this.game) return;
    const cost = this.game.rerollCost();
    this.el.rerollCost.textContent = cost;
    this.el.rerollBtn.classList.toggle('disabled', save.coins < cost);
  }

  updateActivePowerups(list) {
    const host = this.el.activePowerupsHud;
    if (!host) return;
    if (!list || list.length === 0) { host.classList.add('hidden'); host.innerHTML = ''; this._apNodes = {}; return; }
    host.classList.remove('hidden');
    this._apNodes = this._apNodes || {};
    const seenIds = new Set(list.map(p => p.id));
    for (const id of Object.keys(this._apNodes)) {
      if (!seenIds.has(id)) { this._apNodes[id].el.remove(); delete this._apNodes[id]; }
    }
    const RADIUS = 15, CIRC = 2 * Math.PI * RADIUS;
    list.forEach(p => {
      let node = this._apNodes[p.id];
      if (!node) {
        const el = document.createElement('div');
        el.className = 'active-powerup'; el.title = p.name;
        el.innerHTML = `<svg class="ap-ring" viewBox="0 0 36 36" width="36" height="36"><circle class="ap-ring-track" cx="18" cy="18" r="${RADIUS}" /><circle class="ap-ring-bar" cx="18" cy="18" r="${RADIUS}" stroke-dasharray="${CIRC}" transform="rotate(-90 18 18)" /></svg><span class="ap-icon">${renderIcon(p.icon, POWERUP_ICON_COLOR, 16)}</span>`;
        host.appendChild(el);
        node = { el, bar: el.querySelector('.ap-ring-bar') };
        this._apNodes[p.id] = node;
      }
      node.bar.style.strokeDashoffset = CIRC * (1 - p.fraction);
      node.bar.classList.toggle('ap-ring-low', p.fraction < 0.25);
    });
  }

  showGameOver({ score, coinsEarned, isNewBest }) {
    this.el.finalScore.textContent = score;
    this.el.coinsEarnedVal.textContent = coinsEarned;
    this.el.newBestBadge.classList.toggle('hidden', !isNewBest);
    this.el.gameover.classList.remove('hidden');
  }

  _reflectMuteButton(muted) {
    if (!this.el.muteBtn) return;
    this.el.muteBtn.classList.toggle('muted', muted);
    this.el.muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
  }

  _syncSettingsToggles() {
    if (!this.audio) return;
    const set = (btn, on) => { btn.classList.toggle('on', on); btn.setAttribute('aria-checked', String(on)); };
    set(this.el.toggleMusic, this.audio.musicEnabled);
    set(this.el.toggleSfx, this.audio.sfxEnabled);
  }

  syncMenuStats() {
    this.el.bestScoreVal.textContent = save.best;
    this.el.coinsMenuVal.textContent = save.coins;
  }

  renderUpgrades() {
    if (this.el.shopCoinsVal) this.el.shopCoinsVal.textContent = save.coins;
    if (!this.el.upgradeList) return;
    this.el.upgradeList.innerHTML = '';
    UPGRADES.forEach(u => {
      const level = upgradeLevel(save, u.id);
      const cost = nextLevelCost(save, u.id);
      const maxed = cost === null;
      const canAfford = !maxed && save.coins >= cost;
      const pips = Array.from({ length: MAX_LEVEL }, (_, i) => `<span class="pip ${i < level ? 'filled' : ''}"></span>`).join('');
      const action = maxed
        ? '<div class="upg-action maxed">MAX</div>'
        : `<button class="upg-action buy ${canAfford ? '' : 'cant-afford'}" data-buy="${u.id}">${renderIcon('coin', COIN_ICON_COLOR, 11)}${cost}</button>`;
      const row = document.createElement('div');
      row.className = 'upgrade-row' + (maxed ? ' maxed' : '');
      row.innerHTML = `<div class="upg-icon">${renderIcon(u.icon, UPGRADE_ICON_COLOR, 24)}</div><div class="upg-body"><div class="upg-head"><span class="upg-name">${u.name}</span><span class="upg-pips">${pips}</span></div><div class="upg-desc">${u.blurb}</div></div>${action}`;
      const btn = row.querySelector('[data-buy]');
      if (btn) btn.addEventListener('click', () => this.onBuyUpgrade(u, btn));
      this.el.upgradeList.appendChild(row);
    });
  }

  onBuyUpgrade(u, btn) {
    const cost = nextLevelCost(save, u.id);
    if (cost === null) return;
    if (save.coins >= cost) {
      save.coins -= cost;
      save.upgrades[u.id] = upgradeLevel(save, u.id) + 1;
      commitSave(); this.syncMenuStats(); this.renderUpgrades();
    } else {
      gsap.fromTo(btn, { x: -4 }, { x: 4, duration: 0.08, repeat: 3, yoyo: true, clearProps: 'x' });
    }
  }
}
