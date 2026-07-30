// Types for puzzle.mjs, which stays plain JS so tools/ and the app share it.

export const NCOLORS: number;
export const FULL: number;

export function bit(c: number): number;
export function has(mask: number, c: number): boolean;
export function isSingle(mask: number): boolean;
export function soleColor(mask: number): number;
export function popcount(mask: number): number;

export function neighborTable(w: number, h: number): number[][];
export function parseSolution(str: string): Int8Array;
export function formatSolution(cells: ArrayLike<number>): string;

export interface Clue { p: number; c: number; n: number; nb: number[] }
export interface Compiled {
  w: number; h: number; size: number;
  nbs: number[][];
  sol: Int8Array;
  givenSet: Set<number>;
  clues: Clue[];
}

export interface LevelInput { w: number; h: number; sol: string; given: number[]; nums: number[] }

export function compile(level: LevelInput): Compiled;
export function initialDomains(cx: Compiled): Uint8Array;
export function propagate(dom: Uint8Array, clues: Clue[]): boolean;
export function propagateSubsets(dom: Uint8Array, clues: Clue[]): number;
export function logicSolve(
  cx: Compiled, dom?: Uint8Array, allowTier2?: boolean
): { solved: boolean; tier: number; dom: Uint8Array };
export function countSolutions(cx: Compiled, limit?: number, dom?: Uint8Array): number;

/** Which deduction rules a solve is allowed to use. */
export interface RuleSet {
  exhaust?: boolean;
  complete?: boolean;
  overlap?: boolean;
  contradiction?: boolean;
}
export const ALL_RULES: RuleSet;
export const WITH_CONTRADICTION: RuleSet;
export const ELIMINATION_ONLY: RuleSet;

export type ResolvedBy = "given" | "single" | "complete" | "overlap" | null;

export function solveTraced(cx: Compiled, dom?: Uint8Array, allow?: RuleSet): {
  solved: boolean;
  /** How each cell was settled — "single" means it fell to crossing off. */
  by: ResolvedBy[];
  rounds: number;
  used: { exhaust: number; complete: number; overlap: number; contradiction: number };
  dom: Uint8Array;
  broken: boolean;
};
export function eliminationRatio(cx: Compiled, trace: { by: ResolvedBy[] }): number;

export function analyse(level: LevelInput): {
  unique: boolean; solutions: number; logical: boolean;
  tier: number; elimination: number; rounds: number;
  clueCounts: Record<number, number>; meanClue: number;
  empties: number; size: number;
};
