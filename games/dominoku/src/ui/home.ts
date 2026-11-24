import { dateKey, dayIndex } from '../game/daily';
import { computeStats } from '../game/stats';
import type { Progress } from '../game/progress';
import type { Puzzle } from '../game/types';
import { h } from './dom';
import { logo } from './logo';

const LABEL: Record<number, string> = { 2: 'Easy', 4: 'Medium', 6: 'Hard' };

export interface DayOptions {
  date: Date;
  today: Date;
  puzzles: Puzzle[];
  progress: Progress;
  /** Where puzzle links go: "#" for today, "#/d/YYYY-MM-DD" for an archive day. */
  base: string;
}

/** The three puzzles of one day. Used for today and for archive days. */
export function mountDay(root: HTMLElement, o: DayOptions): void {
  const key = dateKey(o.date);
  const isToday = key === dateKey(o.today);
  const cards = o.puzzles.map((p) => {
    const saved = o.progress.get(key, p.size);
    const state = saved?.solved ? '\u2713 Solved' : saved && saved.placed.length > 0 ? 'In progress' : 'Play';
    return h(
      'a',
      { class: `card ${saved?.solved ? 'done' : ''}`, href: `${o.base}/p/${p.size}` },
      h('span', { class: 'card-size' }, `${p.size}\u00D7${p.size}`),
      h('span', { class: 'card-meta' }, h('strong', {}, LABEL[p.size]), h('span', {}, `${p.tiles.length} dominoes`)),
      h('span', { class: 'card-state' }, state),
    );
  });

  const top: (HTMLElement | null)[] = [
    isToday ? logo(72) : null,
    h('p', { class: 'date' }, o.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: isToday ? undefined : 'numeric' })),
  ];
  if (isToday) {
    const streak = computeStats(o.progress.days, o.today).currentStreak;
    top.push(
      h('p', { class: 'streak' + (streak > 0 ? ' on' : '') }, streak > 0 ? `${streak} day streak` : 'Solve a puzzle to start a streak'),
      h('p', { class: 'lead' }, 'Place every domino so each row and column adds up to its number.'),
    );
  } else {
    top.push(h('p', { class: 'lead' }, 'From the archive. Solving it does not add to your streak.'));
  }

  const links = isToday
    ? h('div', { class: 'links' }, h('a', { class: 'btn', href: '#/archive' }, 'Archive'), h('a', { class: 'btn', href: '#/stats' }, 'Stats'))
    : null;

  root.append(
    h(
      'div',
      { class: 'home' },
      ...top,
      h('div', { class: 'cards' }, ...cards),
      links,
      h('p', { class: 'fine' }, `Puzzle set No. ${dayIndex(o.date) + 1}`),
    ),
  );
}