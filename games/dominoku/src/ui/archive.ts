import { isPlayableDay, monthCells, monthInRange, shiftMonth } from '../game/calendar';
import { dateKey } from '../game/daily';
import type { Progress } from '../game/progress';
import { h } from './dom';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Month calendar of every playable day, with a dot for each solved puzzle. */
export function mountArchive(root: HTMLElement, progress: Progress, today: Date): void {
  let view = { year: today.getFullYear(), month: today.getMonth() };
  const todayKey = dateKey(today);
  const wrap = h('div', { class: 'archive' });
  root.append(wrap);

  const render = () => {
    const prev = shiftMonth(view.year, view.month, -1);
    const next = shiftMonth(view.year, view.month, 1);
    const prevBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Previous month' }, '\u2039');
    const nextBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Next month' }, '\u203A');
    prevBtn.disabled = !monthInRange(prev.year, prev.month, today);
    nextBtn.disabled = !monthInRange(next.year, next.month, today);
    prevBtn.addEventListener('click', () => ((view = prev), render()));
    nextBtn.addEventListener('click', () => ((view = next), render()));

    const grid = h('div', { class: 'cal' }, ...WEEKDAYS.map((d) => h('span', { class: 'cal-head', 'aria-hidden': 'true' }, d)));
    for (const day of monthCells(view.year, view.month)) {
      if (day === null) {
        grid.append(h('span', { class: 'cal-day empty' }));
        continue;
      }
      const date = new Date(view.year, view.month, day);
      const key = dateKey(date);
      const solved = [2, 4, 6].filter((s) => progress.get(key, s as 2 | 4 | 6)?.solved).length;
      const dots = h('span', { class: 'dots', 'aria-hidden': 'true' }, ...[0, 1, 2].map((i) => h('i', { class: i < solved ? 'on' : '' })));
      const label = `${date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}, ${solved} of 3 solved`;
      const cls = `cal-day${key === todayKey ? ' today' : ''}${solved === 3 ? ' full' : ''}`;
      grid.append(
        isPlayableDay(date, today)
          ? h('a', { class: cls, href: key === todayKey ? '#/' : `#/d/${key}`, 'aria-label': label }, h('b', {}, String(day)), dots)
          : h('span', { class: `${cls} off`, 'aria-hidden': 'true' }, h('b', {}, String(day))),
      );
    }

    wrap.replaceChildren(
      h('div', { class: 'cal-nav' }, prevBtn, h('h2', {}, new Date(view.year, view.month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })), nextBtn),
      grid,
      h('p', { class: 'fine' }, 'Puzzles from the archive do not add to your streak.'),
    );
  };
  render();
}
