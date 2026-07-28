import type { Board, Conflicts, Level, PieceType } from './types';

/** Sliding directions for line pieces. */
const DIRS: Partial<Record<PieceType, [number, number][]>> = {
  R: [[0, 1], [0, -1], [1, 0], [-1, 0]],
  B: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  Q: [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]],
};

/** Fixed-offset attacks for jumping/stepping pieces. Pawn attacks are
 * directional (diagonally toward row 0), so attacks are not symmetric. */
const HOPS: Partial<Record<PieceType, [number, number][]>> = {
  N: [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]],
  K: [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]],
  P: [[-1, -1], [-1, 1]],
};

/**
 * Cells attacked by the piece at (r, c). Sliding pieces stop at the first
 * occupied cell (which they attack) or at a blocked cell (which shields).
 */
export function attacksFrom(
  size: number,
  blocked: Set<number>,
  board: Board,
  r: number,
  c: number,
): [number, number][] {
  const cell = board[r][c];
  if (!cell) return [];
  const out: [number, number][] = [];
  const dirs = DIRS[cell.p];
  if (dirs) {
    for (const [dr, dc] of dirs) {
      let rr = r + dr;
      let cc = c + dc;
      while (rr >= 0 && rr < size && cc >= 0 && cc < size) {
        if (blocked.has(rr * size + cc)) break;
        if (board[rr][cc]) {
          out.push([rr, cc]);
          break;
        }
        rr += dr;
        cc += dc;
      }
    }
  }
  const hops = HOPS[cell.p];
  if (hops) {
    for (const [dr, dc] of hops) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && rr < size && cc >= 0 && cc < size && board[rr][cc]) out.push([rr, cc]);
    }
  }
  return out;
}

/** All attacking pairs on the board plus the set of cells involved. */
export function computeConflicts(size: number, blocked: Set<number>, board: Board): Conflicts {
  const pairs: [number, number, number, number][] = [];
  const cells = new Set<number>();
  const seen = new Set<string>();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!board[r][c]) continue;
      for (const [rr, cc] of attacksFrom(size, blocked, board, r, c)) {
        cells.add(r * size + c);
        cells.add(rr * size + cc);
        const a = r * size + c;
        const b = rr * size + cc;
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push([r, c, rr, cc]);
        }
      }
    }
  }
  return { pairs, cells };
}

/** Cells violating the level's sudoku rule (2+ pieces in a row/col/box). */
export function ruleViolations(level: Level, board: Board): Set<number> {
  const n = level.size;
  const bad = new Set<number>();
  const groups = new Map<string, number[]>();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!board[r][c]) continue;
      const k = r * n + c;
      if (level.rule === 'rowcol') {
        (groups.get(`r${r}`) ?? groups.set(`r${r}`, []).get(`r${r}`)!).push(k);
        (groups.get(`c${c}`) ?? groups.set(`c${c}`, []).get(`c${c}`)!).push(k);
      } else if (level.rule === 'box') {
        const b = Math.floor(r / level.boxH!) * (n / level.boxW!) + Math.floor(c / level.boxW!);
        (groups.get(`b${b}`) ?? groups.set(`b${b}`, []).get(`b${b}`)!).push(k);
      }
    }
  }
  for (const g of groups.values()) {
    if (g.length > 1) for (const k of g) bad.add(k);
  }
  return bad;
}

/**
 * Whether a fully-placed board satisfies the level's sudoku rule.
 * (With every piece placed and no duplicates, coverage follows from counts.)
 */
export function ruleSatisfied(level: Level, board: Board): boolean {
  return ruleViolations(level, board).size === 0;
}
