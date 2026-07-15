import { createMockAdManager } from '@arcade/ads';
import { Game } from './Game.js';
import { UI } from './UI.js';

async function bootstrap() {
  // Ad setup: a banner in each ad slot, plus interstitial/rewarded wired
  // into the game-over flow. Swap createMockAdManager() for a real provider
  // (see packages/ads) when ad network credentials are available - nothing
  // below this line needs to change.
  const adManager = await createMockAdManager({
    onEvent: (e) => console.debug('[ads]', e.type),
  });
  adManager.showBanner(document.getElementById('topBanner'), { label: 'Ad space · 320×50' });
  adManager.showBanner(document.getElementById('bottomBanner'), { label: 'Ad space · 320×50' });

  const canvas = document.getElementById('game');
  const ui = new UI(adManager);
  const game = new Game(canvas, ui, adManager);
  ui.attachGame(game);
  game.goToMenu();
}

bootstrap();
