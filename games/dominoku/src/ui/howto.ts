import type { Progress } from '../game/progress';
import { parseTile } from '../game/dominoes';
import { h } from './dom';
import { pieceEl } from './piece';
import { openSheet } from './sheet';

/** A tiny solved 2x2 board built from the same elements as the real one. */
function exampleBoard(): HTMLElement {
  const board = h('div', { class: 'board example', 'aria-hidden': 'true' });
  board.style.setProperty('--n', '2');
  board.style.setProperty('--cell', '44px');
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const slot = h('div', { class: 'slot' });
      slot.style.gridArea = `${r + 1} / ${c + 1}`;
      board.append(slot);
    }
  }
  const put = (id: string, row: number) => {
    const el = pieceEl(parseTile(id), 0, ['placed']);
    el.style.setProperty('--r', String(row));
    el.style.setProperty('--c', '0');
    board.append(el);
  };
  put('1-2', 0);
  put('3-4', 1);
  const line = (kind: 'row' | 'col', i: number, target: number) => {
    const el = h('div', { class: `line ${kind} match` }, h('span', { class: 'target' }, String(target)), h('span', { class: 'total' }, h('i', {}, '\u2713'), String(target)));
    el.style.gridArea = kind === 'row' ? `${i + 1} / 3` : `3 / ${i + 1}`;
    board.append(el);
  };
  line('row', 0, 3);
  line('row', 1, 7);
  line('col', 0, 4);
  line('col', 1, 6);
  return board;
}

const STEPS: [string, string][] = [
  ['Tap a domino to turn it.', 'Then tap an empty square to place it, or drag it there.'],
  ['Double-tap a placed domino to take it back.', 'Tan dominoes are locked and cannot be moved.'],
  ['Watch the small number beside each target.', 'Gray means you are short. A solid \u2713 means it matches. An outlined \u25B2 means you are over.'],
  ['Fill every square.', 'Each puzzle has exactly one solution. Undo and Restart are always there.'],
];

export function openHowTo(progress: Progress): void {
  progress.markHowToSeen();
  openSheet(
    'How to play',
    [
      h('h2', {}, 'How to play'),
      h('p', { class: 'goal' }, 'Fill the grid with dominoes so every row and column adds up to the number beside it.'),
      h('div', { class: 'example-wrap' }, exampleBoard()),
      h('ol', { class: 'steps' }, ...STEPS.map(([a, b]) => h('li', {}, h('strong', {}, a), h('span', {}, b)))),
      h('p', { class: 'keys' }, 'Keyboard: arrow keys move over the grid, R turns the chosen domino, Enter places it, Backspace takes it back, 1 to 9 choose a domino, Z undoes.'),
      h('div', { class: 'sheet-actions' }, h('button', { class: 'btn primary', type: 'button', 'data-close': '' }, 'Got it')),
    ],
    { wide: true },
  );
}