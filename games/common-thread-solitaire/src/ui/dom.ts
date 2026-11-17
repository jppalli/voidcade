import { ICONS } from '../data/icons';

export type Child = Node | string | null | undefined | false;
export type Props = Record<string, any>;

/**
 * Tiny element builder: `el('div', { class: 'card', onclick: fn, style: {...}, html: '<b>x</b>' }, child, ...)`.
 * Keys starting with "on" become event listeners; null/undefined/false props are skipped.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = String(value);
    else if (key === 'html') node.innerHTML = String(value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children) {
    if (child !== null && child !== undefined && child !== false) {
      node.append(child instanceof Node ? child : document.createTextNode(child));
    }
  }
  return node;
}

export type IconName = keyof typeof ICONS;

/** An inline SVG icon from the icon set, wrapped in `<i class="ico">`. */
export const icon = (name: string, className = 'ico') =>
  el('i', { class: className, html: (ICONS as Record<string, string>)[name] ?? '' });

/** Speaks a message to screen readers through the #sr live region. */
export function announce(message: string): void {
  const region = document.getElementById('sr');
  if (region) {
    region.textContent = '';
    setTimeout(() => (region.textContent = message), 30);
  }
}
