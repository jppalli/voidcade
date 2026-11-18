import { economy } from "../content/economy.js";

/** Implement this interface for a publisher SDK. No vendor calls belong in game rules. */
export interface PlatformAdapter {
  ready?(): void;
  gameplayStart?(): void;
  gameplayStop?(): void;
  track?(event: string, properties: Record<string, unknown>): void;
  rewarded?(placement: string): Promise<boolean>;
  interstitial?(placement: string): Promise<void>;
  isSubscriber?(): boolean;
}
export interface TelemetryEvent {
  t: number;
  name: string;
  props: Record<string, unknown>;
}
export const telemetry: TelemetryEvent[] = [];
const listeners = new Set<(event: TelemetryEvent) => void>();
let adapter: PlatformAdapter = {};
let presenter: ((kind: string) => Promise<boolean>) | undefined;
let mute: ((value: boolean) => void) | undefined;
let lastReward = -Infinity,
  lastInterstitial = 0,
  started = 0,
  elapsed = 0;
let adPending = false;
function safe(callback: (() => void) | undefined) {
  try {
    callback?.();
  } catch (error) {
    console.warn("Platform callback failed", error);
  }
}
export function installPlatform(next: PlatformAdapter) {
  adapter = next;
}
export const sdk = {
  setAdPresenter(next: typeof presenter) {
    presenter = next;
  },
  setMuteHook(next: typeof mute) {
    mute = next;
  },
  onTelemetry(callback: (event: TelemetryEvent) => void) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },
  track(name: string, props: Record<string, unknown> = {}) {
    const event = { t: Date.now(), name, props };
    telemetry.push(event);
    if (telemetry.length > 300) telemetry.shift();
    listeners.forEach((listener) => safe(() => listener(event)));
    safe(() => adapter.track?.(name, props));
    if (
      typeof location !== "undefined" &&
      new URLSearchParams(location.search).has("debug")
    )
      console.info("[game]", name, props);
  },
  gameReady() {
    safe(() => adapter.ready?.());
    this.track("game_ready");
  },
  gameplayStart() {
    if (!started) started = performance.now();
    safe(() => adapter.gameplayStart?.());
  },
  gameplayStop() {
    if (started) elapsed += performance.now() - started;
    started = 0;
    safe(() => adapter.gameplayStop?.());
  },
  async rewarded(placement: string) {
    if (adPending) return false;
    adPending = true;
    safe(() => mute?.(true));
    this.track("ad_rewarded_request", { placement });
    let completed = false;
    try {
      completed = adapter.rewarded
        ? await adapter.rewarded(placement)
        : ((await presenter?.("rewarded")) ?? false);
    } catch {
      completed = false;
    } finally {
      adPending = false;
      safe(() => mute?.(false));
    }
    if (completed) lastReward = Date.now();
    this.track(completed ? "ad_rewarded_complete" : "ad_rewarded_fail", {
      placement,
    });
    return completed;
  },
  async interstitial(placement: string, level: number) {
    const now = Date.now();
    const played =
      (elapsed + (started ? performance.now() - started : 0)) / 1000;
    let subscriber = false;
    safe(() => {
      subscriber = adapter.isSubscriber?.() ?? false;
    });
    if (
      adPending ||
      subscriber ||
      (level > 0 && level < economy.noInterstitialBeforeLevel)
    )
      return;
    if (now - lastReward < economy.rewardedGraceSec * 1000) return;
    if (
      lastInterstitial
        ? now - lastInterstitial < economy.interstitialCooldownSec * 1000
        : played < economy.interstitialCooldownSec
    )
      return;
    adPending = true;
    lastInterstitial = now;
    safe(() => mute?.(true));
    try {
      if (adapter.interstitial) await adapter.interstitial(placement);
      else await presenter?.("interstitial");
    } catch {
      this.track("ad_interstitial_fail", { placement });
    } finally {
      adPending = false;
      safe(() => mute?.(false));
    }
  },
};
