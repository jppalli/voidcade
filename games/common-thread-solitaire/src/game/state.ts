import type { GameState, Level, CardPosition, Slot, GameStateSnapshot } from './types';

export function createGameState(level: Level): GameState {
  const cardPositions = new Map<string, CardPosition>();
  const slots = new Map<string, Slot>();

  // Initialize slots
  level.slots.forEach(slotData => {
    slots.set(slotData.id, {
      ...slotData,
      cardIds: [],
      complete: false,
    });
  });

  // Shuffle and place cards randomly at start
  const shuffledCards = [...level.cards].sort(() => Math.random() - 0.5);
  shuffledCards.forEach((card, index) => {
    // Place cards in a grid pattern initially (stock area)
    const row = Math.floor(index / 4);
    const col = index % 4;
    cardPositions.set(card.id, {
      x: 600 + col * 130,
      y: 100 + row * 170,
    });
  });

  return {
    level,
    cardPositions,
    slots,
    moves: 0,
    history: [],
    complete: false,
    startTime: Date.now(),
  };
}

export function moveCard(
  state: GameState,
  cardId: string,
  position: CardPosition
): GameState {
  // Save current state to history
  const snapshot: GameStateSnapshot = {
    cardPositions: new Map(state.cardPositions),
    slots: new Map(state.slots),
    moves: state.moves,
  };

  const newPositions = new Map(state.cardPositions);
  const newSlots = new Map(state.slots);
  const oldPosition = state.cardPositions.get(cardId);

  // Remove card from old slot if it was in one
  if (oldPosition?.slotId) {
    const oldSlot = newSlots.get(oldPosition.slotId);
    if (oldSlot) {
      oldSlot.cardIds = oldSlot.cardIds.filter(id => id !== cardId);
      oldSlot.complete = false;
      newSlots.set(oldPosition.slotId, oldSlot);
    }
  }

  // Add card to new slot if moving to one
  if (position.slotId) {
    const newSlot = newSlots.get(position.slotId);
    if (newSlot) {
      newSlot.cardIds.push(cardId);
      // Check if slot is complete (all 4 cards of same category)
      if (newSlot.cardIds.length === 4) {
        const allSameCategory = newSlot.cardIds.every(id => {
          const card = state.level.cards.find(c => c.id === id);
          return card?.category === newSlot.category;
        });
        newSlot.complete = allSameCategory;
      }
      newSlots.set(position.slotId, newSlot);
    }
  }

  newPositions.set(cardId, position);

  // Check if game is complete
  const allSlotsComplete = Array.from(newSlots.values()).every(
    slot => slot.complete
  );

  return {
    ...state,
    cardPositions: newPositions,
    slots: newSlots,
    moves: state.moves + 1,
    history: [...state.history, snapshot],
    complete: allSlotsComplete,
  };
}

export function undo(state: GameState): GameState {
  if (state.history.length === 0) return state;

  const snapshot = state.history[state.history.length - 1];
  const newHistory = state.history.slice(0, -1);

  return {
    ...state,
    cardPositions: new Map(snapshot.cardPositions),
    slots: new Map(snapshot.slots),
    moves: snapshot.moves,
    history: newHistory,
    complete: false,
  };
}

export function canUndo(state: GameState): boolean {
  return state.history.length > 0;
}

export function getHint(state: GameState): string[] | null {
  // Find a category that isn't complete yet
  const incompleteSlot = Array.from(state.slots.values()).find(
    slot => !slot.complete
  );

  if (!incompleteSlot) return null;

  // Find all cards that belong to this category but aren't in the correct slot
  const hintCards = state.level.cards
    .filter(card => {
      const position = state.cardPositions.get(card.id);
      return (
        card.category === incompleteSlot.category &&
        position?.slotId !== incompleteSlot.id
      );
    })
    .map(card => card.id)
    .slice(0, 2); // Show max 2 cards

  return hintCards.length > 0 ? hintCards : null;
}

export function getPlayTime(state: GameState): number {
  return Math.floor((Date.now() - state.startTime) / 1000);
}

export function getStars(state: GameState): number {
  const minMoves = state.level.minMoves || state.level.cards.length;
  const moves = state.moves;

  if (moves <= minMoves) return 3;
  if (moves <= minMoves * 1.5) return 2;
  return 1;
}
