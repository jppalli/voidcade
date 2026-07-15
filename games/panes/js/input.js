/**
 * input.js — pointer/touch drag interaction.
 * Calls back into game.js; no direct DOM writes except via renderer.
 */

import { state, isCellFree } from "./state.js";
import { showDragOverlay, hideDragOverlay, ensureDragOverlay } from "./renderer.js";
import { validateDragRect, rectFromDrag } from "./state.js";

let _boardEl = null;
let _onCommit = null;   // (rect, clueIndex) => void
let _onRemove = null;   // (r, c) => void
let _onMiss   = null;   // (rect) => void

let rafPending   = false;
let pendingEvent = null;

/** Initialise pointer handling. Call once after board is built. */
export function attachInput(boardEl, { onCommit, onRemove, onMiss }) {
  _boardEl  = boardEl;
  _onCommit = onCommit;
  _onRemove = onRemove;
  _onMiss   = onMiss;

  ensureDragOverlay(boardEl.parentElement);

  boardEl.onpointerdown   = handleDown;
  boardEl.onpointermove   = handleMove;
  boardEl.onpointerup     = handleUp;
  boardEl.onpointercancel = handleCancel;
}

// ─── Coordinate math ────────────────────────────────────────────────

function pointerToCell(clientX, clientY) {
  const br  = _boardEl.getBoundingClientRect();
  const col = Math.floor((clientX - br.left) / (br.width  / state.width));
  const row = Math.floor((clientY - br.top)  / (br.height / state.height));
  if (row < 0 || row >= state.height || col < 0 || col >= state.width) return null;
  return { row, col };
}

// ─── Event handlers ─────────────────────────────────────────────────

function handleDown(e) {
  if (state.readOnly) return;
  const pos = pointerToCell(e.clientX, e.clientY);
  if (!pos) return;
  const { row: r, col: c } = pos;

  if (!isCellFree(r, c)) {
    state.drag = { removeCandidate: { r, c }, moved: false };
    return;
  }

  state.drag = { anchorR: r, anchorC: c, curR: r, curC: c, moved: false };
  const rect  = rectFromDrag(r, c, r, c);
  const valid = validateDragRect(rect).ok;
  showDragOverlay(_boardEl, rect, valid);
  _boardEl.setPointerCapture(e.pointerId);
}

function handleMove(e) {
  if (!state.drag || state.drag.removeCandidate) return;
  pendingEvent = e;
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    const ev = pendingEvent;
    pendingEvent = null;
    if (!state.drag || !ev) return;

    const pos = pointerToCell(ev.clientX, ev.clientY);
    if (!pos) return;
    const { row: r, col: c } = pos;
    if (r === state.drag.curR && c === state.drag.curC) return;

    state.drag.curR  = r;
    state.drag.curC  = c;
    state.drag.moved = true;
    const rect  = rectFromDrag(state.drag.anchorR, state.drag.anchorC, r, c);
    const valid = validateDragRect(rect).ok;
    showDragOverlay(_boardEl, rect, valid);
  });
}

function handleUp() {
  const drag = state.drag;
  state.drag = null;
  hideDragOverlay();

  if (!drag) return;

  if (drag.removeCandidate) {
    if (!drag.moved) _onRemove(drag.removeCandidate.r, drag.removeCandidate.c);
    return;
  }

  const rect  = rectFromDrag(drag.anchorR, drag.anchorC, drag.curR, drag.curC);
  const check = validateDragRect(rect);
  if (check.ok) {
    _onCommit(rect, check.clueIndex);
  } else {
    _onMiss(rect);
  }
}

function handleCancel() {
  hideDragOverlay();
  state.drag = null;
}
