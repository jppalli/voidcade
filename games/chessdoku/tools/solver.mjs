/**
 * ChessDoku level verifier — proves every level in src/game/levels.data.json
 * has at least one solution, and reports solution counts as a difficulty hint.
 *
 * Usage: npm run verify-levels
 * Exits non-zero if any level is unsolvable.
 *
 * Rules mirror src/game/rules.ts: no piece may attack another. Sliding pieces
 * (Q, R, B) stop at the first occupied cell (which they attack) and at blocked
 * cells (which shield). N and K use fixed offsets. Optional sudoku rules:
 * 'rowcol' (one piece per row and column) and 'box' (one per boxH×boxW box).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, '../src/game/levels.data.json'), 'utf8'));

const DIRS = {
  R: [[0, 1], [0, -1], [1, 0], [-1, 0]],
  B: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  Q: [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]],
};
const HOPS = {
  N: [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]],
  K: [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]],
  P: [[-1, -1], [-1, 1]], // pawns attack diagonally toward row 0 (one-way)
};
const STRENGTH = { Q: 0, R: 1, B: 2, N: 3, K: 4, P: 5 };

function attacks(level, blockedSet, board, r, c) {
  const p = board[r][c];
  const n = level.size;
  const out = [];
  if (DIRS[p]) {
    for (const [dr, dc] of DIRS[p]) {
      let rr = r + dr, cc = c + dc;
      while (rr >= 0 && rr < n && cc >= 0 && cc < n) {
        if (blockedSet.has(rr * n + cc)) break;
        if (board[rr][cc]) { out.push([rr, cc]); break; }
        rr += dr; cc += dc;
      }
    }
  }
  if (HOPS[p]) {
    for (const [dr, dc] of HOPS[p]) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < n && cc >= 0 && cc < n && board[rr][cc]) out.push([rr, cc]);
    }
  }
  return out;
}

function solve(level, cap) {
  const n = level.size;
  const board = Array.from({ length: n }, () => Array(n).fill(null));
  const blockedSet = new Set((level.blocked ?? []).map(([r, c]) => r * n + c));
  const occupied = [];
  for (const g of level.given ?? []) {
    board[g.r][g.c] = g.p;
    occupied.push([g.r, g.c]);
  }
  const pieces = [];
  for (const [p, count] of Object.entries(level.pieces)) {
    for (let i = 0; i < count; i++) pieces.push(p);
  }
  pieces.sort((a, b) => STRENGTH[a] - STRENGTH[b]);

  const anyAttack = () => occupied.some(([r, c]) => attacks(level, blockedSet, board, r, c).length);

  const ruleOk = () => {
    if (level.rule === 'rowcol') {
      const rows = new Set(), cols = new Set();
      for (const [r, c] of occupied) {
        if (rows.has(r) || cols.has(c)) return false;
        rows.add(r); cols.add(c);
      }
      return rows.size === n && cols.size === n;
    }
    if (level.rule === 'box') {
      const seen = new Set();
      for (const [r, c] of occupied) {
        const b = Math.floor(r / level.boxH) * (n / level.boxW) + Math.floor(c / level.boxW);
        if (seen.has(b)) return false;
        seen.add(b);
      }
      return true;
    }
    return true;
  };

  let solutions = 0;
  let first = null;

  const rec = (idx, minCellForSameType) => {
    if (solutions >= cap) return;
    if (idx === pieces.length) {
      if (anyAttack() || !ruleOk()) return;
      solutions++;
      first ??= occupied.map(([r, c]) => `${board[r][c]}${r}${c}`).join(' ');
      return;
    }
    const p = pieces[idx];
    const start = idx > 0 && pieces[idx - 1] === p ? minCellForSameType + 1 : 0;
    for (let cell = start; cell < n * n; cell++) {
      const r = Math.floor(cell / n), c = cell % n;
      if (board[r][c] || blockedSet.has(cell)) continue;
      board[r][c] = p;
      occupied.push([r, c]);
      // a partial position with an attack can never become attack-free
      if (!anyAttack()) rec(idx + 1, cell);
      occupied.pop();
      board[r][c] = null;
    }
  };
  rec(0, -1);
  return { solutions, first };
}

const CAP = 500;
let failed = 0;
console.log(`Verifying ${data.levels.length} levels (solution cap ${CAP})…\n`);
for (const level of data.levels) {
  const chapter = data.chapters[level.ch].name;
  const t0 = Date.now();
  const { solutions, first } = solve(level, CAP);
  const ms = Date.now() - t0;
  const label = `[${chapter}] ${level.name}`.padEnd(34);
  if (solutions === 0) {
    failed++;
    console.error(`✗ ${label} UNSOLVABLE (${ms}ms)`);
  } else {
    const count = solutions >= CAP ? `${CAP}+` : String(solutions);
    console.log(`✓ ${label} solutions=${count.padEnd(4)} (${ms}ms)  e.g. ${first}`);
  }
}
console.log(failed ? `\n${failed} level(s) UNSOLVABLE — fix before shipping!` : '\nAll levels solvable.');
process.exit(failed ? 1 : 0);
