export { AdProvider } from './AdProvider.js';
export { MockAdProvider } from './MockAdProvider.js';
export { AdManager } from './AdManager.js';

/**
 * Convenience factory: builds an AdManager backed by the mock provider.
 * Swap this out for a real provider (AdSense/AdMob wrapper implementing
 * AdProvider) when you have publisher/app IDs - nothing else in game code
 * needs to change since games only ever talk to the AdManager interface.
 */
export async function createMockAdManager(options = {}) {
  const provider = new MockAdProvider();
  const manager = new AdManager(provider, options);
  await manager.init(options.config);
  return manager;
}
