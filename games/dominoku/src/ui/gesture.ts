/**
 * Tells taps, double-taps and drags apart. The decision logic has no DOM access so it can be
 * tested; `bindGestures` connects it to Pointer Events (mouse, touch and pen in one code path).
 */
export const DRAG_THRESHOLD_PX = 6;
export const DOUBLE_TAP_MS = 300;
export const DOUBLE_TAP_PX = 24;

export interface TapMemory {
  t: number;
  x: number;
  y: number;
}
/** Shared by all elements, so a double-tap still works after the board is re-rendered between taps. */
const sharedMemory: { last: TapMemory | null } = { last: null };

export type UpResult = 'tap' | 'doubletap' | 'dragend';

export class GestureTracker {
  private start: { x: number; y: number } | null = null;
  private dragging = false;

  constructor(
    private readonly opts: { drag: boolean; doubleTap: boolean },
    private readonly memory: { last: TapMemory | null } = sharedMemory,
  ) {}

  down(x: number, y: number): void {
    this.start = { x, y };
    this.dragging = false;
  }

  move(x: number, y: number): 'dragstart' | 'dragmove' | null {
    if (!this.start || !this.opts.drag) return null;
    if (this.dragging) return 'dragmove';
    if (Math.hypot(x - this.start.x, y - this.start.y) < DRAG_THRESHOLD_PX) return null;
    this.dragging = true;
    return 'dragstart';
  }

  up(x: number, y: number, time: number): UpResult | null {
    if (!this.start) return null;
    const wasDragging = this.dragging;
    this.start = null;
    this.dragging = false;
    if (wasDragging) {
      this.memory.last = null;
      return 'dragend';
    }
    if (this.opts.doubleTap) {
      const last = this.memory.last;
      if (last && time - last.t <= DOUBLE_TAP_MS && Math.hypot(x - last.x, y - last.y) <= DOUBLE_TAP_PX) {
        this.memory.last = null;
        return 'doubletap';
      }
      this.memory.last = { t: time, x, y };
    }
    return 'tap';
  }

  /** Returns true if a drag was in progress. */
  cancel(): boolean {
    const was = this.dragging;
    this.start = null;
    this.dragging = false;
    return was;
  }
}

export interface GestureHandlers {
  onTap?(e: PointerEvent): void;
  onDoubleTap?(e: PointerEvent): void;
  onDragStart?(e: PointerEvent): void;
  onDragMove?(e: PointerEvent): void;
  onDragEnd?(e: PointerEvent, cancelled: boolean): void;
}

export function bindGestures(el: HTMLElement, h: GestureHandlers): void {
  const tracker = new GestureTracker({ drag: !!h.onDragStart, doubleTap: !!h.onDoubleTap });
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !e.isPrimary) return;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* capture is a nicety, not a requirement */
    }
    tracker.down(e.clientX, e.clientY);
  });
  el.addEventListener('pointermove', (e) => {
    const r = tracker.move(e.clientX, e.clientY);
    if (r === 'dragstart') h.onDragStart?.(e);
    if (r) h.onDragMove?.(e);
  });
  const finish = (e: PointerEvent) => {
    const r = tracker.up(e.clientX, e.clientY, e.timeStamp);
    if (r === 'tap') h.onTap?.(e);
    else if (r === 'doubletap') h.onDoubleTap?.(e);
    else if (r === 'dragend') h.onDragEnd?.(e, false);
  };
  el.addEventListener('pointerup', finish);
  el.addEventListener('pointercancel', (e) => {
    if (tracker.cancel()) h.onDragEnd?.(e, true);
  });
  // Keep the long-press menu and text selection away from game pieces.
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}