import { generatePuzzle, shuffle, createSeededRandom } from '@arcade/queens-core';
import type { WardenLevel } from './types';

export interface GenerateWardenOptions {
  size: number;
  seed: number;
  id: string;
  /** how many domains to try to shrink to a single cell (early-level help) */
  singletonDomains?: number;
  /** floor on domain size; 2+ stops levels gifting a free Warden */
  minDomainSize?: number;
}

/**
 * Wraps the shared Queens engine with the Wardens-specific bit: which elemental
 * glyph/colour each domain uses. The board itself (regions + unique solution +
 * connectivity guarantees) comes from @arcade/queens-core.
 */
export function generateWardenLevel(opts: GenerateWardenOptions): WardenLevel {
  const board = generatePuzzle({
    size: opts.size,
    seed: opts.seed,
    singletonRegions: opts.singletonDomains,
    minRegionSize: opts.minDomainSize,
  });

  // Separate RNG stream so element assignment can't perturb board generation.
  const elementOrder = shuffle(
    Array.from({ length: opts.size }, (_, i) => i),
    createSeededRandom(opts.seed + 7919)
  );

  return {
    id: opts.id,
    size: board.size,
    regions: board.regions,
    solution: board.solution,
    elementOrder,
  };
}
