// Small neon-style SVG icons for the powerup-choice cards. Plain vector
// line art, no emoji — same rendering approach as the rest of the arcade.
const PATHS = {
  multishot: '<circle cx="12" cy="15" r="2.4" /><circle cx="6" cy="7" r="1.8" /><circle cx="18" cy="7" r="1.8" /><line x1="12" y1="12.6" x2="7" y2="8.6" stroke-opacity="0.55" /><line x1="12" y1="12.6" x2="17" y2="8.6" stroke-opacity="0.55" />',
  bigbang:   '<circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" /><line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" /><line x1="5" y1="5" x2="7.2" y2="7.2" stroke-opacity="0.6" /><line x1="19" y1="5" x2="16.8" y2="7.2" stroke-opacity="0.6" /><line x1="5" y1="19" x2="7.2" y2="16.8" stroke-opacity="0.6" /><line x1="19" y1="19" x2="16.8" y2="16.8" stroke-opacity="0.6" />',
  freeze:    '<line x1="12" y1="3" x2="12" y2="21" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="5.6" y1="5.6" x2="18.4" y2="18.4" /><line x1="18.4" y1="5.6" x2="5.6" y2="18.4" /><circle cx="12" cy="12" r="2" />',
  chain:     '<circle cx="9" cy="12" r="4" /><circle cx="15" cy="12" r="4" stroke-opacity="0.6" />',
  colorbomb: '<circle cx="12" cy="13" r="7" /><path d="M15 6 L17 4" /><circle cx="17.5" cy="3.5" r="1.5" /><line x1="9" y1="10" x2="15" y2="16" stroke-opacity="0.6" />',
  jackpot:   '<path d="M7 9 L12 4 L17 9 L12 20 Z" /><path d="M7 9 L17 9" stroke-opacity="0.55" />',
  coin:      '<circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="5.5" stroke-opacity="0.6" /><path d="M12 8.2 V15.8" stroke-opacity="0.6" />',
  rainbow:   '<path d="M4 17 A8 8 0 0 1 20 17" /><path d="M7 17 A5 5 0 0 1 17 17" stroke-opacity="0.6" /><circle cx="12" cy="17" r="1.6" />',
  slowmo:    '<circle cx="12" cy="12" r="8" /><path d="M12 8 V12 L15 14" /><path d="M4 4 L6 6" stroke-opacity="0.5" /><path d="M20 4 L18 6" stroke-opacity="0.5" />',
};

export function renderIcon(key, color = '#8ab6ff', size = 22) {
  const inner = PATHS[key] || '';
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none"
    stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
    style="filter:drop-shadow(0 0 3px ${color}88)">${inner}</svg>`;
}
