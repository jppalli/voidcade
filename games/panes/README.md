# Panes

A daily rectangle-division puzzle. Split the grid into panes — each region
must contain exactly one number, and that number must equal the region's
area (cell count).

Inspired by the classic Nikoli puzzle **Shikaku**.

## Play

Each day has 3 levels: Easy (5×5), Medium (7×7), Hard (9×9). Clear all
three to complete the day and build your streak. Browse past days with
the calendar picker — every puzzle is generated deterministically from
its date, so it's the same for everyone and reproducible on replay.

## Running locally

No build step — plain HTML/CSS/JS with ES modules. Serve the folder with
any static file server, e.g.:

```
npx serve .
```

Then open the printed local URL in a browser.

## Project structure

```
index.html
css/
  tokens.css       design tokens (colors, spacing, motion) — dark, matches the Voidcade site
  layout.css       app shell, header, daily panel, board frame, controls
  board.css        grid, cells, region borders, drag overlay
  components.css   buttons, modals, win banner, stats, calendar
  animations.css   keyframes + animation helper classes
  main.css         import entrypoint
js/
  rng.js           seeded PRNG + date-based seed derivation
  solver.js        backtracking exact-cover solver (verifies unique solutions)
  generator.js     puzzle generator (recursive partition + solver validation)
  daily.js         dates, daily level definitions, progress/streak logic
  state.js         single source of truth for game state
  renderer.js      all DOM writes for the board (no game logic)
  input.js         pointer/touch drag handling
  game.js          core game logic (start, commit region, hint, clear, win)
  ui.js            non-board UI: modals, calendar, level pills
  main.js          boot + event wiring
```
