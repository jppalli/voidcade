// Shikaku solver: given a grid size and a list of clues (row, col, value),
// finds candidate rectangles per clue and counts solutions via backtracking
// exact-cover search. Used at generation time to guarantee a unique solution.

function divisorPairs(n) {
  const pairs = [];
  for (let h = 1; h <= n; h++) {
    if (n % h === 0) pairs.push([n / h, h]); // [w, h]
  }
  return pairs;
}

// Build every legal rectangle for a clue: area === value, contains the clue
// cell, stays in bounds, and contains no other clue cell.
export function candidateRectsForClue(clue, width, height, clues) {
  const { row, col, value } = clue;
  const others = clues.filter((c) => c !== clue);
  const out = [];
  const seen = new Set();

  for (const [w, h] of divisorPairs(value)) {
    if (w > width || h > height) continue;
    for (let rowOffset = 0; rowOffset < h; rowOffset++) {
      const top = row - rowOffset;
      const bottom = top + h - 1;
      if (top < 0 || bottom >= height) continue;
      for (let colOffset = 0; colOffset < w; colOffset++) {
        const left = col - colOffset;
        const right = left + w - 1;
        if (left < 0 || right >= width) continue;

        let hasOtherClue = false;
        for (const oc of others) {
          if (oc.row >= top && oc.row <= bottom && oc.col >= left && oc.col <= right) {
            hasOtherClue = true;
            break;
          }
        }
        if (hasOtherClue) continue;

        const key = `${top},${left},${bottom},${right}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ top, left, bottom, right, w, h, area: value, clue });
      }
    }
  }
  return out;
}

function rectsOverlap(a, b) {
  return a.left <= b.right && b.left <= a.right && a.top <= b.bottom && b.top <= a.bottom;
}

// Counts solutions up to `cap` (default 2, enough to detect non-uniqueness).
// Returns { count, solution } where solution is the first full placement found.
export function countSolutions(width, height, clues, cap = 2) {
  const candidatesByClue = clues.map((c) => candidateRectsForClue(c, width, height, clues));

  if (candidatesByClue.some((list) => list.length === 0)) {
    return { count: 0, solution: null };
  }

  const order = clues.map((_, i) => i).sort(
    (a, b) => candidatesByClue[a].length - candidatesByClue[b].length
  );

  const occupied = new Int8Array(width * height);
  const placement = new Array(clues.length).fill(null);
  let solutionsFound = 0;
  let firstSolution = null;

  function markRect(rect, val) {
    for (let r = rect.top; r <= rect.bottom; r++) {
      for (let c = rect.left; c <= rect.right; c++) {
        occupied[r * width + c] += val;
      }
    }
  }

  function canPlace(rect) {
    for (let r = rect.top; r <= rect.bottom; r++) {
      for (let c = rect.left; c <= rect.right; c++) {
        if (occupied[r * width + c]) return false;
      }
    }
    return true;
  }

  function backtrack(pos) {
    if (solutionsFound >= cap) return;
    if (pos === order.length) {
      solutionsFound++;
      if (!firstSolution) {
        firstSolution = placement.slice();
      }
      return;
    }
    const clueIdx = order[pos];
    for (const rect of candidatesByClue[clueIdx]) {
      if (!canPlace(rect)) continue;
      markRect(rect, 1);
      placement[clueIdx] = rect;
      backtrack(pos + 1);
      markRect(rect, -1);
      placement[clueIdx] = null;
      if (solutionsFound >= cap) return;
    }
  }

  backtrack(0);

  return {
    count: solutionsFound,
    solution: firstSolution,
  };
}

export function hasUniqueSolution(width, height, clues) {
  const { count, solution } = countSolutions(width, height, clues, 2);
  return { unique: count === 1, solution };
}
