import gsap from 'gsap';
import { save, commitSave } from './save.js';
import { UPGRADES, upgradeLevel, nextLevelCost, MAX_LEVEL } from './upgrades.js';
import { renderIcon } from './icons.js';

const UPGRADE_ICON_COLOR = '#7dd8ff'; // cyan neon, matches pre-run menu accent
const POWERUP_ICON_COLOR = '#ffd93d'; // gold neon, matches in-run overlay accent
const COIN_ICON_COLOR = '#ffd93d';

export class UI {
  constructor(audio) {
    this.audio = audio || null;
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
      shieldsHud: document.getElementById('shieldsHud'),
      activePowerupsHud: document.getElementById('activePowerupsHud'),
      powerupModal: document.getElementById('powerupModal'),
      powerupList: document.getElementById('powerupList'),
      powerupFloor: document.getElementById('powerupFloor'),
      rerollBtn: document.getElementById('rerollBtn'),
      rerollCost: document.getElementById('rerollCost'),
      playBtn: document.getElementById('playBtn'),
      finalScore: document.getElementById('finalScore'),
      newBestBadge: document.getElementById('newBestBadge'),
      coinsEarnedVal: document.getElementById('coinsEarnedVal'),
      retryBtn: document.getElementById('retryBtn'),
      menuBtn: document.getElementById('menuBtn'),
      tapHint: document.getElementById('tapHint'),
      muteBtn: document.getElementById('muteBtn'),
      settingsBtn: document.getElementById('settingsBtn'),
      settingsModal: document.getElementById('settingsModal'),
      closeSettingsBtn: document.getElementById('closeSettingsBtn'),
      toggleMusic: document.getElementById('toggleMusic'),
      toggleSfx: document.getElementById('toggleSfx'),
    };
    this.game = null; // set via attachGame

    // Fill every static coin icon slot with the neon coin glyph once.
    document.querySelectorAll('[data-coin-icon]').forEach((el) => {
      el.innerHTML = renderIcon('coin', COIN_ICON_COLOR, 15);
    });
  }

  attachGame(game) {
    this.game = game;
    this.el.playBtn.addEventListener('click', () => game.startRun());
    this.el.retryBtn.addEventListener('click', () => game.startRun());
    this.el.menuBtn.addEventListener('click', () => {
      game.goToMenu();
      this.syncMenuStats();
      this.renderUpgrades();
    });
    this.el.shopBtn.addEventListener('click', () => {
      this.renderUpgrades();
      this.el.shopModal.classList.remove('hidden');
    });
    this.el.closeShopBtn.addEventListener('click', () => {
      this.el.shopModal.classList.add('hidden');
    });
    if (this.el.muteBtn) {
      this.el.muteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const muted = this.audio ? this.audio.toggleMute() : false;
        this._reflectMuteButton(muted);
      });
    }

    // Settings modal
    this.el.settingsBtn.addEventListener('click', () => {
      this._syncSettingsToggles();
      this.el.settingsModal.classList.remove('hidden');
    });
    this.el.closeSettingsBtn.addEventListener('click', () => {
      this.el.settingsModal.classList.add('hidden');
    });
    this.el.toggleMusic.addEventListener('click', () => {
      if (!this.audio) return;
      this.audio.setMusicEnabled(!this.audio.musicEnabled);
      this._syncSettingsToggles();
    });
    this.el.toggleSfx.addEventListener('click', () => {
      if (!this.audio) return;
      this.audio.setSfxEnabled(!this.audio.sfxEnabled);
      this._syncSettingsToggles();
    });

    // Reflect any persisted mute state on the quick-toggle button.
    this._reflectMuteButton(this.audio ? this.audio.muted : false);

    this.syncMenuStats();
    this.renderUpgrades();
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
      this.el.shieldsHud.classList.add('hidden');
      if (this.el.activePowerupsHud) this.el.activePowerupsHud.classList.add('hidden');
    }
  }

  updateScore(score) {
    this.el.score.textContent = score;
  }

  updateCoinsHud(total, coinGain = 0, sourceBlock = null) {
    const prev = this._prevCoinsTotal || 0;
    this.el.coinsHudVal.textContent = total;
    if (total > prev) {
      const icon = this.el.coinsHud && this.el.coinsHud.querySelector('.coinIcon');
      if (icon) {
        icon.classList.remove('coin-pop');
        void icon.offsetWidth;
        icon.classList.add('coin-pop');
      }
      gsap.fromTo(this.el.coinsHudVal, { scale: 1.3, color: '#ffd93d' }, { scale: 1, color: '#ffffff', duration: 0.3, ease: 'power1.out' });

      // Fly coin tokens from the tower to the HUD counter.
      // Only fire when the caller provides the source block so we know where
      // to start the arc; skip on quiet 1-coin drops to avoid spam.
      if (sourceBlock && coinGain >= 2) {
        this._spawnCoinFly(sourceBlock, coinGain);
      }
    }
    this._prevCoinsTotal = total;
  }

  /** Spawn `count` (capped at 5) small DOM coin tokens that arc from the
   *  top of the newly placed block up to the coins HUD counter. */
  _spawnCoinFly(block, count) {
    const canvas = document.getElementById('canvasHost');
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    const hudRect = this.el.coinsHud.getBoundingClientRect();

    const game = this.game;
    if (!game) return;
    const scale = game.world.scale.x;
    const worldOffsetY = game.world.y;
    const worldOffsetX = game.world.x;

    const blockCenterX = canvasRect.left + (block.x + block.blockW / 2) * scale + worldOffsetX;
    const blockTopY    = canvasRect.top  + (block.y - 40) * scale + worldOffsetY;

    const destX = hudRect.left + hudRect.width / 2;
    const destY = hudRect.top  + hudRect.height / 2;

    const n = Math.min(count, 5);
    for (let i = 0; i < n; i++) {
      const el = document.createElement('span');
      el.innerHTML = renderIcon('coin', '#ffd93d', 14);
      el.style.cssText = `
        position:fixed; pointer-events:none; z-index:9999;
        left:${blockCenterX - 7}px; top:${blockTopY - 7}px;
        transform:translate(0,0) scale(1); opacity:1;
      `;
      document.body.appendChild(el);

      const delay = i * 55;
      const scatter = (Math.random() - 0.5) * 30;
      const coinIndex = i; // capture for closure

      gsap.to(el, {
        left: destX - 7 + scatter * 0.3,
        top:  destY - 7,
        scale: 0.6,
        opacity: 0,
        duration: 0.55,
        delay: delay / 1000,
        ease: 'power2.in',
        onComplete: () => {
          el.remove();
          // Play a landing ping for each coin as it arrives, slightly higher
          // pitched per coin so multiple arrivals sound like ascending chimes.
          if (this.audio) this.audio.coinLand(coinIndex);
        },
      });
    }
  }

  updateShields(count) {
    if (count > 0) {
      this.el.shieldsHud.classList.remove('hidden');
      // Icon + count badge, same visual pattern as the active powerup rings
      this.el.shieldsHud.innerHTML =
        `${renderIcon('shield', '#7dffd4', 18)}<span class="shield-count">${count}</span>`;
    } else {
      this.el.shieldsHud.classList.add('hidden');
    }
  }

  updateCombo(combo) {
    if (combo >= 2) {
      this.el.combo.classList.remove('hidden');
      this.el.comboVal.textContent = combo;
      gsap.fromTo(this.el.combo, { scale: 1.25 }, { scale: 1, duration: 0.18, ease: 'back.out(2)' });
    } else {
      this.el.combo.classList.add('hidden');
    }
  }

  showToast(text, variant) {
    // Lightweight DOM toast reusing the tap hint area for now; fades via gsap.
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
    gsap.fromTo(toastEl,
      { opacity: 1, y: 0, scale: variant === 'perfect' ? 1.3 : 1 },
      { opacity: 0, y: -30, scale: 1, duration: variant === 'perfect' ? 0.9 : 1.1, ease: 'power1.out' });
  }

  showPowerupChoice(choices, onChoose) {
    this._onChoosePowerup = onChoose;
    this.el.powerupFloor.textContent = this.game ? this.game.floors : '';
    this._renderPowerupCards(choices);
    this._syncRerollButton();
    gsap.fromTo(this.el.powerupModal, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    this.el.powerupModal.classList.remove('hidden');

    if (this.el.rerollBtn && !this.el.rerollBtn.dataset.bound) {
      this.el.rerollBtn.dataset.bound = '1';
      this.el.rerollBtn.addEventListener('click', () => {
        if (!this.game) return;
        const result = this.game.tryRerollPowerups();
        if (!result) {
          gsap.fromTo(this.el.rerollBtn, { x: -4 }, { x: 4, duration: 0.08, repeat: 3, yoyo: true, clearProps: 'x' });
          return;
        }
        if (this.audio) this.audio.powerupOpen();
        this._renderPowerupCards(result.choices);
        this._syncRerollButton();
      });
    }
  }

  _renderPowerupCards(choices) {
    this.el.powerupList.innerHTML = '';
    choices.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'powerup-card';
      card.innerHTML = `
        <div class="icon">${renderIcon(p.icon, POWERUP_ICON_COLOR, 28)}</div>
        <div class="name">${p.name}</div>
        <div class="desc">${p.desc}</div>
      `;
      card.addEventListener('click', () => {
        this.el.powerupModal.classList.add('hidden');
        this._onChoosePowerup(p);
      });
      this.el.powerupList.appendChild(card);
    });
  }

  _syncRerollButton() {
    if (!this.el.rerollBtn || !this.game) return;
    const cost = this.game.rerollCost();
    this.el.rerollCost.textContent = cost;
    this.el.rerollBtn.classList.toggle('disabled', save.coins < cost);
  }

  /** Active in-run powerups shown as a HUD strip, each with a depleting
   *  circular ring (SVG stroke-dashoffset) showing time remaining. Called
   *  every frame, so DOM nodes are created once per id and only their ring
   *  offset / seconds text are patched afterward - no innerHTML churn. */
  updateActivePowerups(list) {
    const host = this.el.activePowerupsHud;
    if (!host) return;
    if (!list || list.length === 0) {
      host.classList.add('hidden');
      host.innerHTML = '';
      this._apNodes = {};
      return;
    }
    host.classList.remove('hidden');
    this._apNodes = this._apNodes || {};

    const seenIds = new Set(list.map((p) => p.id));
    // Remove nodes for powerups that are no longer active.
    for (const id of Object.keys(this._apNodes)) {
      if (!seenIds.has(id)) {
        this._apNodes[id].el.remove();
        delete this._apNodes[id];
      }
    }

    const RADIUS = 15;
    const CIRC = 2 * Math.PI * RADIUS;

    list.forEach((p) => {
      let node = this._apNodes[p.id];
      if (!node) {
        const el = document.createElement('div');
        el.className = 'active-powerup';
        el.title = p.name;
        el.innerHTML = `
          <svg class="ap-ring" viewBox="0 0 36 36" width="36" height="36">
            <circle class="ap-ring-track" cx="18" cy="18" r="${RADIUS}" />
            <circle class="ap-ring-bar" cx="18" cy="18" r="${RADIUS}"
              stroke-dasharray="${CIRC}" transform="rotate(-90 18 18)" />
          </svg>
          <span class="ap-icon">${renderIcon(p.icon, POWERUP_ICON_COLOR, 16)}</span>
        `;
        host.appendChild(el);
        node = { el, bar: el.querySelector('.ap-ring-bar') };
        this._apNodes[p.id] = node;
      }
      const offset = CIRC * (1 - p.fraction);
      node.bar.style.strokeDashoffset = offset;
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
    const setToggle = (btn, on) => {
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-checked', on ? 'true' : 'false');
    };
    setToggle(this.el.toggleMusic, this.audio.musicEnabled);
    setToggle(this.el.toggleSfx, this.audio.sfxEnabled);
  }

  syncMenuStats() {
    this.el.bestScoreVal.textContent = save.best;
    this.el.coinsMenuVal.textContent = save.coins;
  }

  /** The upgrade shop: 5 compact rows, each with level pips and a single
   *  UPGRADE button (cost of the next level, or MAX). Everything is a
   *  permanent, always-on coin purchase - no equipping or consuming. */
  renderUpgrades() {
    if (this.el.shopCoinsVal) this.el.shopCoinsVal.textContent = save.coins;
    if (!this.el.upgradeList) return;

    this.el.upgradeList.innerHTML = '';
    UPGRADES.forEach((u) => {
      const level = upgradeLevel(save, u.id);
      const cost = nextLevelCost(save, u.id);
      const maxed = cost === null;
      const canAfford = !maxed && save.coins >= cost;

      const pips = Array.from({ length: MAX_LEVEL }, (_, i) =>
        `<span class="pip ${i < level ? 'filled' : ''}"></span>`).join('');

      const action = maxed
        ? '<div class="upg-action maxed">MAX</div>'
        : `<button class="upg-action buy ${canAfford ? '' : 'cant-afford'}" data-buy="${u.id}">
             ${renderIcon('coin', COIN_ICON_COLOR, 11)}${cost}
           </button>`;

      const row = document.createElement('div');
      row.className = 'upgrade-row' + (maxed ? ' maxed' : '');
      row.innerHTML = `
        <div class="upg-icon">${renderIcon(u.icon, UPGRADE_ICON_COLOR, 24)}</div>
        <div class="upg-body">
          <div class="upg-head">
            <span class="upg-name">${u.name}</span>
            <span class="upg-pips">${pips}</span>
          </div>
          <div class="upg-desc">${u.blurb}</div>
        </div>
        ${action}
      `;

      const buyBtn = row.querySelector('[data-buy]');
      if (buyBtn) buyBtn.addEventListener('click', () => this.onBuyUpgrade(u, buyBtn));
      this.el.upgradeList.appendChild(row);
    });
  }

  onBuyUpgrade(u, buyBtn) {
    const cost = nextLevelCost(save, u.id);
    if (cost === null) return; // already maxed
    if (save.coins >= cost) {
      save.coins -= cost;
      save.upgrades[u.id] = upgradeLevel(save, u.id) + 1;
      commitSave();
      this.syncMenuStats();
      this.renderUpgrades();
    } else {
      gsap.fromTo(buyBtn, { x: -4 }, { x: 4, duration: 0.08, repeat: 3, yoyo: true, clearProps: 'x' });
    }
  }
}
