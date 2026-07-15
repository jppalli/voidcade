import { createMockAdManager } from '@arcade/ads';

async function bootstrap() {
  document.getElementById('year').textContent = String(new Date().getFullYear());

  const cards = document.querySelectorAll('.game-card[data-game]');
  document.getElementById('gameCount').textContent = `${cards.length} available`;
  const statGames = document.getElementById('statGames');
  if (statGames) statGames.textContent = String(cards.length);

  // Site-level banner ads: a leaderboard slot above/below the game grid,
  // plus a native-styled in-feed card inside the grid itself. Swap
  // createMockAdManager() for a real provider once ad credentials exist -
  // this file doesn't need to change.
  const adManager = await createMockAdManager({
    onEvent: (e) => console.debug('[site ads]', e.type),
  });
  adManager.showBanner(document.getElementById('adSlotTop'), { label: 'Ad space · 728×90' });
  adManager.showBanner(document.getElementById('adSlotBottom'), { label: 'Ad space · 728×90' });
  adManager.showBanner(document.getElementById('adSlotInFeed'), { label: 'Sponsored' });
}

bootstrap();
