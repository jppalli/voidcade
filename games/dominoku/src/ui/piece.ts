import { isFlat } from '../game/dominoes';
import type { Orientation, Tile } from '../game/types';
import { h } from './dom';
import { pipsSvg } from './pips';

/** A domino element in the given orientation. Size comes from the --cell variable of its container. */
export function pieceEl(tile: Tile, orientation: Orientation, classes: string[] = []): HTMLElement {
  const flat = isFlat(orientation);
  const first = orientation < 2 ? tile.a : tile.b;
  const second = orientation < 2 ? tile.b : tile.a;
  const el = h('div', { class: ['piece', flat ? 'flat' : 'stand', ...classes].join(' '), 'data-tile': tile.id });
  const half = (n: number) => {
    const s = h('span', { class: 'half' });
    s.innerHTML = pipsSvg(n, !flat);
    return s;
  };
  el.append(half(first), half(second));
  return el;
}