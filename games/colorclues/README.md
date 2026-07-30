# Color Clues

A logic puzzle where minesweeper's counting trick is turned loose on color.

Every square on the board is one of three colors — **Coral**, **Teal**, **Butter**.
Some squares start painted, and some of those carry a number: how many of the
**eight squares around it** share that same color. A Teal `0` means nothing
touching it is Teal. A Coral `3` means exactly three of its neighbours are Coral.

From there you work the rest out. You can **paint** a square when you know its
color, or **cross** a color off a square you have ruled it out of.

Crosses are notes, not claims: the game never checks them and they never cost
anything. **Double-tapping a number** crosses its own color off every empty
square it touches — the marks you would otherwise place one at a time, in one
go. That is its entire effect. It does not paint, does not check whether the
marks are right, and reveals nothing.

Painting is the commitment. A wrong color costs a heart, and there are three
hearts per board.

## The palette

Aimed at a casual portal audience (this is built for arkadium.com): bright and
friendly rather than moody, but kept soft — nothing fully saturated. The whole
palette lives in `:root` in `src/styles.css`; nothing else hardcodes a colour, so
a retheme is one block.

The three play colours are chosen for **separation before prettiness**, because
telling them apart *is* the game. They differ on two axes at once — hue (coral
warm / teal cool / butter warm-light) and lightness (mid / dark / light). Coral
against teal is the safest pairing for red-green colour blindness, and the
lightness spread means even total colour blindness leaves them readable.

Contrast was measured, not eyeballed. Numbers sit at 3.4:1 on coral, 3.7:1 on
teal and 5.6:1 on butter — all clearing the 3:1 WCAG floor for large bold text.
The first coral came in at 2.8:1 and was darkened until it passed.

## The journey

Navigation is title → **journey map** → board. The map is a serpentine trail that
climbs from the first board at the bottom to the last at the top, through one
tinted region per chapter, with a banner marking the entrance to each. The trail
lights up behind boards you have solved, so it reads as a route walked rather than
a list ticked off. Opening it lands you on the board you are up to.

Node positions are a pure function of index and container width, so the map is
stable across every re-render and redraws correctly on resize.

## Running it

```bash
npm install
npm run dev
```

Also available through the repo's `.claude/launch.json` as `colorclues` (port 5182).

Keyboard: `1` `2` `3` pick a color, `space` / `x` swaps paint and cross, `z`
undoes, `esc` goes back to the board list.

## The tutorial

The first chapter is four tiny hand-made boards that teach the game one idea at
a time, with a coach bar under the board:

1. **3×3** — what a number means, and a case where it leaves only one answer.
2. **4×3** — what a `0` means, and double-tapping it to cross a color off
   everything it watches. Two double-taps corner both blanks; the player paints.
3. **4×3** — crossing colors out by hand, then painting what is left.
4. **4×4** — tapping a number to see which squares it watches, then a free solve.

These boards lose no hearts; a wrong move gets a line from the coach instead.
Steps wait for the player to actually do the thing — a step that wants the Cross
tool makes the button wave, it does not press it for them.

They live in `src/game/tutorial.data.json`, hand-written and separate from the
generated chapters so `npm run gen-levels` can never overwrite the teaching.
`verify-levels` checks them to the same standard as everything else, plus that
each step's cell references still point somewhere real.

## Levels

24 generated boards in 4 chapters, from 5×5 up to 9×8, in
`src/game/levels.data.json`, after the 4 tutorial boards.

Every shipped board is **uniquely solvable by deduction** — never by guessing.
But solvable is a low bar, and clearing it is not what makes a board worth
playing. There are three ways a cell can fall:

1. **EXHAUST → SINGLE.** A clue has found all *n* of its color, so that color is
   crossed off everything else it touches. Do that from two clues of different
   colors and a square has one option left. *This is the game.*
2. **COMPLETE.** A clue still needs *n*, and exactly *n* squares can still take
   it, so they are all that color. Correct, but it hands the answer over without
   the player crossing anything off.
3. **OVERLAP.** When one clue's remaining cells sit entirely inside another's of
   the same color, the difference between their counts is forced into the cells
   only the second sees. (Minesweeper's 1-2 pattern.)

The **elimination ratio** is the share of a board's blanks that fall to (1). It
is the number that matters, and `verify-levels` enforces a floor on it per
chapter. Chapters 1–3 are 100% — finishable by crossing off and nothing else.
The Weave requires COMPLETE, and its last three boards genuinely require OVERLAP.

```bash
npm run verify-levels   # one solution, reachable by logic, and enough elimination
npm run gen-levels      # rebuild the whole set (--seed N for a different one)
```

`verify-levels` is not optional after hand-editing levels — it is the only thing
standing between a typo and an unsolvable board.

## Daily Challenge

One board a day, the same board for everyone, unlocked once the tutorial is
done. It runs on a **fourth deduction tier that no chapter board uses**:

4. **CONTRADICTION.** When every other rule stalls, take a square with two colors
   left, assume one, and follow it out. If the assumption breaks the board, that
   color is impossible. This is proof, not guessing — you never have to back a
   hunch, only chase one far enough to watch it fail.

Every daily board is verified to *need* that rule, so none of them can be ground
out with the techniques the chapters teach. They also run bigger than any chapter
board (up to 11×9 and 10×10, against a 9×9 ceiling elsewhere) with chains
averaging 25 rounds against 5–17. Five hearts instead of three, and a streak
counter that survives until you actually skip a day.

There is no server. The pool in `src/game/daily.data.json` is pre-generated and
pre-verified, and the local calendar date picks the board — so two people on the
same day get the same puzzle with nothing fetched, and no player is ever handed a
puzzle nobody checked.

```bash
npm run gen-daily              # rebuild the pool
node tools/daily.mjs --append  # keep what exists, add more
```

One thing the daily deliberately does *not* do is minimise clues much further
than the chapters. Sweeping the search showed a hard ceiling around **55% blank
squares**, and it is a property of the puzzle rather than of the solver: a clue
only ever reaches its own 3×3, so a region with no clues near it cannot be pinned
by any amount of cleverness. Difficulty is bought with size, chain depth and the
contradiction rule instead.

## How the generator gets there

Optimising the carving alone does not work — by then the damage is done. The
first version grew the hidden coloring in *blobs*, so cells sat surrounded by
their own color and clue numbers ran high (mean 3.15 of a possible 8). A high
number is a machine for naming cells; a `0` can only ever cross things off. Those
levels were 93% the dull kind, and every check in `verify-levels` passed them.

So `tools/generate.mjs` works from the coloring up:

1. **Anneal** the hidden coloring to push same-color neighbours apart, dragging
   the clue distribution down to roughly 22% zeros, 61% ones, 17% twos.
2. **Carve** biggest-number-first, so the clues that survive are the ones that
   eliminate. Keep 2s over 1s over 0s — a 2 makes the player establish two
   neighbours before it says anything, while a board of 0s plays itself.
3. **Score** every candidate with the traced solver, and refuse any that falls
   below the chapter's elimination floor.

Two knobs were tuned by measurement rather than taste, and both were
counter-intuitive: charging even a little for a neighbour count of 2 produced
boards that were 83% ones; and pressing counts all the way down to 0s and 1s
produced numbers that were pure decoration.

## Layout

```
src/game/puzzle.mjs     the rules: neighbours, clue propagation, solver
src/game/state.ts       one board in play — paint, cross, chord, hint, undo
src/game/levels.data.json     generated
src/game/tutorial.data.json   hand-written, chapter 1
src/game/daily.data.json      generated pool for the Daily Challenge
src/game/daily.ts             date -> board, streaks, daily progress
src/render/board.ts     the grid, as DOM
src/ui/screens.ts       title, board list, play screen, modals
tools/generate.mjs      builds levels.data.json
tools/daily.mjs         builds daily.data.json
tools/verify.mjs        npm run verify-levels (covers the daily pool too)
tools/tutorial-boards.mjs  candidate boards for the free-solve tutorial levels
```

One rule the code depends on: **only painted cells are trusted.** A paint is
checked against the solution, so it is always right; an X is a note the player
may have got wrong. So `Game.hint()` builds its domains from fills alone —
feeding player crosses to the solver would let one bad mark produce a wrong
hint, or contradict the board outright.

`puzzle.mjs` is plain JavaScript rather than TypeScript on purpose: the node
tools and the browser app import the same file, so the rules the generator
proves are literally the rules the game plays by. Its types live alongside it in
`puzzle.d.mts`.

Progress is kept in `localStorage` under `colorclues-progress-v1`. For poking
at it from the console there is `window.__clues` — `.jump("weave-3")` opens a
board, `.play().fillAll()` finishes one.
