import { h } from './dom';

/**
 * A modal sheet over the page. Closes on Escape, on a click outside, and on any element
 * with `data-close`. Focus moves into the sheet and returns to where it was.
 */
export function openSheet(label: string, content: HTMLElement[], opts: { wide?: boolean; onClose?: () => void } = {}): () => void {
  const returnTo = document.activeElement as HTMLElement | null;
  const sheet = h('div', { class: `sheet left${opts.wide ? ' wide' : ''}` }, ...content);
  const overlay = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': label }, sheet);
  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    returnTo?.focus?.();
    opts.onClose?.();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const items = [...sheet.querySelectorAll<HTMLElement>('button, a[href], input')];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus());
      else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus());
    }
  };
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || (e.target as HTMLElement).closest('[data-close]')) close();
  });
  document.addEventListener('keydown', onKey);
  document.body.append(overlay);
  (sheet.querySelector<HTMLElement>('[data-close]') ?? sheet.querySelector<HTMLElement>('button, input'))?.focus();
  return close;
}
