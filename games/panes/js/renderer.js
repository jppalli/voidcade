/**
 * renderer.js — all DOM writes for the board.
 * No game logic here. Accepts data, mutates DOM.
 */

import { state } from "./state.js";
import { rectCells, rectArea } from "./state.js";

// ─── Helpers ──────────────────────────────────────────────────────────

export function cellAt(r, c) {
  if (r < 0 || c < 0 || r >= state.height || c >= state.width) return null;
  return state.cellEls[r]?.[c] ?? null;
}

// ─── Board build ──────────────────────────────────────────────────────

/** Rebuild the entire board grid from scratch. */
export function buildBoard(boardEl) {
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${state.width}, 1fr)`;
  boardEl.style.gridTemplateRows    = `repeat(${state.height}, 1fr)`;

  state.cellEls = [];
  const frag = document.createDocumentFragment();

  for (let r = 0; r < state.height; r++) {
    const rowEls = [];
    for (let c = 0; c < state.width; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);
      cell.setAttribute("role", "gridcell");

      const clueIdx = state.clueByCell.get(`${r},${c}`);
      if (clueIdx !== undefined) {
        const span = document.createElement("span");
        span.className = "clue";
        span.textContent = String(state.clues[clueIdx].value);
        cell.appendChild(span);
      }

      frag.appendChild(cell);
      rowEls.push(cell);
    }
    state.cellEls.push(rowEls);
  }

  boardEl.appendChild(frag);

  // Board entrance animation
  boardEl.classList.remove("anim-board-enter");
  void boardEl.offsetWidth; // force reflow
  boardEl.classList.add("anim-board-enter");
}

// ─── Region styling ───────────────────────────────────────────────────

export function applyRegionStyling(region) {
  for (const [r, c] of rectCells(region)) {
    const cell = cellAt(r, c);
    if (!cell) continue;
    cell.style.backgroundColor = region.color;
    cell.classList.add("locked");
  }
}

export function removeRegionStyling(region) {
  for (const [r, c] of rectCells(region)) {
    const cell = cellAt(r, c);
    if (!cell) continue;
    cell.style.backgroundColor = "";
    cell.classList.remove("locked");
  }
}

/**
 * Repaint region boundary borders across the whole board in one pass.
 * Every internal seam is owned by exactly one cell (its border-right for
 * vertical seams, its border-bottom for horizontal seams), so no seam is
 * ever drawn by two cells at once — eliminating doubled-up thick borders
 * where two locked regions (or a locked + unlocked cell) meet.
 */
export function repaintRegionBorders() {
  const w = state.width, h = state.height;
  const grid = Array.from({ length: h }, () => new Array(w).fill(-1));
  state.regions.forEach((region, idx) => {
    for (const [r, c] of rectCells(region)) grid[r][c] = idx;
  });

  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const cell = cellAt(r, c);
      if (!cell) continue;
      const id = grid[r][c];
      const rightBoundary  = c < w - 1 && grid[r][c + 1] !== id;
      const bottomBoundary = r < h - 1 && grid[r + 1][c] !== id;
      cell.classList.toggle("region-edge-right",  rightBoundary);
      cell.classList.toggle("region-edge-bottom", bottomBoundary);
    }
  }
}

// ─── Animations ───────────────────────────────────────────────────────

/** Play fill-in animation on every cell of a region, bounce the clue number. */
export function animateRegionLock(region) {
  const cells = rectCells(region);
  cells.forEach(([r, c], i) => {
    const cell = cellAt(r, c);
    if (!cell) return;
    const delay = i * 18; // stagger each cell slightly
    cell.style.animationDelay = `${delay}ms`;
    cell.classList.remove("anim-region-fill");
    void cell.offsetWidth;
    cell.classList.add("anim-region-fill");
    cell.addEventListener("animationend", () => {
      cell.classList.remove("anim-region-fill");
      cell.style.animationDelay = "";
    }, { once: true });
  });

  // Bounce the clue number
  const clue = state.clues[region.clueIndex];
  const clueCell = cellAt(clue.row, clue.col);
  const span = clueCell?.querySelector(".clue");
  if (span) {
    span.classList.remove("anim-bounce-number");
    void span.offsetWidth;
    span.classList.add("anim-bounce-number");
    span.addEventListener("animationend", () => span.classList.remove("anim-bounce-number"), { once: true });
  }
}

/** Shake cells in a rectangle to signal an invalid placement. */
export function animateShakeRect(rect) {
  for (const [r, c] of rectCells(rect)) {
    const cell = cellAt(r, c);
    if (!cell) continue;
    cell.classList.remove("anim-shake");
    void cell.offsetWidth;
    cell.classList.add("anim-shake");
    cell.addEventListener("animationend", () => cell.classList.remove("anim-shake"), { once: true });
  }
}

// ─── Drag overlay ────────────────────────────────────────────────────

let _dragOverlay = null;

export function ensureDragOverlay(container) {
  if (_dragOverlay && container.contains(_dragOverlay)) return _dragOverlay;
  _dragOverlay = document.createElement("div");
  _dragOverlay.className = "drag-overlay";
  _dragOverlay.hidden = true;
  container.appendChild(_dragOverlay);
  return _dragOverlay;
}

export function showDragOverlay(boardEl, rect, valid) {
  const overlay = _dragOverlay;
  if (!overlay) return;
  const br  = boardEl.getBoundingClientRect();
  const fr  = boardEl.parentElement.getBoundingClientRect();
  const cw  = br.width  / state.width;
  const ch  = br.height / state.height;
  const ox  = br.left - fr.left;
  const oy  = br.top  - fr.top;

  overlay.style.left   = `${ox + rect.left * cw}px`;
  overlay.style.top    = `${oy + rect.top  * ch}px`;
  overlay.style.width  = `${(rect.right  - rect.left + 1) * cw}px`;
  overlay.style.height = `${(rect.bottom - rect.top  + 1) * ch}px`;
  overlay.className    = `drag-overlay ${valid ? "drag-valid" : "drag-invalid"}`;
  overlay.hidden       = false;
}

export function hideDragOverlay() {
  if (_dragOverlay) _dragOverlay.hidden = true;
}

// ─── Confetti ────────────────────────────────────────────────────────

export function burstConfetti(container) {
  const canvas = document.createElement("canvas");
  canvas.id = "confetti-canvas";
  canvas.width  = container.offsetWidth;
  canvas.height = container.offsetHeight;
  container.appendChild(canvas);

  const ctx   = canvas.getContext("2d");
  const W     = canvas.width;
  const H     = canvas.height;
  const COUNT = 60;
  const colors = ["#f7c842","#5c8df6","#82d95f","#f77a7a","#b79cf7","#f59a4a","#63d2d2"];

  const particles = Array.from({ length: COUNT }, () => ({
    x:   W * 0.5 + (Math.random() - 0.5) * W * 0.6,
    y:   H * 0.45,
    vx:  (Math.random() - 0.5) * 5,
    vy:  -(2 + Math.random() * 4),
    r:   3 + Math.random() * 4,
    rot: Math.random() * 360,
    vr:  (Math.random() - 0.5) * 12,
    color: colors[Math.floor(Math.random() * colors.length)],
    alpha: 1,
  }));

  let start = null;
  function draw(ts) {
    if (!start) start = ts;
    const elapsed = ts - start;
    ctx.clearRect(0, 0, W, H);
    let alive = 0;
    for (const p of particles) {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.12; // gravity
      p.rot += p.vr;
      p.alpha = Math.max(0, 1 - elapsed / 1600);
      if (p.alpha <= 0) continue;
      alive++;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
      ctx.restore();
    }
    if (alive > 0 && elapsed < 1800) requestAnimationFrame(draw);
    else canvas.remove();
  }
  requestAnimationFrame(draw);
}
