import type { Game } from '../game/state';
import { scoreboard } from '../game/state';
import type { Player, WinInfo } from '../game/types';

export type ScreenId = 'title' | 'game';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

export function showScreen(id: ScreenId): void {
  const next = document.getElementById(`screen-${id}`)!;
  for (const s of document.querySelectorAll<HTMLElement>('.screen')) {
    if (s === next || s.classList.contains('hidden')) continue;
    if (s.classList.contains('leaving')) {
      s.classList.add('hidden');
      s.classList.remove('leaving');
      continue;
    }
    s.classList.remove('enter');
    s.classList.add('leaving');
    const finish = (): void => {
      if (!s.classList.contains('leaving')) return;
      s.classList.add('hidden');
      s.classList.remove('leaving');
    };
    s.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, 280);
  }
  next.classList.remove('hidden', 'leaving', 'enter');
  void next.offsetWidth;
  next.classList.add('enter');
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
}

export function showOverlay(id: string, show: boolean): void {
  $(id).classList.toggle('hidden', !show);
}

// ---------------------------------------------------------------- title

export function renderTitleScoreboard(): void {
  const total = scoreboard.x + scoreboard.o + scoreboard.draws;
  $('titleScoreboard').innerHTML = total === 0
    ? ''
    : `<span class="scoreChip scoreX">X ${scoreboard.x}</span>` +
      `<span class="scoreChip scoreO">O ${scoreboard.o}</span>` +
      `<span class="scoreChip scoreDraw">Draws ${scoreboard.draws}</span>`;
}

// ---------------------------------------------------------------- game HUD

export function renderGridName(game: Game): void {
  $('gridName').textContent = game.grid.name;
}

export function renderTurn(game: Game): void {
  const label = $('turnLabel');
  if (game.isOver()) {
    label.textContent = game.winner ? `${game.winner.player} wins!` : "It's a draw!";
  } else if (game.isAiTurn()) {
    label.textContent = "Computer's turn";
  } else {
    label.textContent = game.mode === 'ai' ? 'Your turn' : `${game.current}'s turn`;
  }
  label.className = `turnLabel turn${game.current}`;

  const modeLabel = $('modeLabel');
  modeLabel.textContent = game.mode === 'ai' ? 'You are X · Computer is O' : '';

  renderScoreChips();
}

export function renderScoreChips(): void {
  $('scoreChips').innerHTML =
    `<span class="scoreChip scoreX">X ${scoreboard.x}</span>` +
    `<span class="scoreChip scoreO">O ${scoreboard.o}</span>` +
    `<span class="scoreChip scoreDraw">${scoreboard.draws}</span>`;
}

export function setPrompt(text: string): void {
  $('promptText').textContent = text;
}

export function promptForCell(game: Game, index: number): void {
  const row = game.grid.rows[game.rowOf(index)];
  const col = game.grid.cols[game.colOf(index)];
  $('promptText').innerHTML = `<strong>${row}</strong> &times; <strong>${col}</strong> — type your answer:`;
  $<HTMLFormElement>('answerForm').classList.remove('hidden');
  const input = $<HTMLInputElement>('answerInput');
  input.value = '';
  input.focus();
  $('statusLine').textContent = '';
  $('statusLine').className = 'statusLine';
}

export function clearPrompt(game: Game): void {
  $<HTMLFormElement>('answerForm').classList.add('hidden');
  setPrompt(
    game.isOver() ? '' :
    game.isAiTurn() ? 'The computer is thinking…' :
    'Tap an empty square to answer its clue.',
  );
  $('statusLine').textContent = '';
  $('statusLine').className = 'statusLine';
}

export function showStatus(text: string, kind: 'good' | 'bad' | ''): void {
  const el = $('statusLine');
  el.textContent = text;
  el.className = `statusLine ${kind}`;
}

// ---------------------------------------------------------------- win modal

export function renderWin(win: WinInfo | null, game: Game): void {
  const medal = $('winMedal');
  const vsAi = game.mode === 'ai';
  medal.innerHTML = '<svg class="icon"><use href="#i-trophy"/></svg>';
  if (win) {
    const youWon = vsAi && win.player === 'X';
    const youLost = vsAi && win.player === 'O';
    $('winTitle').textContent = vsAi
      ? (youWon ? 'You Win!' : 'Computer Wins!')
      : `${win.player} Wins!`;
    $('winText').textContent = youWon
      ? 'You lined up three in a row against the computer. Nice work!'
      : youLost
        ? 'The computer lined up three in a row. Better luck next round.'
        : `${win.player} lined up three in a row. Nicely answered.`;
  } else {
    medal.innerHTML = '<svg class="icon"><use href="#i-handshake"/></svg>';
    $('winTitle').textContent = "It's a Draw!";
    $('winText').textContent = vsAi
      ? 'The board filled up with no winner. The computer held its ground.'
      : 'The board filled up with no winner. Good match.';
  }
}

export function syncSoundButtons(muted: boolean): void {
  for (const id of ['btnSoundTitle', 'btnSoundGame']) {
    const btn = $(id);
    btn.querySelector('use')?.setAttribute('href', muted ? '#i-sound-off' : '#i-sound-on');
    btn.title = muted ? 'Sound off — click to unmute' : 'Sound on — click to mute';
    btn.setAttribute('aria-pressed', String(muted));
    btn.classList.toggle('mutedState', muted);
  }
}

export function playerLabel(p: Player): string {
  return p === 'X' ? 'X' : 'O';
}
