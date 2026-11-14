/**
 * The shop: a full-screen panel opened from the shop button in the header (on every screen).
 * Left: sell the finds in the bag and buy helper charges. Right: permanent upgrades.
 * All prices live in economy.ts.
 */
import { saved } from './progress';
import { CELLS, FIND_VALUE, TRACKS, anyAffordable, bagCount, bagValue, buy, buyCells, canBuyCells, nextTier, sellAll, type Track } from './economy';
import type { Treasure } from './levels';
import { CELLS_ART, DETECTOR_ART, FAN_ART } from './art';
import * as sfx from './sound';

const $ = (id: string) => document.getElementById(id) as HTMLElement;

const COIN = '<i class="coin"></i>';

/** Little illustrations (64 x 64, drawn in the game's colours). */
const ART: Record<Track, string> = {
  scoop: `<svg viewBox="0 0 64 64" aria-hidden="true"><g transform="rotate(32 32 32)"><rect x="29" y="4" width="6" height="32" rx="3" fill="#b0743a"/><path d="M22 4h20a3.5 3.5 0 0 1 0 7H22a3.5 3.5 0 0 1 0-7Z" fill="#8a5424"/><path d="M19 34h26l-3.5 19Q32 63 22.5 53Z" fill="#d4dde3" stroke="#6f7e88" stroke-width="2.5" stroke-linejoin="round"/><path d="M26 38l-1.5 11" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".75"/></g></svg>`,
  brush: `<svg viewBox="0 0 64 64" aria-hidden="true"><g transform="rotate(-28 32 32)"><rect x="29" y="2" width="6" height="30" rx="3" fill="#b0743a"/><rect x="17" y="30" width="30" height="9" rx="3.5" fill="#8a5424"/><path d="M17 39h30l3.5 21h-37Z" fill="#f3cf5a" stroke="#b8891b" stroke-width="2.5" stroke-linejoin="round"/><path d="M24 43v15M32 43v16M40 43v15" stroke="#c9a02b" stroke-width="2.2" stroke-linecap="round"/></g></svg>`,
  detector: DETECTOR_ART,
  fan: FAN_ART,
};

/** A market stall with a striped awning, for the top of the screen. */
function stall(): string {
  const red = '#e8806a',
    cream = '#fff5d4';
  const tw = 92 / 6,
    bw = 112 / 6;
  const stripes = Array.from({ length: 6 }, (_, i) => {
    const t0 = 14 + i * tw,
      b0 = 4 + i * bw;
    return `<path d="M${t0} 6h${tw}L${b0 + bw} 26H${b0}Z" fill="${i % 2 ? cream : red}"/>`;
  }).join('');
  const scallops = Array.from({ length: 6 }, (_, i) => `<path d="M${4 + i * bw} 26a${bw / 2} ${bw / 2} 0 0 0 ${bw} 0Z" fill="${i % 2 ? cream : red}"/>`).join('');
  const coin = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="6" fill="#ffd24a" stroke="#b9780f" stroke-width="2"/>`;
  return `<svg viewBox="0 0 120 80" aria-hidden="true"><rect x="14" y="26" width="6" height="50" rx="2" fill="#a56a32"/><rect x="100" y="26" width="6" height="50" rx="2" fill="#a56a32"/>${stripes}${scallops}<path d="M14 6h92L116 26H4Z" fill="none" stroke="#b8793d" stroke-width="2.5" stroke-linejoin="round"/><rect x="10" y="60" width="100" height="14" rx="4" fill="#c58a4b" stroke="#8a5424" stroke-width="2.5"/>${coin(40, 54)}${coin(52, 54)}${coin(46, 46)}<rect x="72" y="44" width="22" height="16" rx="3" fill="#8ec96a" stroke="#4a8a36" stroke-width="2"/></svg>`;
}

const pips = (have: number, total: number) =>
  Array.from({ length: total }, (_, i) => `<i class="pip ${i < have ? 'on' : ''}"></i>`).join('');
const money = () => (saved.cheat ? '∞' : String(saved.coins));

/** Refreshes the coin counter and the shop button in the header. The shop button glows when there is something to do. */
export function updateCoinPill() {
  $('coin-count').textContent = money();
  $('coin-badge').setAttribute('aria-label', `${money()} coins`);
  $('btn-shop').classList.toggle('can-buy', anyAffordable() || bagCount() > 0);
}

export function initShop(imageOf: (kind: string) => string | null, hooks: { onOpen?: () => void; onClose?: () => void } = {}) {
  const screen = $('shop');
  let open = false;

  const render = () => {
    const kinds = Object.keys(saved.bag).filter(k => saved.bag[k] > 0) as Treasure[];
    const sell = kinds.length
      ? `<ul class="shop-bag">${kinds
          .map(k => {
            const img = imageOf(k);
            return `<li><span class="thumb">${img ? `<img alt="" src="${img}">` : ''}<b class="count">×${saved.bag[k]}</b></span><span class="name">${k}</span><span class="worth">${FIND_VALUE[k] ?? 0} ${COIN}</span></li>`;
          })
          .join('')}</ul><button class="primary sell" data-act="sell">Sell all <span class="plus">+${bagValue()}</span> ${COIN}</button>`
      : `<p class="shop-empty">Nothing to sell yet.<br>Bonus items you find in the hay land here.</p>`;

    const have = saved.cheat ? '∞' : String(saved.cells);
    const helpers = `<div class="shop-row"><span class="art">${CELLS_ART}</span><div class="info"><strong>Battery cells</strong><span>In your stock: ${have}</span><small>Every helper runs on them. Each level starts with ${CELLS.free} free.</small></div><button class="buy" data-act="cells" ${canBuyCells() ? '' : 'disabled'}><span class="price">${CELLS.cost} ${COIN}</span><small>+${CELLS.pack} cells</small></button></div>`;
    const rows = (Object.keys(TRACKS) as Track[])
      .map(t => {
        const tiers = TRACKS[t].tiers,
          have = saved.upgrades[t],
          next = nextTier(t);
        const action = next
          ? `<button class="buy" data-buy="${t}" ${saved.coins >= next.cost ? '' : 'disabled'}><span class="price">${next.cost} ${COIN}</span><small>Next: ${next.text}</small></button>`
          : `<span class="maxed">All upgraded!</span>`;
        return `<div class="shop-row"><span class="art">${ART[t]}</span><div class="info"><strong>${TRACKS[t].name}</strong><span>${tiers[have].text}</span><div class="pips" aria-hidden="true">${pips(have, tiers.length - 1)}</div></div>${action}</div>`;
      })
      .join('');

    screen.innerHTML = `<div class="shop-panel">
      <div class="shop-top"><button class="shop-back" aria-label="Close the shop"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg><span>Back</span></button>
        <span class="stall">${stall()}</span><h2 id="shop-title">The Shop</h2><p class="shop-balance">${COIN}<b>${money()}</b> coins</p></div>
      <div class="shop-cols">
        <section class="shop-col"><h3>Your finds</h3>${sell}<h3>Energy</h3>${helpers}</section>
        <section class="shop-col"><h3>Upgrades</h3>${rows}</section>
      </div></div>`;
  };

  const close = () => {
    if (!open) return;
    open = false;
    screen.classList.add('hidden');
    updateCoinPill();
    hooks.onClose?.();
  };
  $('btn-shop').onclick = () => {
    if (open) return;
    sfx.select();
    hooks.onOpen?.();
    open = true;
    render();
    screen.classList.remove('hidden');
    (screen.querySelector('.shop-back') as HTMLElement | null)?.focus();
  };
  window.addEventListener('keydown', e => {
    if (open && e.key === 'Escape') {
      e.preventDefault();
      sfx.cancel();
      close();
    }
  });
  screen.addEventListener('click', e => {
    const el = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
    if (!el) return;
    if (el.classList.contains('shop-back')) {
      sfx.cancel();
      close();
      return;
    }
    if (el.dataset.act === 'sell') {
      if (sellAll() > 0) sfx.found(0, false);
    } else if (el.dataset.buy) {
      if (buy(el.dataset.buy as Track)) sfx.found(0, false);
      else sfx.denied();
    } else if (el.dataset.act === 'cells') {
      if (buyCells()) sfx.found(0, false);
      else sfx.denied();
    } else return;
    updateCoinPill();
    render();
  });
  updateCoinPill();
}
