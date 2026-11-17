import { buildCards, deal } from './rules';
import { solve } from './solver';
import { CATEGORIES, CATEGORY_BY_ID } from '../data/categories';
import { hashString, seededRng, shuffle } from './rng';
import type { Card, GameMode, LevelDef, SetSpec } from './types';

interface GenerateOptions {
  key: string;
  mode: GameMode;
  title: string;
  board: number;
  sets: SetSpec[];
  /** Move-budget multiplier: budget = par * mu. */
  mu: number;
  seedStart: number;
  attempts?: number;
  maxTries?: number;
  minSuccess?: number;
  requireCatUp?: boolean;
}

/** A deal is playable if a category tag is face-up on a column, or (unless required) near the top of the deck. */
function dealIsPlayable(cards: Card[], seed: number, board: number, requireCatUp = false): boolean {
  const table = deal(cards, board, seed, 1);
  const catUp = table.cols.some((column) => cards[column[column.length - 1].id].kind === 'cat');
  const catNearTop = table.stock.slice(-3).some((id) => cards[id].kind === 'cat');
  return requireCatUp ? catUp : catUp || catNearTop;
}

/** Searches seeds until the solver finds a winnable deal, and sets the move budget from the solver's par. */
function generateLevel(options: GenerateOptions): LevelDef {
  const cards = buildCards(options.sets);
  const minSuccess = options.minSuccess ?? 0.2;
  let fallback: LevelDef | null = null;
  for (let attempt = 0; attempt < (options.maxTries ?? 80); attempt++) {
    const seed = (options.seedStart + attempt * 7919) >>> 0;
    if (!dealIsPlayable(cards, seed, options.board, options.requireCatUp)) continue;
    const table = deal(cards, options.board, seed, 1);
    const result = solve(table, cards, seed, options.attempts ?? 24);
    if (!result.solved) continue;
    const level: LevelDef = {
      key: options.key,
      mode: options.mode,
      title: options.title,
      board: options.board,
      sets: options.sets,
      mu: options.mu,
      seed,
      par: result.par,
      budget: Math.round(result.par * options.mu),
    };
    if (result.successRate >= minSuccess) return level;
    if (!fallback) fallback = level;
  }
  if (fallback) return fallback;
  throw Error(`Could not generate solvable level for ${options.key}`);
}

const PIC_CATEGORY_IDS = CATEGORIES.filter((c) => c.modality === 'pic').map((c) => c.id);
const WORD_CATEGORY_IDS = CATEGORIES.filter((c) => c.modality === 'word').map((c) => c.id);

interface PickOptions {
  count: number;
  picCount: number;
  minN: number;
  maxN: number;
  avoidHomographs?: boolean;
}

/** Chooses which categories (and how many cards of each) make up a generated level. */
function pickSets(seed: number, options: PickOptions): SetSpec[] {
  const rng = seededRng(seed);
  const words = shuffle(
    WORD_CATEGORY_IDS.filter((id) => !(options.avoidHomographs && CATEGORY_BY_ID[id].tags?.includes('homograph'))),
    rng,
  );
  const ids = [
    ...shuffle(PIC_CATEGORY_IDS.slice(), rng).slice(0, options.picCount),
    ...words.slice(0, options.count - options.picCount),
  ];
  return shuffle(ids, rng).map((id) => {
    const available = Math.min(options.maxN, CATEGORY_BY_ID[id].items.length);
    const min = Math.min(options.minN, available);
    return { cat: id, n: min + Math.floor(rng() * (available - min + 1)) };
  });
}

export type QuickTier = 'casual' | 'standard' | 'expert';

export const QUICK_TIERS: Record<QuickTier, PickOptions & { label: string; mu: number }> = {
  casual: { label: 'Casual', count: 6, picCount: 1, minN: 3, maxN: 5, mu: 1.75, avoidHomographs: true },
  standard: { label: 'Standard', count: 9, picCount: 1, minN: 4, maxN: 7, mu: 1.5, avoidHomographs: false },
  expert: { label: 'Expert', count: 12, picCount: 2, minN: 5, maxN: 8, mu: 1.3, avoidHomographs: false },
};

export function quickLevel(tier: QuickTier, seed: number): LevelDef {
  const config = QUICK_TIERS[tier];
  return generateLevel({
    key: `qp-${tier}-${seed}`,
    mode: 'quick',
    title: `Quick Play · ${config.label}`,
    board: 4,
    sets: pickSets(seed, config),
    mu: config.mu,
    seedStart: seed,
    attempts: 16,
    maxTries: 40,
  });
}

export function dailyLevel(dateKey: string): LevelDef {
  const seed = hashString('common-thread-daily-' + dateKey);
  return generateLevel({
    key: `daily-${dateKey}`,
    mode: 'daily',
    title: 'Daily Puzzle',
    board: 4,
    sets: pickSets(seed, { count: 9, picCount: 1, minN: 4, maxN: 7 }),
    mu: 1.45,
    seedStart: seed,
    attempts: 16,
    maxTries: 40,
  });
}
