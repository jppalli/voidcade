import type { Position, Level } from './types';

// --- Seeded Random ---
// Mulberry32 — a proper 32-bit seeded PRNG
export function createSeededRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getSeedFromDate(date: Date): number {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return y * 10000 + m * 100 + d;
}

// --- Level Generation ---

export function generateSolvableLevel(
  id: number,
  width: number,
  height: number,
  seed?: number
): Level {
  const grid = Array.from({ length: height }, () => Array(width).fill(0));

  const random =
    seed !== undefined ? createSeededRandom(seed) : Math.random;

  const startPos: Position = {
    x: Math.floor(random() * width),
    y: Math.floor(random() * height),
  };

  const solve = (x: number, y: number, path: Position[]): boolean => {
    if (path.length === width * height) return true;

    const dirs: number[][] = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ];
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }

    const maxDist = Math.max(width, height);
    const distances = Array.from({ length: maxDist - 1 }, (_, i) => i + 1);
    for (let i = distances.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [distances[i], distances[j]] = [distances[j], distances[i]];
    }

    for (const [dx, dy] of dirs) {
      for (const d of distances) {
        const nx = x + dx * d;
        const ny = y + dy * d;
        if (
          nx >= 0 && nx < width &&
          ny >= 0 && ny < height &&
          !path.some((p) => p.x === nx && p.y === ny)
        ) {
          grid[y][x] = d;
          if (solve(nx, ny, [...path, { x: nx, y: ny }])) return true;
        }
      }
    }
    return false;
  };

  let success = false;
  for (let attempt = 0; attempt < 10; attempt++) {
    if (solve(startPos.x, startPos.y, [startPos])) {
      success = true;
      break;
    }
  }

  if (!success) {
    return {
      id,
      grid: Array.from({ length: height }, () => Array(width).fill(1)),
      startPos: { x: 0, y: 0 },
    };
  }

  // Fill the last cell (which remains 0)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === 0) grid[y][x] = Math.floor(random() * 3) + 1;
    }
  }

  return { id, grid, startPos };
}

// --- Solver (for hints & solvability check) ---

export function solvePuzzle(
  grid: number[][],
  currentPath: Position[],
  totalCells: number
): Position[] | null {
  if (currentPath.length === totalCells) return currentPath;

  const last = currentPath[currentPath.length - 1];
  const value = grid[last.y][last.x];
  const possibleMoves = [
    { x: last.x, y: last.y - value },
    { x: last.x, y: last.y + value },
    { x: last.x - value, y: last.y },
    { x: last.x + value, y: last.y },
  ].filter(
    (m) =>
      m.x >= 0 &&
      m.x < grid[0].length &&
      m.y >= 0 &&
      m.y < grid.length &&
      !currentPath.some((p) => p.x === m.x && p.y === m.y)
  );

  // Heuristic: try moves that lead to fewer future moves (Warnsdorff's rule)
  possibleMoves.sort((a, b) => {
    const getMoveCount = (pos: Position, p: Position[]) => {
      const val = grid[pos.y][pos.x];
      return [
        { x: pos.x, y: pos.y - val },
        { x: pos.x, y: pos.y + val },
        { x: pos.x - val, y: pos.y },
        { x: pos.x + val, y: pos.y },
      ].filter(
        (m) =>
          m.x >= 0 &&
          m.x < grid[0].length &&
          m.y >= 0 &&
          m.y < grid.length &&
          !p.some((prev) => prev.x === m.x && prev.y === m.y)
      ).length;
    };
    return (
      getMoveCount(a, [...currentPath, a]) -
      getMoveCount(b, [...currentPath, b])
    );
  });

  for (const move of possibleMoves) {
    const result = solvePuzzle(grid, [...currentPath, move], totalCells);
    if (result) return result;
  }

  return null;
}

// --- Pre-generated stable chapter levels (seeded) ---

export const CHAPTER_LEVELS: Level[] = [
  generateSolvableLevel(1, 2, 2, 10001),
  generateSolvableLevel(2, 3, 2, 10002),
  generateSolvableLevel(3, 3, 3, 10003),
  generateSolvableLevel(4, 3, 3, 10004),
  generateSolvableLevel(5, 4, 3, 10005),
  generateSolvableLevel(6, 4, 4, 10006),
  generateSolvableLevel(7, 4, 4, 10007),
  generateSolvableLevel(8, 4, 4, 10008),
  generateSolvableLevel(9, 5, 4, 10009),
  generateSolvableLevel(10, 5, 5, 10010),
  generateSolvableLevel(11, 5, 5, 10011),
  generateSolvableLevel(12, 5, 5, 10012),
  generateSolvableLevel(13, 6, 5, 10013),
  generateSolvableLevel(14, 6, 5, 10014),
  generateSolvableLevel(15, 6, 6, 10015),
  generateSolvableLevel(16, 6, 6, 10016),
  generateSolvableLevel(17, 7, 6, 10017),
  generateSolvableLevel(18, 7, 7, 10018),
  generateSolvableLevel(19, 8, 7, 10019),
  generateSolvableLevel(20, 8, 8, 10020),
];

// --- Archive dates: March 1 – Dec 31, 2025 ---
export function getArchiveDates(): string[] {
  const dates: string[] = [];
  // Use UTC to avoid DST issues
  let cur = Date.UTC(2026, 2, 1); // March 1, 2026
  const end = Date.UTC(2026, 11, 31); // Dec 31, 2026
  while (cur <= end) {
    const d = new Date(cur);
    dates.push(d.toISOString().split('T')[0]);
    cur += 86400000; // exactly one day in ms
  }
  return dates;
}

export function getTargetableMovesFromPos(
  pos: Position,
  grid: number[][],
  visited: Position[]
): Position[] {
  if (!pos) return [];
  const value = grid[pos.y][pos.x];
  const moves: Position[] = [
    { x: pos.x, y: pos.y - value },
    { x: pos.x, y: pos.y + value },
    { x: pos.x - value, y: pos.y },
    { x: pos.x + value, y: pos.y },
  ];
  return moves.filter(
    (m) =>
      m.x >= 0 &&
      m.x < grid[0].length &&
      m.y >= 0 &&
      m.y < grid.length &&
      !visited.some((p) => p.x === m.x && p.y === m.y)
  );
}
