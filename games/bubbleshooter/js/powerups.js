/**
 * Roguelite powerup layer, ported from Voidburst: a meter fills as you pop
 * bubbles, and once full you pick one of 3 timed modifiers. Every effect
 * here maps onto a lever this engine already has (shot count, match size,
 * ceiling pressure, cluster radius, color, score) rather than reusing
 * Voidburst's flags wholesale — some of those (e.g. "extra wall bounces")
 * don't mean anything here since shots already bounce off walls forever.
 */

export const CHARGE_MAX        = 24;  // matched bubbles popped to fill the meter
export const POWERUP_DURATION  = 22;  // seconds each picked powerup stays active
export const MAX_ACTIVE        = 3;   // simultaneous active powerups cap

export function defaultMods() {
  return {
    shotCount: 1,           // bubbles fired per shot (Wide Shot)
    popRadiusBonus: 0,      // extra neighbor ring cleared on 5+ clusters (Big Bang)
    freezeCeiling: false,   // ceiling stops advancing (Freeze)
    matchMinOverride: null, // override MATCH_MIN, e.g. 2 (Loose Match)
    colorWipe: false,       // landing near a match clears the whole color (Color Bomb)
    scoreMult: 1,           // multiplies every point award (Double Points)
  };
}

const POWERUP_DEFS = [
  {
    id: 'multishot',
    name: 'Wide Shot',
    icon: 'multishot',
    desc: 'Fire 3 bubbles in a spread with every shot.',
    apply: (m) => { m.shotCount = 3; },
  },
  {
    id: 'bigbang',
    name: 'Big Bang',
    icon: 'bigbang',
    desc: 'Clusters of 5+ pop an extra ring of neighbors.',
    apply: (m) => { m.popRadiusBonus += 1; },
  },
  {
    id: 'freeze',
    name: 'Freeze',
    icon: 'freeze',
    desc: 'The ceiling stops advancing.',
    apply: (m) => { m.freezeCeiling = true; },
  },
  {
    id: 'loose',
    name: 'Loose Match',
    icon: 'loose',
    desc: 'Groups of just 2 bubbles pop.',
    apply: (m) => { m.matchMinOverride = 2; },
  },
  {
    id: 'colorbomb',
    name: 'Color Bomb',
    icon: 'colorbomb',
    desc: 'Landing near a match clears every bubble of that color.',
    apply: (m) => { m.colorWipe = true; },
  },
  {
    id: 'jackpot',
    name: 'Double Points',
    icon: 'jackpot',
    desc: 'Score from every pop is doubled.',
    apply: (m) => { m.scoreMult *= 2; },
  },
];

export const POWERUP_BY_ID = Object.fromEntries(POWERUP_DEFS.map((p) => [p.id, p]));

export function getPowerupDef(id) {
  return POWERUP_BY_ID[id] || null;
}

/** Roll N unique powerups, excluding given IDs (e.g. already active). */
export function rollPowerups(n, excludeIds = []) {
  const pool = POWERUP_DEFS.filter((p) => !excludeIds.includes(p.id));
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}
