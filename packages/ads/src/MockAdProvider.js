// Local/dev ad provider. Simulates banner, interstitial, and rewarded-video
// flows with real on-screen UI and timing, so the full ad experience (and
// game code that reacts to it) can be built and tested without any real ad
// network account. Swap for a real provider by implementing AdProvider's
// interface and passing it to installAds() instead of this class.
import { AdProvider } from './AdProvider.js';

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function injectStylesOnce() {
  if (document.getElementById('arcade-ads-mock-style')) return;
  const style = document.createElement('style');
  style.id = 'arcade-ads-mock-style';
  style.textContent = `
    .ad-mock-banner {
      display: flex; align-items: center; justify-content: center;
      width: 100%; min-height: 50px; background: repeating-linear-gradient(
        135deg, #1a1a28, #1a1a28 10px, #20202f 10px, #20202f 20px);
      border: 1px dashed rgba(255,255,255,0.15); border-radius: 8px;
      color: #7d7d95; font: 700 11px 'Segoe UI', Arial, sans-serif;
      letter-spacing: 1px; text-transform: uppercase;
    }
    .ad-mock-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: #05050a;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      color: #fff; font-family: 'Segoe UI', Arial, sans-serif;
    }
    .ad-mock-overlay .ad-mock-panel {
      width: min(360px, 86vw); text-align: center;
      border: 1px solid rgba(255,255,255,0.1); border-radius: 20px;
      padding: 36px 24px; background: radial-gradient(circle at 50% 20%, rgba(255,255,255,0.06), transparent 60%), #0d0d17;
    }
    .ad-mock-tag {
      font-size: 11px; font-weight: 800; letter-spacing: 2px; color: #7d7d95;
      text-transform: uppercase; margin-bottom: 14px;
    }
    .ad-mock-icon {
      width: 64px; height: 64px; border-radius: 16px; margin: 0 auto 18px;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #ff6b6b, #ff9f43);
      font-size: 28px; font-weight: 900;
    }
    .ad-mock-title { font-size: 18px; font-weight: 800; margin-bottom: 8px; }
    .ad-mock-sub { font-size: 12px; color: #9a9ab0; margin-bottom: 24px; line-height: 1.4; }
    .ad-mock-ring-wrap { position: relative; width: 72px; height: 72px; margin: 0 auto 20px; }
    .ad-mock-ring-wrap svg { width: 72px; height: 72px; }
    .ad-mock-ring-track { fill: none; stroke: rgba(255,255,255,0.1); stroke-width: 4; }
    .ad-mock-ring-bar { fill: none; stroke: #ffd93d; stroke-width: 4; stroke-linecap: round;
      transition: stroke-dashoffset 0.2s linear; }
    .ad-mock-ring-num {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; font-weight: 800;
    }
    .ad-mock-btn {
      border: none; border-radius: 24px; font-weight: 800; letter-spacing: 0.5px;
      font-size: 13px; padding: 12px 28px; cursor: pointer;
    }
    .ad-mock-btn.primary { background: linear-gradient(135deg, #ff6b6b, #ff9f43); color: #fff; }
    .ad-mock-btn.ghost { background: rgba(255,255,255,0.08); color: #9a9ab0; margin-top: 10px; }
    .ad-mock-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  `;
  document.head.appendChild(style);
}

export class MockAdProvider extends AdProvider {
  constructor() {
    super();
    this._ready = true;
    this._banners = new Set();
  }

  async init(_config) {
    injectStylesOnce();
    this._ready = true;
  }

  showBanner(containerEl, opts = {}) {
    injectStylesOnce();
    containerEl.innerHTML = '';
    const banner = el('div', 'ad-mock-banner', opts.label || 'Ad space · 728×90');
    containerEl.appendChild(banner);
    this._banners.add(banner);
    return {
      destroy() {
        banner.remove();
      },
    };
  }

  async showInterstitial(opts = {}) {
    // Interstitials count as "shown" whether the viewer waits it out or
    // skips early - being displayed is the whole point, there's no reward
    // riding on completion.
    await this._showOverlay({
      tag: 'INTERSTITIAL AD',
      title: opts.title || 'A quick word from our sponsor',
      sub: 'Simulated interstitial - closes automatically.',
      seconds: 3,
      skippableAfter: 2,
    });
    return { shown: true };
  }

  async showRewarded(opts = {}) {
    // Rewarded ads only grant the reward if fully completed (not skipped).
    const { finishedNaturally } = await this._showOverlay({
      tag: 'REWARDED AD',
      title: opts.title || 'Watch to earn your reward',
      sub: opts.rewardLabel || 'Simulated rewarded video.',
      seconds: 5,
      skippableAfter: null, // not skippable - must finish for the reward
    });
    return { completed: finishedNaturally };
  }

  isRewardedReady() {
    return this._ready;
  }

  // ---------------------------------------------------------
  /** Shows the simulated ad overlay. Resolves { finishedNaturally: boolean }
   *  - true if the countdown ran out (viewer watched/waited), false if
   *  closed early via the skip button. */
  _showOverlay({ tag, title, sub, seconds, skippableAfter }) {
    injectStylesOnce();
    return new Promise((resolve) => {
      const RADIUS = 32;
      const CIRC = 2 * Math.PI * RADIUS;

      const overlay = el('div', 'ad-mock-overlay');
      overlay.innerHTML = `
        <div class="ad-mock-panel">
          <div class="ad-mock-tag">${tag}</div>
          <div class="ad-mock-ring-wrap">
            <svg viewBox="0 0 72 72">
              <circle class="ad-mock-ring-track" cx="36" cy="36" r="${RADIUS}" />
              <circle class="ad-mock-ring-bar" cx="36" cy="36" r="${RADIUS}"
                stroke-dasharray="${CIRC}" stroke-dashoffset="0"
                transform="rotate(-90 36 36)" />
            </svg>
            <div class="ad-mock-ring-num">${seconds}</div>
          </div>
          <div class="ad-mock-title">${title}</div>
          <div class="ad-mock-sub">${sub}</div>
          <button class="ad-mock-btn primary" data-action="close" disabled>Continue</button>
          ${skippableAfter != null ? '<div><button class="ad-mock-btn ghost" data-action="skip" disabled>Skip ad</button></div>' : ''}
        </div>
      `;
      document.body.appendChild(overlay);

      const ringBar = overlay.querySelector('.ad-mock-ring-bar');
      const ringNum = overlay.querySelector('.ad-mock-ring-num');
      const closeBtn = overlay.querySelector('[data-action="close"]');
      const skipBtn = overlay.querySelector('[data-action="skip"]');

      let elapsed = 0;
      let finished = false;
      const tick = 100;
      const timer = setInterval(() => {
        elapsed += tick / 1000;
        const remaining = Math.max(0, seconds - elapsed);
        const frac = 1 - remaining / seconds;
        ringBar.style.strokeDashoffset = String(CIRC * (1 - frac));
        ringNum.textContent = String(Math.ceil(remaining));

        if (skippableAfter != null && elapsed >= skippableAfter && skipBtn) {
          skipBtn.disabled = false;
        }
        if (elapsed >= seconds && !finished) {
          finished = true;
          clearInterval(timer);
          ringNum.textContent = '✓';
          closeBtn.disabled = false;
          closeBtn.textContent = 'Continue';
        }
      }, tick);

      function finish(finishedNaturally) {
        clearInterval(timer);
        overlay.remove();
        resolve({ finishedNaturally });
      }

      closeBtn.addEventListener('click', () => {
        if (!finished) return;
        finish(true);
      });
      if (skipBtn) {
        skipBtn.addEventListener('click', () => {
          if (skipBtn.disabled) return;
          finish(false);
        });
      }
    });
  }
}
