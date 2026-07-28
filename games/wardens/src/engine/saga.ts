import type { RealmDef } from './types';

// The saga: 3 realms of escalating grid size/difficulty, 8 levels each.
// Sizes stay within [5, 9] where the generator converges near-instantly.
export const REALMS: RealmDef[] = [
  {
    id: 'ember-reach',
    name: 'The Ember Reach',
    blurb: 'Where Fire and Water first learned to share a border.',
    size: 5,
    levelCount: 8,
    colorFrom: '#ff6b6b',
    colorTo: '#4dd0ff',
  },
  {
    id: 'stormwake',
    name: 'Stormwake',
    blurb: 'Lightning and Frost quarrel over the middle sky.',
    size: 7,
    levelCount: 8,
    colorFrom: '#ffe14d',
    colorTo: '#8affea',
  },
  {
    id: 'the-veil',
    name: 'The Veil',
    blurb: 'Shadow and Radiant, bound to opposite ends of every line.',
    size: 9,
    levelCount: 8,
    colorFrom: '#b58aff',
    colorTo: '#ff9fe0',
  },
];

export const TOTAL_LEVELS = REALMS.reduce((sum, r) => sum + r.levelCount, 0);

export interface LevelRef {
  /** absolute index across the whole saga, 0-based */
  globalIndex: number;
  realmIndex: number;
  levelInRealm: number; // 0-based within the realm
  realm: RealmDef;
  size: number;
  /** stable id used as the generation seed and localStorage key */
  id: string;
  /** true every 3rd level (levelInRealm === 2, 5 -> 0-indexed 2,5) grants a boon choice on completion */
  grantsBoon: boolean;
}

export function getAllLevelRefs(): LevelRef[] {
  const refs: LevelRef[] = [];
  let globalIndex = 0;
  REALMS.forEach((realm, realmIndex) => {
    for (let levelInRealm = 0; levelInRealm < realm.levelCount; levelInRealm++) {
      refs.push({
        globalIndex,
        realmIndex,
        levelInRealm,
        realm,
        size: realm.size,
        id: `${realm.id}-${levelInRealm}`,
        grantsBoon: (levelInRealm + 1) % 3 === 0,
      });
      globalIndex++;
    }
  });
  return refs;
}

export function getLevelRef(globalIndex: number): LevelRef | null {
  const all = getAllLevelRefs();
  return all[globalIndex] ?? null;
}

/** Deterministic per-level seed: stable across sessions, unique per level id. */
export function seedForLevel(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  }
  // Fold into a positive range; add a large constant so it doesn't collide
  // with small test seeds used elsewhere.
  return Math.abs(h) + 1_000_000;
}
