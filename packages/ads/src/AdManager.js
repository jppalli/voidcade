// Thin orchestration layer on top of an AdProvider: adds frequency capping
// for interstitials (so games can call "maybe show an ad" freely without
// hand-rolling cooldown logic) and centralizes analytics-friendly hooks.
// Games should talk to an AdManager instance, not the provider directly.

const DEFAULT_INTERSTITIAL_COOLDOWN_MS = 60_000; // don't show more than 1/min
const DEFAULT_MIN_ACTIONS_BETWEEN_INTERSTITIALS = 2; // e.g. 2 game-overs

export class AdManager {
  constructor(provider, options = {}) {
    this.provider = provider;
    this.interstitialCooldownMs = options.interstitialCooldownMs ?? DEFAULT_INTERSTITIAL_COOLDOWN_MS;
    this.minActionsBetweenInterstitials = options.minActionsBetweenInterstitials ?? DEFAULT_MIN_ACTIONS_BETWEEN_INTERSTITIALS;
    this._lastInterstitialAt = 0;
    this._actionsSinceInterstitial = 0;
    this._onEvent = options.onEvent || (() => {});
  }

  async init(config) {
    await this.provider.init(config);
    this._onEvent({ type: 'ads_init' });
  }

  showBanner(containerEl, opts) {
    const handle = this.provider.showBanner(containerEl, opts);
    this._onEvent({ type: 'banner_shown' });
    return handle;
  }

  /** Call this once per natural "break point" in the game (e.g. after a
   *  run ends). Internally decides whether enough time/actions have passed
   *  to actually show an interstitial, and no-ops otherwise. Returns
   *  { shown: boolean } either way so callers don't need their own branching. */
  async maybeShowInterstitial(opts) {
    this._actionsSinceInterstitial++;
    const now = Date.now();
    const cooledDown = now - this._lastInterstitialAt >= this.interstitialCooldownMs;
    const enoughActions = this._actionsSinceInterstitial >= this.minActionsBetweenInterstitials;

    if (!cooledDown || !enoughActions) {
      return { shown: false };
    }

    const result = await this.provider.showInterstitial(opts);
    if (result.shown) {
      this._lastInterstitialAt = now;
      this._actionsSinceInterstitial = 0;
      this._onEvent({ type: 'interstitial_shown' });
    }
    return result;
  }

  /** Rewarded ads are opt-in (player taps "watch ad") so no frequency cap -
   *  the player is explicitly asking for one. Resolves { completed }. */
  async showRewarded(opts) {
    this._onEvent({ type: 'rewarded_requested' });
    const result = await this.provider.showRewarded(opts);
    this._onEvent({ type: result.completed ? 'rewarded_completed' : 'rewarded_skipped' });
    return result;
  }

  isRewardedReady() {
    return this.provider.isRewardedReady();
  }
}
