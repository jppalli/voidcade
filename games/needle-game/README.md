# Needle

A browser hidden-object game built with Phaser 3, TypeScript, and Vite.

## Develop

```sh
npm install
npm run dev
```

## Production

```sh
npm run build
```

Deploy `dist/` to a static host. Sites identity lives in `.openai/hosting.json`.

## Play

Hold and drag (mouse or touch) to brush the hay. Straws slide with the stroke and settle with friction: the top layer moves most, deeper layers less, and straws pushed off-centre turn. The needle and bonus items lying underneath are carried along a little too. Each level starts with the needle and every bonus item at least 90% under hay (extra straws are laid over them until that holds); a tap picks one up once at least 35% of it shows. Tap a single straw to pluck it off the pile; tapping a covered needle lifts its top cover. Brush or pluck the stalks covering the needle, then click or tap it. There is no timer and no score: you find the needle, and the level is done. Keys 1, 2, and 3 select magnet, wind, and magnification. Click or tap a spot on the hay to apply the selected tool. Selection and cancellation are free; a charge is spent on placement. Press Escape or select the same tool again to cancel aiming. Wind clears a local 130-unit radius; magnet scans a 170-unit radius and reacts only to nearby metal. The movable 2× lens lasts ten seconds and does not zoom the board. Each tool has two charges per round. Progress and sound preferences are stored in this browser; there is no account or backend.

All sound is synthesized with Web Audio in `src/sound.ts` (no audio files): hay rustles and plucks made of filtered noise, pentatonic bells and marimba notes for finds and tools, and a quiet breeze with distant birds. Audio starts on the first tap or key press and follows the sound toggle.

The hay and needle textures are drawn procedurally into Phaser canvas textures, with independently animated straw sprites. The interface uses only system fonts (Trebuchet MS and Arial Black, with fallbacks); no web fonts are downloaded. Difficulty increases with density and a smaller needle, capped to preserve playability. Five rounds make a chapter.

## Verification

TypeScript checking and production bundling run together with `npm run build`. Browser checks covered needle selection, tool selection/cancellation without spending charges, local wind clearing, magnet misses, lens rendering, charge consumption, and the revised game layout. No browser console errors were observed in the powerup checks. Physical touch-device performance still needs playtesting.

## Progression

The game opens on a title screen with a Play button, then a world map (as in Kitty Doku). There are 40 levels in 5 worlds of 8, each with its own backdrop. Each world's last level is a finale (spiral layout) with 3 bonus items. A node shows a gold sparkle when all bonus items were found. There is no timer, score, or stars.

First-time experience (levels 1-4, with short messages that fade):
1. Level 1: brush the hay (needle 70% hidden, no bonus items).
2. Level 2: a long cover straw lies across the needle; tap it to lift it.
3. Level 3: first bonus item.
4. Level 4: practice.

From level 5 the needle and items start at least 85-90% hidden. Helpers unlock at level 5 (detector) and 9 (wind), each with an intro card. Old saves are migrated: a legacy `{level}` save marks all earlier levels as solved. Progress is stored under `needle-save`.

Code: `src/levels.ts` (level definitions, worlds), `src/progress.ts` (save), `src/worldmap.ts` (map), `src/scenery.ts` (per-world backdrop), `src/props.ts` (SVG art).

Run `node test-levels.mjs` to check the 40-level structure, helper schedule, finales, difficulty limits, layouts, and 18,000 seeded placement samples.

Tuning knobs: hidden shares in `levelDef`, and `CARRY`, `FRICTION`, `VISIBLE_TO_TAP` for the physics.


## Zoom and pan

Everyone can zoom; there is no magnifier helper. Wheel zooms around the cursor, two fingers pinch and pan, and the +, - and fit buttons sit at the top right of the board. Keys: + / - / 0, arrows pan, and pushing the mouse against the board edge scrolls that way. One finger or the mouse always brushes. Worlds scale the board with `WORLD_SIZE` in `levels.ts` (1, 1.25, 1.5, 1.8, 2.1); straw count follows `min(10000, round(min(2100, 700+n*45) * size^2 * (1+world*0.08)))`. Brush radius shrinks as you zoom in (`clamp(46/sqrt(zoom), 32, 76)`).


## Detector

The level-5 helper. It runs on a battery cell (every helper does: each level starts with 4 free, more are sold in the shop). A cell lasts 10 seconds of scanning; it scans only while you hold the button down for more than 0.15 s (`SCAN_DELAY`), so a quick tap just picks things up; it senses the needle and any bonus item not yet picked up, covered or not within `DET_R` world units. Beeps get faster and higher as you get closer, the needle adds a second note, and a ring around the pointer warms up and pulses for muted play. When a cell runs out the next one takes over by itself; letting go of the button pauses the detector and keeps what is left of the cell (tap the button to carry on). Every scan press uses at least `DET_MIN` (1 s) of the cell and the first ping waits about a second, so tapping around is not free. Dragging scans instead of brushing while it is on; taps still pluck or pick up. Internally the button id and icon key are still `magnet`.

## Level 40

The last level is one huge haystack (`GRAND_FINALE` in `levels.ts`): size 3 and 25,200 straws, 2.5 times the straws of any other level. In a browser with no graphics card it ran at about half the frame rate of the old biggest level (10,000 straws), and zooming in brings it back up. Phones are untested. Lower the numbers there if it runs badly.

## Battery cells in the interface

The cell total sits in the top bar next to the coins. While the detector or the fan is out, the message pill under the board becomes a battery bar: the detector shows the cell it is draining (with seconds left) and the cells waiting to take over; the fan shows the whole cell it will use. The bar is hidden when no helper is out. A cell left partly used when a level ends is lost. every level starts with `CELLS.free` fresh ones.
