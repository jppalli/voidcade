# Design: Dominoku

Implements `requirements.md`. Requirement numbers are written as R1 to R9.

## 1. Overview and decisions

| Topic | Decision | Why |
|---|---|---|
| Stack | Vite 6, strict TypeScript, no UI framework, DOM + CSS (SVG for pips) | Same as Kittydoku and Hangman. The UI is small enough that a framework adds weight and no benefit. |
| Location | `games/dominoku`, port 5196, output `../../dist/games/dominoku` | Same layout as the other games. Port 5196 is free (5175, 5179, 5180, 5187, 5188, 5194, 5195 are used). |
| Puzzle data | Generated offline, verified by a solver, stored in `src/game/puzzles.data.json` | Same pattern as Kittydoku `levels.data.json` and Hangman `daily.data.json`. Uniqueness (R5.1) is proven before shipping, not at run time. |
| Daily choice | Local date, days counted from a fixed start date, index into the bundled list (wraps when the list ends) | Deterministic and works offline. |
| Input | Pointer Events (mouse, touch, pen in one code path) | One code path, and `touch-action: none` stops page scroll while dragging. |
| Tests | Vitest for the pure game logic and for the puzzle data | Fast, works with Vite 6. Kittydoku has no test runner today, so this is new for the repo but limited to this game. |
| Platform | Small `Platform` adapter with a `local` implementation, same interface style as Hangman | Lets an Arkadium implementation be added later (R9.4). |

## 2. Module layout

```
games/dominoku/
  index.html
  package.json  tsconfig.json  vite.config.ts
  public/            favicon, share image (from Game Dev/Dominoku)
  src/
    main.ts                     app start, router (home / puzzle), theme init
    styles.css                  tokens, layout, components
    game/                       pure TypeScript, no DOM (R9.3)
      types.ts                  Puzzle, Placement, BoardState, Orientation
      dominoes.ts               pip order per orientation, rotate, tile ids
      board.ts                  place, remove, canPlace, cells, totals
      rules.ts                  lineStatus(total,target), isSolved
      history.ts                undo stack
      solver.ts                 count solutions up to a limit
      daily.ts                  date to day index to puzzle set
      progress.ts               saved state per day and puzzle
      puzzles.data.json         generated
    ui/
      home.ts  puzzle.ts  howto.ts  celebrate.ts  theme.ts
      board-view.ts             grid, targets, totals, ghost preview
      tray-view.ts              tray, selection, rotation
      pointer.ts                tap / drag / double-tap recognizer
      keyboard.ts               R9 / R2.10 keyboard model
      announce.ts               live region
    platform/
      platform.ts  storage.ts
  tools/
    generate-puzzles.ts         seeded generator
    verify-puzzles.ts           independent check, exit code 1 on failure
  tests/
    board.spec.ts  rules.spec.ts  history.spec.ts  solver.spec.ts
    daily.spec.ts  puzzles.spec.ts  pointer.spec.ts
```

`game/` never touches the DOM or `localStorage`. `ui/` never contains rules. This is what makes the rules testable (R9.3).

## 3. Data model

```ts
type Pip = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type Size = 2 | 4 | 6;
type Orientation = 0 | 1 | 2 | 3;      // 0: a|b flat, 1: a over b, 2: b|a flat, 3: b over a (90° clockwise steps)

interface Tile { id: string; a: Pip; b: Pip }          // id like "3-5", unique within a puzzle

interface Placement {                                   // a domino on the grid
  tile: string;           // Tile id
  row: number; col: number;   // top or left cell of the domino (see the table below)
  orientation: Orientation;
}

interface Puzzle {
  id: string;             // "2026-03-14-6" (date + size)
  size: Size;
  rowTargets: number[];   // length = size
  colTargets: number[];
  tiles: Tile[];          // all dominoes: locked and tray
  locked: Placement[];    // fixed at the start
}

interface BoardState {
  placements: Placement[];  // player-placed (not locked)
  // derived, not stored: cell map, totals
}
```

Orientation to cells (first half at `(row, col)`):

| Orientation | First cell shows | Second cell | Second cell position |
|---|---|---|---|
| 0 | a | b | right `(row, col+1)` |
| 1 | a | b | below `(row+1, col)` |
| 2 | b | a | right |
| 3 | b | a | below |

"First cell" means the top or left half. Rotating a tray domino turns it 90° clockwise, which moves through orientations 0 to 1 to 2 to 3 and back to 0. The sequence is chosen so that each rotation shows the new face the way a physical domino would look after a clockwise quarter turn (the visible pip order changes every step). Doubles (`a == b`) are the same at 0 and 2, and at 1 and 3. The tray still steps through all four so that the tap always visibly does something and flat and standing are both reachable.

Totals are derived from the cell map every time. Nothing stores totals, so they cannot go out of sync (R3.6).

## 4. Rules

- `canPlace(board, placement)`: both cells inside the grid, both empty (locked and placed dominoes both occupy cells), and the tile is not already on the grid.
- `lineStatus(total, target)`: `total < target` is `short`, `total === target` is `match`, `total > target` is `over` (R3.2 to R3.4). A full line that is still short stays `short`. The requirement gives only three states and a full-but-short line is rare because the last domino usually shows the problem in the other direction.
- `isSolved`: every cell is covered and all `2 × size` lines are `match` (R4.1). Because each puzzle has one solution (R5.1), any full board that matches all targets is the intended solution. The check does not compare against a stored answer.
- Undo (`history.ts`): a stack of `{type: 'place' | 'remove', placement}`. Undo pops one entry and applies the inverse. Restart clears placements and the stack. Rotating in the tray is not recorded (R6.5). After a solve, history is frozen.

## 5. Puzzle generation and verification

### Solver (`solver.ts`)

Counts solutions, stopping at 2 (all that uniqueness needs). It scans cells in row-major order and, at the first empty cell, tries each unused tile in each pip order with the domino going right or down. That is complete because the first empty cell is always the top-left cell of its domino. It prunes when a line's total goes over its target, when the pips still possible in the line (max 6 per empty cell) cannot reach the target, or when a completed line misses its target.

### Generator (`tools/generate-puzzles.ts`)

1. Build a full solution: a random domino tiling of the grid (seeded RNG), a random distinct set of tiles from the 28-tile double-six set, random orientations.
2. Compute the row and column targets from that solution.
3. Start with every domino locked, then try to unlock them one at a time in random order, keeping an unlock only if the solver still reports exactly one solution.
4. Keep the puzzle if it meets its size's lock budget, otherwise discard and retry with the next seed.
5. Write the result as `puzzles.data.json` (a list of `{date, puzzles: [2×2, 4×4, 6×6]}`).

Why unlock from a full board and not lock from an empty board: the solver is very slow on a nearly empty 6×6 (the search space is huge) and very fast on a heavily locked one.

### Feasibility check (done before writing this design)

A throwaway prototype outside the repo (same algorithm, 60 runs per size) showed that uniqueness needs more locked dominoes than "a few" on the bigger grids, because only 12 sums constrain 36 cells:

| Size | Dominoes | Locked needed to be unique (typical) | Solve time |
|---|---|---|---|
| 2×2 | 2 | 0 to 1 | under 1 ms |
| 4×4 | 8 | 1 to 4 | a few ms |
| 6×6 | 18 | 6 to 12 (median about 9) | the whole 60-puzzle run took 0.4 s |

The prototype allowed repeated tiles. The real generator uses distinct tiles (R1.3), which is more constrained and should help, but this must be confirmed when the generator is built. The generator therefore takes a lock budget per size (initial: 2×2 up to 1, 4×4 up to 3, 6×6 up to 8) and rejects puzzles above it. If 6×6 puzzles at that budget turn out to be rare, the budget is the one number to raise. See open question 2.

### Verification (`tools/verify-puzzles.ts` and `tests/puzzles.spec.ts`)

For every bundled puzzle: sizes and counts match R1.2, tiles are distinct and 0 to 6, locked dominoes are valid and do not overlap, targets are consistent with at least one full solution, and the solver finds exactly one. Every day has exactly three puzzles in the order 2×2, 4×4, 6×6. The same check runs in the Vitest suite so a bad data file fails `npm test`.

## 6. Daily selection (`daily.ts`)

`dayIndex = floor((localMidnight(today) - START_DATE) / 86400000)`, computed from the local year, month and day (not from UTC, so it changes at the player's midnight). `puzzles = data[dayIndex % data.length]`. The bundle holds 365 days (about 1,100 puzzles, well under 200 KB as JSON). A day number shown on Home ("No. 42") uses the same index. The function takes the date as an argument so tests can pass any date.

## 7. Interaction

### Gesture recognizer (`pointer.ts`)

One recognizer handles `pointerdown`, `pointermove`, `pointerup` and `pointercancel`. It reports `tap`, `doubletap`, `dragstart`, `dragmove` and `dragend` for an element.

- Movement under 6 px between down and up is a tap. More is a drag. The drag starts on the first move past 6 px.
- Two taps on the same element within 300 ms and 24 px make a double-tap. Single taps are reported immediately, with no delay waiting for a second tap. This works because a single tap on a placed domino does nothing (R2.9).
- Tray dominoes use `touch-action: none`. The board and page keep normal scrolling outside dragged tiles.
- Pointer capture is set on the dragged element, so a drag keeps working if the pointer leaves the element or the window.

### Placement model

- **Tap in tray:** rotate 90° clockwise and select (R2.1). Tapping the selected domino again rotates it again.
- **Tap on an empty cell with a domino selected:** place with the first half on that cell (R2.2). If the second cell is off the grid or taken, the placement is invalid and shows feedback. A tap near the right or bottom edge will therefore fail for orientations that stick out. The preview (below) shows this before the player taps.
- **Drag from the tray:** a translucent copy follows the pointer, lifted above the finger on touch so the finger does not hide it. The cell pair under the center of the first half is the target. On release it is placed if valid (R2.3).
- **Preview:** hovering with a selected domino, or dragging, outlines the two cells in the accent color if valid or in red if not (R2.4).
- **Take back:** double-tap a placed domino. It returns to the tray with the orientation it had on the grid and becomes selected (R2.7).
- **Locked dominoes:** drawn with a flat tint and a small lock mark. They ignore drag and rotate and shake on double-tap (R1.5, R2.8).
- **Keyboard (R2.10):** the board is an ARIA `grid` with a roving cell cursor. Arrows move, `R` rotates the selected domino, `Enter` or `Space` places, `Backspace` or `Delete` takes back, number keys `1` to `9` (or `Tab`) pick a tray domino.

### Screens

```
Home -> Puzzle(2x2 | 4x4 | 6x6) -> Solved card -> Home
  \-> How to Play (modal, also opened from Puzzle)
```

A tiny hash router (`#/`, `#/p/2`, `#/p/4`, `#/p/6`) lets the browser back button return from a puzzle to Home. The first visit opens How to Play over Home (R6.2).

## 8. Layout and look

### Puzzle screen

- Portrait: header (back, title, theme toggle, help) / board with targets and totals / tray / action bar (Undo, Restart).
- Wide landscape: board on the left, tray and actions in a column on the right.
- The board is a CSS grid with a gutter on the right and bottom for target and total. Cell size is `min(…vw, …vh) / (size + gutter)` through a CSS variable, floored at 44 px where the screen allows, so 6×6 fits a 320 px phone with 40 px cells at the smallest. At 320 px the cell cannot reach 44 px with 6 columns and two gutters. That one case uses 40 px cells, with the full 44 px tap target kept by the invisible padding around each cell (see open question 4).
- Each line shows the target (bold, large) and the total beside it (small). Total styles: `short` gray, `match` green with a check, `over` red with an up arrow (R3).

### Style (NYT Games direction)

- White (light) or near black (dark) page, one accent color, hairline borders, generous spacing, no gradients and no drop shadows heavier than a 1 px line.
- Type: the system UI font stack with tabular figures for all numbers. Headings in the same family at heavier weight. No extra font download.
- Domino: rounded rectangle, a thin center divider, pips as SVG circles in the standard dice layout for 0 to 6.
- Colors are CSS variables on `:root` and `:root[data-theme="dark"]`: `--bg`, `--surface`, `--ink`, `--muted`, `--line`, `--accent`, `--ok`, `--over`, `--locked`. Every pair used for text is checked for AA contrast in both themes (R7.5).
- Theme: first load follows `prefers-color-scheme`. The toggle sets `data-theme` and saves the choice. A short inline script in `index.html` sets the theme before first paint so there is no flash.

### Motion

CSS transitions only: place (short settle), take back (return to tray), total color change, invalid shake, and the celebration. `prefers-reduced-motion: reduce` removes them and swaps the celebration for a static card (R4.4, R7.6).

### Celebration

On solve: the board settles, the dominoes do a quick staggered pulse, a canvas-free confetti burst (about 40 absolutely positioned CSS-animated elements, removed after 3 s) plays, then the completion card slides in with the puzzle name, a short message and buttons for the next puzzle or Home.

## 9. Persistence (`progress.ts`, `platform/storage.ts`)

`storage.ts` wraps `localStorage` in try/catch and falls back to an in-memory object (R8.3). Keys are namespaced `dominoku:`.

```jsonc
{
  "v": 1,
  "theme": "dark",
  "seenHowTo": true,
  "days": {
    "2026-03-14": {
      "2": { "solved": true,  "placements": [ ... ] },
      "4": { "solved": false, "placements": [ ... ] }
    }
  }
}
```

The game saves after every place, take back, undo and restart. Loading validates the shape and each placement against the puzzle (`canPlace` replay). Anything invalid is dropped. Days older than 30 days are removed on load (R8.4). The undo stack is rebuilt from the saved placements in order, so undo works after a reload (R8.2).

## 10. Accessibility

- Board: `role="grid"`, rows and cells with `aria-label` ("Row 2, column 3, 5 pips" or "empty"). Targets and totals are announced with the row or column ("Row 2, total 7 of 9").
- A polite live region announces placements, a line reaching its target, undo, and "Puzzle solved".
- Focus ring on every control and cell. Modals trap focus and close on `Escape`.
- Status uses shape as well as color (R3.5).
- Reduced motion and AA contrast as above.

## 11. Build and integration

- `package.json`: scripts `dev`, `build` (`tsc && vite build`), `preview`, `test` (`vitest run`), `generate-puzzles`, `verify-puzzles` (both `vite-node`). Dependencies: none at run time. Dev dependencies: `typescript ~5.8`, `vite ^6.2`, `vite-node ^3.2`, `vitest ^3`.
- `vite.config.ts`: `base: './'`, `server.port: 5196`, `build.outDir: '../../dist/games/dominoku'`.
- Root: `dev:dominoku` script and a card on the landing page `index.html`.
- Brand files come from `Game Dev/Dominoku` (logo, favicon, share image). Only the files the game uses are copied into `public/`.

## 12. Testing

| Area | Tests |
|---|---|
| `board` | placement in each orientation, rejection off-grid, on occupied cells and for tiles already placed, removal, cell map and totals |
| `rules` | `lineStatus` below, equal and above target, full-but-short line, `isSolved` for a solved and a one-off board |
| `history` | undo to empty, undo after remove, restart clears, frozen after a solve |
| `solver` | known unique puzzle gives 1, a puzzle with two solutions gives 2, no-solution gives 0, locked dominoes respected |
| `daily` | same date gives same puzzles, midnight rollover in local time, wrap-around, three puzzles in order |
| `puzzles` | the whole data file passes every verification rule in section 5 |
| `pointer` | tap, drag threshold, double-tap timing and distance, cancel |
| Browser check (manual and scripted) | place by drag and by tap with mouse and touch emulation, take back, undo, restart, solve and celebration, both themes, 320 px to desktop, no console errors, served from a subfolder |

## 13. Risks

| Risk | Handling |
|---|---|
| Few locked dominoes on 6×6 cannot be unique | Lock budget per size is a tunable. Prototype shows 6 to 12 are typical. Open question 2. |
| Distinct-tile rule makes generation slower or rarer | Generator retries seeds. Verified by the data test. |
| Drag on touch scrolls the page | `touch-action: none` on tray tiles, pointer capture, tested with touch emulation. |
| 6×6 cells under 44 px on a 320 px phone | See open question 4. |
| Local-date daily set differs across time zones | Accepted. It is simple and works offline. |

## 14. Open questions

These have defaults in this design. Say if you want a different answer.

1. **Brand and folder.** Use the logo, favicon and share image in `Game Dev/Dominoku`, and create the game at `voidcade/games/dominoku`?
2. **Locked dominoes on 6×6.** The prototype suggests about 6 to 9 of 18 must be locked for a unique puzzle. Is that acceptable for "some puzzles start with a few"? A smarter generator might lower it a little, and relaxing "all dominoes distinct" would not obviously help.
3. **Order of the three puzzles.** Default: all three are open from the start, in any order. Alternative: 4×4 opens after 2×2 and 6×6 after 4×4.
4. **6×6 on very small phones.** Default: 40 px cells on screens narrower than 360 px, with a 44 px touch area. Alternative: allow the board to scroll sideways on those screens.
5. **Arkadium SDK, sound, streaks.** Left out of version 1 (see requirements). Add any of them now?

## 15. Sound, archive, streaks and statistics (added after the first playable version)

- **Sound** (`audio/sound.ts`): procedural WebAudio like Kittydoku, no files. Effects are filtered-noise clacks and short sine or triangle glides. Chimes use soft plucked tones. Music is a slow loop of four chords with random notes from C pentatonic, through a small generated reverb. Audio starts on the first tap or key press and pauses when the tab is hidden. Preferences are `{sfx, music}` in saved state and are switched in a sound sheet opened from the bar.
- **Archive** (`ui/archive.ts`, `game/calendar.ts`): month calendar from the start date to today. Routes: `#/archive`, `#/d/YYYY-MM-DD`, `#/d/YYYY-MM-DD/p/N`. Invalid, future or too-old dates redirect to `#/archive`, and today's date redirects to the normal screens. History is no longer pruned at 30 days, so saved results are kept (about three years).
- **Statistics** (`game/stats.ts`, pure and tested): each saved puzzle stores `solvedOn` (the local date it was solved) and `ms` (active play time). A day is a streak day when any of its puzzles has `solvedOn` equal to that day.
- **Streak rule:** at least one solve per day, because requiring all three would make the hard 6×6 decide the streak. This is one line in `streakDays` if it should be stricter.

## 16. Monochrome look and new logo

- Totals use no color: short is gray text, a match is a solid ink badge with a check mark, over is an outlined badge with an up arrow. `--ok` is now the same as the ink color. The only colors left are blue (selection and preview), red (an invalid placement flash) and the tan tint on locked dominoes.
- The old colored logo came from an earlier game and is not used. The new mark is a solid black domino (three pips and four pips) above two empty outlined squares, so it reads as "dominoes on a grid". It is one SVG, drawn with `currentColor` and a mask for the pips, so it follows the light and dark theme (`public/favicon.svg`, `ui/logo.ts`). PNG copies exist for old browsers and iOS (`favicon-64.png`, `apple-touch-icon.png`).
