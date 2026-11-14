/**
 * The daily gift: once a day the title screen offers a gift of coins, and battery cells once
 * a helper is unlocked. Seven gifts in a cycle, a bigger one on day seven. Missing a day costs
 * nothing: the cycle just carries on from where it was.
 *
 * The card opens by itself when today's gift is waiting, and the "Daily gift" button on the title
 * screen opens it any time (after the gift is claimed it just shows the week and says to come back).
 */
import { DAILY, claimDaily, dailyPlan, dailyReady, helpersUnlocked } from './economy';
import { saved } from './progress';
import { centerOf, flyCells, flyCoins, holdCells, holdCoins, updateCellsPill, updateCoinPill } from './shop';
import { CELL_ART, GIFT_ART } from './art';
import * as sfx from './sound';

const COIN = '<i class="coin"></i>';

/** A little pile of coins: more coins for bigger gifts. */
const pile = (coins: number) => {
  const n = coins <= 20 ? 1 : coins <= 35 ? 2 : 3;
  return `<span class="pile p${n}">${'<i class="coin"></i>'.repeat(n)}</span>`;
};

function build(view: boolean) {
  const plan = dailyPlan();
  const cellsOn = helpersUnlocked();
  const next = saved.daily.day % DAILY.length;
  // Days before the next one are done. After day seven the cycle starts again, with only day one still to come.
  const doneUpTo = view ? (next === 0 ? DAILY.length : next) : plan.day;
  const nextIdx = view ? next : plan.day;
  const days = DAILY.map((d, i) => {
    const done = view ? (next === 0 ? i > 0 : i < next) : i < plan.day;
    const here = i === nextIdx;
    const last = i === DAILY.length - 1;
    const cl = cellsOn && d.cells ? `<span class="cl">${CELL_ART}+${d.cells}</span>` : '<span class="cl"></span>';
    const tag = here ? `<span class="tag">${view ? 'Tomorrow' : 'Today'}</span>` : '';
    const tick = done ? '<i class="tick">&#10003;</i>' : '';
    const ico = last ? `<span class="ico big-ico">${GIFT_ART}</span>` : `<span class="ico">${pile(d.coins)}</span>`;
    return `<li class="day${done ? ' done' : ''}${here ? (view ? ' next' : ' today') : ''}${last ? ' big' : ''}">${tag}<span class="n">Day ${i + 1}</span>${ico}<span class="amt">${d.coins}</span>${cl}${tick}</li>`;
  }).join('');
  void doneUpTo;
  const reward = view
    ? `<p class="claimed-note">You have today's gift. Come back tomorrow for the next one.</p>`
    : `<div class="reward"><span class="chip coins">${COIN}+${plan.coins}</span>${cellsOn && plan.cells ? `<span class="chip cells">${CELL_ART}+${plan.cells}</span>` : ''}</div>`;
  const stage = `<div class="gift-stage"><span class="gift-rays"></span><div class="gift-art">${GIFT_ART}</div><i class="spark s1">&#10022;</i><i class="spark s2">&#10022;</i><i class="spark s3">&#10022;</i><i class="spark s4">&#10022;</i></div>`;
  const sub = view ? 'Daily gift claimed' : `Day ${plan.day + 1} of ${DAILY.length}`;
  return `${stage}<h2>Daily gift</h2><p class="sub">${sub}</p><ul class="days">${days}</ul>${reward}${view ? '<button class="primary close-daily">Nice!</button>' : '<button class="primary claim">Claim</button>'}`;
}

/** Opens the daily gift card. With `auto`, only when today's gift is waiting. Returns true when it opened. */
export function showDaily(opts: { auto?: boolean; onClose?: () => void } = {}): boolean {
  const ready = dailyReady();
  if ((opts.auto && !ready) || document.querySelector('dialog[open]')) return false;
  const dlg = document.createElement('dialog');
  dlg.className = 'daily';
  dlg.innerHTML = build(!ready);
  document.body.append(dlg);
  dlg.addEventListener('close', () => {
    dlg.remove();
    opts.onClose?.();
  }, { once: true });
  dlg.querySelector('.close-daily')?.addEventListener('click', () => {
    sfx.select();
    dlg.close();
  });
  dlg.querySelector('.claim')?.addEventListener('click', e => {
    const from = centerOf(e.currentTarget as HTMLElement);
    const got = claimDaily();
    sfx.found(0, true);
    holdCoins(got.coins);
    if (got.cells) holdCells(got.cells);
    updateCoinPill();
    updateCellsPill();
    dlg.close();
    flyCoins(from, got.coins);
    if (got.cells) flyCells(from, got.cells);
  });
  dlg.showModal();
  if (ready) sfx.unlockTool();
  return true;
}

/** Opens by itself when today's gift is waiting. */
export const maybeShowDaily = (onClose?: () => void) => showDaily({ auto: true, onClose });
/** Opened from the title screen button, whether or not today's gift has been claimed. */
export const openDaily = (onClose?: () => void) => showDaily({ onClose });
