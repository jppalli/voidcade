import { el, icon, type Child } from './dom';
import { ICONS } from '../data/icons';
import { audio } from '../audio/audio';
import type { AdKind } from '../platform/sdk';

export interface ModalButton {
  label: Child;
  /** Extra class on the button: "blue", "gold", "light", "ghost". */
  kind?: string;
  icon?: string;
  disabled?: boolean;
  /** Keep the dialog open after the click. */
  keepOpen?: boolean;
  /** Return false to keep the dialog open. */
  onClick?: () => unknown;
}

export interface ModalOptions {
  title: string;
  body?: string | Node;
  buttons?: ModalButton[];
  /** Default true: shows a close button and closes on Esc or a tap outside. */
  dismissible?: boolean;
  onClose?: () => void;
}

/** Opens a dialog. Returns a function that closes it. */
export function openModal(options: ModalOptions): () => void {
  const previousFocus = document.activeElement as HTMLElement | null;
  const dismissible = options.dismissible !== false;

  const close = () => {
    scrim.remove();
    document.removeEventListener('keydown', onKey, true);
    options.onClose?.();
    previousFocus?.focus?.();
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && dismissible) {
      event.stopPropagation();
      close();
    }
  };

  const header = el(
    'div',
    { class: 'mh', id: 'mh' },
    options.title,
    dismissible
      ? el('button', {
          class: 'close',
          'aria-label': 'Close',
          html: ICONS.close,
          onclick: () => {
            audio.click();
            close();
          },
        })
      : null,
  );
  const body = options.body
    ? el('div', { class: 'mb' }, typeof options.body === 'string' ? el('p', { style: { margin: '0' } }, options.body) : options.body)
    : null;

  const footer = el('div', { class: 'mf' });
  for (const spec of options.buttons ?? []) {
    const button = el(
      'button',
      { class: `btn ${spec.kind ?? ''}`, disabled: spec.disabled },
      spec.icon ? icon(spec.icon) : null,
      spec.label,
    );
    button.addEventListener('click', async () => {
      audio.click();
      const result = await spec.onClick?.();
      if (!spec.keepOpen && result !== false) close();
    });
    footer.append(button);
  }

  const dialog = el(
    'div',
    { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mh' },
    header,
    body,
    footer,
  );
  const scrim = el('div', { class: 'scrim' }, dialog);
  scrim.addEventListener('pointerdown', (event) => {
    if (event.target === scrim && dismissible) close();
  });
  document.addEventListener('keydown', onKey, true);
  document.body.append(scrim);
  footer.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();
  return close;
}

/** A coin icon followed by an amount. */
export function coinLine(amount: string | number): HTMLElement {
  return el('span', { class: 'coinline' }, icon('coin', ''), String(amount));
}

/**
 * Stand-in ad used when the Arkadium SDK is not present. Counts down, then resolves true.
 * "Close" resolves true for an interstitial (skipped) and false for a rewarded ad (no reward).
 */
export function mockAd(kind: AdKind): Promise<boolean> {
  return new Promise((resolve) => {
    let seconds = kind === 'rewarded' ? 4 : 3;
    const countdown = el('div', { class: 'cd' }, String(seconds));
    const closeButton = el(
      'button',
      { class: 'btn ghost', style: { color: '#ccc' } },
      kind === 'rewarded' ? 'Close (no reward)' : 'Skip',
    );
    const screen = el(
      'div',
      { class: 'adscrim', role: 'dialog', 'aria-label': 'Advertisement' },
      el(
        'div',
        {},
        el(
          'div',
          { class: 'adbox' },
          el('span', { class: 'tag' }, 'AD'),
          el('div', {}, countdown, el('div', {}, kind === 'rewarded' ? 'Rewarded video' : 'Advertisement')),
        ),
        el('p', {}, 'Mock ad for the vertical slice. On Arkadium.com the Arkadium SDK plays a real video here.'),
        closeButton,
      ),
    );
    document.body.append(screen);
    const timer = setInterval(() => {
      seconds--;
      countdown.textContent = String(Math.max(seconds, 0));
      if (seconds <= 0) {
        clearInterval(timer);
        screen.remove();
        resolve(true);
      }
    }, 1000);
    closeButton.addEventListener('click', () => {
      clearInterval(timer);
      screen.remove();
      resolve(kind === 'interstitial');
    });
  });
}
