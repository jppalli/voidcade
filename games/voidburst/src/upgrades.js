// Permanent upgrades — bought with coins, active every run.
// Same shop model as Stackward.
export const MAX_LEVEL = 3;

export const UPGRADES = [
  {
    id: 'bigger',
    name: 'Big Bang',
    icon: 'target',
    // Nerfed from a full extra shell/level (was extremely strong on any
    // 3+ cluster) to a single half-strength shell that only kicks in on
    // clusters of 5+, so it rewards big matches without trivializing every
    // small one.
    blurb: 'Clusters of 5+ pop one extra ring of same-color neighbors.',
    levels: [
      { cost: 260,  value: 1 },
      { cost: 650,  value: 1 },
      { cost: 1400, value: 2 },
    ],
  },
  {
    id: 'fortune',
    name: 'Fortune',
    icon: 'gem',
    blurb: 'Earn more coins per pop, every run.',
    levels: [
      { cost: 300,  value: 1.15 },
      { cost: 750,  value: 1.3 },
      { cost: 1600, value: 1.5 },
    ],
  },
  {
    id: 'reload',
    name: 'Quick Reload',
    icon: 'refresh',
    blurb: 'Fire cooldown after each shot is shorter.',
    levels: [
      { cost: 260, value: 0.05 },
      { cost: 620, value: 0.09 },
      { cost: 1300, value: 0.14 },
    ],
  },
  {
    id: 'extra',
    name: 'Extra Shot',
    icon: 'cluster',
    blurb: 'Start every run with an extra ball queued up.',
    levels: [
      { cost: 320,  value: 1 },
      { cost: 800,  value: 2 },
      { cost: 1700, value: 3 },
    ],
  },
  {
    id: 'steady',
    name: 'Steady Aim',
    icon: 'target',
    blurb: 'Aim line shows more bounce reflections so you can plan shots.',
    levels: [
      { cost: 220, value: 1 },
      { cost: 550, value: 2 },
      { cost: 1200, value: 3 },
    ],
  },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

export function upgradeLevel(save, id) {
  return Math.min((save.upgrades && save.upgrades[id]) || 0, MAX_LEVEL);
}

export function upgradeValue(save, id) {
  const lvl = upgradeLevel(save, id);
  if (lvl <= 0) return 0;
  const def = UPGRADE_BY_ID[id];
  return def ? def.levels[lvl - 1].value : 0;
}

export function nextLevelCost(save, id) {
  const lvl = upgradeLevel(save, id);
  if (lvl >= MAX_LEVEL) return null;
  const def = UPGRADE_BY_ID[id];
  return def ? def.levels[lvl].cost : null;
}
