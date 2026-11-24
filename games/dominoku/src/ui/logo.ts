let counter = 0;

/** The Dominoku mark: one domino placed on a grid with two squares still empty. Takes its color from the text color. */
export function logo(size = 72): HTMLElement {
  const id = `dk-holes-${++counter}`;
  const el = document.createElement('span');
  el.className = 'mark';
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', 'Dominoku');
  el.style.width = el.style.height = `${size}px`;
  el.innerHTML = `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" focusable="false">
    <defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
      <rect width="100" height="100" fill="#fff"/>
      <g fill="#000"><circle cx="18.5" cy="18.5" r="4.4"/><circle cx="28" cy="28" r="4.4"/><circle cx="37.5" cy="37.5" r="4.4"/>
      <circle cx="62.5" cy="18.5" r="4.4"/><circle cx="81.5" cy="18.5" r="4.4"/><circle cx="62.5" cy="37.5" r="4.4"/><circle cx="81.5" cy="37.5" r="4.4"/></g>
      <line x1="50" y1="15" x2="50" y2="41" stroke="#000" stroke-width="3.4" stroke-linecap="round"/>
    </mask></defs>
    <rect x="9" y="9" width="82" height="38" rx="11" fill="currentColor" mask="url(#${id})"/>
    <rect x="11.5" y="55.5" width="33" height="33" rx="8.5" fill="none" stroke="currentColor" stroke-width="5"/>
    <rect x="55.5" y="55.5" width="33" height="33" rx="8.5" fill="none" stroke="currentColor" stroke-width="5"/>
  </svg>`;
  return el;
}