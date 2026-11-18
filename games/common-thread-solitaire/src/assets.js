import { paintedIllustrations } from './art/painted';
var svg = t => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${t}</svg>`,
  illustrations = paintedIllustrations,
  picture = t => `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${t}</svg>`,
  icons = {
    spool: picture('<rect x="5" y="3" width="14" height="3" rx="1" fill="currentColor"/><rect x="5" y="18" width="14" height="3" rx="1" fill="currentColor"/><path d="M7 6v12M17 6v12M7 9l10 2M7 12l10 2M7 15l10 2"/><path d="M17 16c3 1 4 4 2 6"/>'),
    hint: picture('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>'),
    undo: picture('<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),
    wild: picture('<path d="M4 20c4-2 6-6 8-10s4-6 8-6"/><path d="M4 14c4 0 6-3 8-6M12 20c3-1 5-4 6-8"/><circle cx="19" cy="5" r="1.5" fill="currentColor"/>'),
    coin: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#E8A33D" stroke="#9A6614" stroke-width="1.5"/><circle cx="12" cy="12" r="6.5" fill="none" stroke="#FCE7B8" stroke-width="1.5" stroke-dasharray="2 2"/></svg>',
    home: picture('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
    gear: picture('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    sound: picture('<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>'),
    mute: picture('<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M23 9l-6 6M17 9l6 6"/>'),
    calendar: picture('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
    play: picture('<path d="M6 4l14 8-14 8z" fill="currentColor"/>'),
    shuffle: picture('<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>'),
    flame: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z" fill="#F08A3C" stroke="#9A4A14" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 13c1 2 3 3 3 5a3 3 0 0 1-6 0c0-2 2-3 3-5z" fill="#F4C13C"/></svg>',
    chest: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 10a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v1H3z" fill="#B5452B" stroke="#5B2414" stroke-width="1.5"/><rect x="3" y="11" width="18" height="9" rx="1.5" fill="#C9673F" stroke="#5B2414" stroke-width="1.5"/><rect x="10" y="9" width="4" height="5" rx="1" fill="#E8A33D" stroke="#5B2414" stroke-width="1.2"/></svg>',
    check: picture('<path d="M5 13l4 4L19 7"/>'),
    lock: picture('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
    close: picture('<path d="M6 6l12 12M18 6L6 18"/>'),
    needle: picture('<path d="M4 20L18 6"/><ellipse cx="19" cy="5" rx="2" ry="1" transform="rotate(-45 19 5)"/><path d="M18 6c2 4-2 8-6 7s-6 4-4 7"/>'),
    film: picture('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4"/>'),
    ad: picture('<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M10 9l5 3-5 3z" fill="currentColor"/>')
  };
export { svg, illustrations, picture, icons };
