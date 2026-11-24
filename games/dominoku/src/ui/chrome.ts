import type { Progress, Theme } from '../game/progress';
import { play, setMusic, setSfx } from '../audio/sound';
import { h } from './dom';
import { openHowTo } from './howto';
import { openSheet } from './sheet';

export function announce(message: string): void {
  const live = document.getElementById('live');
  if (!live) return;
  live.textContent = '';
  window.setTimeout(() => (live.textContent = message), 30);
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#121212' : '#ffffff');
}

export function initTheme(progress: Progress): void {
  applyTheme(progress.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
}

/** A labelled on/off switch. */
function toggleRow(label: string, hint: string, value: boolean, onChange: (on: boolean) => void): HTMLElement {
  const input = h('input', { type: 'checkbox', role: 'switch', class: 'switch-input' });
  input.checked = value;
  input.addEventListener('change', () => onChange(input.checked));
  return h(
    'label',
    { class: 'row-toggle' },
    h('span', { class: 'row-text' }, h('strong', {}, label), h('span', {}, hint)),
    input,
    h('span', { class: 'switch', 'aria-hidden': 'true' }),
  );
}

export function openSettings(progress: Progress): void {
  const prefs = progress.sound;
  const save = () => progress.setSound(prefs);
  openSheet('Sound settings', [
    h('h2', {}, 'Sound'),
    toggleRow('Sound effects', 'Clacks, chimes and taps', prefs.sfx, (on) => {
      prefs.sfx = on;
      setSfx(on);
      save();
    }),
    toggleRow('Music', 'Quiet background loop', prefs.music, (on) => {
      prefs.music = on;
      setMusic(on);
      save();
    }),
    h('div', { class: 'sheet-actions' }, h('button', { class: 'btn primary', type: 'button', 'data-close': '' }, 'Done')),
  ]);
}

/** Top bar: optional back link, title, help, sound settings and theme toggle. */
export function appBar(opts: { title: string; backHref?: string; progress: Progress }): HTMLElement {
  const theme = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Switch light and dark theme', title: 'Theme' }, '\u25D0');
  theme.addEventListener('click', () => {
    const next: Theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    opts.progress.setTheme(next);
    play('tap');
  });
  const sound = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Sound settings', title: 'Sound' }, '\u266A');
  sound.addEventListener('click', () => openSettings(opts.progress));
  const help = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'How to play', title: 'How to play' }, '?');
  help.addEventListener('click', () => openHowTo(opts.progress));
  return h(
    'header',
    { class: 'bar' },
    opts.backHref ? h('a', { class: 'icon-btn', href: opts.backHref, 'aria-label': 'Back' }, '\u2190') : h('span', { class: 'icon-btn ghost' }),
    h('h1', { class: 'title' }, opts.title),
    h('div', { class: 'bar-actions' }, help, sound, theme),
  );
}