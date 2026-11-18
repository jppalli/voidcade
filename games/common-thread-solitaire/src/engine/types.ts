export interface Card {
  id: number;
  kind: "cat" | "word" | "pic" | "wild";
  cat: string;
  label: string;
  total?: number;
  icon?: string;
}
export interface Foundation {
  cat: string;
  catCard: number;
  count: number;
  total: number;
}
export interface GameState {
  cols: { id: number; up: boolean }[][];
  stock: number[];
  waste: number[];
  found: (Foundation | null)[];
  cleared: string[];
  moves: number;
  movesUsed: number;
}
export type Source = { z: "waste" } | { z: "col"; i: number; idx: number };
export type Destination = { z: "found" | "col"; i: number };
export type Action =
  | { t: "draw" }
  | { t: "recycle" }
  | { t: "move"; from: Source; to: Destination };
export type MoveError =
  | "noMoves"
  | "notMovable"
  | "needCategory"
  | "slotBusy"
  | "wrongSet"
  | "onCategory"
  | "mismatch";
export interface MoveResult {
  ok: boolean;
  reason?: MoveError;
  moved?: number[];
  flipped?: number[];
  dissolvedWild?: number;
  scored?: { found: number; ids: number[] };
  clearedCat?: string;
  clearedFound?: number;
}
export interface LevelDefinition {
  key: string;
  mode: "journey" | "daily" | "quick" | "custom";
  title: string;
  board: number;
  sets: { cat: string; n: number }[];
  mu: number;
  seed: number;
  par: number;
  budget: number;
}
export interface HistoryEntry {
  state: GameState;
  wildPlaced?: number;
}
export interface SessionSnapshot {
  def: LevelDefinition;
  cards: Card[];
  state: GameState;
  history: HistoryEntry[];
  freeUndos: number;
  rescues: number;
  hints: number;
  bonusMoves: number;
  startBudget: number;
}
