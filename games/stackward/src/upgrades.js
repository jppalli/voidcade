// Permanent meta-progression. ONE unified system: every upgrade is bought
// with coins, levels up (1..MAX_LEVEL), and is always active on every run.
// No consumables, no charges, no equipping - you earn coins by climbing and
// spend them here, and your power grows permanently. This is the classic
// arcade-shop model (Jetpack Joyride / Subway Surfers), chosen to kill the
// old consumable/permanent split and its "play naked to afford toys" treadmill.
//
// Distinct from POWERUPS, which remain the in-run, temporary, timed layer.

export const MAX_LEVEL = 3;

export const UPGRADES = [
  {
    id: 'foundation',
    name: 'Foundation',
    icon: 'wall',
    blurb: 'Start every run with a wider base and a higher growth ceiling.',
    levels: [
      { cost: 100, value: 40 },
      { cost: 250, value: 80 },
      { cost: 550, value: 120 },
    ],
  },
  {
    id: 'steadyhand',
    name: 'Steady Hand',
    icon: 'target',
    blurb: 'Widen the perfect-drop window on every run.',
    levels: [
      { cost: 120, value: 0.03 },
      { cost: 300, value: 0.06 },
      { cost: 650, value: 0.10 },
    ],
  },
  {
    id: 'reinforce',
    name: 'Reinforce',
    icon: 'shield',
    blurb: 'Begin each run with free shields that each save one miss.',
    levels: [
      { cost: 150, value: 1 },
      { cost: 450, value: 2 },
      { cost: 900, value: 3 },
    ],
  },
  {
    id: 'fortune',
    name: 'Fortune',
    icon: 'gem',
    blurb: 'Earn more coins from every floor, on every run, forever.',
    levels: [
      { cost: 100, value: 1.15 },
      { cost: 250, value: 1.30 },
      { cost: 500, value: 1.50 },
    ],
  },
  {
    id: 'tempo',
    name: 'Tempo',
    icon: 'slow',
    blurb: 'Blocks speed up more gently as the tower climbs.',
    levels: [
      { cost: 120, value: 0.15 },
      { cost: 320, value: 0.30 },
      { cost: 650, value: 0.50 },
    ],
  },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

/** Current level (0..MAX_LEVEL) of an upgrade in a save object. */
export function upgradeLevel(save, id) {
  return Math.min((save.upgrades && save.upgrades[id]) || 0, MAX_LEVEL);
}

/** The upgrade's aggregated effect value at the player's current level, or
 *  0 if not yet owned. Values are absolute per-level (not additive). */
export function upgradeValue(save, id) {
  const lvl = upgradeLevel(save, id);
  if (lvl <= 0) return 0;
  const def = UPGRADE_BY_ID[id];
  return def ? def.levels[lvl - 1].value : 0;
}

/** Coin cost of the NEXT level of an upgrade, or null if already maxed. */
export function nextLevelCost(save, id) {
  const lvl = upgradeLevel(save, id);
  if (lvl >= MAX_LEVEL) return null;
  const def = UPGRADE_BY_ID[id];
  return def ? def.levels[lvl].cost : null;
}
