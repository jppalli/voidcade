// Neon SVG icons — same rendering system as Stackward.
// 24x24 stroke-only glyphs rendered as inline SVG with neon glow.
const PATHS = {
  dash:    '<line x1="6" y1="12" x2="18" y2="12" />',
  coin:    '<circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="5.5" stroke-opacity="0.6" /><path d="M12 8.2 V15.8" stroke-opacity="0.6" />',
  shield:  '<path d="M12 3 L19 6 V12 C19 17 15.5 20 12 21 C8.5 20 5 17 5 12 V6 Z" />',
  gem:     '<path d="M7 9 L12 4 L17 9 L12 20 Z" /><path d="M7 9 L17 9" stroke-opacity="0.55" />',
  slow:    '<circle cx="12" cy="12" r="8" /><path d="M12 8 V12 L15 14" />',
  target:  '<circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.4" /><line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" /><line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" />',
  bolt:    '<path d="M13 3 L6 13 H11 L10 21 L18 10 H13 Z" />',
  magnet:  '<path d="M6 4 V12 A6 6 0 0 0 18 12 V4" /><line x1="6" y1="4" x2="6" y2="7" stroke-opacity="0.6" /><line x1="18" y1="4" x2="18" y2="7" stroke-opacity="0.6" />',
  refresh: '<path d="M5 12 A7 7 0 0 1 17.5 7.5" /><path d="M19 12 A7 7 0 0 1 6.5 16.5" /><path d="M17 4 L17.5 7.5 L14 8" /><path d="M7 20 L6.5 16.5 L10 16" />',
  // Voidburst-specific icons
  // Bouncer: ball bouncing off a wall
  bouncer: '<path d="M4 20 L12 4 L20 12" /><path d="M20 12 L20 20" stroke-opacity="0.5" />',
  // Cluster: three dots spreading
  cluster: '<circle cx="12" cy="14" r="2.5" /><circle cx="6" cy="7" r="2" /><circle cx="18" cy="7" r="2" /><line x1="12" y1="11.5" x2="7" y2="8.5" stroke-opacity="0.55" /><line x1="12" y1="11.5" x2="17" y2="8.5" stroke-opacity="0.55" />',
  // Color wipe: swipe line clearing bubbles
  wipe:    '<path d="M4 12 Q12 6 20 12" /><path d="M4 16 Q12 10 20 16" stroke-opacity="0.55" /><line x1="3" y1="9" x2="3" y2="19" /><line x1="21" y1="9" x2="21" y2="19" />',
  // Freeze: snowflake
  freeze:  '<line x1="12" y1="3" x2="12" y2="21" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="5.6" y1="5.6" x2="18.4" y2="18.4" /><line x1="18.4" y1="5.6" x2="5.6" y2="18.4" /><circle cx="12" cy="12" r="2" />',
  // Bomb: explosion circle
  bomb:    '<circle cx="12" cy="13" r="7" /><path d="M15 6 L17 4" /><circle cx="17.5" cy="3.5" r="1.5" /><line x1="9" y1="10" x2="15" y2="16" stroke-opacity="0.6" />',
  // Ghost: see-through bubble
  ghost:   '<circle cx="12" cy="10" r="6" stroke-dasharray="3 2" /><path d="M6 10 V18 Q9 16 12 18 Q15 16 18 18 V10" stroke-dasharray="3 2" />',
};

export function renderIcon(key, color = '#9ad9ff', size = 22) {
  const inner = PATHS[key] || PATHS.dash;
  return `<svg class="neon-icon" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none"
    stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
    style="--neon-color:${color}">${inner}</svg>`;
}
