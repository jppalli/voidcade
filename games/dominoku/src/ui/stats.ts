import type { Progress } from '../game/progress';
import { computeStats, formatTime } from '../game/stats';
import { h } from './dom';

export function mountStats(root: HTMLElement, progress: Progress, today: Date): void {
  const s = computeStats(progress.days, today);
  const tile = (value: string | number, label: string) => h('div', { class: 'stat' }, h('b', {}, String(value)), h('span', {}, label));
  const row = (size: 2 | 4 | 6) => {
    const z = s.bySize[size];
    return h('tr', {}, h('th', { scope: 'row' }, `${size}\u00D7${size}`), h('td', {}, String(z.solved)), h('td', {}, formatTime(z.bestMs)), h('td', {}, formatTime(z.avgMs)));
  };
  root.append(
    h(
      'div',
      { class: 'stats' },
      h('div', { class: 'tiles' }, tile(s.currentStreak, 'Current streak'), tile(s.longestStreak, 'Longest streak'), tile(s.solved, 'Puzzles solved'), tile(s.daysComplete, 'Days completed')),
      h(
        'table',
        { class: 'by-size' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Size'), h('th', {}, 'Solved'), h('th', {}, 'Best'), h('th', {}, 'Average'))),
        h('tbody', {}, row(2), row(4), row(6)),
      ),
      h('p', { class: 'fine' }, 'A day counts toward your streak when you solve at least one of its puzzles on that day. Archive puzzles do not count. A completed day means all three puzzles are solved.'),
    ),
  );
}