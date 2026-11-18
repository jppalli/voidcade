import { economy } from "../content/economy.js";
import { createCards, dealCards } from "./cards";
import { cloneState, applyAction, isWon, isDeadlocked, isItem } from "./rules";
import { bestHint } from "./solver.js";
import type {
  Card,
  GameState,
  LevelDefinition,
  SessionSnapshot,
  HistoryEntry,
  Action,
} from "./types";

/** Owns reversible game state. Rendering, storage and platform SDKs stay outside. */
export class GameSession {
  cards: Card[];
  state: GameState;
  history: HistoryEntry[] = [];
  freeUndos = economy.freeUndosPerLevel;
  rescues = 0;
  hints = 0;
  startBudget: number;
  constructor(
    public def: LevelDefinition,
    public bonusMoves = 0,
  ) {
    this.cards = createCards(def.sets);
    this.startBudget = def.budget + bonusMoves;
    this.state = dealCards(this.cards, def.board, def.seed, this.startBudget);
  }
  static restore(snapshot: SessionSnapshot): GameSession {
    return Object.assign(
      Object.create(GameSession.prototype),
      structuredClone(snapshot),
    );
  }
  save(): SessionSnapshot {
    return structuredClone({
      def: this.def,
      cards: this.cards,
      state: this.state,
      history: this.history.slice(-60),
      freeUndos: this.freeUndos,
      rescues: this.rescues,
      hints: this.hints,
      bonusMoves: this.bonusMoves,
      startBudget: this.startBudget,
    });
  }
  get totalSets() {
    return this.cards.filter((card) => card.kind === "cat").length;
  }
  get setsLeft() {
    return this.totalSets - this.state.cleared.length;
  }
  move(action: Action) {
    const before = cloneState(this.state);
    const result = applyAction(this.state, this.cards, action);
    if (result.ok) this.history.push({ state: before });
    return result;
  }
  status() {
    if (isWon(this.state, this.cards)) return "won";
    if (this.state.moves <= 0) return "out";
    return isDeadlocked(this.state, this.cards) ? "deadlock" : "play";
  }
  canUndo() {
    return this.history.length > 0;
  }
  undo() {
    const previous = this.history.pop();
    if (!previous) return { ok: false };
    this.state = previous.state;
    if (previous.wildPlaced !== undefined)
      this.cards = this.cards.filter((card) => card.id !== previous.wildPlaced);
    return { ok: true, wildRefund: previous.wildPlaced !== undefined };
  }
  canPlaceWild(columnIndex: number) {
    const column = this.state.cols[columnIndex];
    if (!column) return false;
    const top = column.at(-1);
    return !top || (top.up && isItem(this.cards[top.id]));
  }
  placeWild(columnIndex: number) {
    if (!this.canPlaceWild(columnIndex)) return null;
    const before = cloneState(this.state);
    const id = this.cards.length;
    this.cards.push({ id, kind: "wild", cat: "", label: "Wild Thread" });
    this.state.cols[columnIndex].push({ id, up: true });
    this.history.push({ state: before, wildPlaced: id });
    return id;
  }
  hint(): Action | null {
    return bestHint(this.state, this.cards);
  }
  addMoves(count: number) {
    this.state.moves += count;
    for (const entry of this.history) entry.state.moves += count;
  }
  payout(bonus: number) {
    const base =
      this.def.mode === "daily" ? economy.dailyBase : economy.winBase;
    return Math.round(
      (base + economy.perMoveLeft * this.state.moves) * (1 + bonus),
    );
  }
}
