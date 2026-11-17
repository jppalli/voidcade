import { CONFIG } from '../config';

/**
 * Platform layer: the Arkadium game SDK when the host page provides it, otherwise a mock.
 * It also records telemetry events and decides when an interstitial ad may show.
 */

interface ArkadiumSdk {
  analytics?: { track?: (name: string, props: Record<string, unknown>) => void };
  lifecycle?: { onTestReady?: () => void; onGameStart?: () => void; onGameEnd?: () => void };
  ads?: {
    showRewardAd?: () => Promise<{ value: boolean }>;
    showMidrollAd?: () => Promise<unknown>;
  };
}

export interface TelemetryEvent {
  t: number;
  name: string;
  props: Record<string, unknown>;
}

export type AdKind = 'rewarded' | 'interstitial';

const sdk = (globalThis as { ArkadiumGameSdk?: ArkadiumSdk }).ArkadiumGameSdk;

let lastInterstitialAt = 0;
let lastRewardedAt = -1_000_000_000_000;
/** Accumulated gameplay time, so a brand-new session is not interrupted by an ad straight away. */
let playTimeMs = 0;
let playStartedAt = 0;

export const telemetryLog: TelemetryEvent[] = [];
const telemetryListeners = new Set<(event: TelemetryEvent) => void>();
let adPresenter: ((kind: AdKind) => Promise<boolean>) | null = null;
let muteHook: ((muted: boolean) => void) | null = null;

/** ?plus=1 simulates an Arkadium Plus member: no interstitials. */
const isPlusMember = () => /[?&]plus=1/.test(location.search);
const isMockSdk = !sdk;

export const platform = {
  setAdPresenter(presenter: (kind: AdKind) => Promise<boolean>) {
    adPresenter = presenter;
  },
  setMuteHook(hook: (muted: boolean) => void) {
    muteHook = hook;
  },
  onTelemetry(listener: (event: TelemetryEvent) => void) {
    telemetryListeners.add(listener);
    return () => telemetryListeners.delete(listener);
  },
  track(name: string, props: Record<string, unknown> = {}) {
    const event: TelemetryEvent = { t: Date.now(), name, props };
    telemetryLog.push(event);
    if (telemetryLog.length > 300) telemetryLog.shift();
    telemetryListeners.forEach((listener) => listener(event));
    sdk?.analytics?.track?.(name, props);
    if (/[?&]debug=1/.test(location.search)) console.info('[telemetry]', name, props);
  },
  gameReady() {
    sdk?.lifecycle?.onTestReady?.();
    this.track('game_ready', { mock: isMockSdk });
  },
  gameplayStart() {
    playStartedAt = performance.now();
    sdk?.lifecycle?.onGameStart?.();
  },
  gameplayStop() {
    if (playStartedAt) playTimeMs += performance.now() - playStartedAt;
    playStartedAt = 0;
    sdk?.lifecycle?.onGameEnd?.();
  },
  /** Plays a rewarded video. Resolves true if the player earned the reward. */
  async rewarded(placement: string): Promise<boolean> {
    this.track('ad_rewarded_request', { placement });
    muteHook?.(true);
    let earned = false;
    try {
      if (sdk?.ads?.showRewardAd) earned = (await sdk.ads.showRewardAd()).value;
      else if (adPresenter) earned = await adPresenter('rewarded');
    } catch {
      earned = false;
    }
    muteHook?.(false);
    if (earned) lastRewardedAt = Date.now();
    this.track(earned ? 'ad_rewarded_complete' : 'ad_rewarded_fail', { placement });
    return earned;
  },
  /** Shows a between-levels ad if the rules allow it (cooldown, grace after a rewarded ad, early levels, Plus members). */
  async interstitial(placement: string, levelNumber: number): Promise<void> {
    const now = Date.now();
    const playSeconds = (playTimeMs + (playStartedAt ? performance.now() - playStartedAt : 0)) / 1000;
    if (isPlusMember()) return;
    if (levelNumber > 0 && levelNumber < CONFIG.noInterstitialBeforeLevel) return;
    if (now - lastRewardedAt < CONFIG.rewardedGraceSec * 1000) return;
    if (lastInterstitialAt && (now - lastInterstitialAt) / 1000 < CONFIG.interstitialCooldownSec) return;
    if (!lastInterstitialAt && playSeconds < CONFIG.interstitialCooldownSec) return;
    lastInterstitialAt = now;
    this.track('ad_interstitial', { placement });
    muteHook?.(true);
    try {
      if (sdk?.ads?.showMidrollAd) await sdk.ads.showMidrollAd();
      else if (adPresenter) await adPresenter('interstitial');
    } finally {
      muteHook?.(false);
    }
  },
};
