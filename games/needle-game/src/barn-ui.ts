/** The barn screen: see the barn, make bales, sell one a day, and pay for improvements. */
import { saved } from './progress';
import { BARN, IMPROVEMENTS, IMPROVEMENT_BY_ID, balesReady, build, canSellBale, grantName, isBuilt, makeBales, sellBale } from './barn';
import { barnBackdrop, barnScene, timeOfDay } from './barn-scene';
import { centerOf, flyCoins, holdCoins, toast, updateCoinPill } from './shop';
import { burst, center, closeOverlay, floatText, keepScroll, openOverlay } from './fx';
import { track } from './analytics';
import * as sfx from './sound';
const $ = (id: string) => document.getElementById(id) as HTMLElement;
const COIN = '<i class="coin"></i>';
type Hooks = { onOpen?: () => void; onClose?: () => void };

/** True when something in the barn is waiting for the player: bales to make, or an improvement to build. */
export function barnHasNews(): boolean {
  return balesReady() > 0 || IMPROVEMENTS.some(i => !isBuilt(i.id) && saved.barn.bales >= i.bales);
}

export function initBarn(hooks: Hooks = {}) {
  const screen = $('barn');
  let open = false;
  /** What just happened, so the picture can animate it once. */
  let just: { built?: string; bales?: number } = {};
  const paint = () => {
    const b = saved.barn,
      ready = balesReady(),
      pct = Math.min(100, Math.round(((b.hay % BARN.perBale) / BARN.perBale) * 100)),
      tod = timeOfDay(),
      affordable = IMPROVEMENTS.filter(i => !isBuilt(i.id) && b.bales >= i.bales).map(i => i.id);
    const sellNote = b.bales <= 0 ? 'Make a bale first' : canSellBale() ? 'One bale a day' : 'Back tomorrow';
    const cards = IMPROVEMENTS.map(imp => {
      const done = isBuilt(imp.id),
        gift = grantName(imp),
        can = !done && b.bales >= imp.bales;
      const action = done ? '<span class="maxed">Built</span>' : `<button class="buy" data-build="${imp.id}" ${can ? '' : 'disabled'}><span class="price">${imp.bales} bales</span><small>${can ? 'Build it' : `Need ${imp.bales - b.bales} more`}</small></button>`;
      return `<div class="imp-card${done ? ' built' : ''}${can ? ' afford' : ''}" data-imp="${imp.id}"><strong>${imp.name}</strong><span>${imp.blurb}</span>${gift ? `<small>Unlocks: ${gift}</small>` : ''}${action}</div>`;
    }).join('');
    const done = b.built.length;
    screen.innerHTML = `<div class="barn-wrap tod-${tod}">
      <div class="barn-bg">${barnBackdrop()}</div>
      <div class="shop-top barn-top"><button class="shop-back" aria-label="Close the barn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg><span>Back</span></button><h2 id="barn-title">The Barn</h2><span class="barn-chip${done === IMPROVEMENTS.length ? ' full' : ''}" title="Improvements built">${done} of ${IMPROVEMENTS.length} built</span><p class="shop-balance">${COIN}<b>${saved.coins}</b> coins</p></div>
      <section class="barn-hay" aria-label="Hay and bales">
        <div class="barn-hay-n"><b>${b.hay}</b><span> hay · ${b.bales} ${b.bales === 1 ? 'bale' : 'bales'}</span></div>
        <div class="barn-meter" aria-hidden="true"><i style="width:${pct}%"></i></div>
        <small>${BARN.perBale} hay makes a bale. Every straw you lift counts.</small>
        <div class="barn-btns">
          <button class="buy" data-act="bale" ${ready > 0 ? '' : 'disabled'}><span class="price">Make bales</span><small>${ready > 0 ? `+${ready}` : 'Need 100 hay'}</small></button>
          <button class="buy" data-act="sell" ${canSellBale() ? '' : 'disabled'}><span class="price">+${BARN.saleCoins} ${COIN}</span><small>${sellNote}</small></button>
        </div>
      </section>
      <div class="barn-stage">${barnScene({ built: b.built, bales: b.bales, hay: b.hay, affordable, justBuilt: just.built, newBales: just.bales })}</div>
      <div class="barn-tray" role="list">${cards}</div>
    </div>`;
    just = {};
  };
  const render = () => keepScroll(screen, paint);
  /** On a narrow screen the picture is wider than the screen: start with the barn in the middle. */
  const centerStage = () => {
    const st = screen.querySelector('.barn-stage') as HTMLElement | null;
    if (st) st.scrollLeft = (st.scrollWidth - st.clientWidth) / 2;
  };
  const close = () => {
    if (!open) return;
    open = false;
    closeOverlay(screen);
    updateCoinPill();
    hooks.onClose?.();
  };
  const show = () => {
    if (open) return;
    sfx.select();
    hooks.onOpen?.();
    open = true;
    render();
    openOverlay(screen);
    centerStage();
    (screen.querySelector('.shop-back') as HTMLElement | null)?.focus();
  };
  window.addEventListener('keydown', e => {
    if (open && e.key === 'Escape') {
      e.preventDefault();
      sfx.cancel();
      close();
    }
  });
  const imageOf = (id: string) => screen.querySelector(`.barn-stage [data-imp="${id}"]`);
  // Pointing at an improvement, in the list or in the picture, lights up the other one.
  const light = (e: Event, on: boolean) => {
    const t = e.target as HTMLElement;
    const card = t.closest?.('.imp-card') as HTMLElement | null,
      piece = t.closest?.('.barn-stage [data-imp]') as HTMLElement | null;
    if (card) imageOf(card.dataset.imp!)?.classList.toggle('hl', on);
    if (piece) screen.querySelector(`.imp-card[data-imp="${piece.dataset.imp}"]`)?.classList.toggle('hl', on);
  };
  screen.addEventListener('pointerover', e => light(e, true));
  screen.addEventListener('pointerout', e => light(e, false));
  screen.addEventListener('focusin', e => light(e, true));
  screen.addEventListener('focusout', e => light(e, false));
  /** Tapping a piece in the picture (or its green plus) brings its card into view and wiggles it. */
  const showCard = (id: string) => {
    const card = screen.querySelector(`.imp-card[data-imp="${id}"]`) as HTMLElement | null;
    if (!card) return;
    sfx.select();
    card.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    card.classList.remove('attn');
    void card.offsetWidth;
    card.classList.add('attn');
    window.setTimeout(() => card.classList.remove('attn'), 1300);
  };
  screen.addEventListener('keydown', e => {
    const cue = (e.target as HTMLElement).closest?.('.cue') as HTMLElement | null;
    if (cue && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      showCard(cue.dataset.cue!);
    }
  });
  screen.addEventListener('click', e => {
    const t = e.target as HTMLElement;
    const piece = t.closest('.barn-stage [data-imp], .barn-stage [data-cue]') as HTMLElement | null;
    if (piece) {
      showCard((piece.dataset.cue ?? piece.dataset.imp)!);
      return;
    }
    const el = t.closest('button') as HTMLButtonElement | null;
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
        just = { bales: k };
        updateCoinPill();
        render();
        const first = screen.querySelector('.bale.new');
        const at = first ? center(first) : center(screen.querySelector('.barn-stage') ?? screen);
        burst(at, 10, ['#ebc562', '#f7e3a0', '#fff', '#ffd24a']);
        floatText(at, `+${k}`);
        return;
      }
      sfx.denied();
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
      const id = el.dataset.build;
      if (build(id)) {
        sfx.found(0, true);
        toast('Built!');
        track('barn_build', { id });
        just = { built: id };
        updateCoinPill();
        render();
        const g = imageOf(id);
        if (g) {
          const at = center(g);
          burst(at, 18);
          window.setTimeout(() => burst(at, 10, ['#fff', '#ffd24a']), 220);
          floatText(at, IMPROVEMENT_BY_ID[id]?.name ?? 'Built!');
        }
        if (saved.barn.built.length === IMPROVEMENTS.length) {
          window.setTimeout(() => {
            toast('The whole barn is finished!');
            const st = screen.querySelector('.barn-stage');
            if (st) burst(center(st), 26);
          }, 900);
        }
        return;
      }
      sfx.denied();
    } else return;
    updateCoinPill();
    render();
  });
  return { open: show };
}
