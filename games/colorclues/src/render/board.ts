import { EMPTY, type Game } from "../game/state";
import { has } from "../game/puzzle.mjs";

export interface BoardHandlers {
  onTap(index: number, alt: boolean): void;
  onChord(index: number): void;
  onFocus(index: number | null): void;
}

const CROSS = `<svg class="icon" viewBox="0 0 24 24"><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg>`;

/** The grid of cells, as DOM. Small boards, so plain elements beat a canvas. */
export class BoardView {
  readonly el: HTMLDivElement;
  private cells: HTMLButtonElement[] = [];
  private game: Game;
  private focused: number | null = null;
  private lastTap = { index: -1, at: 0 };

  constructor(game: Game, handlers: BoardHandlers) {
    this.game = game;
    const { w, h } = game.level;

    this.el = document.createElement("div");
    this.el.className = "board";
    this.el.style.setProperty("--w", String(w));
    this.el.style.setProperty("--h", String(h));

    for (let i = 0; i < game.size; i++) {
      const btn = document.createElement("button");
      btn.className = "cell";
      btn.type = "button";
      btn.dataset.i = String(i);
      btn.innerHTML = `<span class="num"></span><span class="marks"></span>`;
      this.cells.push(btn);
      this.el.appendChild(btn);
    }

    this.el.addEventListener("click", (ev) => {
      const index = this.indexFrom(ev.target as HTMLElement);
      if (index === null) return;
      const now = performance.now();
      const isDouble = this.lastTap.index === index && now - this.lastTap.at < 340;
      this.lastTap = { index, at: now };

      if (this.game.cells[index].given) {
        // Givens never take paint: a tap studies them, a double tap chords.
        if (isDouble && this.game.clueAt(index) !== null) handlers.onChord(index);
        else this.setFocus(index, handlers);
        return;
      }
      this.setFocus(null, handlers);
      handlers.onTap(index, ev.metaKey || ev.ctrlKey);
    });

    this.el.addEventListener("contextmenu", (ev) => {
      const index = this.indexFrom(ev.target as HTMLElement);
      if (index === null) return;
      ev.preventDefault();
      if (!this.game.cells[index].given) handlers.onTap(index, true);
    });

    this.el.addEventListener("pointerover", (ev) => {
      const index = this.indexFrom(ev.target as HTMLElement);
      if (index === null || !this.game.cells[index].given) return;
      if (this.game.clueAt(index) === null) return;
      if (window.matchMedia("(hover: hover)").matches) this.setFocus(index, handlers);
    });
    this.el.addEventListener("pointerleave", () => {
      if (window.matchMedia("(hover: hover)").matches) this.setFocus(null, null);
    });
  }

  private indexFrom(target: HTMLElement): number | null {
    const cell = target.closest<HTMLElement>(".cell");
    return cell?.dataset.i ? Number(cell.dataset.i) : null;
  }

  setFocus(index: number | null, handlers: BoardHandlers | null) {
    if (this.focused === index) return;
    this.focused = index;
    for (const el of this.cells) el.classList.remove("neighbour", "focus");
    if (index !== null) {
      this.cells[index].classList.add("focus");
      for (const q of this.game.neighbors(index)) this.cells[q].classList.add("neighbour");
    }
    handlers?.onFocus(index);
  }

  refresh(indexes?: number[]) {
    if (!indexes) {
      for (let i = 0; i < this.cells.length; i++) this.paintCell(i);
      return;
    }
    // Painting a cell can settle a clue next to it, so redraw those numbers too.
    const list = new Set(indexes);
    for (const i of indexes) for (const q of this.game.neighbors(i)) list.add(q);
    for (const i of list) this.paintCell(i);
  }

  /** Ring a set of cells for the tutorial coach. */
  spotlight(indexes: number[]) {
    for (const el of this.cells) el.classList.remove("spot");
    for (const i of indexes) this.cells[i]?.classList.add("spot");
  }

  private paintCell(i: number) {
    const cell = this.game.cells[i];
    const el = this.cells[i];
    const clue = this.game.clueAt(i);

    // Rebuild the state classes, but leave the overlay ones (spotlight, focus,
    // neighbour ring, running animations) exactly where they were.
    el.classList.remove("blank", "filled", "given", "hinted", "satisfied", "c0", "c1", "c2");
    if (cell.given) el.classList.add("given");
    if (cell.hinted) el.classList.add("hinted");
    if (cell.fill === EMPTY) {
      el.classList.add("blank");
    } else {
      el.classList.add("filled", `c${cell.fill}`);
    }
    if (clue !== null && this.game.clueSatisfied(i)) el.classList.add("satisfied");

    const num = el.firstElementChild as HTMLElement;
    num.textContent = clue !== null ? String(clue) : "";

    const marks = el.lastElementChild as HTMLElement;
    if (cell.fill === EMPTY && cell.cross) {
      let html = "";
      for (let c = 0; c < 3; c++) if (has(cell.cross, c)) html += `<i class="mark c${c}">${CROSS}</i>`;
      marks.innerHTML = html;
    } else if (marks.childElementCount) {
      marks.innerHTML = "";
    }
  }

  /** Add or remove an in-cell gesture cue. kind: 'tap' | 'doubletap' | 'none' */
  setCellHint(i: number, kind: "tap" | "doubletap" | "none") {
    const el = this.cells[i];
    el.querySelector(".ftue-hint")?.remove();
    if (kind === "none") return;
    const hint = document.createElement("span");
    hint.className = `ftue-hint ftue-${kind}`;
    hint.setAttribute("aria-hidden", "true");
    if (kind === "tap") {
      hint.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12V6a2 2 0 1 1 4 0v6"/><path d="M13 8a2 2 0 1 1 4 0v4"/><path d="M17 10a2 2 0 1 1 4 0v4a7 7 0 0 1-14 0v-4"/></svg>`;
    } else {
      hint.innerHTML = `<span class="ftue-dbl">×2</span>`;
    }
    el.appendChild(hint);
  }

  clearCellHints() {
    for (const el of this.cells) el.querySelector(".ftue-hint")?.remove();
  }

  /** Short animations, driven by class + animationend so they can restack. */
  private pulse(i: number, className: string) {
    const el = this.cells[i];
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
    el.addEventListener("animationend", () => el.classList.remove(className), { once: true });
  }

  pop(indexes: number[]) { for (const i of indexes) this.pulse(i, "pop"); }
  shake(i: number) { this.pulse(i, "wrong"); }
  glow(i: number) { this.pulse(i, "glow"); }

  /** Fit the grid to whatever room the layout gave us. */
  resize() {
    const box = this.el.parentElement;
    if (!box) return;
    const { w, h } = this.game.level;
    const gap = w >= 8 ? 4 : 6;
    const availW = box.clientWidth - 16;
    const availH = box.clientHeight - 16;
    if (availW <= 0 || availH <= 0) return;
    const size = Math.floor(Math.min((availW - gap * (w - 1)) / w, (availH - gap * (h - 1)) / h));
    // Floor keeps tiny screens tappable; ceiling stops a desktop board from
    // sprawling into something you have to move your head to read.
    this.el.style.setProperty("--cell", `${Math.min(72, Math.max(22, size))}px`);
    this.el.style.setProperty("--gap", `${gap}px`);
  }

  celebrate() {
    const order = this.cells.map((_, i) => i);
    order.forEach((i) => {
      const { w } = this.game.level;
      const delay = ((i % w) + Math.floor(i / w)) * 45;
      setTimeout(() => this.pulse(i, "cheer"), delay);
    });
  }
}
