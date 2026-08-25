import type { PuzzleSession } from '../game/session';
import { toRC } from '../core/grid';

export interface BoardCallbacks {
  onCellActivate: (cell: number) => void;
}

/**
 * Renders the N x N board as a CSS grid of cell buttons, plus a keyboard
 * cursor that's independent of the "next value" anchor (so arrow keys can
 * browse the board before committing an Enter/Space placement). Distance
 * clues are conveyed both by color AND a pip-count glyph (••• etc.) so the
 * information isn't color-only — important for colorblind accessibility.
 */
export class BoardRenderer {
  private cellEls: HTMLButtonElement[] = [];
  private size = 0;
  private keyboardCursor = 0;

  constructor(
    private boardEl: HTMLElement,
    private connectorHost: SVGSVGElement,
    private callbacks: BoardCallbacks,
  ) {}

  /** Rebuilds the grid DOM for a new puzzle (called once per new session). */
  attach(session: PuzzleSession): void {
    this.size = session.puzzle.size;
    this.boardEl.innerHTML = '';
    this.boardEl.style.setProperty('--board-size', String(this.size));
    this.cellEls = [];
    this.keyboardCursor = session.currentAnchorCell() ?? 0;

    for (let i = 0; i < session.puzzle.maxValue; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'll-cell';
      const { r, c } = toRC(i, this.size);
      btn.style.gridRowStart = String(r + 1);
      btn.style.gridColumnStart = String(c + 1);
      btn.setAttribute('data-cell', String(i));
      btn.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}`);
      btn.addEventListener('click', () => this.callbacks.onCellActivate(i));
      this.boardEl.appendChild(btn);
      this.cellEls.push(btn);
    }

    this.sync(session);
  }

  /** Full redraw of values, candidate highlighting, cursor and connectors from current session state. */
  sync(session: PuzzleSession): void {
    if (this.cellEls.length === 0) return;
    const candidates = new Set(session.candidateCells());
    const anchor = session.currentAnchorCell();
    const isOver = session.isComplete();

    for (let i = 0; i < this.cellEls.length; i++) {
      const el = this.cellEls[i];
      const value = session.valueAt(i);
      const isGiven = session.isGivenCell(i);
      const isCandidate = candidates.has(i);
      const distance = isCandidate ? session.distanceToCandidate(i) : null;

      el.textContent = value !== null ? String(value) : '';
      el.classList.toggle('ll-cell--given', isGiven && value !== null);
      el.classList.toggle('ll-cell--filled', value !== null && !isGiven);
      el.classList.toggle('ll-cell--anchor', i === anchor && !isOver);
      el.classList.toggle('ll-cell--candidate', isCandidate && !isOver);
      el.classList.toggle('ll-cell--cursor', i === this.keyboardCursor && !isOver);
      el.classList.remove('ll-dist-1', 'll-dist-2', 'll-dist-3');
      if (distance) el.classList.add(`ll-dist-${distance}`);
      el.disabled = value !== null || isOver;
      el.setAttribute('aria-pressed', String(value !== null));

      // Pip glyph communicates distance without relying on color alone.
      const existingPip = el.querySelector('.ll-pip');
      if (existingPip) existingPip.remove();
      if (isCandidate && distance) {
        const pip = document.createElement('span');
        pip.className = 'll-pip';
        pip.setAttribute('aria-hidden', 'true');
        pip.textContent = '•'.repeat(distance);
        el.appendChild(pip);
      }
    }

    this.drawConnectors(session);
  }

  /** Draws the solved-so-far path as connecting lines between placed values, colored by step distance. */
  private drawConnectors(session: PuzzleSession): void {
    this.connectorHost.innerHTML = '';
    this.connectorHost.setAttribute('viewBox', `0 0 ${this.size} ${this.size}`);

    const cellCenter = (cell: number): { x: number; y: number } => {
      const { r, c } = toRC(cell, this.size);
      return { x: c + 0.5, y: r + 0.5 };
    };

    let prevCell: number | null = null;
    for (let v = 1; v <= session.puzzle.maxValue; v++) {
      const cell = session.cellForValue(v);
      if (cell === null) break;
      if (prevCell !== null) {
        const a = cellCenter(prevCell);
        const b = cellCenter(cell);
        const dist = Math.abs(toRC(prevCell, this.size).r - toRC(cell, this.size).r) +
          Math.abs(toRC(prevCell, this.size).c - toRC(cell, this.size).c);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(a.x));
        line.setAttribute('y1', String(a.y));
        line.setAttribute('x2', String(b.x));
        line.setAttribute('y2', String(b.y));
        line.setAttribute('class', `ll-connector ll-connector-dist-${Math.min(3, Math.max(1, dist))}`);
        line.setAttribute('vector-effect', 'non-scaling-stroke');
        this.connectorHost.appendChild(line);
      }
      prevCell = cell;
    }
  }

  /** Momentary flash on a cell that just failed a placement attempt (mistake or invalid shape). */
  flashInvalid(cell: number): void {
    const el = this.cellEls[cell];
    if (!el) return;
    el.classList.remove('ll-cell--shake');
    void el.offsetWidth;
    el.classList.add('ll-cell--shake');
  }

  /** Brief pulse on a cell that was just correctly placed. */
  flashPlaced(cell: number): void {
    const el = this.cellEls[cell];
    if (!el) return;
    el.classList.remove('ll-cell--pop');
    void el.offsetWidth;
    el.classList.add('ll-cell--pop');
  }

  /** Highlights every cell of the finished path once the puzzle is solved. */
  celebrate(): void {
    for (const el of this.cellEls) el.classList.add('ll-cell--solved');
  }

  /** Temporary highlight for a hinted cell (tier-3 hints reveal an exact cell). */
  showHintCell(cell: number): void {
    const el = this.cellEls[cell];
    if (!el) return;
    el.classList.remove('ll-cell--hint');
    void el.offsetWidth;
    el.classList.add('ll-cell--hint');
  }

  // ---------------------------------------------------------------- keyboard cursor

  getCursor(): number {
    return this.keyboardCursor;
  }

  setCursor(cell: number, session: PuzzleSession): void {
    this.keyboardCursor = cell;
    this.sync(session);
    this.cellEls[cell]?.focus({ preventScroll: true });
  }

  /** Moves the keyboard cursor by one grid step in a direction, clamped to the board. */
  moveCursor(dr: number, dc: number, session: PuzzleSession): void {
    const { r, c } = toRC(this.keyboardCursor, this.size);
    const nr = Math.min(this.size - 1, Math.max(0, r + dr));
    const nc = Math.min(this.size - 1, Math.max(0, c + dc));
    this.setCursor(nr * this.size + nc, session);
  }
}
