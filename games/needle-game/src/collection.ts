/**
 * The collection book: every item in the game, grouped in sets. Items not found yet show as a
 * dark shape with their rarity colour, so you know what is still out there. Completing a set pays
 * a reward (see items.ts), shown in a small card when it happens.
 */
import { saved } from './progress';
import { SETS, ITEM_BY_ID, RARITIES, itemsOfSet, type SetDef } from './items';
import { collectionProgress, itemValue } from './economy';
import { activeEvent, daysLeft } from './events';
import { centerOf, flyCells, flyCoins, updateCellsPill, updateCoinPill } from './shop';
import * as sfx from './sound';

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const COIN = '<i class="coin"></i>';

type Hooks = { onOpen?: () => void; onClose?: () => void };

export function initCollection(imageOf: (id: string) => string | null, hooks: Hooks = {}) {
  const screen = $('collection');
  let open = false;

  const card = (id: string) => {
    const it = ITEM_BY_ID[id],
      n = saved.collection[id] ?? 0,
      r = RARITIES[it.rarity],
      img = imageOf(id);
    const pic = img ? `<img alt="" src="${img}">` : '';
    return n > 0
      ? `<li class="card r-${it.rarity}"><span class="pic">${pic}</span><b>${it.name}</b><small>${r.label}${n > 1 ? ` &middot; found ${n}` : ''}</small><small class="val">${itemValue(id)} ${COIN}</small></li>`
      : `<li class="card unknown r-${it.rarity}"><span class="pic">${pic}</span><b>? ? ?</b><small>${r.label}</small></li>`;
  };

  const render = () => {
    const ev = activeEvent();
    const sets = SETS.filter(s => s.world >= 0 || (ev && ev.set === s.id) || itemsOfSet(s.id).some(i => (saved.collection[i.id] ?? 0) > 0));
    const prog = collectionProgress();
    const body = sets
      .map(s => {
        const items = itemsOfSet(s.id),
          have = items.filter(i => (saved.collection[i.id] ?? 0) > 0).length,
          done = have === items.length;
        const live = ev && ev.set === s.id;
        const note = s.world < 0 ? (live ? `<span class="tagline live">On now &middot; ${daysLeft(ev!)} days left</span>` : '<span class="tagline">Comes back every year</span>') : `<span class="tagline">${s.blurb}</span>`;
        const reward = done ? '<i class="badge">Complete</i>' : `<span class="reward">Reward: ${COIN}${s.reward.coins}${s.reward.cells ? ` and ${s.reward.cells} ${s.reward.cells === 1 ? 'cell' : 'cells'}` : ''}</span>`;
        return `<section class="col-set${done ? ' complete' : ''}"><div class="col-head"><h3>${s.name}</h3>${note}<span class="prog">${have} / ${items.length}</span>${reward}</div><ul class="col-grid">${items.map(i => card(i.id)).join('')}</ul></section>`;
      })
      .join('');
    screen.innerHTML = `<div class="shop-panel col-panel"><div class="shop-top"><button class="shop-back" aria-label="Close the collection"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg><span>Back</span></button><h2 id="col-title">Collection</h2><p class="shop-balance col-count"><b>${prog.have}</b> of ${prog.total} found</p></div><div class="col-body">${body}</div></div>`;
  };

  const close = () => {
    if (!open) return;
    open = false;
    screen.classList.add('hidden');
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
    if ((e.target as HTMLElement).closest('.shop-back')) {
      sfx.cancel();
      close();
    }
  });
  return { open: show, isOpen: () => open };
}

/**
 * "Set complete!": a small card with the reward. The coins and cells are already in the purse
 * (recordFinds paid them) and the counters are holding back; pressing the button lets them arrive.
 */
export function showSetComplete(done: SetDef[], imageOf: (id: string) => string | null, coins: number, cells: number, onClose?: () => void) {
  if (!done.length) return;
  const dlg = document.createElement('dialog');
  dlg.className = 'set-done';
  const names = done.map(s => s.name).join(' and ');
  const pics = done
    .flatMap(s => itemsOfSet(s.id))
    .map(i => {
      const img = imageOf(i.id);
      return img ? `<span class="pic r-${i.rarity}"><img alt="" src="${img}"></span>` : '';
    })
    .join('');
  dlg.innerHTML = `<h2>Set complete!</h2><p class="sub">${names}</p><div class="set-pics">${pics}</div><div class="reward"><span class="chip coins">${COIN}+${coins}</span>${cells ? `<span class="chip cells"><i class="cell mini"></i>+${cells}</span>` : ''}</div><button class="primary">Collect</button>`;
  document.body.append(dlg);
  dlg.addEventListener('close', () => {
    dlg.remove();
    onClose?.();
  }, { once: true });
  dlg.querySelector('button')!.addEventListener('click', e => {
    const from = centerOf(e.currentTarget as HTMLElement);
    sfx.found(0, true);
    updateCoinPill();
    updateCellsPill();
    dlg.close();
    flyCoins(from, coins);
    if (cells) flyCells(from, cells);
  });
  dlg.showModal();
  sfx.unlockTool();
}
