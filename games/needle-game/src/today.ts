/**
 * "Today": one card for everything that changes day to day: the daily gift, the daily haystack,
 * the three quests, and a note about the season's event. A red dot on the title screen says
 * something is waiting.
 */
import { saved } from './progress';
import { dailyReady, dailyPlan, dailyHayDone, dailyHayReward, helpersUnlocked } from './economy';
import { questViews, claimQuest, questsToClaim } from './quests';
import { showDaily } from './daily';
import { activeEvent, daysLeft } from './events';
import { centerOf, flyCells, flyCoins, holdCells, holdCoins, updateCellsPill, updateCoinPill } from './shop';
import { CELL_ART, GIFT_ART, HAY_ART, SCROLL_ART } from './art';
import { track } from './analytics';
import * as sfx from './sound';

const COIN = '<i class="coin"></i>';

/** True when the gift is waiting, the haystack is not done, or a quest can be claimed. */
export const todayPending = () => dailyReady() || !dailyHayDone() || questsToClaim() > 0;

export function openToday(opts: { onPlayDaily: () => void; onClose?: () => void }) {
  if (document.querySelector('dialog[open]')) return;
  const dlg = document.createElement('dialog');
  dlg.className = 'today';
  document.body.append(dlg);

  const chips = (coins: number, cells: number) => `<span class="chip coins small">${COIN}+${coins}</span>${helpersUnlocked() && cells ? `<span class="chip cells small">${CELL_ART}+${cells}</span>` : ''}`;

  const render = () => {
    const ev = activeEvent();
    const plan = dailyPlan(),
      giftReady = dailyReady(),
      hay = dailyHayReward(),
      hayDone = dailyHayDone();
    const event = ev ? `<div class="t-event"><b>${ev.name}</b><span>${ev.blurb} ${daysLeft(ev)} days left.</span></div>` : '';
    const gift = `<div class="t-row"><span class="t-ico">${GIFT_ART}</span><div class="t-info"><strong>Daily gift</strong><span>${giftReady ? `Day ${plan.day + 1} of 7 is waiting` : 'Claimed. Come back tomorrow'}</span></div>${giftReady ? `<div class="t-reward">${chips(plan.coins, plan.cells)}</div><button class="primary small" data-act="gift">Open</button>` : '<i class="done-mark">&#10003;</i>'}</div>`;
    const haystack = `<div class="t-row"><span class="t-ico">${HAY_ART}</span><div class="t-info"><strong>Today's haystack</strong><span>${hayDone ? `Found it! Streak: ${saved.dailyHay.streak} ${saved.dailyHay.streak === 1 ? 'day' : 'days'}` : `A big one, the same for everyone. ${hay.streak > 1 ? `Streak: ${hay.streak - 1} ${hay.streak === 2 ? 'day' : 'days'}` : 'Start a streak'}`}</span></div>${hayDone ? '<i class="done-mark">&#10003;</i>' : `<div class="t-reward">${chips(hay.coins, hay.cells)}</div><button class="primary small" data-act="hay">Play</button>`}</div>`;
    const quests = questViews()
      .map(q => {
        const pct = Math.round((q.n / q.goal) * 100);
        const action = q.claimed ? '<i class="done-mark">&#10003;</i>' : q.done ? `<button class="primary small" data-claim="${q.index}">Claim</button>` : `<span class="t-count">${Math.floor(q.n)}/${q.goal}</span>`;
        return `<li class="quest${q.done ? ' done' : ''}${q.claimed ? ' claimed' : ''}"><div class="q-info"><span>${q.text}</span><span class="q-bar"><i style="width:${pct}%"></i></span></div><div class="t-reward">${chips(q.reward.coins, q.reward.cells)}</div>${action}</li>`;
      })
      .join('');
    dlg.innerHTML = `<button class="close" aria-label="Close">&times;</button><h2>Today</h2>${event}${gift}${haystack}<h3 class="t-head"><span class="t-ico mini">${SCROLL_ART}</span>Quests</h3><ul class="quests">${quests}</ul><p class="t-foot">New gifts and quests every day.</p>`;
  };

  dlg.addEventListener('click', e => {
    const el = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
    if (!el) return;
    if (el.classList.contains('close')) {
      sfx.cancel();
      dlg.close();
    } else if (el.dataset.act === 'gift') {
      sfx.select();
      dlg.close();
      showDaily({ onClose: opts.onClose });
    } else if (el.dataset.act === 'hay') {
      sfx.select();
      track('daily_haystack_start');
      dlg.close();
      opts.onPlayDaily();
    } else if (el.dataset.claim !== undefined) {
      const from = centerOf(el),
        r = claimQuest(Number(el.dataset.claim));
      if (!r) return;
      sfx.found(0, false);
      track('quest_claimed', { coins: r.coins, cells: r.cells });
      holdCoins(r.coins);
      if (r.cells) holdCells(r.cells);
      updateCoinPill();
      updateCellsPill();
      render();
      flyCoins(from, r.coins);
      if (r.cells) flyCells(from, r.cells);
    }
  });
  dlg.addEventListener('close', () => {
    dlg.remove();
    opts.onClose?.();
  });
  render();
  dlg.showModal();
  sfx.unlockTool();
}
