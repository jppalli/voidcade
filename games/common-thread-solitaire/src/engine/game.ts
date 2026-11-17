import { CONFIG } from '../config';
import { applyAction, buildCards, cloneState, deal, isDeadlocked, isPlayable, isSolved } from './rules';
import { bestAction } from './solver';
import type { Action, ActionResult, Card, GameStatus, LevelDef, TableState } from './types';

export interface HistoryEntry {
  state: TableState;
  /** Set when the entry was created by placing a Wild Thread (the card id), so Undo can refund it. */
  wildPlaced?: number;
}

/** What gets written to the saved session so an interrupted level can resume. */
export interface GameSave {
  def: LevelDef;
  cards: Card[];
  state: TableState;
  history: HistoryEntry[];
  freeUndos: number;
  rescues: number;
  hints: number;
  bonusMoves: number;
  startBudget: number;
}

/** One level in play: the deck, the table, the undo stack and the per-attempt counters. */
export class Game {
  def!: LevelDef;
  cards!: Card[];
  state!: TableState;
  history: HistoryEntry[] = [];
  freeUndos: number = CONFIG.freeUndosPerLevel;
  rescues = 0;
  hints = 0;
  bonusMoves = 0;
  startBudget!: number;

  constructor(def: LevelDef, bonusMoves = 0) {
    this.def = def;
    this.cards = buildCards(def.sets);
    this.bonusMoves = bonusMoves;
    this.startBudget = def.budget + bonusMoves;
    this.state = deal(this.cards, def.board, def.seed, this.startBudget);
  }

  static restore(save: GameSave): Game {
    const game = Object.create(Game.prototype) as Game;
    Object.assign(game, save);
    return game;
  }

  save(): GameSave {
    return {
      def: this.def,
      cards: this.cards,
      state: this.state,
      history: this.history.slice(-60),
      freeUndos: this.freeUndos,
      rescues: this.rescues,
      hints: this.hints,
      bonusMoves: this.bonusMoves,
      startBudget: this.startBudget,
    };
  }

  get totalSets(): number {
    return this.cards.filter((card) => card.kind === 'cat').length;
  }

  get setsLeft(): number {
    return this.totalSets - this.state.cleared.length;
  }

  move(action: Action): ActionResult {
    const before = cloneState(this.state);
    const result = applyAction(this.state, this.cards, action);
    if (result.ok) this.history.push({ state: before });
    return result;
  }

  status(): GameStatus {
    if (isSolved(this.state, this.cards)) return 'won';
    if (this.state.moves <= 0) return 'out';
    if (isDeadlocked(this.state, this.cards)) return 'deadlock';
    return 'play';
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  undo(): { ok: boolean; wildRefund?: boolean } {
    const entry = this.history.pop();
    if (!entry) return { ok: false };
    this.state = entry.state;
    if (entry.wildPlaced !== undefined) {
      this.cards = this.cards.filter((card) => card.id !== entry.wildPlaced);
    }
    return { ok: true, wildRefund: entry.wildPlaced !== undefined };
  }

  /** A Wild Thread can sit on an empty column, or on a face-up word/picture card. */
  canPlaceWild(column: number): boolean {
    const cards = this.state.cols[column];
    if (!cards) return false;
    if (cards.length === 0) return true;
    const top = cards[cards.length - 1];
    return top.up && isPlayable(this.cards[top.id]);
  }

  placeWild(column: number): number | null {
    if (!this.canPlaceWild(column)) return null;
    const before = cloneState(this.state);
    const id = this.cards.length;
    this.cards.push({ id, kind: 'wild', cat: '', label: 'Wild Thread' });
    this.state.cols[column].push({ id, up: true });
    this.history.push({ state: before, wildPlaced: id });
    return id;
  }

  hint(): Action | null {
    return bestAction(this.state, this.cards);
  }

  /** Extra moves (rescue). Also added to every undo snapshot so undoing doesn't take them away. */
  addMoves(count: number): void {
    this.state.moves += count;
    for (const entry of this.history) entry.state.moves += count;
  }

  /** Coins for a win: base plus a bonus per move left, scaled by the streak bonus. */
  payout(streakBonus: number): number {
    const base = this.def.mode === 'daily' ? CONFIG.dailyBase : CONFIG.winBase;
    return Math.round((base + CONFIG.perMoveLeft * this.state.moves) * (1 + streakBonus));
  }
}
