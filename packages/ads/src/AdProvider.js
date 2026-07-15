// Contract every ad provider must implement. This is the ONLY surface games
// and the site shell talk to - swapping mock -> real (AdSense/AdMob/etc.)
// means writing a new class that satisfies this interface, nothing else
// changes. Keep this file dependency-free.
//
// All methods that show an ad return a Promise that resolves with a result
// object once the ad flow is fully done (closed, skipped, or failed) so
// callers can safely resume the game loop / grant rewards.

export class AdProvider {
  /** Call once, before any ad is requested. May be async (SDK script load). */
  async init(_config) {
    throw new Error('AdProvider.init() not implemented');
  }

  /** Render a persistent banner into `containerEl`. Returns a handle with
   *  a .destroy() method to remove it. Should be safe to call multiple
   *  times (replacing any existing banner in that container). */
  showBanner(_containerEl, _opts) {
    throw new Error('AdProvider.showBanner() not implemented');
  }

  /** Show a full-screen interstitial (e.g. between runs / on retry).
   *  Resolves { shown: boolean } - false if no ad was available/ready. */
  async showInterstitial(_opts) {
    throw new Error('AdProvider.showInterstitial() not implemented');
  }

  /** Show a rewarded video ad. Resolves { completed: boolean } - true only
   *  if the viewer watched it through and the reward should be granted.
   *  Must NEVER resolve completed:true unless the ad genuinely finished -
   *  this return value directly gates in-game rewards. */
  async showRewarded(_opts) {
    throw new Error('AdProvider.showRewarded() not implemented');
  }

  /** Whether a rewarded ad is currently ready to show (lets games hide/show
   *  the "Watch ad" button appropriately instead of it failing silently). */
  isRewardedReady() {
    return false;
  }
}
