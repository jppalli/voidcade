import { seedFromString } from '@arcade/queens-core';
import type { RealmDef } from './types';

/**
 * A single level in the saga. Sizes ramp deliberately: the first realm opens
 * at 4x4 where the rules are almost self-demonstrating, and only reaches 6x6
 * by its end. `tip` shows a one-line lesson above the board, so the opening
 * levels teach one rule at a time instead of dumping all three at once.
 */
export interface LevelDef {
  size: number;
  tip?: string;
  /**
   * How many domains to shrink to a single cell. A one-cell domain gives away
   * one Warden position for free, so early levels use them as a foothold and
   * later levels drop them entirely.
   */
  singletons?: number;
}

/** Authoring shape: `levelCount` is derived from `levels`, not written by hand. */
interface RealmSpec extends Omit<RealmDef, 'levelCount'> {
  levels: LevelDef[];
}

const REALM_SPECS: RealmSpec[] = [
  {
    id: 'ember-reach',
    name: 'The Ember Reach',
    blurb: 'Where the elements first learned to share a border.',
    colorFrom: '#ff8a75',
    colorTo: '#6fd2ff',
    levels: [
      {
        size: 4,
        tip: 'Every colored domain holds exactly one Warden. A domain of a single cell gives its Warden away — start there.',
        singletons: 2,
      },
      {
        size: 4,
        tip: 'Only one Warden per row and per column, too. Nothing may share a line.',
        singletons: 1,
      },
      {
        size: 5,
        tip: 'Wardens never touch — not even at the corners. Leave a gap around each one.',
        singletons: 2,
      },
      {
        size: 5,
        tip: 'A domain squeezed into a single row must hold its Warden there.',
        singletons: 1,
      },
      {
        size: 5,
        tip: 'Count what is left. When a row has one legal cell, that cell is certain.',
        singletons: 1,
      },
      { size: 6, singletons: 1 },
      { size: 6 },
      { size: 6 },
    ],
  },
  {
    id: 'stormwake',
    name: 'Stormwake',
    blurb: 'Lightning and Frost quarrel over the middle sky.',
    colorFrom: '#ffe98a',
    colorTo: '#9dffee',
    levels: [
      { size: 6, tip: 'Larger boards reward patience. Find the forced cell before you guess.' },
      { size: 7 },
      { size: 7 },
      { size: 7 },
      { size: 7 },
      { size: 8 },
      { size: 8 },
      { size: 8 },
    ],
  },
  {
    id: 'the-veil',
    name: 'The Veil',
    blurb: 'Shadow and Radiant, bound to opposite ends of every line.',
    colorFrom: '#c9a8ff',
    colorTo: '#ffc9ee',
    levels: [
      { size: 8 },
      { size: 8 },
      { size: 9 },
      { size: 9 },
      { size: 9 },
      { size: 9 },
      { size: 9 },
      { size: 9 },
    ],
  },
];

export const REALMS: RealmDef[] = REALM_SPECS.map(({ levels, ...realm }) => ({
  ...realm,
  levelCount: levels.length,
}));

export const TOTAL_LEVELS = REALM_SPECS.reduce((sum, r) => sum + r.levels.length, 0);

export interface LevelRef {
  /** absolute index across the whole saga, 0-based */
  globalIndex: number;
  realmIndex: number;
  levelInRealm: number; // 0-based within the realm
  realm: RealmDef;
  size: number;
  tip?: string;
  singletons: number;
  /** stable id used as the generation seed and progress key */
  id: string;
}

let cachedRefs: LevelRef[] | null = null;

export function getAllLevelRefs(): LevelRef[] {
  if (cachedRefs) return cachedRefs;
  const refs: LevelRef[] = [];
  let globalIndex = 0;
  REALM_SPECS.forEach((spec, realmIndex) => {
    const realm = REALMS[realmIndex];
    spec.levels.forEach((def, levelInRealm) => {
      refs.push({
        globalIndex,
        realmIndex,
        levelInRealm,
        realm,
        size: def.size,
        tip: def.tip,
        singletons: def.singletons ?? 0,
        id: `${spec.id}-${levelInRealm}`,
      });
      globalIndex++;
    });
  });
  cachedRefs = refs;
  return refs;
}

export function getLevelRef(globalIndex: number): LevelRef | null {
  return getAllLevelRefs()[globalIndex] ?? null;
}

/** Deterministic per-level seed: stable across sessions, unique per level id. */
export const seedForLevel = seedFromString;
