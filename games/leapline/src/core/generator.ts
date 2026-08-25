import { DIFFICULTY_CONFIG, nodeBudgetForSize } from './difficulty';
import { buildRandomHamiltonianPath } from './pathBuilder';
import { rngFromString, shuffled } from './rng';
import { countSolutions } from './solver';
import type { Difficulty, GivenClue, Puzzle } from './types';

function givensFromValueSet(values: Set<number>, solution: number[]): GivenClue[] {
  const out: GivenClue[] = [];
  for (const v of values) out.push({ value: v, cell: solution[v - 1] });
  out.sort((a, b) => a.value - b.value);
  return out;
}

/**
 * Greedily removes as many givens as possible (in a random order) while
 * re-checking solver uniqueness after every removal, stopping once the
 * given count reaches `targetGivens` or no further clue can be removed
 * without breaking uniqueness. Value 1 and the final value are always
 * kept so the player has a fixed start and end anchor.
 *
 * Runs a couple of randomized passes: greedy clue-minimization is
 * order-dependent (removing A-then-B can succeed where B-then-A gets
 * stuck), so a second shuffled pass typically gets closer to the target.
 */
function reduceGivens(
  size: number,
  solution: number[],
  targetGivens: number,
  rngSeed: string,
): GivenClue[] {
  const maxValue = size * size;
  const rng = rngFromString(`${rngSeed}:reduce`);
  const budget = nodeBudgetForSize(size);
  const mandatory = new Set<number>([1, maxValue]);

  let current = new Set<number>();
  for (let v = 1; v <= maxValue; v++) current.add(v);

  // Several randomized passes: greedy clue-minimization is order-dependent
  // (removing A-then-B can succeed where B-then-A gets stuck on a clue
  // that's actually removable in a different order), so re-shuffling and
  // re-attempting a handful of times reliably squeezes out more clues
  // than a single or double pass, especially on larger/sparser boards.
  const maxPasses = 5;
  for (let pass = 0; pass < maxPasses && current.size > targetGivens; pass++) {
    const before = current.size;
    const removable = shuffled(
      [...current].filter(v => !mandatory.has(v)),
      rng,
    );
    for (const v of removable) {
      if (current.size <= targetGivens) break;
      current.delete(v);
      const givens = givensFromValueSet(current, solution);
      const result = countSolutions(size, givens, 2, budget);
      if (result.exhaustedBudget || result.count !== 1) {
        current.add(v); // removing this clue broke uniqueness — keep it
      }
    }
    if (current.size === before) break; // this pass removed nothing further — no point re-shuffling again
  }

  return givensFromValueSet(current, solution);
}

export interface GeneratePuzzleOptions {
  /** Overrides the difficulty's default grid size, if provided. */
  size?: number;
  maxAttempts?: number;
}

/**
 * Full generation pipeline: build a random Hamiltonian solution path,
 * derive and minimize starting clues for the requested difficulty, then
 * verify the resulting puzzle has exactly one solution before returning
 * it. Retries with fresh randomness (derived deterministically from the
 * seed) if a path can't be built or a candidate puzzle fails validation —
 * a puzzle is only ever returned once solver-verified unique.
 */
export function generatePuzzle(
  seed: string,
  difficulty: Difficulty,
  opts: GeneratePuzzleOptions = {},
): Puzzle {
  const config = DIFFICULTY_CONFIG[difficulty];
  const size = opts.size ?? config.size;
  const maxValue = size * size;
  const maxAttempts = opts.maxAttempts ?? 40;
  const budget = nodeBudgetForSize(size);
  const targetGivens = Math.max(2, Math.round(config.givenDensity * maxValue));

  // Greedy clue-minimization on a single random solution path tends to
  // bottom out at a structural floor somewhat above the exact target
  // density (some Hamiltonian paths are more "forced" than others), so
  // this is an approximate target, not a guarantee — trying to chase it
  // exactly by scanning many solution paths costs far more solver time
  // than it's worth. One good-faith reduction attempt per generated
  // puzzle keeps generation fast; the difficulty curve still holds
  // clearly in aggregate because size and target density both increase
  // together across difficulties.
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptSeed = `${seed}:${difficulty}:${size}:${attempt}`;
    const pathRng = rngFromString(attemptSeed);
    const solution = buildRandomHamiltonianPath(size, pathRng);
    if (!solution) continue;

    const givens = reduceGivens(size, solution, targetGivens, attemptSeed);

    // Final authoritative check: the puzzle we're about to ship must be
    // provably unique, not just "unique as far as the reducer verified" —
    // re-verify from scratch so a bug anywhere upstream can never leak an
    // ambiguous or unsolvable puzzle to the player.
    const finalCheck = countSolutions(size, givens, 2, budget);
    if (finalCheck.exhaustedBudget || finalCheck.count !== 1) continue;

    return { seed, size, difficulty, maxValue, solution, givens };
  }

  throw new Error(
    `Failed to generate a valid "${difficulty}" Leapline puzzle for seed "${seed}" after ${maxAttempts} attempts.`,
  );
}
