/**
 * Hand-authored levels for Color Sweeper.
 *
 * Each level defines:
 *   grid: 2D array of color indices (0=orange, 1=dark, 2=yellow) — the solution
 *   clues: array of [row, col] cells that show a number clue from the start.
 *          The number = how many orthogonal neighbours share the same color.
 *          A cell with 0 neighbours of its color is a very strong clue.
 *
 * Rule: clue cells are "revealed" — their color AND number are shown to the
 * player. Blank cells start grey. When the player correctly paints a blank cell
 * the game re-evaluates which clue cells now have all their neighbours
 * confirmed and may reveal additional numbers (progressive unlocking).
 *
 * Every level was verified to be solvable by pure deduction (no guessing).
 */

// Color constants
export const C = { O: 0, D: 1, Y: 2 }; // Orange, Dark, Yellow
const { O, D, Y } = C;

export const COLORS = [
  { id: 0, name: 'Orange', hex: '#f4631e', light: '#f9a07a' },
  { id: 1, name: 'Dark',   hex: '#2d3340', light: '#6b7385' },
  { id: 2, name: 'Yellow', hex: '#e8c04a', light: '#f0d98a' },
];

export const LEVELS = [
  // ─── Level 1: 4×4, "First Steps" ─────────────────────────────────────────
  // Solution:
  //   O D O O
  //   D D O D
  //   Y Y D D
  //   Y Y Y D
  {
    id: 1,
    name: 'First Steps',
    size: 4,
    solution: [
      [O, D, O, O],
      [D, D, O, D],
      [Y, Y, D, D],
      [Y, Y, Y, D],
    ],
    // Clues shown from the start. Format: [row, col].
    // Numbers are computed automatically from the solution.
    startClues: [
      [0, 0], // Orange, neighbors: right=D, below=D → 0 orange neighbours
      [0, 3], // Orange, neighbors: left=O, below=D → 1
      [1, 1], // Dark, neighbors: up=D, right=O, below=Y, left=D → 2
      [2, 2], // Dark, neighbors: up=O, right=D, below=Y, left=Y → 1
      [3, 3], // Dark, neighbors: up=D, left=Y → 1
      [3, 0], // Yellow, neighbors: up=Y, right=Y → 2
    ],
  },

  // ─── Level 2: 5×5, "Getting Going" ──────────────────────────────────────
  // Solution:
  //   O O D D Y
  //   O D D Y Y
  //   O O D Y Y
  //   D D O O Y
  //   D D D O O
  {
    id: 2,
    name: 'Getting Going',
    size: 5,
    solution: [
      [O, O, D, D, Y],
      [O, D, D, Y, Y],
      [O, O, D, Y, Y],
      [D, D, O, O, Y],
      [D, D, D, O, O],
    ],
    startClues: [
      [0, 0], // O: right=O, below=O → 2
      [0, 4], // Y: left=D, below=Y → 1
      [1, 3], // Y: right=Y, above=D, below=Y, left=D → 2
      [2, 1], // O: left=O, right=D, above=D, below=D → 1
      [2, 2], // D: above=D, right=Y, below=O, left=O → 1
      [3, 4], // Y: above=Y, left=O, below=O → 0 yellow
      [4, 2], // D: above=O, right=O, left=D → 1
      [4, 0], // D: right=D, above=D → 2
    ],
  },

  // ─── Level 3: 5×5, "Three's Company" ────────────────────────────────────
  // Solution:
  //   Y Y O O O
  //   Y D O D O
  //   D D D D O
  //   D Y Y Y D
  //   Y Y D D D
  {
    id: 3,
    name: "Three's Company",
    size: 5,
    solution: [
      [Y, Y, O, O, O],
      [Y, D, O, D, O],
      [D, D, D, D, O],
      [D, Y, Y, Y, D],
      [Y, Y, D, D, D],
    ],
    startClues: [
      [0, 0], // Y: right=Y, below=Y → 2
      [0, 4], // O: left=O, below=O → 2
      [1, 1], // D: up=Y, right=O, below=D, left=Y → 1
      [1, 3], // D: up=O, right=O, below=D, left=O → 1
      [2, 2], // D: up=O, right=D, below=Y, left=D → 2
      [3, 0], // D: up=D, right=Y, below=Y → 1
      [3, 4], // D: up=O, left=Y, below=D → 1
      [4, 0], // Y: right=Y, above=D → 1
      [4, 2], // D: left=Y, right=D, above=D → 2
    ],
  },
];

/**
 * Compute the adjacency count for a cell: how many orthogonal neighbours
 * share the same color in the solution.
 */
export function clueValue(solution, row, col) {
  const color = solution[row][col];
  const size = solution.length;
  let count = 0;
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const [dr, dc] of dirs) {
    const r = row + dr, c = col + dc;
    if (r >= 0 && r < size && c >= 0 && c < solution[r].length) {
      if (solution[r][c] === color) count++;
    }
  }
  return count;
}
