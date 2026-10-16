/**
 * Faint chalk doodles at the edges of the board, a different set per lesson,
 * like a teacher's sketches. Static (no motion behind the word), drawn with
 * the same chalk filter as the hangman drawing, and kept clear of the play
 * area by fixed slots (see .doodles in styles.css).
 */

const S = (inner: string, label: string) =>
  `<svg viewBox="0 0 80 80" role="presentation" data-name="${label}"><g filter="url(#chalk)" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
const T = (text: string, size = 30, y = 52) =>
  `<text x="40" y="${y}" text-anchor="middle" font-family="Patrick Hand, Comic Sans MS, sans-serif" font-size="${size}" fill="currentColor" stroke="none">${text}</text>`;

export const ART: Record<string, string> = {
  apple: S('<path d="M40 24c-8-6-24-4-24 14 0 16 12 30 24 26 12 4 24-10 24-26 0-18-16-20-24-14Z"/><path d="M40 24c0-6 2-10 6-13"/><path d="M42 18c5-5 12-5 15-2-4 4-10 5-15 2Z"/>', 'apple'),
  abc: S(T('ABC', 30), 'ABC'),
  pencil: S('<path d="M16 64l6-18 34-34 12 12-34 34Z"/><path d="M22 46l12 12"/><path d="M50 18l12 12"/><path d="M16 64l4-1-3-3Z"/>', 'pencil'),
  sum: S(T('1+1=2', 22, 48), 'sum'),
  ball: S('<circle cx="40" cy="40" r="24"/><path d="M16 40h48"/><path d="M40 16c-10 8-10 40 0 48"/><path d="M40 16c10 8 10 40 0 48"/>', 'ball'),
  hopscotch: S('<path d="M28 66h24v-14H28Z"/><path d="M28 52h24V38H28Z"/><path d="M16 38h24V24H16Z"/><path d="M40 38h24V24H40Z"/><path d="M28 24h24V10H28Z"/>', 'hopscotch'),
  kite: S('<path d="M40 8l18 22-18 26-18-26Z"/><path d="M22 30h36"/><path d="M40 8v48"/><path d="M40 56c-4 6 4 8 0 14s4 6 2 8"/>', 'kite'),
  rope: S('<path d="M14 24c6 40 46 40 52 0"/><path d="M10 14v14M70 14v14"/><path d="M10 14h4M66 14h4"/>', 'jump rope'),
  bus: S('<rect x="10" y="22" width="60" height="30" rx="6"/><path d="M16 30h10v10H16ZM32 30h10v10H32ZM48 30h10v10H48Z"/><circle cx="22" cy="56" r="5"/><circle cx="58" cy="56" r="5"/>', 'bus'),
  pin: S('<path d="M40 70C28 52 22 42 22 32a18 18 0 0 1 36 0c0 10-6 20-18 38Z"/><circle cx="40" cy="32" r="6"/>', 'map pin'),
  sun: S('<circle cx="40" cy="40" r="12"/><path d="M40 12v8M40 60v8M12 40h8M60 40h8M20 20l6 6M54 54l6 6M60 20l-6 6M26 54l-6 6"/>', 'sun'),
  camera: S('<rect x="12" y="26" width="56" height="34" rx="5"/><circle cx="40" cy="43" r="10"/><path d="M28 26l4-8h16l4 8"/>', 'camera'),
  atom: S('<circle cx="40" cy="40" r="4"/><ellipse cx="40" cy="40" rx="28" ry="10"/><ellipse cx="40" cy="40" rx="28" ry="10" transform="rotate(60 40 40)"/><ellipse cx="40" cy="40" rx="28" ry="10" transform="rotate(-60 40 40)"/>', 'atom'),
  flask: S('<path d="M32 10h16M34 10v20L16 64c-2 4 0 6 4 6h40c4 0 6-2 4-6L46 30V10"/><path d="M24 50h32"/><circle cx="36" cy="58" r="2"/><circle cx="46" cy="54" r="1.5"/>', 'flask'),
  lens: S('<circle cx="34" cy="34" r="18"/><path d="M47 47l20 20"/><path d="M26 28c2-4 6-6 10-6"/>', 'magnifier'),
  water: S(T('H₂O', 28), 'H2O'),
  book: S('<path d="M40 22c-8-6-20-6-28-2v42c8-4 20-4 28 2 8-6 20-6 28-2V20c-8-4-20-4-28 2Z"/><path d="M40 22v42"/><path d="M18 30c6-2 12-2 16 0M46 30c4-2 10-2 16 0"/>', 'book'),
  castle: S('<path d="M14 66V30h8v6h6v-6h8v6h8v-6h8v6h6v-6h8v36Z"/><path d="M34 66V52a6 6 0 0 1 12 0v14"/><path d="M40 30V12l10 4-10 4"/>', 'castle'),
  books: S('<rect x="14" y="54" width="52" height="10" rx="2"/><rect x="18" y="42" width="44" height="12" rx="2"/><rect x="14" y="30" width="50" height="12" rx="2"/><path d="M24 30v12M30 54v10"/>', 'books'),
  star: S('<path d="M40 10l8 18 20 2-15 13 5 20-18-11-18 11 5-20-15-13 20-2Z"/>', 'star'),
  cap: S('<path d="M8 32l32-14 32 14-32 14Z"/><path d="M22 38v14c10 8 26 8 36 0V38"/><path d="M66 34v18"/><path d="M66 52l-3 8h6Z"/>', 'graduation cap'),
  scroll: S('<rect x="12" y="28" width="56" height="24" rx="12"/><path d="M24 28v24M56 28v24"/><path d="M34 52l-4 14 6-4 4 6 2-16"/>', 'diploma'),
  aplus: S(T('A+', 38, 56), 'A+'),
  clock: S('<circle cx="40" cy="40" r="26"/><path d="M40 24v16l11 8"/><path d="M40 16v3M40 61v3M16 40h3M61 40h3"/>', 'clock'),
  bulb: S('<path d="M30 52c0-8-10-12-10-24a20 20 0 0 1 40 0c0 12-10 16-10 24Z"/><path d="M30 58h20M33 64h14"/><path d="M36 38l4 6 4-6"/>', 'light bulb'),
  question: S(T('?', 52, 60), 'question mark'),
};

/** Four doodles per board: two either side of the drawing, two lower down. */
const SETS: Record<string, string[]> = {
  'first-lesson': ['apple', 'abc', 'pencil', 'sum'],
  recess: ['ball', 'kite', 'hopscotch', 'rope'],
  'field-trip': ['bus', 'sun', 'pin', 'camera'],
  'science-class': ['atom', 'flask', 'water', 'lens'],
  library: ['book', 'castle', 'star', 'books'],
  'final-exam': ['cap', 'aplus', 'scroll', 'clock'],
  endless: ['question', 'star', 'bulb', 'aplus'],
  title: ['apple', 'aplus', 'book', 'star'],
};

/** Fill a screen's doodle layer with a set (`key` = lesson id, 'endless' or 'title'). */
export function setDoodles(host: HTMLElement, key: string) {
  if (host.dataset.set === key) return;
  host.dataset.set = key;
  host.innerHTML = (SETS[key] ?? SETS.title).map((name, i) => `<span class="dd s${i}">${ART[name] ?? ''}</span>`).join('');
}
