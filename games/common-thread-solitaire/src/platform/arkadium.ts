import type { PlatformAdapter } from "./sdk";

/** Compatibility adapter for the SDK shape used by the supplied prototype.
 * Confirm these methods against your publisher's SDK before production release.
 */
export interface ArkadiumHost {
  analytics?: { track?(name: string, props: Record<string, unknown>): void };
  lifecycle?: {
    onTestReady?(): void;
    onGameStart?(): void;
    onGameEnd?(): void;
  };
  ads?: {
    showRewardAd?(): Promise<{ value: boolean }>;
    showMidrollAd?(): Promise<unknown>;
  };
}
export function arkadiumAdapter(host: ArkadiumHost): PlatformAdapter {
  return {
    ready: () => host.lifecycle?.onTestReady?.(),
    gameplayStart: () => host.lifecycle?.onGameStart?.(),
    gameplayStop: () => host.lifecycle?.onGameEnd?.(),
    track: (name, props) => host.analytics?.track?.(name, props),
    rewarded: async () => (await host.ads?.showRewardAd?.())?.value === true,
    interstitial: async () => {
      await host.ads?.showMidrollAd?.();
    },
  };
}
