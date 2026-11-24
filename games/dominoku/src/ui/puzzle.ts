import { canPlace, cellMap, totals, trayTiles } from '../game/board';
import { dateKey } from '../game/daily';
import { cellsOf, nextOrientation } from '../game/dominoes';
import { Game } from '../game/game';
import type { Progress } from '../game/progress';
import { lineStatus } from '../game/rules';
import type { Orientation, Placement, Puzzle, Size } from '../game/types';
import { play } from '../audio/sound';
import { announce } from './chrome';
import { h } from './dom';
import { bindGestures } from './gesture';
import { pieceEl } from './piece';

export interface PuzzleContext {
  date: Date;
  puzzle: Puzzle;
  progress: Progress;
  /** The next puzzle of the day to suggest after solving this one. */
  next: Size | null;
  /** Link prefix for puzzles of this day: "#" for today, "#/d/YYYY-MM-DD" for an archive day. */
  base: string;
  /** Where "All puzzles" goes. */
  homeHref: string;
}

const MARK = { short: '', match: '\u2713', over: '\u25B2' } as const;
const MARK_TEXT = { short: 'short of target', match: 'matches target', over: 'over target' } as const;

/** Mounts the puzzle screen into `root`. Returns a function that removes anything it added elsewhere. */
export function mountPuzzle(root: HTMLElement, ctx: PuzzleContext): () => void {
  const { puzzle, progress } = ctx;
  const n = puzzle.size;
  const day = dateKey(ctx.date);
  const game = new Game(puzzle, progress.get(day, n)?.placed ?? []);

  // Active play time: runs while the puzzle is open, visible and unsolved.
  let elapsed = progress.get(day, n)?.ms ?? 0;
  let runningSince: number | null = null;
  const startClock = () => {
    if (runningSince === null && !game.solved && document.visibilityState === 'visible') runningSince = performance.now();
  };
  const stopClock = () => {
    if (runningSince !== null) {
      elapsed += performance.now() - runningSince;
      runningSince = null;
    }
  };
  const onVisibility = () => (document.hidden ? (stopClock(), persist()) : startClock());
  document.addEventListener('visibilitychange', onVisibility);

  const orient = new Map<string, Orientation>();
  let selected: string | null = null;
  let lastPlaced: string | null = null;
  let rotated: string | null = null;
  let overlay: HTMLElement | null = null;
  let drag: { tile: string; ghost: HTMLElement; cell: number; lift: number } | null = null;

  // ---- static DOM -------------------------------------------------------------------------
  const board = h('div', {
    class: 'board',
    role: 'group',
    tabindex: 0,
    'aria-label': `${n} by ${n} grid. Arrow keys move, Enter places the chosen domino, R turns it, Backspace takes a domino back, 1 to 9 choose from the tray, Z undoes.`,
  });
  const slots: HTMLElement[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const slot = h('div', { class: 'slot', 'data-r': r, 'data-c': c });
      slot.style.gridArea = `${r + 1} / ${c + 1}`;
      slots.push(slot);
      board.append(slot);
    }
  }
  const rowLines: HTMLElement[] = [];
  const colLines: HTMLElement[] = [];
  for (let i = 0; i < n; i++) {
    const row = h('div', { class: 'line row' });
    row.style.gridArea = `${i + 1} / ${n + 1}`;
    const col = h('div', { class: 'line col' });
    col.style.gridArea = `${n + 1} / ${i + 1}`;
    rowLines.push(row);
    colLines.push(col);
    board.append(row, col);
  }

  const tray = h('div', { class: 'tray', 'aria-label': 'Dominoes to place' });
  const status = h('p', { class: 'status', role: 'status' });
  const undoBtn = h('button', { class: 'btn', type: 'button' }, 'Undo');
  const restartBtn = h('button', { class: 'btn', type: 'button' }, 'Restart');
  const actions = h('div', { class: 'actions' }, undoBtn, restartBtn);
  const side = h('div', { class: 'side' }, tray, status, actions);
  const puzzleEl = h('div', { class: 'puzzle' }, h('div', { class: 'stage' }, board, side));
  puzzleEl.style.setProperty('--n', String(n));
  root.append(puzzleEl);

  // ---- helpers ----------------------------------------------------------------------------
  const cellSize = () => slots[0].getBoundingClientRect().width;
  const orientationOf = (tile: string): Orientation => orient.get(tile) ?? 0;

  function cellAt(x: number, y: number): { row: number; col: number } {
    const a = slots[0].getBoundingClientRect();
    const b = slots[1].getBoundingClientRect();
    const step = b.left - a.left;
    return { row: Math.floor((y - a.top) / step), col: Math.floor((x - a.left) / step) };
  }

  function placementFor(tile: string, row: number, col: number): Placement {
    return { tile, row, col, orientation: orientationOf(tile) };
  }

  function clearPreview(): void {
    slots.forEach((s) => s.classList.remove('pv-ok', 'pv-bad'));
  }

  function showPreview(tile: string, row: number, col: number): void {
    clearPreview();
    const t = game.board.tiles.get(tile);
    if (!t) return;
    const p = placementFor(tile, row, col);
    const ok = canPlace(game.board, p);
    for (const c of cellsOf(t, p)) {
      if (c.row >= 0 && c.col >= 0 && c.row < n && c.col < n) slots[c.row * n + c.col].classList.add(ok ? 'pv-ok' : 'pv-bad');
    }
  }

  function flash(tile: string, row: number, col: number): void {
    const t = game.board.tiles.get(tile);
    if (!t) return;
    const hit: HTMLElement[] = [];
    for (const c of cellsOf(t, placementFor(tile, row, col))) {
      if (c.row >= 0 && c.col >= 0 && c.row < n && c.col < n) hit.push(slots[c.row * n + c.col]);
    }
    hit.forEach((s) => s.classList.add('bad'));
    window.setTimeout(() => hit.forEach((s) => s.classList.remove('bad')), 380);
  }

  function persist(): void {
    const prev = progress.get(day, n);
    const ms = Math.round(elapsed + (runningSince !== null ? performance.now() - runningSince : 0));
    const solved = game.solved;
    progress.set(day, n, {
      placed: [...game.board.placed],
      solved,
      solvedOn: solved ? (prev?.solvedOn ?? dateKey(new Date())) : undefined,
      ms,
    });
  }

  const matchCount = (): number => {
    const t = totals(game.board);
    return (
      t.rows.filter((v, i) => v === puzzle.rowTargets[i]).length + t.cols.filter((v, i) => v === puzzle.colTargets[i]).length
    );
  };
  let lastMatches = matchCount();

  // ---- actions ----------------------------------------------------------------------------
  function afterChange(sound: 'place' | 'takeback' | 'undo' | 'restart'): void {
    const cardShown = overlay !== null;
    if (game.solved) stopClock();
    persist();
    render();
    const matches = matchCount();
    if (game.solved && !cardShown) {
      play('place');
      window.setTimeout(() => play('solved'), 170);
      showSolved();
    } else {
      if (sound === 'place') play('place');
      else if (sound === 'takeback') play('takeback');
      else play('undo');
      if (sound === 'place' && matches > lastMatches) window.setTimeout(() => play('match'), 110);
    }
    lastMatches = matches;
  }

  function tryPlace(tile: string, row: number, col: number): boolean {
    const p = placementFor(tile, row, col);
    if (!game.place(p)) {
      flash(tile, row, col);
      play('invalid');
      return false;
    }
    lastPlaced = tile;
    selected = null;
    clearPreview();
    announce(`Placed ${tile.replace('-', ' and ')}`);
    afterChange('place');
    return true;
  }

  function takeBack(tile: string): void {
    const p = game.takeBack(tile);
    if (!p) return;
    orient.set(tile, p.orientation);
    selected = tile;
    lastPlaced = null;
    announce('Domino taken back');
    afterChange('takeback');
  }

  function undo(): void {
    const a = game.undo();
    if (!a) return;
    if (a.type === 'place') {
      orient.set(a.placement.tile, a.placement.orientation);
      selected = null;
    }
    lastPlaced = null;
    clearPreview();
    afterChange('undo');
  }

  function restart(): void {
    if (game.solved) return;
    if (game.board.placed.length > 0 && !window.confirm('Remove all the dominoes you placed?')) return;
    game.restart();
    selected = null;
    lastPlaced = null;
    orient.clear();
    clearPreview();
    afterChange('undo');
  }

  undoBtn.addEventListener('click', undo);
  restartBtn.addEventListener('click', restart);

  // ---- rendering --------------------------------------------------------------------------
  function renderPieces(): void {
    board.querySelectorAll('.piece').forEach((el) => el.remove());
    const draw = (p: Placement, locked: boolean) => {
      const tile = game.board.tiles.get(p.tile);
      if (!tile) return;
      const el = pieceEl(tile, p.orientation, ['placed', locked ? 'locked' : '', p.tile === lastPlaced ? 'pop' : '']);
      el.style.setProperty('--r', String(p.row));
      el.style.setProperty('--c', String(p.col));
      el.setAttribute('aria-label', `${locked ? 'Locked domino' : 'Domino'} ${tile.a} and ${tile.b}`);
      bindGestures(el, {
        onDoubleTap: () => {
          if (locked || game.solved) {
            if (locked) play('invalid');
            el.classList.remove('shake');
            void el.offsetWidth;
            el.classList.add('shake');
          } else takeBack(p.tile);
        },
      });
      board.append(el);
    };
    game.board.locked.forEach((p) => draw(p, true));
    game.board.placed.forEach((p) => draw(p, false));
  }

  function renderTotals(): void {
    const t = totals(game.board);
    const update = (el: HTMLElement, total: number, target: number, label: string) => {
      const s = lineStatus(total, target);
      el.className = `${el.className.split(' ').slice(0, 2).join(' ')} ${s}`;
      el.setAttribute('aria-label', `${label}: target ${target}, total ${total}, ${MARK_TEXT[s]}`);
      el.replaceChildren(
        h('span', { class: 'target' }, String(target)),
        h('span', { class: 'total' }, h('i', { 'aria-hidden': 'true' }, MARK[s]), String(total)),
      );
    };
    rowLines.forEach((el, i) => update(el, t.rows[i], puzzle.rowTargets[i], `Row ${i + 1}`));
    colLines.forEach((el, i) => update(el, t.cols[i], puzzle.colTargets[i], `Column ${i + 1}`));
  }

  function renderTray(refocus?: string): void {
    tray.replaceChildren();
    for (const tile of trayTiles(game.board)) {
      const o = orientationOf(tile.id);
      const slot = h('div', {
        class: `tile-slot${selected === tile.id ? ' sel' : ''}`,
        'data-tile': tile.id,
        role: 'button',
        tabindex: 0,
        'aria-label': `Domino ${tile.a} and ${tile.b}${selected === tile.id ? ', selected' : ''}. Press Enter to rotate.`,
      });
      slot.append(pieceEl(tile, o, rotated === tile.id ? ['turn'] : []));
      bindGestures(slot, {
        onTap: () => rotateTile(tile.id),
        onDragStart: (e) => startDrag(tile.id, slot, e),
        onDragMove: (e) => moveDrag(e),
        onDragEnd: (e, cancelled) => endDrag(e, cancelled, slot),
      });
      slot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          rotateTile(tile.id, true);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const all = [...tray.querySelectorAll<HTMLElement>('.tile-slot')];
          all[all.indexOf(slot) + (e.key === 'ArrowRight' ? 1 : -1)]?.focus();
        }
      });
      tray.append(slot);
    }
    rotated = null;
    if (refocus) tray.querySelector<HTMLElement>(`[data-tile="${refocus}"]`)?.focus();
  }

  function renderStatus(): void {
    const left = trayTiles(game.board).length;
    status.textContent = game.solved ? 'Solved' : left === 0 ? 'All placed. Check the totals.' : `${left} domino${left === 1 ? '' : 's'} left`;
    status.classList.toggle('ok', game.solved);
    undoBtn.disabled = !game.canUndo;
    restartBtn.disabled = game.solved || (game.board.placed.length === 0);
    board.classList.toggle('done', game.solved);
    puzzleEl.classList.toggle('is-solved', game.solved);
  }

  function render(): void {
    renderPieces();
    renderTotals();
    renderTray();
    renderStatus();
  }

  // ---- tap to place -----------------------------------------------------------------------
  function rotateTile(tile: string, refocus = false): void {
    orient.set(tile, nextOrientation(orientationOf(tile)));
    selected = tile;
    rotated = tile;
    clearPreview();
    play('rotate');
    renderTray(refocus ? tile : undefined);
  }

  board.addEventListener('click', (e) => {
    const slot = (e.target as HTMLElement).closest<HTMLElement>('.slot');
    if (!slot || !selected || game.solved) return;
    tryPlace(selected, Number(slot.dataset.r), Number(slot.dataset.c));
  });

  // Mouse hover preview for the selected domino.
  board.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !selected || drag || game.solved) return;
    const { row, col } = cellAt(e.clientX, e.clientY);
    if (row < 0 || col < 0 || row >= n || col >= n) clearPreview();
    else showPreview(selected, row, col);
  });
  board.addEventListener('pointerleave', () => {
    if (!drag) clearPreview();
  });

  // ---- keyboard ---------------------------------------------------------------------------
  let cursor: { row: number; col: number } | null = null;

  function showCursor(): void {
    slots.forEach((s) => s.classList.remove('cursor'));
    if (!cursor) return;
    slots[cursor.row * n + cursor.col].classList.add('cursor');
    if (selected) showPreview(selected, cursor.row, cursor.col);
    else clearPreview();
    const cell = cellMap(game.board)[cursor.row * n + cursor.col];
    announce(
      `Row ${cursor.row + 1}, column ${cursor.col + 1}, ` +
        (cell ? `domino ${cell.tile.replace('-', ' and ')}, ${cell.pip} ${cell.pip === 1 ? 'pip' : 'pips'}${cell.locked ? ', locked' : ''}` : 'empty'),
    );
  }

  board.addEventListener('focus', () => {
    if (!board.matches(':focus-visible')) return; // a mouse click should not show a keyboard cursor
    cursor ??= { row: 0, col: 0 };
    showCursor();
  });
  board.addEventListener('blur', () => {
    slots.forEach((s) => s.classList.remove('cursor'));
    clearPreview();
  });

  board.addEventListener('keydown', (e) => {
    if (game.solved || e.altKey || e.ctrlKey || e.metaKey) return;
    cursor ??= { row: 0, col: 0 };
    const key = e.key;
    const move: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (move[key]) {
      e.preventDefault();
      cursor = {
        row: Math.min(n - 1, Math.max(0, cursor.row + move[key][0])),
        col: Math.min(n - 1, Math.max(0, cursor.col + move[key][1])),
      };
      showCursor();
    } else if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      if (selected) tryPlace(selected, cursor.row, cursor.col);
      else announce('Choose a domino first. Press 1 to 9, or Tab to the tray.');
    } else if (key === 'r' || key === 'R') {
      const tile = selected ?? trayTiles(game.board)[0]?.id;
      if (!tile) return;
      e.preventDefault();
      rotateTile(tile);
      showCursor();
    } else if (key === 'Backspace' || key === 'Delete') {
      e.preventDefault();
      const cell = cellMap(game.board)[cursor.row * n + cursor.col];
      if (cell && !cell.locked) takeBack(cell.tile);
      else if (cell?.locked) play('invalid');
    } else if (/^[1-9]$/.test(key)) {
      const tile = trayTiles(game.board)[Number(key) - 1];
      if (!tile) return;
      e.preventDefault();
      selected = tile.id;
      renderTray();
      announce(`Domino ${tile.a} and ${tile.b} selected`);
      showCursor();
    } else if (key === 'z' || key === 'Z') {
      e.preventDefault();
      undo();
    } else if (key === 'Escape') {
      selected = null;
      renderTray();
      clearPreview();
    }
  });

  // ---- drag and drop ----------------------------------------------------------------------
  function startDrag(tile: string, slotEl: HTMLElement, e: PointerEvent): void {
    const t = game.board.tiles.get(tile);
    if (!t || game.solved) return;
    selected = tile;
    play('tap');
    const cell = cellSize();
    const ghost = pieceEl(t, orientationOf(tile), ['ghost']);
    ghost.style.setProperty('--cell', `${cell}px`);
    document.body.append(ghost);
    drag = { tile, ghost, cell, lift: e.pointerType === 'mouse' ? 0 : cell * 1.15 };
    tray.querySelectorAll('.tile-slot.sel').forEach((el) => el.classList.remove('sel'));
    slotEl.classList.add('dragging');
    moveDrag(e);
  }

  function moveDrag(e: PointerEvent): void {
    if (!drag) return;
    const { ghost, cell, lift } = drag;
    ghost.style.transform = `translate(${e.clientX - cell / 2}px, ${e.clientY - lift - cell / 2}px)`;
    const { row, col } = cellAt(e.clientX, e.clientY - lift);
    showPreview(drag.tile, row, col);
  }

  function endDrag(e: PointerEvent, cancelled: boolean, slotEl: HTMLElement): void {
    if (!drag) return;
    const { tile, ghost, lift } = drag;
    drag = null;
    ghost.remove();
    slotEl.classList.remove('dragging');
    clearPreview();
    if (cancelled) {
      renderTray();
      return;
    }
    const { row, col } = cellAt(e.clientX, e.clientY - lift);
    const inside = row >= 0 && col >= 0 && row < n && col < n;
    if (inside) tryPlace(tile, row, col);
    renderTray();
  }

  // ---- solved card ------------------------------------------------------------------------
  let confettiLayer: HTMLElement | null = null;
  function confetti(): void {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['var(--accent)', 'var(--ok)', '#f5b82e', 'var(--over)'];
    const layer = h('div', { class: 'confetti', 'aria-hidden': 'true' });
    for (let i = 0; i < 44; i++) {
      const piece = h('i');
      piece.style.cssText =
        `left:${Math.random() * 100}%;background:${colors[i % colors.length]};` +
        `width:${6 + Math.random() * 6}px;height:${8 + Math.random() * 8}px;` +
        `animation-delay:${Math.random() * 0.5}s;animation-duration:${1.8 + Math.random() * 1.4}s;` +
        `--drift:${Math.round((Math.random() - 0.5) * 160)}px`;
      layer.append(piece);
    }
    document.body.append(layer);
    confettiLayer = layer;
    window.setTimeout(() => layer.remove(), 4200);
  }

  function showSolved(): void {
    announce('Puzzle solved');
    confetti();
    const close = () => {
      overlay?.remove();
      overlay = null;
    };
    const buttons: HTMLElement[] = [];
    if (ctx.next) buttons.push(h('a', { class: 'btn primary', href: `${ctx.base}/p/${ctx.next}` }, `Next: ${ctx.next}\u00D7${ctx.next}`));
    buttons.push(h('a', { class: `btn${ctx.next ? '' : ' primary'}`, href: ctx.homeHref }, 'All puzzles'));
    const view = h('button', { class: 'btn quiet', type: 'button' }, 'View board');
    view.addEventListener('click', close);
    buttons.push(view);
    overlay = h(
      'div',
      { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Puzzle solved' },
      h(
        'div',
        { class: 'sheet' },
        h('h2', {}, 'Solved!'),
        h('p', {}, ctx.next ? 'Nicely done. The next one is a little harder.' : 'That was the hardest one today. See you tomorrow.'),
        h('div', { class: 'sheet-actions' }, ...buttons),
      ),
    );
    document.body.append(overlay);
  }

  render();
  startClock();

  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    stopClock();
    if (!game.solved && game.board.placed.length > 0) persist();
    drag?.ghost.remove();
    overlay?.remove();
    confettiLayer?.remove();
  };
}
