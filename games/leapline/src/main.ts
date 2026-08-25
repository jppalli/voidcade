import { sound } from './audio/sound';
import { generateDailyPuzzle, todayDateString } from './core/daily';
import { generatePuzzle } from './core/generator';
import type { Difficulty, Puzzle } from './core/types';
import { PuzzleSession } from './game/session';
import { loadStats, recordCompletion } from './game/stats';
import { tutorialPuzzle, tutorialScript, type TutorialStep } from './game/tutorial';
import { BoardRenderer } from './render/board';
import {
  hideTutorialBubble, renderCompletion, renderDifficultyGrid, renderHomeStreak, renderHud,
  renderHudMode, renderStats, renderTimer, setStatus, showOverlay, showScreen, showTutorialBubble,
  syncSoundButtons, type ScreenId,
} from './ui/screens';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

type Mode = 'tutorial' | 'daily' | 'practice';

let session: PuzzleSession;
let renderer: BoardRenderer;
let currentMode: Mode = 'practice';
let currentDifficulty: Difficulty = 'easy';
let currentDailyDate = '';
let tutorialSteps: TutorialStep[] = [];
let tutorialIndex = 0;
let timerHandle: number | null = null;
let previousScreen: ScreenId = 'home';

renderer = new BoardRenderer(
  $('board'),
  $('connectorLayer') as unknown as SVGSVGElement,
  { onCellActivate: cell => handleCellActivate(cell) },
);

// ---------------------------------------------------------------- session lifecycle

function stopTimerLoop(): void {
  if (timerHandle !== null) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
}

function startTimerLoop(): void {
  stopTimerLoop();
  timerHandle = window.setInterval(() => {
    renderTimer(session.elapsedMs());
  }, 250);
}

function beginSession(puzzle: Puzzle, mode: Mode, modeLabel: string): void {
  currentMode = mode;
  currentDifficulty = puzzle.difficulty;
  session = new PuzzleSession(puzzle);
  session.start();
  renderer.attach(session);
  renderHudMode(modeLabel);
  renderHud(session);
  renderTimer(0);
  setStatus('');
  startTimerLoop();

  if (mode === 'tutorial') {
    tutorialSteps = tutorialScript(puzzle);
    tutorialIndex = 0;
    maybeShowTutorialStep();
  } else {
    hideTutorialBubble();
  }
}

function maybeShowTutorialStep(): void {
  if (currentMode !== 'tutorial') return;
  const step = tutorialSteps[tutorialIndex];
  if (!step) {
    hideTutorialBubble();
    return;
  }
  if (session.nextValue() === step.atNextValue || (step.atNextValue === 2 && tutorialIndex === 0)) {
    showTutorialBubble(step.title, step.body);
  } else {
    hideTutorialBubble();
  }
}

$('btnTutorialNext').addEventListener('click', () => {
  tutorialIndex++;
  hideTutorialBubble();
  maybeShowTutorialStep();
});

// ---------------------------------------------------------------- placement handling

function handleCellActivate(cell: number): void {
  if (currentMode !== 'tutorial') hideTutorialBubble();
  const outcome = session.attemptPlace(cell);

  switch (outcome.kind) {
    case 'over':
      return;
    case 'occupied':
      sound.invalid();
      return;
    case 'invalid':
      sound.invalid();
      renderer.flashInvalid(cell);
      setStatus('That cell is too far, or not in a straight line — try a highlighted one.', 'bad');
      return;
    case 'mistake':
      sound.mistake();
      renderer.flashInvalid(cell);
      setStatus(`That's a legal move, but not the right spot for ${outcome.value}. Try another highlighted cell.`, 'bad');
      renderer.sync(session);
      return;
    case 'placed': {
      sound.place(distanceOfLastPlacement(cell));
      renderer.flashPlaced(cell);
      renderer.sync(session);
      renderHud(session);
      setStatus('');
      if (outcome.completed) {
        onPuzzleCompleted();
      } else if (currentMode === 'tutorial') {
        maybeShowTutorialStep();
      }
      return;
    }
  }
}

/** Recovers the step distance of the just-placed value, purely for the placement sound's pitch cue. */
function distanceOfLastPlacement(cell: number): number {
  const value = session.valueAt(cell);
  if (value === null || value === 1) return 1;
  const prevCell = session.cellForValue(value - 1);
  if (prevCell === null) return 1;
  const { size } = session.puzzle;
  const a = Math.floor(prevCell / size);
  const b = Math.floor(cell / size);
  const c1 = prevCell % size;
  const c2 = cell % size;
  return Math.abs(a - b) + Math.abs(c1 - c2);
}

function onPuzzleCompleted(): void {
  stopTimerLoop();
  sound.win();
  renderer.celebrate();
  const summary = session.getCompletionSummary();

  const stats = recordCompletion({
    seed: session.puzzle.seed,
    difficulty: session.puzzle.difficulty,
    size: session.puzzle.size,
    timeMs: summary.timeMs,
    mistakes: summary.mistakes,
    hintsUsed: summary.hintsUsed,
    isDaily: currentMode === 'daily',
    dailyDate: currentMode === 'daily' ? currentDailyDate : undefined,
  });

  if (currentMode === 'tutorial') {
    setTimeout(() => goHome(), 900);
    return;
  }

  renderCompletion(summary, session.puzzle.difficulty, stats, currentMode === 'daily');
  setTimeout(() => showOverlay('completionOverlay', true), 650);
}

// ---------------------------------------------------------------- undo / restart / hint

$('btnUndo').addEventListener('click', () => {
  if (currentMode === 'tutorial') return;
  const undone = session.undo();
  if (undone === null) {
    sound.invalid();
    return;
  }
  sound.undo();
  renderer.sync(session);
  renderHud(session);
  setStatus('');
});

$('btnRestart').addEventListener('click', () => {
  session.restart();
  session.start();
  renderer.attach(session);
  renderHud(session);
  renderTimer(0);
  setStatus('');
  startTimerLoop();
  if (currentMode === 'tutorial') {
    tutorialIndex = 0;
    maybeShowTutorialStep();
  }
});

$('btnHint').addEventListener('click', () => {
  const hint = session.requestHint();
  if (!hint) return;
  sound.hint();
  renderHud(session);

  let message = `${hint.distance} cell${hint.distance === 1 ? '' : 's'} away`;
  if (hint.direction) message += ` — head ${hint.direction}`;
  if (hint.cell !== undefined) {
    renderer.showHintCell(hint.cell);
    message = `It's right there — the highlighted cell.`;
  }
  setStatus(message, '');
});

// ---------------------------------------------------------------- home / navigation

function goHome(): void {
  stopTimerLoop();
  const stats = loadStats();
  renderHomeStreak(stats);
  showScreen('home');
}

function goDifficultySelect(): void {
  previousScreen = 'difficulty';
  renderDifficultyGrid(difficulty => {
    sound.uiClick();
    startPractice(difficulty);
  });
  showScreen('difficulty');
}

function startPractice(difficulty: Difficulty): void {
  previousScreen = 'difficulty';
  const seed = `practice-${difficulty}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const puzzle = generatePuzzle(seed, difficulty);
  beginSession(puzzle, 'practice', `Practice · ${capitalize(difficulty)}`);
  showScreen('game');
}

function startDaily(): void {
  previousScreen = 'home';
  currentDailyDate = todayDateString();
  const puzzle = generateDailyPuzzle(currentDailyDate);
  beginSession(puzzle, 'daily', `Daily · ${capitalize(puzzle.difficulty)}`);
  showScreen('game');
}

function startTutorial(): void {
  previousScreen = 'home';
  const puzzle = tutorialPuzzle();
  beginSession(puzzle, 'tutorial', 'Tutorial');
  showScreen('game');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

$('btnPlayDaily').addEventListener('click', startDaily);
$('btnPractice').addEventListener('click', goDifficultySelect);
$('btnTutorial').addEventListener('click', startTutorial);
$('btnStats').addEventListener('click', () => {
  renderStats(loadStats());
  previousScreen = 'home';
  showScreen('stats');
});
$('btnPremium').addEventListener('click', () => {
  previousScreen = 'home';
  showScreen('premium');
});

document.querySelectorAll<HTMLElement>('[data-nav]').forEach(btn => {
  btn.addEventListener('click', () => {
    const nav = btn.dataset.nav;
    if (nav === 'home') goHome();
    else if (nav === 'prevScreen') {
      stopTimerLoop();
      showScreen(previousScreen);
      if (previousScreen === 'home') {
        renderHomeStreak(loadStats());
      }
    }
  });
});

$('btnCompletionHome').addEventListener('click', () => {
  showOverlay('completionOverlay', false);
  goHome();
});
$('btnCompletionNext').addEventListener('click', () => {
  showOverlay('completionOverlay', false);
  if (currentMode === 'daily') goHome();
  else startPractice(currentDifficulty);
});

$('btnHowToGotIt').addEventListener('click', () => showOverlay('howToOverlay', false));
$('btnHowToClose').addEventListener('click', () => showOverlay('howToOverlay', false));

for (const id of ['btnSoundHome', 'btnSoundGame']) {
  const el = document.getElementById(id);
  el?.addEventListener('click', () => syncSoundButtons(sound.toggleMute()));
}

$('btnPremiumNotify').addEventListener('click', () => {
  // Intentionally disabled — see index.html's premiumNote. No purchase flow is wired up.
});

// generic click sound for buttons that don't manage their own audio
document.body.addEventListener('click', e => {
  const t = e.target as HTMLElement;
  if (t.closest('.btn, .iconBtn, .difficultyCard')) sound.uiClick();
});

// ---------------------------------------------------------------- keyboard controls

document.addEventListener('keydown', e => {
  const onGameScreen = !$('screen-game').classList.contains('hidden');

  if (e.key === 'Escape') {
    if (!$('completionOverlay').classList.contains('hidden')) return;
    if (!$('howToOverlay').classList.contains('hidden')) {
      showOverlay('howToOverlay', false);
      return;
    }
    if (onGameScreen) {
      stopTimerLoop();
      showScreen(previousScreen);
    }
    return;
  }

  if (!onGameScreen) return;

  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault();
      renderer.moveCursor(-1, 0, session);
      break;
    case 'ArrowDown':
      e.preventDefault();
      renderer.moveCursor(1, 0, session);
      break;
    case 'ArrowLeft':
      e.preventDefault();
      renderer.moveCursor(0, -1, session);
      break;
    case 'ArrowRight':
      e.preventDefault();
      renderer.moveCursor(0, 1, session);
      break;
    case 'Enter':
    case ' ':
      e.preventDefault();
      handleCellActivate(renderer.getCursor());
      break;
    case 'u':
    case 'U':
      $('btnUndo').click();
      break;
    case 'r':
    case 'R':
      $('btnRestart').click();
      break;
    case 'h':
    case 'H':
      $('btnHint').click();
      break;
    default:
      break;
  }
});

// dev-only debug handle
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__leapline = { getSession: () => session, renderer };
}

// ---- boot ----
syncSoundButtons(sound.muted);
goHome();
