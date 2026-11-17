import { audio } from '../audio/sound';

interface DragState {
  cardId: string;
  element: HTMLElement;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  originalZ: string;
}

let currentDrag: DragState | null = null;

export function setupDragAndDrop(
  container: HTMLElement,
  onCardMoved: (cardId: string, slotId: string | undefined, x: number, y: number) => void
): void {
  let isDragging = false;

  // Pointer down - start potential drag
  container.addEventListener('pointerdown', (e: PointerEvent) => {
    const cardEl = (e.target as HTMLElement).closest('.card') as HTMLElement;
    if (!cardEl || !cardEl.dataset.cardId) return;

    const cardId = cardEl.dataset.cardId;
    const rect = cardEl.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    currentDrag = {
      cardId,
      element: cardEl,
      startX: rect.left - containerRect.left,
      startY: rect.top - containerRect.top,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      originalZ: cardEl.style.zIndex,
    };

    cardEl.style.zIndex = '1000';
    cardEl.setPointerCapture(e.pointerId);
    
    audio.cardPick();
    isDragging = false;
  });

  // Pointer move - drag card
  container.addEventListener('pointermove', (e: PointerEvent) => {
    if (!currentDrag) return;

    isDragging = true;
    const containerRect = container.getBoundingClientRect();
    const x = e.clientX - containerRect.left - currentDrag.offsetX;
    const y = e.clientY - containerRect.top - currentDrag.offsetY;

    currentDrag.element.classList.add('dragging');
    currentDrag.element.style.left = `${x}px`;
    currentDrag.element.style.top = `${y}px`;

    // Highlight potential drop targets
    highlightDropTarget(e.clientX, e.clientY, container);
  });

  // Pointer up - drop card
  container.addEventListener('pointerup', (e: PointerEvent) => {
    if (!currentDrag) return;

    const drag = currentDrag;
    currentDrag = null;

    drag.element.classList.remove('dragging');
    drag.element.style.zIndex = drag.originalZ;

    // Clear all drop target highlights
    container.querySelectorAll('.card-slot.drop-target').forEach(el => {
      el.classList.remove('drop-target');
    });

    if (!isDragging) {
      // Just a click, no drag - return to original position
      drag.element.style.left = `${drag.startX}px`;
      drag.element.style.top = `${drag.startY}px`;
      return;
    }

    // Find drop target
    const dropSlot = getDropTarget(e.clientX, e.clientY);
    
    if (dropSlot) {
      const slotId = dropSlot.dataset.slotId;
      const slotRect = dropSlot.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      const x = slotRect.left - containerRect.left;
      const y = slotRect.top - containerRect.top;
      
      onCardMoved(drag.cardId, slotId, x, y);
      audio.cardPlace();
    } else {
      // Dropped in empty space
      const containerRect = container.getBoundingClientRect();
      const x = e.clientX - containerRect.left - drag.offsetX;
      const y = e.clientY - containerRect.top - drag.offsetY;
      
      onCardMoved(drag.cardId, undefined, x, y);
      audio.cardPlace();
    }

    isDragging = false;
  });

  // Pointer cancel
  container.addEventListener('pointercancel', () => {
    if (currentDrag) {
      currentDrag.element.classList.remove('dragging');
      currentDrag.element.style.zIndex = currentDrag.originalZ;
      currentDrag.element.style.left = `${currentDrag.startX}px`;
      currentDrag.element.style.top = `${currentDrag.startY}px`;
      currentDrag = null;
    }
    
    // Clear highlights
    container.querySelectorAll('.card-slot.drop-target').forEach(el => {
      el.classList.remove('drop-target');
    });
  });
}

function highlightDropTarget(clientX: number, clientY: number, container: HTMLElement): void {
  const target = getDropTarget(clientX, clientY);
  
  // Remove all highlights
  container.querySelectorAll('.card-slot.drop-target').forEach(el => {
    el.classList.remove('drop-target');
  });
  
  // Add highlight to current target
  if (target) {
    target.classList.add('drop-target');
  }
}

function getDropTarget(clientX: number, clientY: number): HTMLElement | null {
  // Get element at pointer position
  const elementsAtPoint = document.elementsFromPoint(clientX, clientY);
  
  // Find first slot element
  for (const el of elementsAtPoint) {
    if (el.classList.contains('card-slot')) {
      return el as HTMLElement;
    }
  }
  
  return null;
}

export function setupKeyboardControls(
  container: HTMLElement,
  onUndo: () => void,
  onHint: () => void,
  onRestart: () => void
): void {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // Only handle if game screen is visible
    if (container.closest('.hidden')) return;

    switch (e.key.toLowerCase()) {
      case 'z':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          onUndo();
        }
        break;
      case 'h':
        e.preventDefault();
        onHint();
        break;
      case 'r':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          onRestart();
        }
        break;
    }
  });
}
