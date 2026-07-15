// Logical (design) resolution — the canvas is scaled to fit the screen.
export const W = 480;
export const H = 720;

export const COLS = 12;
// Odd rows are offset half a bubble, so the widest row spans 2*COLS+1 radii.
export const R = W / (2 * COLS + 1);
export const ROW_H = R * Math.sqrt(3);
export const MAX_ROWS = 40;

export const SHOOTER_X = W / 2;
export const SHOOTER_Y = H - 74;
export const DANGER_Y = H - 168;

export const PROJECTILE_SPEED = 1250; // px/s
export const SHOTS_PER_DROP = 8;
export const MATCH_MIN = 3;

// Max aim deviation from straight up, in radians (~77°).
export const AIM_LIMIT = 1.35;

export const COLORS = [
  { name: 'red',    base: '#ff4d6b', light: '#ff9bb0', dark: '#a8123c' },
  { name: 'orange', base: '#ffa502', light: '#ffd36b', dark: '#b06c00' },
  { name: 'green',  base: '#2ed573', light: '#8af0b4', dark: '#128a48' },
  { name: 'blue',   base: '#3d8bff', light: '#93c1ff', dark: '#1c55b8' },
  { name: 'purple', base: '#a55eea', light: '#d0a2f5', dark: '#63279e' },
  { name: 'cyan',   base: '#34e7e4', light: '#a5f6f4', dark: '#0e918f' },
];

export function colorsForLevel(level) {
  return Math.min(4 + Math.floor((level - 1) / 2), COLORS.length);
}

export function rowsForLevel(level) {
  return Math.min(5 + Math.floor((level - 1) / 2), 9);
}
