/**
 * Roguelite powerup layer, ported from Voidburst: a meter fills as you pop
 * bubbles, and once full you pick one of 3 timed modifiers. Every effect
 * here maps onto a lever this engine already has (shot count, match size,
 * ceiling pressure, cluster radius, color, score) rather than reusing
 * Voidburst's flags wholesale — some of those (e.g. "extra wall bounces")
 * don't mean anything here since shots already bounce off walls forever.
 */

// Base charge required to fill the meter. Rises slightly per level (see
// Game.chargeRequired()) so powerups keep pace with the game rather than
// arriving constantly once boards get bigger and cascades get larger.
export const CHARGE_MAX         = 50;
export const CHARGE_PER_LEVEL   = 6;
// A single shot's contribution is capped so one lucky mega-cascade can't
// jump the meter from empty to full in one pop — filling the bar should
// take a handful of good shots, not one.
export const PER_SHOT_CHARGE_CAP = 9;
// Short pause between the meter maxing out and the choice modal opening,
// so the pop/cascade animation that filled it gets a beat to finish
// on-screen instead of being interrupted by a hard cut to the modal.
export const CHARGE_READY_DELAY = 0.9;
export const POWERUP_DURATION  = 24;  // seconds each picked powerup stays active
export const MAX_ACTIVE        = 3;   // simultaneous active powerups cap

export function defaultMods() {
  return {
    shotCount: 1,           // bubbles fired per shot (Wide Shot)
    popRadiusBonus: 0,      // extra neighbor ring cleared on 5+ clusters (Big Bang)
    freezeCeiling: false,   // ceiling stops advancing (Freeze)
    matchMinOverride: null, // override MATCH_MIN, e.g. 2 (Chain Reaction)
    colorWipe: false,       // landing near a match clears the whole color (Color Bomb)
    scoreMult: 1,           // multiplies every point award (Double Points)
    rainbow: false,         // ball auto-joins whichever neighbor color has the most bubbles (Rainbow Ball)
    speedMult: 1,           // projectile speed multiplier (Slo-Mo Aim)
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
    id: 'chain',
    name: 'Chain Reaction',
    icon: 'chain',
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
  {
    id: 'rainbow',
    name: 'Rainbow Ball',
    icon: 'rainbow',
    desc: 'Every shot morphs to match whatever it touches best.',
    apply: (m) => { m.rainbow = true; },
  },
  {
    id: 'slowmo',
    name: 'Slo-Mo Aim',
    icon: 'slowmo',
    desc: 'Shots fly slower, giving you time to line up bank shots.',
    apply: (m) => { m.speedMult = 0.62; },
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
