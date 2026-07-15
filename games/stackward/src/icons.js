// Small hand-drawn neon-style SVG icons for blessings/powerups.
// Plain vector line art, no emoji. Rendered as inline SVG strings so they
// can be dropped straight into card markup and pick up a CSS neon glow
// (see .neon-icon in style.css).
//
// Each icon is a 24x24 stroke-only glyph. `stroke` is passed in per-render
// so the same path set can be recolored (e.g. gold for powerups, cyan for
// blessings) without duplicating markup.

const PATHS = {
  // simple horizontal dash - "no effect" / none
  dash: '<line x1="6" y1="12" x2="18" y2="12" />',

  // shield outline - safety net / guardian shield
  shield: '<path d="M12 3 L19 6 V12 C19 17 15.5 20 12 21 C8.5 20 5 17 5 12 V6 Z" />',

  // hourglass-ish clock lines - slow hands / slow-mo
  slow: '<circle cx="12" cy="12" r="8" /><path d="M12 8 V12 L15 14" />',

  // forward chevrons - momentum / pace
  pace: '<path d="M8 6 L14 12 L8 18" /><path d="M13 6 L19 12 L13 18" stroke-opacity="0.55" />',

  // gem / coin outline - fortune / gold rush
  gem: '<path d="M7 9 L12 4 L17 9 L12 20 Z" /><path d="M7 9 L17 9" stroke-opacity="0.55" />',

  // crosshair / target - steady grip / steady hands
  target: '<circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.4" /><line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" /><line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" />',

  // brick wall grid - wide base
  wall: '<rect x="3" y="6" width="7" height="5" /><rect x="10" y="6" width="7" height="5" /><rect x="17" y="6" width="4" height="5" /><rect x="3" y="13" width="4" height="5" /><rect x="7" y="13" width="7" height="5" /><rect x="14" y="13" width="7" height="5" />',

  // upward sprout / trend arrow - growth spurt
  sprout: '<path d="M12 20 V10" /><path d="M12 10 C8 10 6 7 6 4 C9 4 12 6 12 10" /><path d="M12 10 C16 10 18 7 18 4 C15 4 12 6 12 10" />',

  // circular refresh arrow - second wind
  refresh: '<path d="M5 12 A7 7 0 0 1 17.5 7.5" /><path d="M19 12 A7 7 0 0 1 6.5 16.5" /><path d="M17 4 L17.5 7.5 L14 8" /><path d="M7 20 L6.5 16.5 L10 16" />',

  // coin - used for currency displays (HUD, menu, game over)
  coin: '<circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="5.5" stroke-opacity="0.6" /><path d="M12 8.2 V15.8" stroke-opacity="0.6" />',

  // U-shaped horseshoe magnet - magnet powerup
  magnet: '<path d="M6 4 V12 A6 6 0 0 0 18 12 V4" /><path d="M6 4 H10 V12 A2 2 0 0 0 14 12 V4 H18" /><line x1="6" y1="4" x2="6" y2="7" stroke-opacity="0.6" /><line x1="18" y1="4" x2="18" y2="7" stroke-opacity="0.6" />',

  // stacked coins - jackpot powerup
  jackpot: '<ellipse cx="12" cy="7" rx="7" ry="2.6" /><path d="M5 7 V13 C5 14.4 8.1 15.6 12 15.6 C15.9 15.6 19 14.4 19 13 V7" /><path d="M5 10 C5 11.4 8.1 12.6 12 12.6 C15.9 12.6 19 11.4 19 10" stroke-opacity="0.55" />',

  // falling feather - feather fall powerup
  feather: '<path d="M18 5 C9 5 5 11 5 19 C13 19 19 15 19 6 Z" /><path d="M15 8 L8 15" stroke-opacity="0.6" /><path d="M16 11 L11 16" stroke-opacity="0.45" /><path d="M5 19 L3 21" />',

  // target outline with drop line - precision guide powerup
  guide: '<rect x="6" y="13" width="12" height="7" /><line x1="12" y1="3" x2="12" y2="10" stroke-dasharray="2 2" /><path d="M9 7 L12 10 L15 7" />',

  // lightning bolt - spare glyph (kept for future powerups)
  bolt: '<path d="M13 3 L6 13 H11 L10 21 L18 10 H13 Z" />',
};

export function renderIcon(key, color = '#9ad9ff', size = 22) {
  const inner = PATHS[key] || PATHS.dash;
  return `<svg class="neon-icon" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none"
    stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
    style="--neon-color:${color}">${inner}</svg>`;
}
