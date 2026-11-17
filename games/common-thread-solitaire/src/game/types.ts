export type CardType = 'word' | 'picture';

export interface Card {
  id: string;
  content: string;
  type: CardType;
  category: string;
  imageUrl?: string;
}

export interface CardPosition {
  x: number;
  y: number;
  slotId?: string;
}

export interface Slot {
  id: string;
  x: number;
  y: number;
  category: string;
  cardIds: string[];
  complete: boolean;
}

export interface Level {
  id: number;
  name: string;
  cards: Card[];
  slots: Omit<Slot, 'cardIds' | 'complete'>[];
  minMoves?: number;
}

export interface GameState {
  level: Level;
  cardPositions: Map<string, CardPosition>;
  slots: Map<string, Slot>;
  moves: number;
  history: GameStateSnapshot[];
  complete: boolean;
  startTime: number;
}

export interface GameStateSnapshot {
  cardPositions: Map<string, CardPosition>;
  slots: Map<string, Slot>;
  moves: number;
}

export interface SaveData {
  currentLevel: number;
  levelsCompleted: number[];
  bestMoves: Record<number, number>;
  totalMoves: number;
  totalTime: number;
  soundEnabled: boolean;
}
