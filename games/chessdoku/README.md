# ChessDoku

Chess pieces. Sudoku rules. Zero casualties.

A puzzle game where each level hands you a board and a tray of chess pieces —
place every piece so that **no piece attacks another**. Later levels add
sudoku-style constraints (one piece per row/column, one piece per box), fixed
"given" pieces, and cracked squares that block line-of-sight.

37 levels across 7 chapters: Rooks, Bishops, Knights, Kings, Queens, Sudoku,
and Mixed.

## Development

```bash
npm install
npm run dev        # start the Vite dev server
npm run build      # type-check and build to dist/
npm run preview    # serve the production build
```

## Level design

Level data lives in [`src/game/levels.data.json`](src/game/levels.data.json) —
the same file is loaded by the game and by the verifier, so they can never
drift apart. After adding or editing levels, always run:

```bash
npm run verify-levels
```

This brute-forces every level and fails the build if any level has no
solution. The reported solution count is a rough inverse difficulty signal
(fewer solutions = harder). Design notes learned the hard way:

- Each queen or rook monopolizes a full row **and** column; too many of them
  on one board (e.g. 7 on 8×8) strangles the space for every other piece.
- Blocked ("cracked") squares cut sliding attacks, enabling otherwise
  impossible packings — e.g. more rooks than rows.
- Sliding pieces are also blocked by other pieces, but the first piece hit is
  attacked, so only cracked squares provide safe shielding.

## Architecture

```
src/
  main.ts            wiring: screens ↔ game state ↔ renderer ↔ sound
  game/
    types.ts         shared types & piece metadata
    levels.data.json level + chapter data (single source of truth)
    levels.ts        typed accessors for the data
    rules.ts         attack computation & sudoku-rule checks
    state.ts         Game class (place/remove/win) + progress persistence
  render/
    board.ts         canvas renderer: board, pieces, animations, particles
  audio/
    sound.ts         WebAudio-synthesized SFX (no audio assets)
  ui/
    screens.ts       DOM screens: title, chapters, level select, HUD, modals
tools/
  solver.mjs         level verifier (npm run verify-levels)
```

Progress is saved in `localStorage` (`chessdoku-progress-v3`). A chapter
unlocks after completing 3 levels of the previous chapter, so one hard level
never blocks all progress.
