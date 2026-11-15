/**
 * The shop: a full-screen panel opened from the shop button in the header (on every screen).
 * Left: sell the finds in the bag and buy helper charges. Right: permanent upgrades.
 * All prices live in economy.ts.
 */
import { saved } from './progress';
import { LOOKS, SLOT_NAME, type Slot } from './cosmetics';
import { buyLook, equipLook, ownsLook, CELLS, TRACKS, adsLeft, anyAffordable, bagCount, bagValue, buy, buyCells, canBuyCells, helpersUnlocked, itemValue, nextTier, recordAd, sellAll, trackVisible, type Track } from './economy';
import { platform } from './platform';
import { track } from './analytics';
import { itemName } from './items';
import type { Treasure } from './levels';
import { CELLS_ART, DETECTOR_ART, FAN_ART, VACUUM_ART } from './art';
import * as sfx from './sound';

const $ = (id: string) => document.getElementById(id) as HTMLElement;

const COIN = '<i class="coin"></i>';

/** Little illustrations (64 x 64, drawn in the game's colours). */
const ART: Record<Track, string> = {
  scoop: `<svg viewBox="0 0 64 64" aria-hidden="true"><g transform="rotate(32 32 32)"><rect x="29" y="4" width="6" height="32" rx="3" fill="#b0743a"/><path d="M22 4h20a3.5 3.5 0 0 1 0 7H22a3.5 3.5 0 0 1 0-7Z" fill="#8a5424"/><path d="M19 34h26l-3.5 19Q32 63 22.5 53Z" fill="#d4dde3" stroke="#6f7e88" stroke-width="2.5" stroke-linejoin="round"/><path d="M26 38l-1.5 11" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".75"/></g></svg>`,
  brush: `<svg viewBox="0 0 64 64" aria-hidden="true"><g transform="rotate(-28 32 32)"><rect x="29" y="2" width="6" height="30" rx="3" fill="#b0743a"/><rect x="17" y="30" width="30" height="9" rx="3.5" fill="#8a5424"/><path d="M17 39h30l3.5 21h-37Z" fill="#f3cf5a" stroke="#b8891b" stroke-width="2.5" stroke-linejoin="round"/><path d="M24 43v15M32 43v16M40 43v15" stroke="#c9a02b" stroke-width="2.2" stroke-linecap="round"/></g></svg>`,
  detector: DETECTOR_ART,
  fan: FAN_ART,
  vacuum: VACUUM_ART,
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
// ---------------------------------------------------------------- counters
// The coin and cell counters in the top bar (and the balance inside the shop) count up as coins
// and cells land in them, and roll down when something is bought. While a gift is on its way the
// number is held back, so it only rises when the coins arrive.
const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
type Pt = { x: number; y: number };
export const centerOf = (el: Element): Pt => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};
const coinView = { shown: saved.coins, hold: false, pending: 0 };
const cellView = { shown: saved.cells, hold: false, last: -1, pending: 0 };
let roll = 0;

const coinText = () => (saved.cheat ? '\u221E' : String(Math.round(coinView.shown)));
function paintCoins() {
  const t = coinText();
  $('coin-count').textContent = t;
  $('coin-badge').setAttribute('aria-label', `${t} coins`);
  document.querySelectorAll('.shop-balance b').forEach(b => (b.textContent = t));
}
function bump(el: Element | null) {
  if (!el || reducedMotion) return;
  el.classList.remove('bump');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('bump');
}
function rollCoins(target: number) {
  cancelAnimationFrame(roll);
  const from = coinView.shown;
  if (saved.cheat || reducedMotion || from === target) {
    coinView.shown = target;
    paintCoins();
    return;
  }
  const t0 = performance.now(),
    dur = Math.min(700, 220 + Math.abs(target - from) * 8);
  const step = (t: number) => {
    const p = Math.min(1, (t - t0) / dur);
    coinView.shown = from + (target - from) * (1 - Math.pow(1 - p, 3));
    paintCoins();
    if (p < 1) roll = requestAnimationFrame(step);
  };
  roll = requestAnimationFrame(step);
}
/** Call right after adding coins to the purse and before the coins are shown arriving: the counter stays at the old amount. */
export function holdCoins(amount: number) {
  cancelAnimationFrame(roll);
  coinView.hold = true;
  coinView.pending += amount;
  coinView.shown = Math.max(0, saved.coins - coinView.pending);
  paintCoins();
}
/** One flight of coins has landed: when nothing is left on its way, the counter shows the real amount. */
function settleCoins(amount: number) {
  coinView.pending = Math.max(0, coinView.pending - amount);
  if (coinView.pending === 0) releaseCoins();
}
/** Lets the counter show the real amount again (used when a gift is never shown arriving). */
export function releaseCoins() {
  coinView.hold = false;
  coinView.pending = 0;
  coinView.shown = saved.coins;
  paintCoins();
}
/** Little pieces of the thing (coins, cells) pop up from `from`, fly to `to` one after another and call `land` as each arrives. */
function fly(from: Pt, to: HTMLElement | null, count: number, cls: string, land: (i: number) => void, done: () => void) {
  if (reducedMotion || !to || to.getClientRects().length === 0) {
    for (let i = 0; i < count; i++) land(i);
    done();
    return;
  }
  const target = centerOf(to);
  let landed = 0;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('i');
    el.className = `${cls} fly`;
    document.body.append(el);
    const sx = from.x + (Math.random() - 0.5) * 40,
      sy = from.y + (Math.random() - 0.5) * 16,
      mx = sx + (Math.random() - 0.5) * 100,
      my = sy - 36 - Math.random() * 50;
    const at = (x: number, y: number, s: number) => `translate(${x}px,${y}px) translate(-50%,-50%) scale(${s})`;
    const a = el.animate(
      [
        { transform: at(sx, sy, 0.4), opacity: 0 },
        { transform: at(mx, my, 1.05), opacity: 1, offset: 0.3 },
        { transform: at(target.x, target.y, 0.75), opacity: 1 },
      ],
      { duration: 900, delay: i * 70, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'both' },
    );
    a.onfinish = () => {
      el.remove();
      land(i);
      if (++landed === count) done();
    };
  }
}
/** Coins fly from `from` into whichever coin counter is on screen (the shop's balance when the shop is open). */
export function flyCoins(from: Pt, amount: number) {
  if (amount <= 0) return;
  if (!coinView.hold) holdCoins(amount);
  const to = (document.querySelector('#shop:not(.hidden) .shop-balance .coin') ?? $('coin-badge').querySelector('.coin')) as HTMLElement | null;
  const count = Math.min(14, Math.max(3, Math.ceil(amount / 4)));
  fly(from, to, count, 'coin', i => {
    coinView.shown += amount / count;
    paintCoins();
    bump(to?.closest('.coin-badge, .shop-balance') ?? null);
    sfx.coin(i);
  }, () => settleCoins(amount));
}

function paintCells() {
  const badge = $('cells-badge'),
    t = saved.cheat ? '\u221E' : String(Math.round(cellView.shown));
  $('cells-count').textContent = t;
  badge.setAttribute('aria-label', saved.cheat ? 'Unlimited battery cells' : `${t} battery cells`);
  badge.classList.toggle('empty', !saved.cheat && cellView.shown <= 0);
  if (cellView.last !== -1 && cellView.last !== cellView.shown && !badge.classList.contains('hidden')) bump(badge);
  cellView.last = cellView.shown;
}
/** The battery cell count in the top bar. It stays hidden until the first helper is unlocked. */
export function updateCellsPill() {
  $('cells-badge').classList.toggle('hidden', !helpersUnlocked());
  if (!cellView.hold) cellView.shown = saved.cells;
  paintCells();
}
export function holdCells(amount: number) {
  cellView.hold = true;
  cellView.pending += amount;
  cellView.shown = Math.max(0, saved.cells - cellView.pending);
  paintCells();
}
export function flyCells(from: Pt, amount: number) {
  if (amount <= 0) return;
  if (!cellView.hold) holdCells(amount);
  const n = Math.min(6, amount);
  fly(from, $('cells-badge').querySelector('.cb-art') as HTMLElement | null, n, 'cell', i => {
    cellView.shown = Math.min(saved.cells, cellView.shown + amount / n);
    paintCells();
    sfx.coin(i + 2);
  }, () => {
    cellView.pending = Math.max(0, cellView.pending - amount);
    if (cellView.pending === 0) {
      cellView.hold = false;
      cellView.shown = saved.cells;
      paintCells();
    }
  });
}

export function releaseCells() {
  cellView.hold = false;
  cellView.pending = 0;
  cellView.shown = saved.cells;
  paintCells();
}

/** A short message that fades by itself. */
export function toast(text: string) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = text;
  document.body.append(el);
  window.setTimeout(() => el.remove(), 3200);
}

/** Plays a rewarded video (on the Arkadium Arena, a real one) and, if it was watched, gives one battery cell. */
let watching = false;
export async function watchForCell(from: Pt): Promise<boolean> {
  if (watching) return false;
  if (adsLeft() <= 0) {
    toast('No more videos today. Come back tomorrow!');
    return false;
  }
  watching = true;
  track('reward_ad_request');
  let ok = false;
  try {
    ok = await platform().showRewardAd();
  } finally {
    watching = false;
  }
  if (!ok) {
    toast('No video is available right now.');
    return false;
  }
  recordAd();
  track('reward_ad_earned');
  holdCells(1);
  updateCellsPill();
  flyCells(from, 1);
  return true;
}

/** Refreshes the coin counter and the shop button in the header. The shop button glows when there is something to do. */
export function updateCoinPill() {
  if (!coinView.hold) rollCoins(saved.coins);
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
            return `<li><span class="thumb">${img ? `<img alt="" src="${img}">` : ''}<b class="count">×${saved.bag[k]}</b></span><span class="name">${itemName(k)}</span><span class="worth">${itemValue(k)} ${COIN}</span></li>`;
          })
          .join('')}</ul><button class="primary sell" data-act="sell">Sell all <span class="plus">+${bagValue()}</span> ${COIN}</button>`
      : `<p class="shop-empty">Nothing to sell yet.<br>Bonus items you find in the hay land here.</p>`;

    const have = saved.cheat ? '∞' : String(saved.cells);
    const videoBtn = adsLeft() > 0 ? `<button class="buy video" data-act="video"><span class="price">Free</span><small>Watch a video: +1 cell (${adsLeft()} left today)</small></button>` : '';
    const helpers = `<div class="shop-row"><span class="art">${CELLS_ART}</span><div class="info"><strong>Battery cells</strong><span>In your stock: ${have}</span><small>Every helper runs on them. You also get some in the daily gift.</small></div><div class="buys"><button class="buy" data-act="cells" ${canBuyCells() ? '' : 'disabled'}><span class="price">${CELLS.cost} ${COIN}</span><small>+${CELLS.pack} cells</small></button>${videoBtn}</div></div>`;
    const rows = (Object.keys(TRACKS) as Track[])
      .filter(trackVisible)
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

    const looks = (Object.keys(LOOKS) as Slot[])
      .map(slot => `<div class="look-row"><strong>${SLOT_NAME[slot]}</strong><div class="look-chips">${LOOKS[slot]
        .map(l => {
          const own = ownsLook(slot, l.id), on = saved.cosmetics[slot] === l.id;
          const label = on ? 'In use' : own ? 'Use' : l.barn ? 'Barn' : `${l.cost} ${COIN}`;
          const dis = !own && (l.barn || saved.coins < l.cost) ? 'disabled' : '';
          return `<button class="look-chip${on ? ' on' : ''}" data-look="${slot}:${l.id}" aria-pressed="${on}" ${dis}><i style="background:${l.swatch}"></i><span>${l.name}</span><small>${label}</small></button>`;
        })
        .join('')}</div></div>`)
      .join('');

    screen.innerHTML = `<div class="shop-panel">
      <div class="shop-top"><button class="shop-back" aria-label="Close the shop"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg><span>Back</span></button>
        <span class="stall">${stall()}</span><h2 id="shop-title">The Shop</h2><p class="shop-balance">${COIN}<b>${coinText()}</b> coins</p></div>
      <div class="shop-cols">
        <section class="shop-col"><h3>Your finds</h3>${sell}${helpersUnlocked() ? `<h3>Energy</h3>${helpers}` : ''}</section>
        <section class="shop-col"><h3>Upgrades</h3>${rows}<h3>Looks</h3>${looks}</section>
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
      const from = centerOf(el),
        gain = sellAll();
      if (gain > 0) {
        sfx.found(0, false);
        track('coins_earned', { source: 'sell', amount: gain });
        holdCoins(gain);
        updateCoinPill();
        render();
        flyCoins(from, gain);
        return;
      }
    } else if (el.dataset.look) {
      const [slot, id] = el.dataset.look.split(':') as [Slot, string];
      if (ownsLook(slot, id) ? equipLook(slot, id) : buyLook(slot, id)) {
        sfx.found(0, false);
        document.body.dataset.frame = saved.cosmetics.frame;
        track('shop_buy', { item: el.dataset.look });
      } else sfx.denied();
    } else if (el.dataset.buy) {
      if (buy(el.dataset.buy as Track)) {
        sfx.found(0, false);
        track('shop_buy', { item: el.dataset.buy as string });
      }
      else sfx.denied();
    } else if (el.dataset.act === 'cells') {
      if (buyCells()) {
        sfx.found(0, false);
        updateCellsPill();
      } else sfx.denied();
    } else if (el.dataset.act === 'video') {
      void watchForCell(centerOf(el)).then(() => {
        updateCoinPill();
        render();
      });
      return;
    } else return;
    updateCoinPill();
    render();
  });
  updateCoinPill();
  updateCellsPill();
}
