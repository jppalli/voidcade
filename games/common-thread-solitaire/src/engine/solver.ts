import { applyAction, cloneState, isSolved, legalActions, movableCards, movableStart } from './rules';
import { seededRng } from './rng';
import type { Action, Card, ColumnCard, TableState } from './types';

const isSetKind = (kind: string) => kind === 'word' || kind === 'pic';

/** Legal actions, minus pointless ones (splitting a stack, or moving a lone column onto an empty column). */
function solverActions(state: TableState, cards: Card[]): Action[] {
  return legalActions(state, cards, true).filter((action) => {
    if (action.t !== 'move' || action.from.z !== 'col') return true;
    if (action.from.idx !== movableStart(state, cards, action.from.i)) return false;
    if (action.to.z === 'col' && state.cols[action.to.i].length === 0 && action.from.idx === 0) return false;
    return true;
  });
}

/** How many open tops (column tops and the waste top) already belong to this category. */
function countOpenOfCategory(state: TableState, cards: Card[], cat: string): number {
  let count = 0;
  for (const column of state.cols) {
    const top = column[column.length - 1];
    if (top && cards[top.id].cat === cat && isSetKind(cards[top.id].kind)) count++;
  }
  const wasteTop = state.waste[state.waste.length - 1];
  if (wasteTop !== undefined && cards[wasteTop].cat === cat) count++;
  return count;
}

/** Heuristic value of an action. Shared by the solver and by Hint. */
export function scoreAction(state: TableState, cards: Card[], action: Action): number {
  if (action.t === 'draw') return 6;
  if (action.t === 'recycle') return 2;

  const moved = movableCards(state, cards, action.from)!;
  const lead = cards[moved[0]];
  let below: ColumnCard | undefined;
  if (action.from.z === 'col') below = state.cols[action.from.i][action.from.idx - 1];
  const flipBonus = below ? (below.up ? 8 : 14) : 0;

  if (action.to.z === 'found') {
    const slot = state.found[action.to.i];
    if (!slot) return 70 + 4 * countOpenOfCategory(state, cards, lead.cat) + flipBonus;
    const completes = slot.count + moved.length >= slot.total;
    return 100 + 5 * moved.length + (completes ? 40 : 0) + flipBonus;
  }
  if (state.cols[action.to.i].length === 0) {
    if (action.from.z === 'waste') return lead.kind === 'cat' ? 14 : 8;
    if (!below) return -1000;
    return below.up ? 15 : 45;
  }
  if (action.from.z === 'waste') return 40;
  if (!below) return 35;
  return below.up ? 30 : 50;
}

export interface Playout {
  solved: boolean;
  moves: number;
  path: Action[];
}

/** Greedy game played from `start`, with `noise` of random jitter on each choice. Unlimited moves. */
function playout(start: TableState, cards: Card[], rng: () => number, noise = 25, maxSteps = 600): Playout {
  const state = cloneState(start);
  state.moves = 1e5;
  const path: Action[] = [];
  let recycles = 0;
  for (let step = 0; step < maxSteps; step++) {
    if (isSolved(state, cards)) return { solved: true, moves: path.length, path };
    const options = solverActions(state, cards);
    if (!options.length) return { solved: false, moves: path.length, path };

    let best: Action | null = null;
    let bestScore = -Infinity;
    for (const option of options) {
      const score = scoreAction(state, cards, option) + rng() * noise;
      if (score > bestScore) {
        bestScore = score;
        best = option;
      }
    }
    if (!best) break;

    if (best.t === 'recycle') {
      if (++recycles > 3) return { solved: false, moves: path.length, path };
    } else if (best.t === 'move') {
      recycles = 0;
    }
    applyAction(state, cards, best);
    path.push(best);
  }
  return { solved: isSolved(state, cards), moves: path.length, path };
}

export interface SolveResult {
  solved: boolean;
  par: number;
  successRate: number;
  bestPath: Action[];
}

/** Runs several noisy playouts. `par` is the shortest winning one; `successRate` is how often the heuristic wins. */
export function solve(state: TableState, cards: Card[], seed: number, attempts = 30): SolveResult {
  const rng = seededRng(seed ^ 2654435769);
  let best: Playout | null = null;
  let wins = 0;
  for (let i = 0; i < attempts; i++) {
    const run = playout(state, cards, rng, i === 0 ? 0 : 25);
    if (run.solved) {
      wins++;
      if (!best || run.moves < best.moves) best = run;
    }
  }
  return {
    solved: !!best,
    par: best ? best.moves : 0,
    successRate: wins / attempts,
    bestPath: best ? best.path : [],
  };
}

/** The action Hint suggests: the highest-scoring legal one. */
export function bestAction(state: TableState, cards: Card[]): Action | null {
  let best: Action | null = null;
  let bestScore = -Infinity;
  for (const action of solverActions(state, cards)) {
    const score = scoreAction(state, cards, action);
    if (score > bestScore) {
      bestScore = score;
      best = action;
    }
  }
  return best;
}
