import { COLS, R, ROW_H } from './config.js';

/**
 * Hex-packed bubble grid. Odd rows are shifted right by one radius.
 * Cells are `{ color, wobble }` objects or null. Row 0 hangs from the ceiling.
 */
export class Grid {
  constructor() {
    this.rows = [];
  }

  get(col, row) {
    if (row < 0 || col < 0 || col >= COLS) return null;
    const r = this.rows[row];
    return r ? r[col] : null;
  }

  set(col, row, cell) {
    while (this.rows.length <= row) {
      this.rows.push(new Array(COLS).fill(null));
    }
    this.rows[row][col] = cell;
  }

  remove(col, row) {
    if (this.rows[row]) this.rows[row][col] = null;
  }

  /** Center of a cell, relative to the ceiling (add ceilingY for world y). */
  cellX(col, row) {
    return R * (1 + 2 * col + (row % 2));
  }

  cellY(row) {
    return R + row * ROW_H;
  }

  forEach(fn) {
    for (let row = 0; row < this.rows.length; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = this.rows[row][col];
        if (cell) fn(cell, col, row);
      }
    }
  }

  isEmpty() {
    for (const row of this.rows) {
      for (const cell of row) if (cell) return false;
    }
    return true;
  }

  count() {
    let n = 0;
    this.forEach(() => n++);
    return n;
  }

  /** The six hex neighbors of (col, row). */
  neighbors(col, row) {
    const side = row % 2 === 0 ? -1 : 0; // even rows look left, odd rows look right
    return [
      [col - 1, row], [col + 1, row],
      [col + side, row - 1], [col + side + 1, row - 1],
      [col + side, row + 1], [col + side + 1, row + 1],
    ];
  }

  hasOccupiedNeighbor(col, row) {
    return this.neighbors(col, row).some(([c, r]) => this.get(c, r));
  }

  /** All same-colored bubbles connected to (col, row), in BFS order. */
  matchCluster(col, row) {
    const start = this.get(col, row);
    if (!start) return [];
    const target = start.color;
    const visited = new Set([col + ',' + row]);
    const queue = [[col, row]];
    const cluster = [];
    while (queue.length) {
      const [c, r] = queue.shift();
      cluster.push([c, r]);
      for (const [nc, nr] of this.neighbors(c, r)) {
        const key = nc + ',' + nr;
        const cell = this.get(nc, nr);
        if (cell && cell.color === target && !visited.has(key)) {
          visited.add(key);
          queue.push([nc, nr]);
        }
      }
    }
    return cluster;
  }

  /** Bubbles not connected to the ceiling (row 0). */
  floatingClusters() {
    const anchored = new Set();
    const queue = [];
    for (let col = 0; col < COLS; col++) {
      if (this.get(col, 0)) {
        anchored.add(col + ',0');
        queue.push([col, 0]);
      }
    }
    while (queue.length) {
      const [c, r] = queue.shift();
      for (const [nc, nr] of this.neighbors(c, r)) {
        const key = nc + ',' + nr;
        if (this.get(nc, nr) && !anchored.has(key)) {
          anchored.add(key);
          queue.push([nc, nr]);
        }
      }
    }
    const floating = [];
    this.forEach((cell, col, row) => {
      if (!anchored.has(col + ',' + row)) floating.push([col, row]);
    });
    return floating;
  }

  /** Distinct color indices still on the board. */
  colorsInUse() {
    const used = new Set();
    this.forEach((cell) => used.add(cell.color));
    return [...used];
  }

  /** Lowest occupied row index, or -1 when empty. */
  bottomRow() {
    for (let row = this.rows.length - 1; row >= 0; row--) {
      if (this.rows[row].some(Boolean)) return row;
    }
    return -1;
  }
}
