import './styles.css';
import { initSound, unlockSound } from './audio/sound';
import { isPlayableDay, parseDateKey } from './game/calendar';
import { dateKey, puzzlesFor } from './game/daily';
import { Progress } from './game/progress';
import type { Size } from './game/types';
import { createStore } from './platform/storage';
import { mountArchive } from './ui/archive';
import { appBar, initTheme } from './ui/chrome';
import { h } from './ui/dom';
import { mountDay } from './ui/home';
import { openHowTo } from './ui/howto';
import { mountPuzzle } from './ui/puzzle';
import { mountStats } from './ui/stats';

const progress = new Progress(createStore(), new Date());
initTheme(progress);
initSound(progress.sound);

// Browsers only allow audio after a tap or key press.
const unlock = () => {
  unlockSound();
  window.removeEventListener('pointerdown', unlock);
  window.removeEventListener('keydown', unlock);
};
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

const app = document.getElementById('app')!;
let cleanup: (() => void) | null = null;

const ORDER: Size[] = [2, 4, 6];

function route(): void {
  cleanup?.();
  cleanup = null;
  app.replaceChildren();

  const today = new Date();
  const todayKey = dateKey(today);
  const hash = location.hash;
  const main = h('main', { class: 'main' });

  const archivePuzzle = /^#\/d\/(\d{4}-\d{2}-\d{2})(?:\/p\/(2|4|6))?$/.exec(hash);
  const todayPuzzle = /^#\/p\/(2|4|6)$/.exec(hash);

  // A day link: validate it, and send today's date to the normal screens.
  let date = today;
  let base = '#';
  let homeHref = '#/';
  let size: Size | null = todayPuzzle ? (Number(todayPuzzle[1]) as Size) : null;
  let day: 'today' | 'archive' = 'today';
  if (archivePuzzle) {
    const parsed = parseDateKey(archivePuzzle[1]);
    if (!parsed || !isPlayableDay(parsed, today)) {
      location.replace('#/archive');
      return;
    }
    if (archivePuzzle[1] === todayKey) {
      location.replace(archivePuzzle[2] ? `#/p/${archivePuzzle[2]}` : '#/');
      return;
    }
    date = parsed;
    base = `#/d/${archivePuzzle[1]}`;
    homeHref = base;
    size = archivePuzzle[2] ? (Number(archivePuzzle[2]) as Size) : null;
    day = 'archive';
  }
  const puzzles = puzzlesFor(date);

  if (size) {
    const puzzle = puzzles.find((p) => p.size === size)!;
    const next = ORDER[ORDER.indexOf(size) + 1] ?? null;
    app.append(appBar({ title: `${size}\u00D7${size}`, backHref: homeHref, progress }), main);
    cleanup = mountPuzzle(main, { date, puzzle, progress, next, base, homeHref });
    document.title = `Dominoku ${size}\u00D7${size} \u00B7 ${dateKey(date)}`;
  } else if (hash === '#/archive') {
    app.append(appBar({ title: 'Archive', backHref: '#/', progress }), main);
    mountArchive(main, progress, today);
    document.title = 'Dominoku \u00B7 Archive';
  } else if (hash === '#/stats') {
    app.append(appBar({ title: 'Statistics', backHref: '#/', progress }), main);
    mountStats(main, progress, today);
    document.title = 'Dominoku \u00B7 Statistics';
  } else {
    app.append(appBar({ title: day === 'today' ? 'Dominoku' : 'Archive', backHref: day === 'archive' ? '#/archive' : undefined, progress }), main);
    mountDay(main, { date, today, puzzles, progress, base });
    document.title = 'Dominoku';
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
if (!progress.seenHowTo) openHowTo(progress);