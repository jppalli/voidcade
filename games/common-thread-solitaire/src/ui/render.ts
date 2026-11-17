import type { GameState, Card } from '../game/types';

export function renderGameBoard(state: GameState, container: HTMLElement): void {
  container.innerHTML = '';

  // Render slots
  state.slots.forEach(slot => {
    const slotEl = document.createElement('div');
    slotEl.className = 'card-slot';
    slotEl.id = `slot-${slot.id}`;
    slotEl.dataset.slotId = slot.id;
    slotEl.dataset.category = slot.category;
    slotEl.style.left = `${slot.x}px`;
    slotEl.style.top = `${slot.y}px`;
    
    if (slot.complete) {
      slotEl.classList.add('complete');
    }
    
    container.appendChild(slotEl);
  });

  // Render cards
  state.level.cards.forEach(card => {
    const position = state.cardPositions.get(card.id);
    if (!position) return;

    const cardEl = createCardElement(card, position, state);
    container.appendChild(cardEl);
  });
}

function createCardElement(
  card: Card,
  position: { x: number; y: number; slotId?: string },
  state: GameState
): HTMLElement {
  const cardEl = document.createElement('div');
  cardEl.className = 'card';
  cardEl.id = `card-${card.id}`;
  cardEl.dataset.cardId = card.id;
  cardEl.style.left = `${position.x}px`;
  cardEl.style.top = `${position.y}px`;
  
  if (position.slotId) {
    cardEl.classList.add('in-slot');
  }

  // Calculate z-index based on position (cards higher up appear on top)
  const zIndex = position.slotId 
    ? 50 + state.slots.get(position.slotId)!.cardIds.indexOf(card.id)
    : 10;
  cardEl.style.zIndex = String(zIndex);

  const inner = document.createElement('div');
  inner.className = 'card-inner';

  // Front face
  const face = document.createElement('div');
  face.className = 'card-face';

  const header = document.createElement('div');
  header.className = 'card-header';
  header.textContent = position.slotId
    ? state.slots.get(position.slotId)!.category
    : '';

  const content = document.createElement('div');
  content.className = 'card-content';
  content.textContent = card.content;

  face.appendChild(header);
  face.appendChild(content);

  // Back of card
  const back = document.createElement('div');
  back.className = 'card-back';

  inner.appendChild(face);
  inner.appendChild(back);
  cardEl.appendChild(inner);

  return cardEl;
}

export function updateCard(cardId: string, state: GameState): void {
  const cardEl = document.getElementById(`card-${cardId}`);
  if (!cardEl) return;

  const position = state.cardPositions.get(cardId);
  if (!position) return;

  cardEl.style.left = `${position.x}px`;
  cardEl.style.top = `${position.y}px`;

  const header = cardEl.querySelector('.card-header');
  if (header && position.slotId) {
    const slot = state.slots.get(position.slotId);
    if (slot) {
      header.textContent = slot.category;
      cardEl.classList.add('in-slot');
      
      // Update z-index based on order in slot
      const indexInSlot = slot.cardIds.indexOf(cardId);
      cardEl.style.zIndex = String(50 + indexInSlot);
    }
  } else if (header) {
    header.textContent = '';
    cardEl.classList.remove('in-slot');
    cardEl.style.zIndex = '10';
  }
}

export function updateSlot(slotId: string, state: GameState): void {
  const slotEl = document.getElementById(`slot-${slotId}`);
  if (!slotEl) return;

  const slot = state.slots.get(slotId);
  if (!slot) return;

  slotEl.classList.toggle('complete', slot.complete);
}

export function showHint(cardIds: string[]): void {
  cardIds.forEach(cardId => {
    const cardEl = document.getElementById(`card-${cardId}`);
    if (cardEl) {
      cardEl.classList.add('hint');
      setTimeout(() => {
        cardEl.classList.remove('hint');
      }, 2000);
    }
  });
}

export function updateMoves(moves: number, container: HTMLElement): void {
  const countEl = container.querySelector('#moves-count');
  if (countEl) {
    countEl.textContent = String(moves);
  }
}

export function showToast(message: string, duration: number = 2000): void {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, duration);
}

export function announceToScreenReader(message: string): void {
  const srEl = document.getElementById('sr-announce');
  if (srEl) {
    srEl.textContent = message;
    // Clear after a moment so repeated messages still announce
    setTimeout(() => {
      srEl.textContent = '';
    }, 1000);
  }
}
