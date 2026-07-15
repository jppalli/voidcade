/**
 * state.js — single source of truth for mutable game state.
 * Nothing here touches the DOM. Import and mutate directly.
 */

export const REGION_PALETTE = [
  "#82d95f", // green
  "#5c8df6", // blue
  "#f5c842", // gold
  "#e08fb0", // rose
  "#63d2d2", // teal
  "#f59a4a", // orange
  "#b79cf7", // lavender
  "#f77a7a", // coral
  "#8fd4c0", // mint
  "#d4b94e", // sand
  "#a8c8f8", // sky
  "#f7b8e8", // pink
];

/** @type {GameState} */
export const state = {
  // Puzzle geometry
  width:   7,
  height:  7,

  // Daily challenge context (the only mode now)
  mode: "daily",
  dailyDateKey: null,     // "YYYY-MM-DD" of the day being played
  dailyLevelKey: null,    // "easy" | "medium" | "hard"

  // Puzzle data (set by startPuzzle)
  clues:        [],        // [{ row, col, value }]
  solutionRects: [],       // [{ top,left,bottom,right, clue }]
  clueByCell:   new Map(), // "r,c" → clue index

  // Player progress
  regions:  [],  // [{ top,left,bottom,right, clueIndex, color }]
  misses:   0,
  solved:   false,
  readOnly: false, // true when viewing an already-completed level (no edits allowed)

  // Timer
  startedAt:   null,
  timerHandle: null,

  // DOM cache (set by renderer)
  cellEls: [],             // 2D array [row][col] → HTMLElement

  // Drag state
  drag: null,
  // active drag:   { anchorR, anchorC, curR, curC, moved }
  // remove drag:   { removeCandidate: { r, c }, moved }
};

export function resetForNewPuzzle(puzzle) {
  state.width         = puzzle.width;
  state.height        = puzzle.height;
  state.clues         = puzzle.clues;
  state.solutionRects = puzzle.solutionRects;
  state.regions       = [];
  state.misses        = 0;
  state.solved        = false;
  state.readOnly      = false;
  state.startedAt     = Date.now();
  state.drag          = null;
  state.clueByCell    = new Map();
  puzzle.clues.forEach((c, i) => state.clueByCell.set(`${c.row},${c.col}`, i));
}

export function regionAt(r, c) {
  return state.regions.find(
    reg => r >= reg.top && r <= reg.bottom && c >= reg.left && c <= reg.right
  );
}

export function isCellFree(r, c) {
  return !regionAt(r, c);
}

export function nextRegionColor() {
  return REGION_PALETTE[state.regions.length % REGION_PALETTE.length];
}

// ─── Rect utilities (no DOM, no game actions) ─────────────────────────

export function rectFromDrag(anchorR, anchorC, curR, curC) {
  return {
    top:    Math.min(anchorR, curR),
    bottom: Math.max(anchorR, curR),
    left:   Math.min(anchorC, curC),
    right:  Math.max(anchorC, curC),
  };
}

export function rectCells(rect) {
  const cells = [];
  for (let r = rect.top; r <= rect.bottom; r++)
    for (let c = rect.left; c <= rect.right; c++)
      cells.push([r, c]);
  return cells;
}

export function rectArea(rect) {
  return (rect.bottom - rect.top + 1) * (rect.right - rect.left + 1);
}

export function validateDragRect(rect) {
  for (const [r, c] of rectCells(rect)) {
    if (!isCellFree(r, c)) return { ok: false, reason: "overlap" };
  }
  let clueIdx = null;
  for (const [r, c] of rectCells(rect)) {
    const idx = state.clueByCell.get(`${r},${c}`);
    if (idx !== undefined) {
      if (clueIdx !== null) return { ok: false, reason: "multiple-clues" };
      clueIdx = idx;
    }
  }
  if (clueIdx === null) return { ok: false, reason: "no-clue" };
  if (state.regions.some(reg => reg.clueIndex === clueIdx)) return { ok: false, reason: "clue-already-used" };
  if (rectArea(rect) !== state.clues[clueIdx].value) return { ok: false, reason: "area-mismatch" };
  return { ok: true, clueIndex: clueIdx };
}
