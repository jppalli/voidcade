import { describe, expect, it } from 'vitest';
import { DOUBLE_TAP_MS, DOUBLE_TAP_PX, DRAG_THRESHOLD_PX, GestureTracker, type TapMemory } from '../src/ui/gesture';

const fresh = () => ({ last: null as TapMemory | null });

describe('gesture tracker', () => {
  it('treats small movement as a tap', () => {
    const g = new GestureTracker({ drag: true, doubleTap: false }, fresh());
    g.down(100, 100);
    expect(g.move(100 + DRAG_THRESHOLD_PX - 1, 100)).toBeNull();
    expect(g.up(103, 101, 10)).toBe('tap');
  });

  it('starts a drag past the threshold, then reports moves and an end', () => {
    const g = new GestureTracker({ drag: true, doubleTap: false }, fresh());
    g.down(0, 0);
    expect(g.move(DRAG_THRESHOLD_PX, 0)).toBe('dragstart');
    expect(g.move(40, 10)).toBe('dragmove');
    expect(g.up(40, 10, 50)).toBe('dragend');
  });

  it('never drags when drag is off', () => {
    const g = new GestureTracker({ drag: false, doubleTap: false }, fresh());
    g.down(0, 0);
    expect(g.move(200, 0)).toBeNull();
    expect(g.up(200, 0, 5)).toBe('tap');
  });

  it('detects a double-tap within the time and distance limits', () => {
    const mem = fresh();
    const g = new GestureTracker({ drag: false, doubleTap: true }, mem);
    g.down(50, 50);
    expect(g.up(50, 50, 1000)).toBe('tap');
    g.down(60, 55);
    expect(g.up(60, 55, 1000 + DOUBLE_TAP_MS)).toBe('doubletap');
    // a third tap starts over
    g.down(60, 55);
    expect(g.up(60, 55, 1000 + DOUBLE_TAP_MS + 10)).toBe('tap');
  });

  it('does not double-tap when too slow or too far apart', () => {
    const slow = new GestureTracker({ drag: false, doubleTap: true }, fresh());
    slow.down(0, 0);
    slow.up(0, 0, 0);
    slow.down(0, 0);
    expect(slow.up(0, 0, DOUBLE_TAP_MS + 1)).toBe('tap');

    const far = new GestureTracker({ drag: false, doubleTap: true }, fresh());
    far.down(0, 0);
    far.up(0, 0, 0);
    far.down(DOUBLE_TAP_PX + 1, 0);
    expect(far.up(DOUBLE_TAP_PX + 1, 0, 100)).toBe('tap');
  });

  it('a drag does not count as the first tap of a double-tap', () => {
    const mem = fresh();
    const a = new GestureTracker({ drag: true, doubleTap: true }, mem);
    a.down(0, 0);
    a.move(30, 0);
    a.up(30, 0, 10);
    a.down(30, 0);
    expect(a.up(30, 0, 100)).toBe('tap');
  });

  it('cancel reports whether a drag was running', () => {
    const g = new GestureTracker({ drag: true, doubleTap: false }, fresh());
    g.down(0, 0);
    expect(g.cancel()).toBe(false);
    g.down(0, 0);
    g.move(20, 0);
    expect(g.cancel()).toBe(true);
    expect(g.up(20, 0, 1)).toBeNull();
  });
});