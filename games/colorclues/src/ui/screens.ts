import data from "../game/levels.data.json";
import tutorial from "../game/tutorial.data.json";
import type { Chapter, Level, LevelData, TeachNeed, TeachStep } from "../game/types";
import { EMPTY, Game, heartsFor, type Tool } from "../game/state";
import { compile } from "../game/puzzle.mjs";
import {
  dailyDone, dailyFor, dailyResult, dailyStreak, prettyDate, recordDaily,
  resetDaily, todayKey, untilTomorrow,
} from "../game/daily";
import { BoardView } from "../render/board";
import { audioMuted, sfx, toggleMute } from "../audio/sound";
import { clearedCount, isCleared, ratingFor, recordWin, resetProgress, resultFor } from "../game/storage";

// The hand-written tutorial leads; the generated chapters follow. Keeping it in
// its own file means `npm run gen-levels` can never overwrite the teaching.
const levels: LevelData = {
  ...(data as LevelData),
  chapters: [tutorial as unknown as Chapter, ...(data as LevelData).chapters],
};
const app = document.getElementById("app") as HTMLDivElement;

const COLOR_NAMES = ["Coral", "Teal", "Butter"];

export function h<T extends HTMLElement = HTMLElement>(html: string): T {
  const tpl = document.createElement("template");
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild as T;
}

export const icon = (id: string, cls = "icon") => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;

/* --------------------------------------------------------- the daily card */

/**
 * The Daily is tier 4 — it needs the contradiction rule, which no chapter board
 * does — so it stays hidden until the tutorial is done. Handing a brand-new
 * player the hardest board in the game is not a welcome.
 */
function dailyUnlocked() {
  const tutorial = levels.chapters[0]?.levels ?? [];
  return tutorial.length > 0 && tutorial.every((l) => isCleared(l.id));
}

/** The Daily entry, shared by the title screen and the board list. */
function dailyCard(): HTMLElement {
  const key = todayKey();
  const done = dailyDone(key);
  const streak = dailyStreak();
  const result = dailyResult(key);

  const card = h(`
    <button class="dailyCard ${done ? "done" : ""}">
      <span class="dailyMark">${icon(done ? "i-check" : "i-ch-daily", "icon")}</span>
      <span class="dailyText">
        <b>Daily Challenge</b>
        <span>${done
          ? `Solved${result?.clean ? " clean" : ""} — back tomorrow`
          : prettyDate(key)}</span>
      </span>
      ${streak > 0 ? `<span class="streak">${icon("i-flame", "icon")}${streak}</span>` : ""}
    </button>`);
  card.addEventListener("click", () => { sfx.tap(); startLevel(dailyFor()); });
  return card;
}

const allLevels: Level[] = levels.chapters.flatMap((c) => c.levels);
// Indexes drive the unlock chain, so they are assigned here rather than trusted
// from the data files — the tutorial shifts everything the generator numbered.
allLevels.forEach((level, i) => { level.index = i; });
const chapterOf = (level: Level) => levels.chapters.find((c) => c.levels.includes(level)) as Chapter;

const unlocked = (level: Level) => level.index === 0 || isCleared(allLevels[level.index - 1].id);

/** Whatever the screen we are leaving attached to window/observers. */
let cleanupCurrent: (() => void) | null = null;

function show(screen: HTMLElement, cleanup?: () => void) {
  cleanupCurrent?.();
  cleanupCurrent = cleanup ?? null;
  app.replaceChildren(screen);
}

/* ------------------------------------------------------------------ modals */

function modal(inner: string, opts: { dismissable?: boolean } = {}) {
  const wrap = h(`<div class="scrim"><div class="modal">${inner}</div></div>`);
  const close = () => {
    wrap.classList.add("out");
    setTimeout(() => wrap.remove(), 200);
  };
  if (opts.dismissable !== false) {
    wrap.addEventListener("click", (ev) => { if (ev.target === wrap) close(); });
  }
  document.body.appendChild(wrap);
  return { wrap, close };
}

const SWATCH_ROW = `<span class="chip c0"></span><span class="chip c1"></span><span class="chip c2"></span>`;

const MARK_X = `<svg class="icon" viewBox="0 0 24 24"><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg>`;

/** The same X the board draws, so a swatch in Cross mode previews the real mark. */
const SWATCH_X = `<svg class="swatchX" viewBox="0 0 24 24"><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg>`;

/**
 * A little board for the rules. Each entry is "." blank, "0"/"1"/"2" painted,
 * "0:3" painted with a number, or "x0" / "x0x1" for crossed-off colors.
 */
function miniBoard(cells: string[], ring?: number[], cols = 3) {
  const inner = cells.map((spec, i) => {
    const ringed = ring?.includes(i) ? " neighbour" : "";
    if (spec === ".") return `<span class="cell mini blank${ringed}"></span>`;
    if (spec.startsWith("x")) {
      const marks = spec.slice(1).split("x").map((c) => `<i class="mark c${c}">${MARK_X}</i>`).join("");
      return `<span class="cell mini blank${ringed}"><span class="marks">${marks}</span></span>`;
    }
    const [color, num] = spec.split(":");
    return `<span class="cell mini filled c${color}${ringed}">${num ? `<span class="num">${num}</span>` : ""}</span>`;
  }).join("");
  return `<span class="miniBoard" style="--mw:${cols}">${inner}</span>`;
}

export function showHelp() {
  const { wrap, close } = modal(`
    <h2>How to play</h2>
    <div class="rules">
      <p>Every square is one of three colors — ${SWATCH_ROW} — and some start
         already painted.</p>

      <h3>Numbers count their own color</h3>
      <p>A number counts how many of the <b>eight squares touching it</b> share
         its color. Diagonals count.</p>
      <div class="egBlock">
        ${miniBoard([".", "1", ".", "1", "0:2", "1", "1", "1", "."], [0, 1, 2, 3, 5, 6, 7, 8])}
        <p>This Coral <b>2</b> watches the eight ringed squares, and exactly two
           of them are Coral. None of the painted ones are — so of the three
           blanks, two are Coral.</p>
      </div>

      <h3>A 0 is the best clue there is</h3>
      <div class="egBlock">
        ${miniBoard(["2", ".", "2", ".", "1:0", ".", "2", ".", "2"])}
        <p>A Teal <b>0</b> touches no Teal at all — every blank around it is
           something else.</p>
      </div>

      <h3>Cross out what it cannot be</h3>
      <div class="egBlock">
        ${miniBoard(["x0", "x0x1", "2"], undefined, 3)}
        <p>Switch to <b>Cross</b> to rule a color out of a square. Rule out two
           and only one color is left — then paint it in.</p>
      </div>
      <p>Crosses are your notes. The game never checks them and never costs you
         a heart for one, so mark freely.</p>

      <h3>Double-tap to mark in bulk</h3>
      <p><b>Double-tap any number</b> and it crosses its own color off every
         empty square it touches — the marks you would have placed one at a time.
         That is all it does. It never paints, and it never tells you anything
         you could not already work out.</p>
      <p>A number <span class="dimEg">dims</span> once it has nothing left to
         tell you — every square it watches is either painted or crossed off. So
         the numbers still doing work are the bright ones.</p>

      <p class="fine">Painting is the commitment: a wrong color costs a heart.
         Three hearts per board.</p>
    </div>
    <button class="btn primary" data-close>Got it</button>`);
  wrap.querySelector("[data-close]")?.addEventListener("click", close);
  return close;
}

function showSettings(onReset: () => void) {
  const { wrap, close } = modal(`
    <h2>Settings</h2>
    <div class="stack">
      <button class="btn" data-sound>${icon(audioMuted() ? "i-sound-off" : "i-sound-on")}<span>${audioMuted() ? "Sound off" : "Sound on"}</span></button>
      <button class="btn" data-help>${icon("i-help")}<span>How to play</span></button>
      <button class="btn danger" data-wipe>${icon("i-reset")}<span>Erase all progress</span></button>
    </div>
    <button class="btn primary" data-close>Close</button>`);

  const soundBtn = wrap.querySelector<HTMLButtonElement>("[data-sound]")!;
  soundBtn.addEventListener("click", () => {
    const muted = toggleMute();
    soundBtn.innerHTML = `${icon(muted ? "i-sound-off" : "i-sound-on")}<span>${muted ? "Sound off" : "Sound on"}</span>`;
    if (!muted) sfx.tap();
  });
  wrap.querySelector("[data-help]")?.addEventListener("click", () => { close(); showHelp(); });
  wrap.querySelector("[data-wipe]")?.addEventListener("click", () => {
    resetProgress();
    resetDaily();
    close();
    onReset();
  });
  wrap.querySelector("[data-close]")?.addEventListener("click", close);
}

const starRow = (n: number, max = 3) =>
  Array.from({ length: max }, (_, i) => icon("i-star", `icon star${i < n ? " on" : ""}`)).join("");

/* ------------------------------------------------------------------- title */

/**
 * The logo is a real 3x3 board, so its numbers are *computed* from its colors
 * with the same rule the game plays by, rather than typed in.
 *
 * They used to be typed in, and the 3 was wrong: that square had exactly one
 * neighbour of its own color, not three. A logo that breaks the rule it is
 * advertising is a bad first impression, and deriving it means it cannot happen
 * again — change the colors and the numbers follow.
 *
 *   Butter  Teal    Butter        centre Butter sees 2 Butter (corners 0 and 2)
 *   Coral   Butter  Coral         below  Coral  sees 3 Coral  (3, 5 and 8)
 *   Teal    Coral   Coral
 */
const LOGO_COLORS = "212020100";
const LOGO_NUMBERED = [4, 7];

function logoGrid(): string {
  const cells = [...Array(9).keys()];
  const cx = compile({ w: 3, h: 3, sol: LOGO_COLORS, given: cells, nums: LOGO_NUMBERED });
  const counts = new Map(cx.clues.map((c) => [c.p, c.n]));
  return cells
    .map((i) => {
      // --i drives the drop cascade. Stepping it by the diagonal (x + y) rather
      // than by index makes the tiles land in a wave from the top-left corner
      // instead of row by row.
      const wave = (i % 3) + Math.floor(i / 3);
      const numbered = counts.has(i);
      return `<span class="c${LOGO_COLORS[i]}${numbered ? " numbered" : ""}" style="--i:${wave}">`
        + `${numbered ? `<b>${counts.get(i)}</b>` : ""}</span>`;
    })
    .join("");
}

/**
 * The resume card. A returning player should be able to see where they left off
 * without opening the map, so this names the next board, echoes its map node,
 * and carries the progress bar that used to be a line of fine print.
 */
function journeyCard(): HTMLElement {
  const frontier = allLevels.find((l) => !isCleared(l.id));
  const cleared = clearedCount();
  const pct = Math.round((cleared / allLevels.length) * 100);

  if (!frontier) {
    const card = h(`
      <button class="journeyCard complete" data-play>
        <span class="jcNode">${icon("i-check", "icon")}</span>
        <span class="jcText">
          <b>Journey complete</b>
          <span class="jcWhere">All ${allLevels.length} boards solved — revisit any of them</span>
        </span>
        ${icon("i-next", "icon jcGo")}
        <span class="jcBar"><i style="width:100%"></i></span>
      </button>`);
    return card;
  }

  const chapter = chapterOf(frontier);
  const numberInChapter = chapter.levels.indexOf(frontier) + 1;
  return h(`
    <button class="journeyCard" data-play>
      <span class="jcNode">${numberInChapter}</span>
      <span class="jcText">
        <b>Continue journey</b>
        <span class="jcWhere">
          ${icon(chapter.icon, "icon jcChapter")}${chapter.name} · ${frontier.w}×${frontier.h}
        </span>
      </span>
      ${icon("i-next", "icon jcGo")}
      <span class="jcBar" title="${cleared} of ${allLevels.length} solved"><i style="width:${pct}%"></i></span>
    </button>`);
}

export function showTitle() {
  const cleared = clearedCount();
  const screen = h(`
    <section class="screen title">
      <div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>
      <div class="titleCard">
        <div class="logoGrid">${logoGrid()}</div>
        <h1>Color<span>Clues</span></h1>
        <p class="tag">Three colors. Eight neighbours. One answer.</p>
        <div class="playSlot"></div>
        <div class="dailySlot"></div>
        <div class="titleRow">
          <button class="btn ghost" data-help>${icon("i-help")}<span>How to play</span></button>
          <button class="btn ghost" data-sound>${icon(audioMuted() ? "i-sound-off" : "i-sound-on")}</button>
        </div>
        <a class="voidcadeLink" href="../../">← Back to Voidcade</a>
      </div>
    </section>`);

  // Nothing to resume yet, so a new player gets a plain invitation rather than a
  // card reporting 0%.
  const playSlot = screen.querySelector(".playSlot")!;
  playSlot.appendChild(cleared === 0
    ? h(`<button class="btn primary big" data-play>Start journey</button>`)
    : journeyCard());

  // A first-time player goes straight into the tutorial; the map is only in the
  // way when there is nothing on it yet.
  screen.querySelector("[data-play]")?.addEventListener("click", () => {
    sfx.tap();
    if (cleared === 0) startLevel(allLevels[0]);
    else showLevelSelect();
  });
  if (dailyUnlocked()) screen.querySelector(".dailySlot")?.appendChild(dailyCard());

  screen.querySelector("[data-help]")?.addEventListener("click", () => { sfx.tap(); showHelp(); });
  const soundBtn = screen.querySelector<HTMLButtonElement>("[data-sound]")!;
  soundBtn.addEventListener("click", () => {
    const muted = toggleMute();
    soundBtn.innerHTML = icon(muted ? "i-sound-off" : "i-sound-on");
    if (!muted) sfx.tap();
  });
  show(screen);
}

/* ------------------------------------------------------------ level select */

/**
 * The journey map: a serpentine trail climbing from the first board at the
 * bottom to the last at the top, through one tinted region per chapter. The
 * trail lights up behind boards you have solved, so the map reads as a route
 * walked rather than a list ticked off.
 *
 * Node positions are a pure function of index and width, so the map is stable
 * across every re-render.
 */
function renderMap(host: HTMLElement, width: number, onPick: (level: Level) => void) {
  const cx = width / 2;
  const amp = Math.max(72, cx - 74);

  // Lay the trail out top-down because that is the easy direction to think in,
  // then mirror every y at the end so the journey climbs.
  const points: { x: number; y: number }[] = [];
  const banners: { chapter: Chapter; y: number }[] = [];
  // y is measured from the *end* of the journey, since it is mirrored below;
  // this leading gap becomes the breathing room under the very first board.
  let y = 46;
  let t = 0.9;
  let index = 0;
  for (const chapter of levels.chapters) {
    banners.push({ chapter, y });
    y += 126;
    for (const _level of chapter.levels) {
      const jitter = Math.sin((index + 1) * 12.9898) * 13;
      points.push({ x: cx + amp * Math.sin(t) + jitter, y });
      y += 92 + ((index * 53) % 3) * 10;
      t += 0.82;
      index++;
    }
    y += 18;
  }
  const totalH = y + 22;
  const flip = (v: number) => totalH - v;
  for (const p of points) p.y = flip(p.y);

  host.style.height = `${totalH}px`;
  host.innerHTML = `
    <div class="mapRegions"></div>
    <svg class="mapPath" viewBox="0 0 ${width} ${totalH}" width="${width}" height="${totalH}"></svg>
    <div class="mapBanners"></div>
    <div class="mapNodes"></div>`;

  // ---- region tints, each with its chapter mark as a watermark ----
  const regions = host.querySelector<HTMLElement>(".mapRegions")!;
  banners.forEach((slot, i) => {
    const top = slot.y - 58;
    const end = i + 1 < banners.length ? banners[i + 1].y - 58 : totalH;
    const div = h(`<div class="mapRegion region-${i % 5}" style="top:${flip(end)}px;height:${end - top}px">
      ${icon(slot.chapter.icon, "icon regionMark")}
    </div>`);
    regions.appendChild(div);
  });

  // ---- the trail, drawn as smooth segments and lit behind cleared boards ----
  const svg = host.querySelector<SVGElement>(".mapPath")!;
  const segments: string[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    const lit = isCleared(allLevels[i].id);
    segments.push(`<path class="trail${lit ? " lit" : ""}" d="M ${p1.x} ${p1.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}"/>`);
  }
  svg.innerHTML = segments.join("");

  // ---- chapter banners, sitting between regions like gates ----
  const bannerHost = host.querySelector<HTMLElement>(".mapBanners")!;
  for (const slot of banners) {
    const total = slot.chapter.levels.length;
    const done = slot.chapter.levels.filter((l) => isCleared(l.id)).length;
    const open = unlocked(slot.chapter.levels[0]);
    const cleared = done === total;
    bannerHost.appendChild(h(`
      <div class="mapBanner${open ? "" : " locked"}${cleared ? " cleared" : ""}" style="top:${flip(slot.y + 26)}px">
        ${icon(slot.chapter.icon, "icon mbIcon")}
        <span class="mbText">
          <span class="mbName">${slot.chapter.name}</span>
          <span class="mbSub">${cleared ? "Region solved" : open ? `${done}/${total} — ${slot.chapter.blurb}` : "Keep climbing to reach it"}</span>
        </span>
        ${open ? "" : icon("i-lock", "icon mbLock")}
      </div>`));
  }

  // ---- the nodes themselves ----
  const nodeHost = host.querySelector<HTMLElement>(".mapNodes")!;
  const frontier = allLevels.findIndex((l) => !isCleared(l.id));
  allLevels.forEach((level, i) => {
    const p = points[i];
    const open = unlocked(level);
    const result = resultFor(level.id);
    const numberInChapter = chapterOf(level).levels.indexOf(level) + 1;
    const state = result ? "done" : i === frontier ? "next" : open ? "open" : "locked";
    const node = h<HTMLButtonElement>(`
      <button class="mapNode ${state}" data-id="${level.id}" style="left:${p.x}px;top:${p.y}px">
        ${open || result
          ? `<span class="mnNum">${numberInChapter}</span>
             <span class="mnStars">${result ? starRow(result.rating) : starRow(0, level.stars)}</span>`
          : icon("i-lock")}
        ${i === frontier ? `<span class="mnLabel">${level.w}×${level.h}</span>` : ""}
      </button>`);
    if (open) node.addEventListener("click", () => { sfx.tap(); onPick(level); });
    else node.disabled = true;
    nodeHost.appendChild(node);
  });
}

export function showLevelSelect(scrollTo?: string) {
  const screen = h(`
    <section class="screen select">
      <header class="bar">
        <button class="iconBtn" data-back>${icon("i-back")}</button>
        <div class="barTitle"><h2>Your journey</h2><p>${clearedCount()} / ${allLevels.length} solved</p></div>
        <button class="iconBtn" data-gear>${icon("i-gear")}</button>
      </header>
      <div class="scroll">
        <div class="dailySlot"></div>
        <div class="mapWrap"></div>
      </div>
    </section>`);

  const scroll = screen.querySelector<HTMLDivElement>(".scroll")!;
  const mapWrap = screen.querySelector<HTMLDivElement>(".mapWrap")!;
  if (dailyUnlocked()) screen.querySelector(".dailySlot")!.appendChild(dailyCard());

  screen.querySelector("[data-back]")?.addEventListener("click", () => { sfx.tap(); showTitle(); });
  screen.querySelector("[data-gear]")?.addEventListener("click", () => { sfx.tap(); showSettings(() => showLevelSelect()); });

  const draw = () => renderMap(mapWrap, mapWrap.clientWidth || 340, (level) => startLevel(level));
  const onResize = () => {
    // Keep the player's place in the trail across a rotate or window resize.
    const fromBottom = scroll.scrollHeight - scroll.scrollTop;
    draw();
    scroll.scrollTop = Math.max(0, scroll.scrollHeight - fromBottom);
  };

  // The map needs a measured width, so it is drawn once the screen is attached.
  show(screen, () => window.removeEventListener("resize", onResize));
  window.addEventListener("resize", onResize);
  draw();

  // Land on the board the player is up to, not at the far end of the trail.
  const target = mapWrap.querySelector<HTMLElement>(
    scrollTo ? `[data-id="${scrollTo}"]` : ".mapNode.next"
  ) ?? mapWrap.querySelector<HTMLElement>(".mapNode.locked");
  if (target) {
    scroll.scrollTop = Math.max(0, target.offsetTop + mapWrap.offsetTop - scroll.clientHeight * 0.55);
  } else {
    scroll.scrollTop = scroll.scrollHeight;
  }
}

/* -------------------------------------------------------------------- game */

interface PlayHandle {
  game: Game;
  board: BoardView;
  /** Straight from the solution — for exercising the win flow, not for play. */
  fillAll(leaveBlank?: number): void;
  tap(index: number, mode: Tool): void;
}
let currentPlay: PlayHandle | null = null;

export function startLevel(level: Level) {
  const game = new Game(level);
  game.reset();
  // The Daily is not part of any chapter, so it carries its own title and its
  // own way back out.
  const isDaily = level.daily === true;
  const dayKey = isDaily ? todayKey() : "";
  const chapter = isDaily ? null : chapterOf(level);
  const title = isDaily
    ? "Daily Challenge"
    : `${chapter!.name} ${chapter!.levels.indexOf(level) + 1}`;
  const leave = () => (isDaily ? showTitle() : showLevelSelect(level.id));

  let color = 0;
  let tool: Tool = "fill";
  let finished = false;

  const screen = h(`
    <section class="screen play${isDaily ? " dailyPlay" : ""}">
      <header class="bar">
        <button class="iconBtn" data-back>${icon("i-back")}</button>
        <div class="barTitle">
          <h2>${title}</h2>
          <p class="hearts"></p>
        </div>
        <button class="iconBtn" data-gear>${icon("i-gear")}</button>
      </header>
      <div class="boardWrap"></div>
      <div class="toolbar">
        <div class="swatches">
          ${[0, 1, 2].map((c) => `
            <button class="swatch c${c}" data-color="${c}">
              <span class="swatchInner">${SWATCH_X}</span>
              <span class="swatchLabel">${COLOR_NAMES[c]}</span>
            </button>`).join("")}
        </div>
        <div class="tools">
          <button class="toolBtn" data-hint>${icon("i-bulb")}<span>Hint</span></button>
          <div class="segment">
            <button class="seg on" data-tool="fill">${icon("i-brush")}<span>Paint</span></button>
            <button class="seg" data-tool="mark">${icon("i-x-tool")}<span>Cross</span></button>
          </div>
          <button class="toolBtn" data-undo>${icon("i-undo")}<span>Undo</span></button>
        </div>
      </div>
    </section>`);

  const heartsEl = screen.querySelector<HTMLElement>(".hearts")!;
  const boardWrap = screen.querySelector<HTMLDivElement>(".boardWrap")!;
  const undoBtn = screen.querySelector<HTMLButtonElement>("[data-undo]")!;

  const drawHearts = () => {
    if (game.gentle) {
      heartsEl.textContent = "practice board — no hearts";
      heartsEl.classList.add("practice");
      return;
    }
    heartsEl.innerHTML = Array.from({ length: game.maxHearts }, (_, i) =>
      icon("i-heart", `icon heart${i < game.hearts ? " on" : " gone"}`)).join("");
  };

  const syncTools = () => {
    screen.querySelectorAll<HTMLElement>(".swatch").forEach((el) =>
      el.classList.toggle("on", Number(el.dataset.color) === color));
    screen.querySelectorAll<HTMLElement>(".seg").forEach((el) =>
      el.classList.toggle("on", el.dataset.tool === tool));
    screen.classList.toggle("marking", tool === "mark");
    undoBtn.disabled = !game.canUndo;
  };

  /* ----------------------------------------------------------- FTUE ------
   * Minimal, action-first tutorial. No floating text panels. Each step:
   *   - Shows animated gesture cues directly on target cells.
   *   - Shows a 3-word pill at the very top of the boardWrap.
   *   - Disables everything irrelevant until the action is done.
   *   - Disappears the moment the player does the right thing.
   */

  const steps: TeachStep[] = level.teach ?? [];
  let stepIndex = 0;
  let lastChord: number | null = null;
  let sawFocus = false;
  let ftueTimer = 0;

  const step = (): TeachStep | undefined => steps[stepIndex];

  // The one tiny pill label — replaces the whole coach banner.
  const ftuePill = document.createElement("div");
  ftuePill.className = "ftue-pill hidden";
  boardWrap.appendChild(ftuePill);

  function renderFtue() {
    const s = step();
    board.clearCellHints();
    board.spotlight(s?.spot ?? []);

    if (!s) {
      ftuePill.classList.add("hidden");
      ftuePill.textContent = "";
      applyFtueLock(s);
      return;
    }

    // Pill: just the key phrase, max ~4 words
    ftuePill.innerHTML = s.say;
    ftuePill.classList.remove("hidden");

    // In-cell cues on each spotlighted cell
    if (s.spot) {
      const needChord = s.need && "chord" in s.need;
      for (const i of s.spot) {
        // Only put cue on given cells (numbered) for chord, blank cells for tap/paint
        const isGiven = game.cells[i]?.given;
        if (needChord && isGiven) board.setCellHint(i, "doubletap");
        else if (!isGiven) board.setCellHint(i, "tap");
      }
    }

    applyFtueLock(s);

    // Auto-advance read-only steps after a pause
    if (!s.need) {
      clearTimeout(ftueTimer);
      ftueTimer = window.setTimeout(() => { stepIndex++; renderFtue(); }, 1400);
    }
  }

  function applyFtueLock(s: TeachStep | undefined) {
    screen.classList.toggle("ftue-locked", !!s);
    screen.querySelectorAll<HTMLButtonElement>(".swatch").forEach((el) => {
      el.disabled = !!s && s.color !== undefined && Number(el.dataset.color) !== s.color;
    });
    screen.querySelectorAll<HTMLButtonElement>(".seg").forEach((el) => {
      el.disabled = !!s && s.tool !== undefined && el.dataset.tool !== s.tool;
    });
    const hintBtn = screen.querySelector<HTMLButtonElement>("[data-hint]");
    if (hintBtn) hintBtn.disabled = !!s;
  }

  function needMet(need: TeachNeed): boolean {
    if ("paint"  in need) return need.paint.every((i) => game.cells[i].fill !== EMPTY);
    if ("chord"  in need) return lastChord === need.chord;
    if ("tool"   in need) return tool === need.tool;
    if ("filled" in need) return game.filledCount >= need.filled;
    if ("focus"  in need) return sawFocus;
    return game.solved;
  }

  function checkFtue() {
    if (!steps.length) return;
    let moved = false;
    let s = step();
    while (s && s.need && needMet(s.need)) { stepIndex++; moved = true; s = step(); }
    if (moved) renderFtue();
  }

  function nudgeCoach(message: string) {
    // Wrong tap on a practice board: briefly flash the pill.
    if (ftuePill.classList.contains("hidden")) return;
    const original = ftuePill.innerHTML;
    ftuePill.innerHTML = message;
    ftuePill.classList.add("oops");
    clearTimeout(ftueTimer);
    ftueTimer = window.setTimeout(() => {
      ftuePill.classList.remove("oops");
      ftuePill.innerHTML = original;
    }, 1800);
  }

  const board = new BoardView(game, {
    onTap: (i, alt) => act(i, alt ? (tool === "fill" ? "mark" : "fill") : tool),
    onChord: (i) => {
      const touched = game.chord(i);
      if (!touched) { lastChord = i; checkFtue(); return; }
      lastChord = i;
      board.refresh(touched);
      board.pop(touched);
      sfx.chord();
      after();
    },
    onFocus: (i) => {
      if (i !== null && game.clueAt(i) !== null) { sawFocus = true; checkFtue(); }
    },
  });
  boardWrap.appendChild(board.el);

  function act(i: number, mode: Tool) {
    if (finished) return;
    const outcome = mode === "fill" ? game.paint(i, color) : game.mark(i, color);
    switch (outcome.kind) {
      case "paint":
        board.refresh(outcome.cells);
        board.pop(outcome.cells);
        sfx.paint(color);
        break;
      case "mark":
        board.refresh(outcome.cells);
        sfx.mark();
        break;
      case "mistake":
        board.shake(outcome.cell);
        sfx.mistake();
        if (game.gentle) {
          nudgeCoach("Not that color. Read the numbers around it once more.");
        } else {
          drawHearts();
          heartsEl.classList.add("hurt");
          setTimeout(() => heartsEl.classList.remove("hurt"), 400);
        }
        break;
      case "locked":
        board.shake(outcome.cell);
        break;
    }
    after();
  }

  function after() {
    syncTools();
    checkFtue();
    if (game.dead) return finish(false);
    if (game.solved) return finish(true);
  }

  function finish(won: boolean) {
    if (finished) return;
    finished = true;
    const seconds = Math.round((performance.now() - game.startedAt) / 1000);
    if (won) {
      board.celebrate();
      sfx.win();
      if (isDaily) {
        const clean = game.mistakes === 0 && game.hints === 0;
        recordDaily(dayKey, { seconds, mistakes: game.mistakes, hints: game.hints, clean });
        setTimeout(() => showDailyWin(seconds, game.mistakes, game.hints, clean), 900);
      } else {
        const rating = ratingFor(game.mistakes, game.hints);
        recordWin(level.id, { rating, mistakes: game.mistakes, hints: game.hints });
        setTimeout(() => showWin(level, rating, seconds, game.mistakes, game.hints), 900);
      }
    } else {
      sfx.fail();
      setTimeout(() => showFail(level), 500);
    }
  }

  screen.querySelector("[data-back]")?.addEventListener("click", () => { sfx.tap(); leave(); });
  screen.querySelector("[data-gear]")?.addEventListener("click", () => { sfx.tap(); showSettings(() => showLevelSelect()); });

  screen.querySelectorAll<HTMLElement>(".swatch").forEach((el) =>
    el.addEventListener("click", () => { color = Number(el.dataset.color); sfx.tap(); syncTools(); checkFtue(); }));
  screen.querySelectorAll<HTMLElement>(".seg").forEach((el) =>
    el.addEventListener("click", () => { tool = el.dataset.tool as Tool; sfx.tap(); syncTools(); checkFtue(); }));
  // coachNext removed — steps advance automatically when their need is met.

  undoBtn.addEventListener("click", () => {
    const touched = game.undo();
    if (!touched.length) return;
    board.refresh(touched);
    sfx.undo();
    syncTools();
  });

  screen.querySelector("[data-hint]")?.addEventListener("click", () => {
    if (finished) return;
    const suggestion = game.hint();
    if (!suggestion) return;
    game.applyHint(suggestion);
    board.refresh([suggestion.cell]);
    board.glow(suggestion.cell);
    sfx.hint();
    after();
  });

  const keys = (ev: KeyboardEvent) => {
    if (document.querySelector(".scrim")) return;
    if (ev.key >= "1" && ev.key <= "3") { color = Number(ev.key) - 1; syncTools(); }
    else if (ev.key === "x" || ev.key === "X" || ev.key === " ") {
      ev.preventDefault();
      tool = tool === "fill" ? "mark" : "fill";
      syncTools();
    } else if (ev.key === "z" || ev.key === "Z") undoBtn.click();
    else if (ev.key === "Escape") leave();
  };
  window.addEventListener("keydown", keys);

  const onResize = () => board.resize();
  window.addEventListener("resize", onResize);
  const observer = new ResizeObserver(() => board.resize());
  observer.observe(boardWrap);

  const handle: PlayHandle = {
    game,
    board,
    fillAll(leaveBlank = 0) {
      const blanks: number[] = [];
      for (let i = 0; i < game.size; i++) if (game.cells[i].fill === EMPTY) blanks.push(i);
      for (const i of blanks.slice(0, Math.max(0, blanks.length - leaveBlank))) {
        game.cells[i].fill = game.solutionAt(i);
        game.cells[i].cross = 0;
      }
      board.refresh();
      after();
    },
    tap: (i, mode) => act(i, mode),
  };

  // Note the ordering: show() runs the *previous* screen's cleanup, so this
  // level's handle is published only once that has happened.
  show(screen, () => {
    window.removeEventListener("keydown", keys);
    window.removeEventListener("resize", onResize);
    observer.disconnect();
    clearTimeout(ftueTimer);
    board.clearCellHints();
    if (currentPlay === handle) currentPlay = null;
  });
  currentPlay = handle;
  drawHearts();
  board.refresh();
  renderFtue();
  board.resize();
  game.startedAt = performance.now();
}

function nextLevel(level: Level) {
  return allLevels[level.index + 1];
}

function showWin(level: Level, rating: number, seconds: number, mistakes: number, hints: number) {
  const next = nextLevel(level);
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const { wrap, close } = modal(`
    <div class="starsBig">${starRow(rating)}</div>
    <h2>${level.gentle ? "Nicely done" : "Board solved"}</h2>
    ${level.outro ? `<p class="outro">${level.outro}</p>` : ""}
    <p class="statLine"><b>${time}</b> · ${mistakes} slip${mistakes === 1 ? "" : "s"} · ${hints} hint${hints === 1 ? "" : "s"}</p>
    <div class="stack">
      ${next ? `<button class="btn primary" data-next>${icon("i-next")}<span>Next board</span></button>` : `<p class="fine">That was the last board. Beautifully done.</p>`}
      <button class="btn" data-again>${icon("i-reset")}<span>Play again</span></button>
      <button class="btn ghost" data-levels>All boards</button>
    </div>`, { dismissable: false });

  wrap.querySelector("[data-next]")?.addEventListener("click", () => { close(); if (next) startLevel(next); });
  wrap.querySelector("[data-again]")?.addEventListener("click", () => { close(); startLevel(level); });
  wrap.querySelector("[data-levels]")?.addEventListener("click", () => { close(); showLevelSelect(level.id); });
}

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

function showDailyWin(seconds: number, mistakes: number, hints: number, clean: boolean) {
  const streak = dailyStreak();
  const wait = untilTomorrow();
  const hours = Math.floor(wait / 3600);
  const minutes = Math.round((wait % 3600) / 60);

  const { wrap, close } = modal(`
    <div class="dailyCrest ${clean ? "clean" : ""}">${icon(clean ? "i-flame" : "i-check", "icon")}</div>
    <h2>${clean ? "Flawless" : "Daily solved"}</h2>
    <p class="outro">${clean
      ? "No wrong colors, no hints. That board did not need to go down that easily."
      : "That is the hardest board this game builds — it needs a step no chapter level does."}</p>
    <p class="statLine"><b>${clock(seconds)}</b> · ${mistakes} slip${mistakes === 1 ? "" : "s"} · ${hints} hint${hints === 1 ? "" : "s"}</p>
    ${streak > 1 ? `<p class="streakLine">${icon("i-flame", "icon")} ${streak} days running</p>` : ""}
    <div class="stack">
      <button class="btn primary" data-home>Back to the start</button>
      <button class="btn ghost" data-levels>All boards</button>
    </div>
    <p class="fine">Next challenge in ${hours}h ${minutes}m</p>`, { dismissable: false });

  wrap.querySelector("[data-home]")?.addEventListener("click", () => { close(); showTitle(); });
  wrap.querySelector("[data-levels]")?.addEventListener("click", () => { close(); showLevelSelect(); });
}

function showFail(level: Level) {
  const hearts = heartsFor(level);
  const isDaily = level.daily === true;
  const { wrap, close } = modal(`
    <div class="heartsBig">${Array.from({ length: hearts }, () => icon("i-heart", "icon heart gone")).join("")}</div>
    <h2>Out of hearts</h2>
    <p class="statLine">${isDaily
      ? "The daily board resets, not the day. Take another run at it."
      : "The board is still there. Take another run at it."}</p>
    <div class="stack">
      <button class="btn primary" data-again>${icon("i-reset")}<span>Try again</span></button>
      <button class="btn ghost" data-levels>${isDaily ? "Back to the start" : "All boards"}</button>
    </div>`, { dismissable: false });

  wrap.querySelector("[data-again]")?.addEventListener("click", () => { close(); startLevel(level); });
  wrap.querySelector("[data-levels]")?.addEventListener("click", () => {
    close();
    if (isDaily) showTitle(); else showLevelSelect(level.id);
  });
}

/** Dev handle: window.__clues.jump("weave-3"), .play().fillAll(1) */
export function devHandle() {
  return {
    levels: allLevels,
    jump: (id: string) => {
      const level = allLevels.find((l) => l.id === id);
      if (level) startLevel(level);
      return level;
    },
    play: () => currentPlay,
    /** .daily() opens today's; .daily("2026-08-04") opens that day's. */
    daily: (key?: string) => {
      const level = dailyFor(key ?? todayKey());
      startLevel(level);
      return level;
    },
    dailyStreak,
  };
}
