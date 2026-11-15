/** The barn screen: make bales, sell one a day, and pay for improvements. */
import { saved } from './progress';
import { BARN, IMPROVEMENTS, balesReady, build, canSellBale, grantName, isBuilt, makeBales, sellBale } from './barn';
import { BARN_ART } from './art';
import { centerOf, flyCoins, holdCoins, toast, updateCoinPill } from './shop';
import { track } from './analytics';
import * as sfx from './sound';

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const COIN = '<i class="coin"></i>';
type Hooks = { onOpen?: () => void; onClose?: () => void };

export function initBarn(hooks: Hooks = {}) {
  const screen = $('barn');
  let open = false;

  const render = () => {
    const b = saved.barn,
      ready = balesReady(),
      pct = Math.min(100, Math.round(((b.hay % BARN.perBale) / BARN.perBale) * 100));
    const sellNote = b.bales <= 0 ? 'You need a bale first.' : canSellBale() ? 'One bale a day.' : 'Come back tomorrow.';
    const left = `<section class="shop-col barn-col">
      <h3>Your hay</h3>
      <div class="barn-hero">${BARN_ART}<div><strong class="barn-hay">${b.hay}</strong><span> hay</span><div class="barn-meter" aria-hidden="true"><i style="width:${pct}%"></i></div><small>${BARN.perBale} hay makes a bale. Every straw you lift out of the hay counts.</small></div></div>
      <div class="shop-row"><div class="info"><strong>Bales: ${b.bales}</strong><small>${ready > 0 ? `${ready} ${ready === 1 ? 'bale' : 'bales'} ready to make.` : 'Not enough hay for a bale yet.'}</small></div><div class="buys"><button class="buy" data-act="bale" ${ready > 0 ? '' : 'disabled'}><span class="price">Make bales</span><small>${ready > 0 ? `+${ready}` : '+0'}</small></button></div></div>
      <div class="shop-row"><div class="info"><strong>Sell a bale</strong><small>${sellNote}</small></div><div class="buys"><button class="buy" data-act="sell" ${canSellBale() ? '' : 'disabled'}><span class="price">+${BARN.saleCoins} ${COIN}</span><small>1 bale</small></button></div></div>
    </section>`;
    const rows = IMPROVEMENTS.map(imp => {
      const done = isBuilt(imp.id),
        gift = grantName(imp);
      const action = done ? '<span class="maxed">Built</span>' : `<button class="buy" data-build="${imp.id}" ${b.bales >= imp.bales ? '' : 'disabled'}><span class="price">${imp.bales} bales</span><small>Build it</small></button>`;
      return `<div class="shop-row${done ? ' built' : ''}"><div class="info"><strong>${imp.name}</strong><span>${imp.blurb}</span>${gift ? `<small>Unlocks: ${gift}</small>` : ''}</div>${action}</div>`;
    }).join('');
    screen.innerHTML = `<div class="shop-panel"><div class="shop-top"><button class="shop-back" aria-label="Close the barn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg><span>Back</span></button><h2 id="barn-title">The Barn</h2><p class="shop-balance">${COIN}<b>${saved.cheat ? '\u221E' : saved.coins}</b> coins</p></div><div class="shop-cols">${left}<section class="shop-col"><h3>Improvements</h3>${rows}</section></div></div>`;
  };

  const close = () => {
    if (!open) return;
    open = false;
    screen.classList.add('hidden');
    updateCoinPill();
    hooks.onClose?.();
  };
  const show = () => {
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
    if (el.dataset.act === 'bale') {
      const k = makeBales();
      if (k > 0) {
        sfx.found(0, false);
        toast(k === 1 ? 'One bale made.' : `${k} bales made.`);
        track('barn_bales', { n: k });
      } else sfx.denied();
    } else if (el.dataset.act === 'sell') {
      const from = centerOf(el),
        gain = sellBale();
      if (gain > 0) {
        sfx.found(0, false);
        track('coins_earned', { source: 'barn', amount: gain });
        holdCoins(gain);
        updateCoinPill();
        render();
        flyCoins(from, gain);
        return;
      }
      sfx.denied();
    } else if (el.dataset.build) {
      if (build(el.dataset.build)) {
        sfx.found(0, true);
        toast('Built!');
        track('barn_build', { id: el.dataset.build });
      } else sfx.denied();
    } else return;
    updateCoinPill();
    render();
  });
  return { open: show };
}
