// Permanent upgrades — bought with coins, active every run.
// Same shop model as Stackward.
export const MAX_LEVEL = 3;

export const UPGRADES = [
  {
    id: 'bigger',
    name: 'Big Bang',
    icon: 'target',
    blurb: 'Bubbles pop adjacent same-color bubbles in a wider radius.',
    levels: [
      { cost: 80,  value: 1 },
      { cost: 200, value: 2 },
      { cost: 450, value: 3 },
    ],
  },
  {
    id: 'fortune',
    name: 'Fortune',
    icon: 'gem',
    blurb: 'Earn more coins per pop, every run.',
    levels: [
      { cost: 100, value: 1.2 },
      { cost: 260, value: 1.45 },
      { cost: 550, value: 1.75 },
    ],
  },
  {
    id: 'reload',
    name: 'Quick Reload',
    icon: 'refresh',
    blurb: 'Fire cooldown after each shot is shorter.',
    levels: [
      { cost: 90,  value: 0.08 },
      { cost: 220, value: 0.14 },
      { cost: 480, value: 0.22 },
    ],
  },
  {
    id: 'extra',
    name: 'Extra Shot',
    icon: 'cluster',
    blurb: 'Start every run with an extra ball queued up.',
    levels: [
      { cost: 120, value: 1 },
      { cost: 300, value: 2 },
      { cost: 700, value: 3 },
    ],
  },
  {
    id: 'steady',
    name: 'Steady Aim',
    icon: 'target',
    blurb: 'Aim line shows more bounce reflections so you can plan shots.',
    levels: [
      { cost: 80,  value: 1 },
      { cost: 200, value: 2 },
      { cost: 420, value: 3 },
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
