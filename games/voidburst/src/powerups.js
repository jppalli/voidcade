// In-run roguelite powerups — offered every WAVE_INTERVAL waves cleared.
// Each is timed (DURATION_SECONDS) and goes on cooldown after expiry.
// Same mods-layer pattern as Stackward.

export const WAVE_INTERVAL    = 3;   // offer powerup choice every N waves
export const DURATION_SECONDS = 25;  // how long each powerup lasts
export const COOLDOWN_SECONDS = 10;  // cooldown before same powerup can appear again

export function defaultMods() {
  return {
    // Physics
    bounceCount:    1,    // number of wall bounces the ball makes
    shotCount:      1,    // how many balls fired per shot (cluster)
    // Pop / scoring
    popRadiusBonus: 0,    // extra neighbors cleared per pop
    coinMult:       1,    // coin gain multiplier
    perfectCoinBonus: 0,
    // Utility
    freezeWaves:    false, // grid doesn't descend this wave
    colorWipe:      false, // next shot removes all same-color on impact
    ghost:          false, // shot passes non-matching bubbles until match
    bombRadius:     0,     // extra radius on landing pop (bomb powerup)
  };
}

// --- Powerup definitions ---
const POWERUP_DEFS = [
  {
    id: 'bouncer',
    name: 'Bouncer',
    icon: 'bouncer',
    desc: 'Shots ricochet off walls twice.',
    apply: (m) => { m.bounceCount += 2; },
  },
  {
    id: 'cluster',
    name: 'Cluster Shot',
    icon: 'cluster',
    desc: 'Each shot fires 3 bubbles in a spread.',
    apply: (m) => { m.shotCount = 3; },
  },
  {
    id: 'wipe',
    name: 'Color Wipe',
    icon: 'wipe',
    desc: 'Next impact removes all bubbles matching your bubble\'s color.',
    apply: (m) => { m.colorWipe = true; },
  },
  {
    id: 'freeze',
    name: 'Freeze',
    icon: 'freeze',
    desc: 'Grid stops descending for the duration.',
    apply: (m) => { m.freezeWaves = true; },
  },
  {
    id: 'bomb',
    name: 'Void Bomb',
    icon: 'bomb',
    desc: 'Landing a shot pops all bubbles in a wider splash.',
    apply: (m) => { m.bombRadius += 2; },
  },
  {
    id: 'ghost',
    name: 'Ghost Ball',
    icon: 'ghost',
    desc: 'Shot passes through non-matching bubbles until it hits a match.',
    apply: (m) => { m.ghost = true; },
  },
  {
    id: 'jackpot',
    name: 'Jackpot',
    icon: 'gem',
    desc: 'Double coins from all pops.',
    apply: (m) => { m.coinMult *= 2; },
  },
  {
    id: 'bigbang',
    name: 'Big Bang',
    icon: 'bolt',
    desc: 'Each pop clears extra surrounding bubbles.',
    apply: (m) => { m.popRadiusBonus += 1; },
  },
];

export const POWERUP_BY_ID = Object.fromEntries(POWERUP_DEFS.map(p => [p.id, p]));

export function getPowerupDef(id) {
  return POWERUP_BY_ID[id] || null;
}

/** Roll N unique powerups, excluding given IDs. */
export function rollPowerups(n, excludeIds = []) {
  const pool = POWERUP_DEFS.filter(p => !excludeIds.includes(p.id));
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}
