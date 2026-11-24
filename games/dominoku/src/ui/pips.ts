/** Pip layouts on a 3x3 grid, as [row, column]. */
const LAYOUT: Record<number, [number, number][]> = {
  0: [],
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [1, 0], [2, 0], [0, 2], [1, 2], [2, 2]],
};

/** SVG for one half of a domino. Standing halves turn the pattern a quarter turn, as a real domino would. */
export function pipsSvg(count: number, standing: boolean): string {
  const dots = (LAYOUT[count] ?? []).map(([r, c]) => {
    const [rr, cc] = standing ? [c, 2 - r] : [r, c];
    return `<circle cx="${7.5 + cc * 7.5}" cy="${7.5 + rr * 7.5}" r="2.9"/>`;
  });
  return `<svg viewBox="0 0 30 30" aria-hidden="true" focusable="false">${dots.join('')}</svg>`;
}