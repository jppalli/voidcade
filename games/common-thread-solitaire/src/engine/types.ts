/** Shared types for the rules engine, generator and views. */

export type CardKind = 'word' | 'pic' | 'cat' | 'wild';

export interface Card {
  id: number;
  kind: CardKind;
  cat: string;
  label: string;
  /** Category cards only: how many cards complete the set. */
  total?: number;
  /** Picture cards and picture category cards: key into PIC_ART. */
  icon?: string;
}

export interface ColumnCard {
  id: number;
  up: boolean;
}

/** A category tag sitting in a foundation slot, collecting its set. */
export interface FoundationSlot {
  cat: string;
  catCard: number;
  count: number;
  total: number;
}

export interface TableState {
  cols: ColumnCard[][];
  stock: number[];
  waste: number[];
  found: (FoundationSlot | null)[];
  cleared: string[];
  moves: number;
  movesUsed: number;
}

export type Place =
  | { z: 'waste' }
  | { z: 'col'; i: number; idx: number }
  | { z: 'found'; i: number }
  | { z: 'stock' };

export type Source = { z: 'waste' } | { z: 'col'; i: number; idx: number };
export type Target = { z: 'found'; i: number } | { z: 'col'; i: number };

export type Action =
  | { t: 'draw' }
  | { t: 'recycle' }
  | { t: 'move'; from: Source; to: Target };

export type RejectReason =
  | 'noMoves'
  | 'notMovable'
  | 'needCategory'
  | 'slotBusy'
  | 'wrongSet'
  | 'onCategory'
  | 'mismatch'
  | 'slotsFull'
  | 'covered';

export interface ActionResult {
  ok: boolean;
  reason?: RejectReason;
  moved?: number[];
  flipped?: number[];
  dissolvedWild?: number;
  scored?: { found: number; ids: number[] };
  clearedCat?: string;
  clearedFound?: number;
}

export interface SetSpec {
  cat: string;
  n: number;
}

export type GameMode = 'journey' | 'daily' | 'quick';

export interface LevelDef {
  key: string;
  mode: GameMode;
  title: string;
  board: number;
  sets: SetSpec[];
  mu: number;
  seed: number;
  par: number;
  budget: number;
}

export type Modality = 'word' | 'pic';

export interface Category {
  id: string;
  title: string;
  modality: Modality;
  items: string[];
  tags?: string[];
}

export type GameStatus = 'won' | 'out' | 'deadlock' | 'play';
