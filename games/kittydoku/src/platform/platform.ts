import type { ArkadiumGameSdk } from '@arkadiuminc/sdk/dist/pkg/arkadium-game-sdk';

/**
 * Everything the game needs from the site hosting it. In the Arkadium Arena
 * this is backed by the Arkadium Game SDK; anywhere else (local dev, a plain
 * page) a local stand-in keeps the game fully playable.
 */
export interface Platform {
  readonly name: 'arkadium' | 'local';
  /** Game is loaded and can be shown (removes the Arena loading overlay). */
  ready(): void;
  /** First real play this page load (sent once). */
  gameStart(): void;
  levelStart(level: number): void;
  levelEnd(level: number): void;
  score(value: number): void;
  /** No more content / session over (sent once). */
  gameEnd(): void;
  onPause(cb: () => void): void;
  onResume(cb: () => void): void;
  load(key: string): Promise<string | null>;
  save(key: string, value: string): Promise<void>;
  /** Plays a rewarded video. Resolves true only if the reward was earned. */
  showRewardAd(): Promise<boolean>;
  /** Plays an interstitial video; resolves when control is back with the game. */
  showInterstitialAd(): Promise<void>;
  /** Arkadium subscribers play ad-free: rewards are granted without a video. */
  isSubscriber(): Promise<boolean>;
}

export const GAME_VERSION = '2.0.0';

// ---------------------------------------------------------------- Arkadium

/** Arkadium wraps every SDK call so an SDK hiccup can never break the game. */
function arkadium(sdk: ArkadiumGameSdk): Platform {
  const safe = (fn: () => unknown) => {
    try {
      const r = fn();
      if (r instanceof Promise) r.catch((e) => console.warn('[kittydoku] sdk', e));
    } catch (e) {
      console.warn('[kittydoku] sdk', e);
    }
  };
  let started = false;
  let ended = false;
  let authorized: Promise<boolean> | null = null;
  const isAuthorized = () =>
    (authorized ??= sdk.auth.isUserAuthorized().catch(() => false));

  return {
    name: 'arkadium',
    ready: () => safe(() => sdk.lifecycle.onTestReady()),
    gameStart: () => {
      if (started) return;
      started = true;
      safe(() => sdk.lifecycle.onGameStart());
    },
    levelStart: (n) => safe(() => sdk.lifecycle.onLevelStart(n)),
    levelEnd: (n) => safe(() => sdk.lifecycle.onLevelEnd(n)),
    score: (v) => safe(() => sdk.lifecycle.onChangeScore(v)),
    gameEnd: () => {
      if (ended) return;
      ended = true;
      safe(() => sdk.lifecycle.onGameEnd());
    },
    onPause: (cb) =>
      safe(() => sdk.lifecycle.registerEventCallback(sdk.lifecycle.LifecycleEvent.GAME_PAUSE, cb)),
    onResume: (cb) =>
      safe(() => sdk.lifecycle.registerEventCallback(sdk.lifecycle.LifecycleEvent.GAME_RESUME, cb)),

    // Signed-in players get their progress on every device (remote storage);
    // everyone else keeps it in the Arena's local storage.
    async load(key) {
      if (await isAuthorized()) {
        try {
          const remote = await sdk.persistence.getRemoteStorageItem(key);
          if (remote !== null && remote !== undefined) {
            return typeof remote === 'string' ? remote : JSON.stringify(remote);
          }
        } catch {
          /* fall back to local */
        }
      }
      return sdk.persistence.getLocalStorageItem(key);
    },
    async save(key, value) {
      await sdk.persistence.setLocalStorageItem(key, value);
      if (await isAuthorized()) {
        await sdk.persistence.setRemoteStorageItem(key, value).catch(() => undefined);
      }
    },

    async showRewardAd() {
      try {
        if (!sdk.ads.showRewardAd) return false;
        const res = await sdk.ads.showRewardAd({});
        return res?.value === 1;
      } catch {
        return false;
      }
    },
    async showInterstitialAd() {
      try {
        if (sdk.ads.showInterstitialAd) await sdk.ads.showInterstitialAd({});
      } catch {
        /* no ad available: just carry on */
      }
    },
    async isSubscriber() {
      try {
        if (!(await isAuthorized())) return false;
        const profile = await sdk.auth.getUserProfile();
        return !!profile?.isUserSubscriber;
      } catch {
        return false;
      }
    },
  };
}

// ---------------------------------------------------------------- local

/** Outside the Arena: browser storage, and a pretend ad that always rewards
 *  after a short wait so the ad flows can be tested. */
function local(): Platform {
  const noop = () => undefined;
  return {
    name: 'local',
    ready: noop,
    gameStart: noop,
    levelStart: noop,
    levelEnd: noop,
    score: noop,
    gameEnd: noop,
    onPause: noop,
    onResume: noop,
    async load(key) {
      try { return localStorage.getItem(key); } catch { return null; }
    },
    async save(key, value) {
      try { localStorage.setItem(key, value); } catch { /* ignore */ }
    },
    async showRewardAd() {
      console.info('[kittydoku] local build: simulating a rewarded ad');
      await new Promise((r) => setTimeout(r, 1200));
      return true;
    },
    async showInterstitialAd() {
      console.info('[kittydoku] local build: simulating an interstitial ad');
      await new Promise((r) => setTimeout(r, 800));
    },
    isSubscriber: async () => false,
  };
}

// ---------------------------------------------------------------- pick one

const SDK_TIMEOUT_MS = 8000;

/**
 * The Arena (and the Arkadium Sandbox) always run the game inside an iframe,
 * so a top-level page skips the SDK entirely. Inside a frame we try the SDK
 * and fall back to local if it doesn't answer in time.
 */
export async function createPlatform(): Promise<Platform> {
  const framed = window.self !== window.top;
  const forced = new URLSearchParams(location.search).get('platform');
  if (forced === 'local' || (!framed && forced !== 'arkadium')) return local();

  try {
    const { getInstance } = await import('@arkadiuminc/sdk');
    const sdk = await Promise.race([
      getInstance(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('sdk timeout')), SDK_TIMEOUT_MS)),
    ]);
    if (new URLSearchParams(location.search).has('debug')) sdk.debugMode(true);
    return arkadium(sdk as unknown as ArkadiumGameSdk);
  } catch (e) {
    console.warn('[kittydoku] Arkadium SDK unavailable, running locally', e);
    return local();
  }
}
