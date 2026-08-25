import { DIFFICULTY_CONFIG, DIFFICULTY_ORDER } from '../core/difficulty';
import type { Difficulty } from '../core/types';
import type { PuzzleSession, CompletionSummary } from '../game/session';
import { formatTime, isStreakActive, type PlayerStats } from '../game/stats';

export type ScreenId = 'home' | 'difficulty' | 'game' | 'stats' | 'premium';

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
    setTimeout(finish, 260);
  }
  next.classList.remove('hidden', 'leaving', 'enter');
  void next.offsetWidth;
  next.classList.add('enter');
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
}

export function showOverlay(id: string, show: boolean): void {
  $(id).classList.toggle('hidden', !show);
}

// ---------------------------------------------------------------- home

export function renderHomeStreak(stats: PlayerStats): void {
  const host = $('homeStreak');
  const active = isStreakActive(stats);
  if (stats.currentStreak <= 0) {
    host.innerHTML = '';
    return;
  }
  host.innerHTML = `
    <svg class="icon streakIcon${active ? ' streakIcon--active' : ''}"><use href="#i-flame"/></svg>
    <span>${stats.currentStreak}-day streak${active ? '' : ' (play today to continue)'}</span>`;
}

export function syncSoundButtons(muted: boolean): void {
  for (const id of ['btnSoundHome', 'btnSoundGame']) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    btn.querySelector('use')?.setAttribute('href', muted ? '#i-sound-off' : '#i-sound-on');
    btn.title = muted ? 'Sound off — click to unmute' : 'Sound on — click to mute';
    btn.setAttribute('aria-pressed', String(muted));
    btn.classList.toggle('mutedState', muted);
  }
}

// ---------------------------------------------------------------- difficulty select

export function renderDifficultyGrid(onPick: (difficulty: Difficulty) => void, locked: Difficulty[] = []): void {
  const host = $('difficultyGrid');
  host.innerHTML = '';
  for (const difficulty of DIFFICULTY_ORDER) {
    const config = DIFFICULTY_CONFIG[difficulty];
    const isLocked = locked.includes(difficulty);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `difficultyCard difficultyCard--${difficulty}${isLocked ? ' difficultyCard--locked' : ''}`;
    card.innerHTML = `
      <span class="difficultyCardLabel">${config.label}</span>
      <span class="difficultyCardMeta">${config.size}×${config.size} grid</span>
      <span class="difficultyCardDesc">${config.description}</span>
      ${isLocked ? '<span class="difficultyCardLock"><svg class="icon"><use href="#i-lock"/></svg>Premium</span>' : ''}`;
    if (!isLocked) card.addEventListener('click', () => onPick(difficulty));
    else card.disabled = true;
    host.appendChild(card);
  }
}

// ---------------------------------------------------------------- game HUD

export function renderHudMode(text: string): void {
  $('hudMode').textContent = text;
}

export function renderTimer(ms: number): void {
  $('hudTimer').textContent = formatTime(ms);
}

export function renderHud(session: PuzzleSession): void {
  const next = session.nextValue();
  $('hudNext').textContent = session.isComplete() ? 'Solved!' : `Next: ${next ?? ''}`;
  $('hudMistakes').textContent = `Mistakes: ${session.mistakes}`;
  $('hudHints').textContent = `Hints: ${session.hintsUsed}`;
}

export function setStatus(text: string, kind: 'good' | 'bad' | '' = ''): void {
  const el = $('statusLine');
  el.textContent = text;
  el.className = `statusLine ${kind}`;
}

// ---------------------------------------------------------------- tutorial bubble

export function showTutorialBubble(title: string, body: string): void {
  $('tutorialTitle').textContent = title;
  $('tutorialBody').textContent = body;
  $('tutorialBubble').classList.remove('hidden');
}

export function hideTutorialBubble(): void {
  $('tutorialBubble').classList.add('hidden');
}

// ---------------------------------------------------------------- completion modal

export function renderCompletion(
  summary: CompletionSummary,
  difficulty: Difficulty,
  stats: PlayerStats,
  isDaily: boolean,
): void {
  $('completionTitle').textContent = isDaily ? "Today's puzzle solved!" : 'Solved!';
  $('completionTime').textContent = formatTime(summary.timeMs);
  $('completionMistakes').textContent = String(summary.mistakes);
  $('completionHints').textContent = String(summary.hintsUsed);

  const best = stats.bestTimeMs[difficulty];
  const bestEl = $('completionBest');
  if (best !== undefined && best >= summary.timeMs) {
    bestEl.innerHTML = `<svg class="icon"><use href="#i-star"/></svg> New personal best for ${DIFFICULTY_CONFIG[difficulty].label}!`;
    bestEl.classList.add('completionBest--new');
  } else if (best !== undefined) {
    bestEl.textContent = `Personal best for ${DIFFICULTY_CONFIG[difficulty].label}: ${formatTime(best)}`;
    bestEl.classList.remove('completionBest--new');
  } else {
    bestEl.textContent = '';
  }

  const streakEl = $('completionStreak');
  streakEl.innerHTML = isDaily && stats.currentStreak > 0
    ? `<svg class="icon"><use href="#i-flame"/></svg> ${stats.currentStreak}-day streak`
    : '';
}

// ---------------------------------------------------------------- statistics screen

export function renderStats(stats: PlayerStats): void {
  const grid = $('statsGrid');
  grid.innerHTML = `
    <div class="statCard"><span class="statCardValue">${stats.totalCompleted}</span><span class="statCardLabel">Puzzles solved</span></div>
    <div class="statCard"><span class="statCardValue">${stats.currentStreak}</span><span class="statCardLabel">Current streak</span></div>
    <div class="statCard"><span class="statCardValue">${stats.bestStreak}</span><span class="statCardLabel">Best streak</span></div>
    <div class="statCard"><span class="statCardValue">${stats.totalMistakes}</span><span class="statCardLabel">Total mistakes</span></div>
  `;

  const bestList = DIFFICULTY_ORDER
    .filter(d => stats.bestTimeMs[d] !== undefined)
    .map(d => `<div class="bestTimeRow"><span>${DIFFICULTY_CONFIG[d].label}</span><span>${formatTime(stats.bestTimeMs[d]!)}</span></div>`)
    .join('');
  if (bestList) {
    grid.innerHTML += `<div class="statCard statCard--wide"><span class="statCardLabel">Personal bests</span>${bestList}</div>`;
  }

  const historyHost = $('historyList');
  if (stats.history.length === 0) {
    historyHost.innerHTML = '<p class="historyEmpty">No puzzles completed yet — play one to start your history.</p>';
    return;
  }
  historyHost.innerHTML = stats.history.slice(0, 20).map(entry => {
    const date = new Date(entry.completedAt);
    const dateLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `
      <div class="historyRow">
        <span class="historyBadge historyBadge--${entry.difficulty}">${DIFFICULTY_CONFIG[entry.difficulty].label}${entry.isDaily ? ' · Daily' : ''}</span>
        <span class="historyTime">${formatTime(entry.timeMs)}</span>
        <span class="historyMeta">${entry.mistakes} mistake${entry.mistakes === 1 ? '' : 's'} · ${entry.hintsUsed} hint${entry.hintsUsed === 1 ? '' : 's'}</span>
        <span class="historyDate">${dateLabel}</span>
      </div>`;
  }).join('');
}
