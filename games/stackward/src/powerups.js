// In-run roguelite powerups. Offered 3-at-a-time every POWERUP_INTERVAL floors.
// Unlike blessings (permanent for the whole run, chosen once before it starts),
// powerups are TEMPORARY and TIME-based: each lasts DURATION_SECONDS of actual
// play time after being picked, then expires and goes on a COOLDOWN_SECONDS
// cooldown (real time, keeps ticking down even while it's not offered) before
// it's eligible to be offered again. Effects are recomputed fresh from the
// active list whenever it changes, so nothing stacks permanently - picking the
// same active powerup again just refreshes its remaining time.

export const POWERUP_INTERVAL = 10;
export const DURATION_SECONDS = 20;
export const COOLDOWN_SECONDS = 12;

// `icon` keys into src/icons.js for a small neon line-art glyph, no emoji.
export const POWERUPS = [
  {
    id: 'widebase',
    name: 'Wide Base',
    icon: 'wall',
    desc: 'Raises the growth ceiling and widens the tower now. Lasts 20s.',
    apply(mods) {
      mods.maxWidthCapExtra = Math.min(mods.maxWidthCapExtra + 60, 240);
    },
  },
  {
    id: 'shield',
    name: 'Guardian Shield',
    icon: 'shield',
    desc: 'Banks a save for the next miss or collapse. Consumed on use; never expires.',
    apply() {
      // Presence in the active list is the effect itself; handled directly
      // by Game.hasShield()/consumeShield() rather than a mods field.
    },
  },
  {
    id: 'momentum',
    name: 'Momentum',
    icon: 'pace',
    desc: 'While your combo is 5+, blocks swing 30% slower. Lasts 20s.',
    apply(mods) {
      mods.comboSlowmo = true;
    },
  },
  {
    id: 'goldrush',
    name: 'Gold Rush',
    icon: 'gem',
    desc: 'Earn noticeably more coins per floor. Lasts 20s.',
    apply(mods) {
      mods.coinFlatBonus += 1;
      mods.coinMult *= 1.4;
    },
  },
  {
    id: 'slowmo',
    name: 'Slow-Mo Focus',
    icon: 'slow',
    desc: 'Blocks swing much slower. Lasts 20s.',
    apply(mods) {
      mods.speedMult = Math.min(mods.speedMult, 0.6);
      mods.speedRampDamp = Math.max(mods.speedRampDamp, 0.6);
    },
  },
  {
    id: 'growspurt',
    name: 'Growth Spurt',
    icon: 'sprout',
    desc: 'Perfect drops grow the tower wider - and grow it more the longer your streak. Lasts 20s.',
    apply(mods) {
      mods.growAmountBonus += 8;
    },
  },
  {
    id: 'secondwind',
    name: 'Second Wind',
    icon: 'refresh',
    desc: 'A missed cut keeps most of your streak alive (coins, and Momentum\'s slow). Lasts 20s.',
    apply(mods) {
      mods.comboKeepFrac = Math.min(mods.comboKeepFrac + 0.4, 0.75);
    },
  },
  {
    id: 'magnet',
    name: 'Magnet',
    icon: 'magnet',
    desc: 'Near-misses snap into a perfect, auto-centered drop. Lasts 20s.',
    apply(mods) {
      mods.magnetSnap = Math.min(mods.magnetSnap + 0.15, 0.4);
    },
  },
  {
    id: 'jackpot',
    name: 'Jackpot',
    icon: 'jackpot',
    desc: 'Every perfect drop showers you with bonus coins. Lasts 20s.',
    apply(mods) {
      mods.perfectCoinBonus += 4;
    },
  },
  {
    id: 'featherfall',
    name: 'Feather Fall',
    icon: 'feather',
    desc: 'Sloppy cuts trim far less width off the tower. Lasts 20s.',
    apply(mods) {
      mods.cutReduction = Math.min(mods.cutReduction + 0.45, 0.75);
    },
  },
  {
    id: 'guide',
    name: 'Precision Guide',
    icon: 'guide',
    desc: 'Projects a target outline so you can nail perfect drops. Lasts 20s.',
    apply(mods) {
      mods.showGuide = true;
    },
  },
];

const POWERUP_BY_ID = Object.fromEntries(POWERUPS.map((p) => [p.id, p]));

export function getPowerupDef(id) {
  return POWERUP_BY_ID[id];
}

export function defaultMods() {
  return {
    speedMult: 1,
    speedRampDamp: 0,      // shaves the score-based speed ramp (0..0.8)
    perfectThreshBonus: 0, // widens the perfect window (Steel Nerves blessing)
    growAmountBonus: 0,    // Growth Spurt: width gained per perfect
    coinFlatBonus: 0,      // Gold Rush
    coinMult: 1,           // Gold Rush / Cash Out
    comboKeepFrac: 0,      // Second Wind: fraction of combo kept on a miss
    maxWidthCapExtra: 0,   // Wide Base
    magnetSnap: 0,         // Magnet: widens perfect window and auto-centers
    perfectCoinBonus: 0,   // Jackpot: flat bonus coins on a perfect drop
    cutReduction: 0,       // Feather Fall: fraction of a bad cut recovered
    comboSlowmo: false,    // Momentum: slow blocks while combo is high
    showGuide: false,      // Precision Guide: draw the target outline
  };
}

/** Pick `count` distinct random powerups from the pool, excluding any id
 *  that's currently active or still on cooldown. Falls back to including
 *  excluded ids only if the pool would otherwise be too small to fill count. */
export function rollPowerups(count, excludeIds) {
  const exclude = new Set(excludeIds || []);
  let pool = POWERUPS.filter((p) => !exclude.has(p.id));
  if (pool.length < count) pool = [...POWERUPS];

  const working = [...pool];
  const picks = [];
  while (picks.length < count && working.length > 0) {
    const idx = Math.floor(Math.random() * working.length);
    picks.push(working.splice(idx, 1)[0]);
  }
  return picks;
}
