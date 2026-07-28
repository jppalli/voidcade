import { createMockAdManager } from '@arcade/ads';

/**
 * Hero game rail: scrolls sideways when there are more games than fit.
 * The arrow buttons only appear when there's actually somewhere to scroll,
 * so the rail looks clean while the lineup is small and stays usable as it
 * grows. Swiping/trackpad scrolling works regardless.
 */
function setupHeroRail() {
  const rail = document.getElementById('heroRail');
  const wrap = rail?.parentElement;
  const prev = document.getElementById('railPrev');
  const next = document.getElementById('railNext');
  if (!rail || !wrap || !prev || !next) return;

  const updateArrows = () => {
    // 2px slack absorbs sub-pixel rounding at the scroll extremes.
    const maxScroll = rail.scrollWidth - rail.clientWidth;
    wrap.classList.toggle('can-scroll-left', rail.scrollLeft > 2);
    wrap.classList.toggle('can-scroll-right', rail.scrollLeft < maxScroll - 2);
  };

  const scrollByCard = (direction) => {
    const card = rail.querySelector('.stage-card');
    const step = card ? card.offsetWidth + 18 : rail.clientWidth * 0.8;
    rail.scrollBy({ left: direction * step * 2, behavior: 'smooth' });
  };

  prev.addEventListener('click', () => scrollByCard(-1));
  next.addEventListener('click', () => scrollByCard(1));
  rail.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);

  if ('ResizeObserver' in window) {
    new ResizeObserver(updateArrows).observe(rail);
  }

  updateArrows();
}

async function bootstrap() {
  document.getElementById('year').textContent = String(new Date().getFullYear());

  const cards = document.querySelectorAll('.game-card[data-game]');
  document.getElementById('gameCount').textContent = `${cards.length} available`;
  const statGames = document.getElementById('statGames');
  if (statGames) statGames.textContent = String(cards.length);

  setupHeroRail();

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
