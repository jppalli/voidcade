# Implementation plan: Dominoku

Each task lists the requirements it covers. Tasks run in order. Nothing is built until the spec is approved.

- [x] 1. Scaffold the game workspace
  - Create `games/dominoku` with `package.json`, `tsconfig.json`, `vite.config.ts` (`base: './'`, port 5196, output `../../dist/games/dominoku`), `index.html`, `src/main.ts` and an empty `styles.css`, copying the conventions of `games/kittydoku`.
  - Add Vitest and the `test`, `generate-puzzles`, `verify-puzzles` scripts.
  - Copy the logo, favicon and share image from `Game Dev/Dominoku` into `public/`.
  - _Requirements: 9.1, 9.6_

- [x] 2. Core types and domino geometry
  - [x] 2.1 `types.ts` and `dominoes.ts`: tile ids, the 28-tile set, orientation to cell offsets and pip order, rotate clockwise.
    - _Requirements: 1.3, 2.1_
  - [x] 2.2 Tests for all four orientations, doubles and rotation order.
    - _Requirements: 2.1_

- [x] 3. Board and rules
  - [x] 3.1 `board.ts`: `canPlace`, `place`, `remove`, cell map, row and column totals, locked dominoes as fixed cells.
    - _Requirements: 1.5, 2.2, 2.3, 2.5, 2.7, 3.6_
  - [x] 3.2 `rules.ts`: `lineStatus` and `isSolved`.
    - _Requirements: 3.2, 3.3, 3.4, 4.1_
  - [x] 3.3 `history.ts`: undo stack for place and remove, restart, freeze after solve.
    - _Requirements: 6.3, 6.4, 6.5_
  - [x] 3.4 Unit tests for 3.1 to 3.3.
    - _Requirements: 9.3_

- [x] 4. Solver
  - [x] 4.1 `solver.ts`: count solutions up to a limit, with the pruning described in the design.
    - _Requirements: 5.1, 5.5_
  - [x] 4.2 Tests with a unique puzzle, a two-solution puzzle and an unsolvable one, plus a check against a brute-force counter on 2×2 and small 4×4 cases.
    - _Requirements: 5.1_

- [x] 5. Puzzle generator and data
  - [x] 5.1 `tools/generate-puzzles.ts`: seeded RNG, random tiling, distinct tiles, targets, unlock-while-unique, lock budget per size, 365 days.
    - _Requirements: 5.1, 5.2, 5.4, 5.6_
  - [x] 5.2 `tools/verify-puzzles.ts` and `tests/puzzles.spec.ts`: every rule from design section 5.
    - _Requirements: 5.1, 5.5_
  - [x] 5.3 Generate and commit `puzzles.data.json`. Report the lock counts per size. If 6×6 does not fit the budget, stop and ask before changing it.
    - _Requirements: 5.1, 5.4_

- [x] 6. Daily selection
  - [x] 6.1 `daily.ts`: local-date day index, wrap-around, three puzzles in order.
    - _Requirements: 5.2, 5.3_
  - [x] 6.2 Tests for same-day stability, local midnight rollover and wrap.
    - _Requirements: 5.3_

- [x] 7. Storage and progress
  - [x] 7.1 `platform/storage.ts` (guarded `localStorage`, in-memory fallback) and `platform/platform.ts` (local adapter).
    - _Requirements: 8.3, 9.4_
  - [x] 7.2 `progress.ts`: save and load per day and puzzle, validate by replaying placements, drop days older than 30 days, rebuild undo history.
    - _Requirements: 4.5, 8.1, 8.2, 8.4_
  - [x] 7.3 Tests for round trip, corrupt data, unavailable storage and old-day cleanup.
    - _Requirements: 8.3, 8.4_

- [x] 8. Styles and theme
  - [x] 8.1 Design tokens, light and dark palettes, typography, the pre-paint theme script, theme toggle and saved choice.
    - _Requirements: 7.1, 7.2, 7.5_
  - [x] 8.2 Check text contrast pairs against AA in both themes.
    - _Requirements: 7.5_

- [x] 9. Puzzle screen
  - [x] 9.1 `board-view.ts`: grid, locked and placed dominoes with SVG pips, targets, totals with color plus check or arrow, cell preview.
    - _Requirements: 1.4, 1.5, 3.1 to 3.5, 2.4_
  - [x] 9.2 `tray-view.ts`: tray dominoes, selection, rotate on tap.
    - _Requirements: 2.1_
  - [x] 9.3 `pointer.ts` with tests: tap, drag threshold, double-tap, cancel, pointer capture.
    - _Requirements: 2.3, 2.6, 2.7, 2.9_
  - [x] 9.4 Wire tap-to-place, drag-and-drop, take back, invalid feedback, locked-domino feedback.
    - _Requirements: 2.2, 2.3, 2.5, 2.7, 2.8_
  - [x] 9.5 Undo and Restart buttons (with confirmation), back control, and saving after each change.
    - _Requirements: 6.3, 6.4, 6.6, 8.1_
  - [x] 9.6 Responsive layout for portrait, landscape and desktop, 320 px minimum, no page scroll while dragging.
    - _Requirements: 7.3, 7.4_

- [x] 10. Keyboard and screen reader support
  - `keyboard.ts` roving cursor and shortcuts, ARIA grid labels, live region announcements, focus handling in modals.
  - _Requirements: 2.10, 7.7_

- [x] 11. Home, How to Play, celebration
  - [x] 11.1 `home.ts`: date, day number, three puzzle cards with state, hash router.
    - _Requirements: 5.2, 5.7, 6.1_
  - [x] 11.2 `howto.ts`: content and example, opens on first visit and from Home and the puzzle screen.
    - _Requirements: 6.2_
  - [x] 11.3 `celebrate.ts`: confetti, completion card with next step, reduced-motion version, finished board on reopen.
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 7.6_

- [~] 12. Integration into voidcade (card and dev script done; full-site build blocked by the duplicate common-thread-solitaire-v2 folder)
  - Add `dev:dominoku` to the root `package.json` and a card on the landing page. Run the full-site `npm run build`.
  - _Requirements: 9.2_

- [~] 13. Verification (game-level checks done; full-site build not run)
  - Run `tsc`, `npm test`, `verify-puzzles` and the production build.
  - Play all three sizes in Edge with mouse and with touch emulation (drag, tap, rotate, take back, undo, restart, solve), in both themes, at 320, 390, 768 and 1280 px, and from a subfolder. Check there are no console errors.
  - Report results, including the lock counts per size and anything that did not meet a requirement.
  - _Requirements: 1 to 9_

- [x] 14. Sound and music (procedural WebAudio, separate switches, saved)
  - _Requirements: 10_
- [x] 15. Archive screen and day routes
  - _Requirements: 11_
- [x] 16. Streaks and statistics screen, streak on Home
  - _Requirements: 12_
