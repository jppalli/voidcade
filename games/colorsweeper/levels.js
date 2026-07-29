/**
 * Color Sweeper — verified levels.
 *
 * Every level in this file was checked by verify-levels.mjs:
 *  - All clue numbers match the actual solution grid.
 *  - Each puzzle is solvable by pure constraint deduction (no guessing).
 *
 * Clue numbers are computed from the solution at load time so there is a
 * single source of truth and no risk of hand-entry errors.
 */

export const COLORS = [
  { id: 0, name: 'Orange', hex: '#f4631e' },
  { id: 1, name: 'Dark',   hex: '#2d3340' },
  { id: 2, name: 'Yellow', hex: '#e8c04a' },
];

const O = 0, D = 1, Y = 2;

/**
 * Count orthogonal same-color neighbours in the solution.
 */
export function clueValue(solution, row, col) {
  const color = solution[row][col];
  const size = solution.length;
  let count = 0;
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const r = row + dr, c = col + dc;
    if (r >= 0 && r < size && c >= 0 && c < size && solution[r][c] === color) count++;
  }
  return count;
}

export const LEVELS = [
  // ── 3×3 Hello ─────────────────────────────────────────────────────────────
  // Solution:
  //   O D O
  //   D Y D
  //   O D O
  // All corners + centre are O or Y with 0 same-color neighbours —
  // just two clue types eliminate everything.
  {
    id: 1,
    name: '3×3 Hello',
    size: 3,
    solution: [
      [O, D, O],
      [D, Y, D],
      [O, D, O],
    ],
    // Clue cells: [row, col]. Numbers computed automatically below.
    startClues: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  },

  // ── 3×3 Corners ───────────────────────────────────────────────────────────
  // Solution:
  //   O O D
  //   Y D O
  //   Y Y D
  {
    id: 2,
    name: '3×3 Corners',
    size: 3,
    solution: [
      [O, O, D],
      [Y, D, O],
      [Y, Y, D],
    ],
    startClues: [[0,0],[0,2],[1,1],[1,2],[2,0],[2,2]],
  },

  // ── 4×4 First Steps ───────────────────────────────────────────────────────
  // Solution:
  //   O O D D
  //   O Y Y D
  //   Y Y D O
  //   D D O O
  {
    id: 3,
    name: '4×4 First Steps',
    size: 4,
    solution: [
      [O, O, D, D],
      [O, Y, Y, D],
      [Y, Y, D, O],
      [D, D, O, O],
    ],
    startClues: [[0,0],[0,3],[1,1],[2,0],[2,2],[3,0],[3,1],[3,3]],
  },

  // ── 4×4 Stripes ───────────────────────────────────────────────────────────
  // Solution:
  //   O D O D
  //   O D O D
  //   Y Y Y Y
  //   O D O D
  {
    id: 4,
    name: '4×4 Stripes',
    size: 4,
    solution: [
      [O, D, O, D],
      [O, D, O, D],
      [Y, Y, Y, Y],
      [O, D, O, D],
    ],
    startClues: [[0,0],[0,1],[0,2],[0,3],[1,2],[2,0],[2,3],[2,2],[3,0],[3,1],[3,2]],
  },
];

// Enrich levels at load time so clue numbers are always correct
for (const lvl of LEVELS) {
  lvl._clueValues = {};
  for (const [r, c] of lvl.startClues) {
    lvl._clueValues[`${r},${c}`] = clueValue(lvl.solution, r, c);
  }
}
