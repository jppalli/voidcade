import type { Game } from '../game/state';
import type { WinInfo } from '../game/types';

/**
 * Renders the 3x3 grid plus its row/column header labels, and manages the
 * "selected cell" highlight. Cells hold no text input themselves — typing
 * happens in a shared answer bar in the game screen (see ui/screens.ts /
 * main.ts) so mobile keyboards don't fight with 9 tiny inline inputs.
 */
export class BoardRenderer {
  private cellEls: HTMLButtonElement[] = [];
  private colHeaderEls: HTMLElement[] = [];
  private rowHeaderEls: HTMLElement[] = [];
  private selected: number | null = null;

  constructor(
    private boardEl: HTMLElement,
    private colHeaderHost: HTMLElement,
    private rowHeaderHost: HTMLElement,
    private onCellClick: (index: number) => void,
  ) {}

  /** Builds the DOM for a fresh grid (called once per new round). */
  attach(game: Game): void {
    this.boardEl.innerHTML = '';
    this.colHeaderHost.innerHTML = '';
    this.rowHeaderHost.innerHTML = '';
    this.cellEls = [];
    this.colHeaderEls = [];
    this.rowHeaderEls = [];
    this.selected = null;

    for (const label of game.grid.cols) {
      const el = document.createElement('div');
      el.className = 'colHeader';
      el.textContent = label;
      this.colHeaderHost.appendChild(el);
      this.colHeaderEls.push(el);
    }
    for (const label of game.grid.rows) {
      const el = document.createElement('div');
      el.className = 'rowHeader';
      el.textContent = label;
      this.rowHeaderHost.appendChild(el);
      this.rowHeaderEls.push(el);
    }

    for (let i = 0; i < 9; i++) {
      const btn = document.createElement('button');
      btn.className = 'cell';
      btn.type = 'button';
      btn.setAttribute('aria-label', `Row ${game.rowOf(i) + 1}, column ${game.colOf(i) + 1}`);
      btn.addEventListener('click', () => this.onCellClick(i));
      this.boardEl.appendChild(btn);
      this.cellEls.push(btn);
    }

    this.sync(game);
  }

  /** Redraws marks + selection state from current game state. */
  sync(game: Game): void {
    // attach() builds the cell elements; onBoardChange can fire (via
    // Game.newRound) before attach() runs on the very first render, so
    // guard against syncing into a DOM that isn't built yet.
    if (this.cellEls.length === 0) return;
    game.board.forEach((mark, i) => {
      const el = this.cellEls[i];
      el.textContent = mark ?? '';
      el.classList.toggle('markX', mark === 'X');
      el.classList.toggle('markO', mark === 'O');
      el.classList.toggle('filled', mark !== null);
      el.classList.toggle('selected', this.selected === i);
      el.disabled = mark !== null || game.isOver() || game.isAiTurn();
    });
  }

  select(index: number | null, game: Game): void {
    this.selected = index;
    this.sync(game);
  }

  /** Brief shake feedback on a wrong answer. */
  shake(index: number): void {
    const el = this.cellEls[index];
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }

  /** Highlights the winning line with a glow + strike animation. */
  celebrate(win: WinInfo): void {
    for (const i of win.line) this.cellEls[i].classList.add('winCell');
  }
}
