import { Container } from 'pixi.js';
import { Bubble, BUBBLE_R, COLORS } from './Bubble.js';

// Hex offset grid (odd-row offset).
// Cell (row, col) has center:
//   x = col * HEX_W + (row % 2) * HEX_W/2 + MARGIN_X
//   y = row * HEX_H + MARGIN_Y

export const HEX_W = BUBBLE_R * 2 + 2;           // horizontal spacing
export const HEX_H = Math.round(BUBBLE_R * 1.73); // vertical spacing ~sqrt(3)*r

const NEIGHBOR_OFFSETS = [
  // even rows           odd rows
  [[-1,-1],[-1, 0],[0,-1],[0,1],[1,-1],[1, 0]],  // even
  [[-1, 0],[-1, 1],[0,-1],[0,1],[1, 0],[1, 1]],  // odd
];

export class Grid {
  /**
   * @param {Container} container  Pixi container to add bubbles into
   * @param {number} cols          Number of columns
   * @param {number} rows          Initial filled rows
   * @param {number} marginX       Left margin offset in pixels
   * @param {number} marginY       Top margin offset in pixels
   * @param {number} colorCount    How many distinct colors to use
   */
  constructor(container, cols, rows, marginX, marginY, colorCount = 3) {
    this.container = container;
    this.cols = cols;
    this.rows = 0; // grows as we fill
    this.marginX = marginX;
    this.marginY = marginY;
    this.colorCount = colorCount;
    // cells[row][col] = Bubble or null
    this.cells = [];
    this._fillRows(rows, 0);
  }

  // ── Coordinate helpers ───────────────────────────────────────────────

  cellCenter(row, col) {
    const x = this.marginX + col * HEX_W + (row % 2 === 1 ? HEX_W / 2 : 0);
    const y = this.marginY + row * HEX_H;
    return { x, y };
  }

  /** Nearest grid cell to pixel position (px, py). Returns {row, col}. */
  pixelToCell(px, py) {
    // Approximate by inverting the center formula
    const row = Math.round((py - this.marginY) / HEX_H);
    const offset = row % 2 === 1 ? HEX_W / 2 : 0;
    const col = Math.round((px - this.marginX - offset) / HEX_W);
    return { row, col };
  }

  inBounds(row, col) {
    return row >= 0 && row < this.cells.length && col >= 0 && col < this.cols;
  }

  get(row, col) {
    if (!this.inBounds(row, col)) return undefined;
    return this.cells[row][col];
  }

  neighbors(row, col) {
    const parity = row % 2; // 0=even, 1=odd
    return NEIGHBOR_OFFSETS[parity]
      .map(([dr, dc]) => ({ row: row + dr, col: col + dc }))
      .filter(({ row: r, col: c }) => this.inBounds(r, c));
  }

  // ── Grid filling ─────────────────────────────────────────────────────

  _fillRows(count, startRow) {
    for (let r = 0; r < count; r++) {
      const row = startRow + r;
      if (!this.cells[row]) this.cells[row] = new Array(this.cols).fill(null);
      for (let c = 0; c < this.cols; c++) {
        if (this.cells[row][c]) continue;
        // Stone bubbles (can't be popped, only cleared as floating debris)
        // start appearing a bit earlier and slightly more often, adding
        // real friction instead of every board being pure same-color mush.
        const isStone = row > 1 && Math.random() < 0.13;
        const cidx = isStone ? -1 : Math.floor(Math.random() * this.colorCount);
        const bubble = new Bubble(cidx);
        this.cells[row][c] = bubble;
        const { x, y } = this.cellCenter(row, c);
        bubble.x = x; bubble.y = y;
        this.container.addChild(bubble);
      }
      this.rows = Math.max(this.rows, row + 1);
    }
  }

  /** Shift all existing rows down by one and add a fresh row at the top. */
  descend(colorCount) {
    // Move all cells down 1 row
    this.cells.unshift(new Array(this.cols).fill(null));
    this.rows++;
    // Update Y positions
    for (let r = 1; r < this.cells.length; r++) {
      for (let c = 0; c < this.cols; c++) {
        const b = this.cells[r][c];
        if (b) {
          const { y } = this.cellCenter(r, c);
          b.y = y;
        }
      }
    }
    // Fill the new row 0 fresh
    const newRow = new Array(this.cols).fill(null);
    this.cells[0] = newRow;
    for (let c = 0; c < this.cols; c++) {
      const cidx = Math.floor(Math.random() * (colorCount || this.colorCount));
      const bubble = new Bubble(cidx);
      newRow[c] = bubble;
      const { x, y } = this.cellCenter(0, c);
      bubble.x = x; bubble.y = y;
      this.container.addChild(bubble);
    }
  }

  // ── Placement ───────────────────────────────────────────────────────

  /** Place a bubble at (row, col). Grows rows array if needed. */
  place(row, col, bubble) {
    // Ensure rows array is big enough
    while (this.cells.length <= row) {
      this.cells.push(new Array(this.cols).fill(null));
    }
    if (this.cells[row][col]) return; // already occupied
    this.cells[row] = this.cells[row] || new Array(this.cols).fill(null);
    this.cells[row][col] = bubble;
    const { x, y } = this.cellCenter(row, col);
    bubble.x = x; bubble.y = y;
    bubble.setGlow(false);
    this.container.addChild(bubble);
    this.rows = Math.max(this.rows, row + 1);
  }

  // ── Pop logic ───────────────────────────────────────────────────────

  /**
   * Flood-fill from (row, col) to find all connected same-color bubbles.
   * Returns [{row, col}].
   */
  findConnected(row, col) {
    const target = this.cells[row]?.[col];
    if (!target || target.isStone) return [];
    const visited = new Set();
    const stack = [{ row, col }];
    const result = [];
    while (stack.length) {
      const cur = stack.pop();
      const key = `${cur.row},${cur.col}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const b = this.cells[cur.row]?.[cur.col];
      if (!b || b.colorIdx !== target.colorIdx) continue;
      result.push(cur);
      for (const nb of this.neighbors(cur.row, cur.col)) {
        if (!visited.has(`${nb.row},${nb.col}`)) stack.push(nb);
      }
    }
    return result;
  }

  /**
   * Find all bubbles not connected (directly or transitively) to row 0.
   * These "fall" when their support is removed.
   */
  findFloating() {
    // BFS from all row-0 bubbles
    const visited = new Set();
    const queue = [];
    for (let c = 0; c < this.cols; c++) {
      if (this.cells[0]?.[c]) {
        const key = `0,${c}`;
        visited.add(key);
        queue.push({ row: 0, col: c });
      }
    }
    while (queue.length) {
      const cur = queue.shift();
      for (const nb of this.neighbors(cur.row, cur.col)) {
        const key = `${nb.row},${nb.col}`;
        if (!visited.has(key) && this.cells[nb.row]?.[nb.col]) {
          visited.add(key);
          queue.push(nb);
        }
      }
    }
    // Anything not visited is floating
    const floating = [];
    for (let r = 0; r < this.cells.length; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.cells[r][c] && !visited.has(`${r},${c}`)) {
          floating.push({ row: r, col: c });
        }
      }
    }
    return floating;
  }

  /**
   * Remove bubbles at the given cells. Returns the removed Bubble objects.
   */
  remove(cells) {
    const removed = [];
    for (const { row, col } of cells) {
      const b = this.cells[row]?.[col];
      if (b) {
        this.cells[row][col] = null;
        removed.push(b);
      }
    }
    return removed;
  }

  /** True if any bubble in any row >= dangerRow is occupied. */
  hasBubbleBelowRow(dangerRow) {
    for (let r = dangerRow; r < this.cells.length; r++) {
      if (this.cells[r]?.some(b => b !== null)) return true;
    }
    return false;
  }

  /** Count total remaining bubbles. */
  count() {
    let n = 0;
    for (const row of this.cells) if (row) for (const b of row) if (b) n++;
    return n;
  }

  /** True if the grid is completely clear. */
  isEmpty() {
    return this.count() === 0;
  }

  /** Remove all bubbles from the container (for game reset). */
  destroy() {
    for (const row of this.cells) {
      if (!row) continue;
      for (const b of row) {
        if (b) { this.container.removeChild(b); b.destroy({ children: true }); }
      }
    }
    this.cells = [];
    this.rows = 0;
  }
}
