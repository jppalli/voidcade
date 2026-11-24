# Requirements: Dominoku

A browser puzzle game. The player fills a square grid with dominoes so that every row and every column adds up to a target number. It lives in the voidcade monorepo as `games/dominoku`, built the same way as the latest games (Vite, strict TypeScript, relative asset paths, generated and verified puzzle data).

## Glossary

- **Cell**: one square of the grid.
- **Pip value**: the number (0 to 6) on one half of a domino.
- **Domino**: a tile with two pip values. It covers two edge-adjacent cells.
- **Orientation**: one of four rotations of a domino. Flat orientations put the two halves side by side. Standing orientations stack them. The pip order flips with the rotation, so each of the four orientations puts different values in different cells.
- **Tray**: the area holding dominoes that are not yet on the grid.
- **Locked domino**: a domino that the puzzle places on the grid at the start. The player cannot move it.
- **Target**: the number shown outside the grid for a row or column.
- **Total**: the sum of pip values currently in that row or column.
- **Puzzle**: grid size, targets, locked dominoes and the set of dominoes in the tray.
- **Daily set**: the three puzzles for one calendar day (2×2, 4×4, 6×6).

## Requirement 1: Grid and dominoes

**User story:** As a player, I want a clear grid with a set of dominoes, so that I know what I have to fill.

Acceptance criteria
1. The grid SHALL be 2×2, 4×4 or 6×6.
2. The number of dominoes (locked plus tray) SHALL equal the cell count divided by two (2, 8 or 18), so the grid can be filled exactly.
3. Every domino in a puzzle SHALL be different from the others. Pip values SHALL range from 0 to 6.
4. Each row and each column SHALL show its target outside the grid.
5. Locked dominoes SHALL appear on the grid at the start, SHALL look different from player-placed dominoes, and SHALL NOT be draggable, rotatable or removable.

## Requirement 2: Placing dominoes

**User story:** As a player, I want to place dominoes by dragging or by tapping, with a mouse or a finger.

Acceptance criteria
1. WHEN the player taps a domino in the tray, THE game SHALL rotate it 90° clockwise and mark it as the selected domino.
2. WHEN a domino is selected and the player taps an empty cell, THE game SHALL place the domino with its first half on that cell, in its current orientation, if both covered cells are on the grid and empty.
3. WHEN the player drags a domino from the tray and drops it, THE game SHALL place it on the two cells under the dragged tile if both are on the grid and empty. Dragging SHALL work with mouse, touch and pen.
4. WHILE a domino is being dragged, or is selected and the pointer is over the grid, THE game SHALL preview the two target cells and mark them valid or invalid.
5. IF a placement is invalid, THEN THE game SHALL leave the board unchanged, return a dragged domino to the tray, and give brief visual feedback.
6. A tap SHALL be told apart from a drag by movement. Movement below 6 px SHALL count as a tap.
7. WHEN the player double-taps (or double-clicks) a player-placed domino, THE game SHALL return it to the tray in the orientation it had. Two taps within 300 ms and 24 px SHALL count as a double-tap.
8. WHEN the player double-taps a locked domino, THE game SHALL leave it in place and give brief visual feedback.
9. A single tap on a placed domino SHALL do nothing, so taking a domino back adds no waiting time to other taps.
10. The game SHALL be fully playable from the keyboard: arrow keys move a cell cursor, `R` rotates the selected domino, `Enter` or `Space` places it, `Backspace` or `Delete` takes back the domino under the cursor, and `Tab` or number keys choose a tray domino.

## Requirement 3: Running totals

**User story:** As a player, I want to see how close each row and column is to its target.

Acceptance criteria
1. Next to each target, THE game SHALL show the current total of that row or column, counting only pips that are on the grid.
2. WHILE a total is below the target, THE total SHALL be plain gray text.
3. WHILE a total equals the target, THE total SHALL show a check mark in a solid, filled badge.
4. WHILE a total is above the target, THE total SHALL show an up arrow in an outlined badge.
5. Status SHALL NOT depend on color. The interface SHALL use no green, yellow or red for totals, so the game stays black, white and gray with one blue for selection.
6. Totals SHALL update immediately after every place, take back, undo and restart.

## Requirement 4: Winning

**User story:** As a player, I want the game to recognise when I have solved the puzzle and reward me.

Acceptance criteria
1. WHEN the grid is full and every row total and column total equals its target, THE game SHALL mark the puzzle solved.
2. WHEN a puzzle is solved, THE game SHALL stop accepting moves on it and show a celebration.
3. The celebration SHALL show confetti and a completion card with the puzzle name and the next step (play another puzzle of the day, or come back tomorrow).
4. IF the system setting "reduce motion" is on, THEN THE celebration SHALL use a static card with no motion.
5. A solved puzzle SHALL stay solved after the page is reloaded, and reopening it SHALL show the finished board.

## Requirement 5: Puzzle quality and daily set

**User story:** As a player, I want fair puzzles that rise in difficulty through the day.

Acceptance criteria
1. Every puzzle SHALL have exactly one solution, meaning exactly one way to place the tray dominoes so that the grid is full and all targets are met.
2. Each calendar day SHALL have three puzzles, in order: 2×2 (easy), 4×4 (medium), 6×6 (hard).
3. The daily set SHALL be chosen from the player's local calendar date, so two players in the same time zone see the same puzzles.
4. Locked dominoes SHALL be used only where needed for uniqueness. Easier sizes SHALL need fewer of them.
5. The project SHALL include a command that verifies, with an independent solver, that every bundled puzzle has exactly one solution and fits its size rules. This check SHALL run as an automated test.
6. The project SHALL include a command that generates the puzzle data for a range of dates, from a fixed seed so that the output is repeatable.
7. The player SHALL be able to open the three puzzles of the day in any order. [Assumption, see design]

## Requirement 6: Controls and screens

**User story:** As a player, I want undo, restart and instructions.

Acceptance criteria
1. The game SHALL have a Home screen that shows today's date and the three puzzles with their state (not started, in progress, solved).
2. The game SHALL have a "How to Play" screen reachable from Home and from the puzzle screen. It SHALL explain the goal, placing, rotating, taking back, and the total colors, with a small animated or static example. It SHALL open automatically on the very first visit.
3. The puzzle screen SHALL have an Undo button. Undo SHALL reverse the last place or take-back action, one step at a time, back to the initial board. It SHALL be disabled when there is nothing to undo.
4. The puzzle screen SHALL have a Restart button that removes all player-placed dominoes. IF the player has placed any domino, THEN THE game SHALL ask for confirmation first.
5. Rotating a domino in the tray SHALL NOT count as an undoable action.
6. The puzzle screen SHALL have a back control to Home.

## Requirement 7: Look and feel

**User story:** As a player, I want a clean, calm interface that works on any device.

Acceptance criteria
1. The visual style SHALL be clean and minimal, in the style of NYT Games: plenty of whitespace, a restrained palette, crisp typography, thin lines and clear numerals.
2. The game SHALL have a light theme and a dark theme. It SHALL follow the system setting at first, SHALL offer a toggle, and SHALL remember the player's choice.
3. The layout SHALL work from 320 px wide phones to wide desktop screens, in portrait and landscape, with no horizontal scrolling and no clipped board.
4. Interactive targets (tray dominoes, cells, buttons) SHALL be at least 44×44 px on touch devices. Touch dragging SHALL NOT scroll or zoom the page.
5. Text and totals SHALL meet WCAG AA contrast in both themes.
6. The game SHALL respect the "reduce motion" setting for all animation.
7. The board SHALL expose roles and labels for screen readers (grid, row and column targets, cell contents) and announce totals reaching the target and puzzle completion in a live region.

## Requirement 8: Saving progress

**User story:** As a player, I want to leave and come back without losing my work.

Acceptance criteria
1. The game SHALL save the player's placements for each puzzle of each day, solved state, theme and "How to Play seen" flag in local storage.
2. WHEN the page is reloaded, THE game SHALL restore the board exactly, including undo history for the current session where practical.
3. IF local storage is unavailable or holds invalid data, THEN THE game SHALL still run with in-memory state and SHALL NOT crash.
4. Saved results SHALL be kept for the archive and statistics. Data older than about three years MAY be removed.

## Requirement 9: Project structure and quality

**User story:** As the maintainer, I want Dominoku to fit the rest of voidcade.

Acceptance criteria
1. The game SHALL live in `games/dominoku` as its own workspace (Vite 6, strict TypeScript, no framework), using `base: './'` and an output folder under the site's `dist/games/dominoku`, the same as the other games.
2. The root site SHALL link to the game (landing page card and a `dev:dominoku` script) and the full-site `npm run build` SHALL pass.
3. Game rules (board, totals, win check, undo, solver, daily selection) SHALL be pure TypeScript with no DOM access, with unit tests.
4. Platform and storage access SHALL go through a small adapter with a local implementation, so a hosted-platform implementation can be added without touching game code.
5. A production build SHALL work when served from a subfolder and SHALL make no console errors.
6. Logo, favicon and share image SHALL come from the existing brand files in `Game Dev/Dominoku`. [Assumption, see design]

## Requirement 10: Sound

**User story:** As a player, I want gentle sound effects and music that I can switch off.

Acceptance criteria
1. The game SHALL play short sound effects for rotating, placing, taking back, undoing, an invalid move, a row or column reaching its target, and solving a puzzle.
2. The game SHALL offer quiet background music.
3. Sound effects and music SHALL have separate on/off switches in a sound settings sheet, reachable from every screen. Both SHALL be on by default and the choice SHALL be saved.
4. No sound SHALL play before the player's first tap or key press, and sound SHALL pause while the page is hidden.
5. Sounds SHALL be generated in the browser, with no audio files.

## Requirement 11: Archive

**User story:** As a player, I want to play puzzles from days I missed.

Acceptance criteria
1. An Archive screen SHALL show a month calendar of every day from the first day of puzzles up to today, with one dot for each solved puzzle of that day.
2. WHEN the player picks a day, THE game SHALL show that day's three puzzles, playable in the same way as today's.
3. Future days and days before the first puzzle day SHALL NOT be playable, and links to them SHALL lead back to the Archive.
4. Progress in archive puzzles SHALL be saved in the same way as today's.

## Requirement 12: Streaks and statistics

**User story:** As a player, I want to see how I am doing over time.

Acceptance criteria
1. A day SHALL count toward the streak when at least one of its puzzles was solved on that same calendar day. Solving a puzzle from the archive on a later day SHALL NOT count.
2. The current streak SHALL stay alive through today if today has no solve yet, and SHALL end once a whole day is missed.
3. A Statistics screen SHALL show current streak, longest streak, puzzles solved, days completed (all three solved), and for each size the number solved, best time and average time.
4. Home SHALL show the current streak.
5. Time SHALL be the active play time while the puzzle is open, visible and unsolved. It is recorded but not shown on the puzzle screen.
## Out of scope for the first version

- Moving a placed domino by dragging it (take back and place again instead).
- Hints, leaderboards, ads and analytics.
- User accounts and cloud saving.
- Puzzle sizes other than 2×2, 4×4 and 6×6.
