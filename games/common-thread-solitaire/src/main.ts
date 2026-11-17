import './styles.css';
import { getLevel, getTotalLevels } from './game/levels';
import { createGameState, moveCard, undo, canUndo, getHint, getPlayTime, getStars } from './game/state';
import { loadSave, recordLevelComplete } from './game/storage';
import { audio, attemptUnlock } from './audio/sound';
import { renderGameBoard, updateCard, updateSlot, showHint, updateMoves, showToast, announceToScreenReader } from './ui/render';
import { setupDragAndDrop, setupKeyboardControls } from './ui/interaction';
import type { GameState } from './game/types';

// DOM Elements
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const $btn = (id: string) => document.getElementById(id) as HTMLButtonElement;

// Screens
const titleScreen = $('screen-title');
const gameScreen = $('screen-game');

// Buttons
const btnPlay = $btn('btn-play');
const btnHowTo = $btn('btn-how-to');
const btnSoundTitle = $btn('btn-sound-title');
const btnBack = $btn('btn-back');
const btnSoundGame = $btn('btn-sound-game');
const btnUndo = $btn('btn-undo');
const btnHint = $btn('btn-hint');
const btnRestart = $btn('btn-restart');
const btnNextLevel = $btn('btn-next-level');
const btnWinMenu = $btn('btn-win-menu');
const btnHowtoClose = $btn('btn-howto-close');
const btnHowtoOk = $btn('btn-howto-ok');

// Containers
const gameBoard = $('game-board');
const levelName = $('level-name');
const movesDisplay = $('moves-display');
const winOverlay = $('win-overlay');
const howtoOverlay = $('howto-overlay');
const winStats = $('win-stats');
const winMessage = $('win-message');

// Game state
let currentState: GameState | null = null;
let currentLevelId = 1;

// Initialize
function init(): void {
  const save = loadSave();
  currentLevelId = save.currentLevel;

  updateSoundButtons();
  setupEventListeners();
  showScreen('title');

  // Update play button label
  const totalLevels = getTotalLevels();
  const completed = save.levelsCompleted.length;
  
  if (completed === 0) {
    $('play-label').textContent = 'Start Playing';
  } else if (completed >= totalLevels) {
    $('play-label').textContent = 'Play Again';
  } else {
    $('play-label').textContent = `Continue (Level ${currentLevelId})`;
  }

  // Stats preview
  const statsPreview = $('stats-preview');
  if (completed > 0) {
    statsPreview.textContent = `${completed} of ${totalLevels} levels completed`;
  }
}

// Screen management
function showScreen(screen: 'title' | 'game'): void {
  titleScreen.classList.toggle('hidden', screen !== 'title');
  gameScreen.classList.toggle('hidden', screen !== 'game');
}

// Start level
function startLevel(levelId: number): void {
  attemptUnlock();
  
  const level = getLevel(levelId);
  if (!level) {
    showToast('Level not found!');
    return;
  }

  currentLevelId = levelId;
  currentState = createGameState(level);

  levelName.textContent = level.name;
  updateMoves(0, movesDisplay);
  
  renderGameBoard(currentState, gameBoard);
  setupDragAndDrop(gameBoard, handleCardMoved);
  setupKeyboardControls(gameBoard, handleUndo, handleHint, handleRestart);
  
  updateUI();
  showScreen('game');
  
  announceToScreenReader(`${level.name} started. ${level.cards.length} cards to sort.`);
}

// Handle card moved
function handleCardMoved(cardId: string, slotId: string | undefined, x: number, y: number): void {
  if (!currentState) return;

  const card = currentState.level.cards.find(c => c.id === cardId);
  if (!card) return;

  // Check if the move is valid
  if (slotId) {
    const slot = currentState.slots.get(slotId);
    if (!slot) return;

    // Can't add more than 4 cards to a slot
    if (slot.cardIds.length >= 4 && !slot.cardIds.includes(cardId)) {
      audio.error();
      showToast('Slot is full!');
      // Reset card position
      const oldPosition = currentState.cardPositions.get(cardId)!;
      const cardEl = document.getElementById(`card-${cardId}`);
      if (cardEl) {
        cardEl.style.left = `${oldPosition.x}px`;
        cardEl.style.top = `${oldPosition.y}px`;
      }
      return;
    }
  }

  const oldSlotId = currentState.cardPositions.get(cardId)?.slotId;
  
  currentState = moveCard(currentState, cardId, { x, y, slotId });
  
  updateCard(cardId, currentState);
  
  // Update affected slots
  if (oldSlotId) {
    updateSlot(oldSlotId, currentState);
  }
  if (slotId) {
    updateSlot(slotId, currentState);
    
    // Check if slot just became complete
    const slot = currentState.slots.get(slotId);
    if (slot?.complete) {
      audio.slotComplete();
      showToast(`✓ ${slot.category} complete!`, 1500);
      announceToScreenReader(`${slot.category} set completed!`);
    }
  }
  
  updateUI();

  // Check if level is complete
  if (currentState.complete) {
    setTimeout(() => handleLevelComplete(), 800);
  }
}

// UI update
function updateUI(): void {
  if (!currentState) return;

  updateMoves(currentState.moves, movesDisplay);
  btnUndo.disabled = !canUndo(currentState);
}

// Actions
function handleUndo(): void {
  if (!currentState || !canUndo(currentState)) return;

  audio.undo();
  currentState = undo(currentState);
  
  // Re-render entire board (simpler than tracking individual changes)
  renderGameBoard(currentState, gameBoard);
  updateUI();
  
  announceToScreenReader('Move undone');
}

function handleHint(): void {
  if (!currentState) return;

  attemptUnlock();
  audio.hint();
  
  const hintCards = getHint(currentState);
  if (hintCards) {
    showHint(hintCards);
    showToast('These cards belong together', 2000);
    announceToScreenReader('Hint shown: highlighted cards belong together');
  } else {
    showToast('No hints available', 1500);
  }
}

function handleRestart(): void {
  if (!currentState) return;

  if (currentState.moves > 0) {
    const confirm = window.confirm('Restart this level? Your progress will be lost.');
    if (!confirm) return;
  }

  attemptUnlock();
  audio.buttonClick();
  startLevel(currentLevelId);
  announceToScreenReader('Level restarted');
}

function handleLevelComplete(): void {
  if (!currentState) return;

  audio.levelComplete();
  
  const timeSeconds = getPlayTime(currentState);
  const stars = getStars(currentState);
  const moves = currentState.moves;
  
  recordLevelComplete(currentLevelId, moves, timeSeconds);

  // Update win modal
  winStats.innerHTML = `
    <div class="stat-card">
      <b>${moves}</b>
      <span>Moves</span>
    </div>
    <div class="stat-card">
      <b>${timeSeconds}s</b>
      <span>Time</span>
    </div>
  `;

  const starsEmoji = '⭐'.repeat(stars);
  winMessage.textContent = `${starsEmoji} ${getCompleteMessage(stars)}`;

  winOverlay.classList.remove('hidden');
  announceToScreenReader(`Level complete! ${moves} moves in ${timeSeconds} seconds. ${stars} stars earned.`);

  // Update next level button
  const nextLevel = getLevel(currentLevelId + 1);
  if (nextLevel) {
    btnNextLevel.textContent = 'Next Level';
    btnNextLevel.disabled = false;
  } else {
    btnNextLevel.textContent = 'All Levels Complete!';
    btnNextLevel.disabled = true;
  }
}

function getCompleteMessage(stars: number): string {
  if (stars === 3) return 'Perfect! Outstanding efficiency!';
  if (stars === 2) return 'Well done! Very good work!';
  return 'Complete! Nice job!';
}

function handleNextLevel(): void {
  audio.buttonClick();
  winOverlay.classList.add('hidden');
  
  const nextLevel = getLevel(currentLevelId + 1);
  if (nextLevel) {
    startLevel(nextLevel.id);
  }
}

function handleBackToMenu(): void {
  audio.buttonClick();
  winOverlay.classList.add('hidden');
  showScreen('title');
  
  // Update button for next play
  const save = loadSave();
  currentLevelId = save.currentLevel;
  
  const totalLevels = getTotalLevels();
  const completed = save.levelsCompleted.length;
  
  if (completed >= totalLevels) {
    $('play-label').textContent = 'Play Again';
    currentLevelId = 1;
  } else {
    $('play-label').textContent = `Continue (Level ${currentLevelId})`;
  }
}

function toggleSound(): void {
  attemptUnlock();
  const newState = !audio.isEnabled();
  audio.setEnabled(newState);
  updateSoundButtons();
  
  if (newState) {
    audio.buttonClick();
  }
}

function updateSoundButtons(): void {
  const enabled = audio.isEnabled();
  const iconHref = enabled ? '#i-sound-on' : '#i-sound-off';
  
  btnSoundTitle.querySelector('use')?.setAttribute('href', iconHref);
  btnSoundGame.querySelector('use')?.setAttribute('href', iconHref);
  btnSoundTitle.setAttribute('aria-label', enabled ? 'Sound on' : 'Sound off');
  btnSoundGame.setAttribute('aria-label', enabled ? 'Sound on' : 'Sound off');
}

// Event listeners
function setupEventListeners(): void {
  btnPlay.addEventListener('click', () => {
    audio.buttonClick();
    startLevel(currentLevelId);
  });

  btnBack.addEventListener('click', () => {
    audio.buttonClick();
    showScreen('title');
  });

  btnUndo.addEventListener('click', handleUndo);
  btnHint.addEventListener('click', handleHint);
  btnRestart.addEventListener('click', handleRestart);

  btnNextLevel.addEventListener('click', handleNextLevel);
  btnWinMenu.addEventListener('click', handleBackToMenu);

  btnSoundTitle.addEventListener('click', toggleSound);
  btnSoundGame.addEventListener('click', toggleSound);

  btnHowTo.addEventListener('click', () => {
    audio.buttonClick();
    howtoOverlay.classList.remove('hidden');
  });

  btnHowtoClose.addEventListener('click', () => {
    audio.buttonClick();
    howtoOverlay.classList.add('hidden');
  });

  btnHowtoOk.addEventListener('click', () => {
    audio.buttonClick();
    howtoOverlay.classList.add('hidden');
  });

  // Close modals on backdrop click
  howtoOverlay.addEventListener('click', (e) => {
    if (e.target === howtoOverlay) {
      audio.buttonClick();
      howtoOverlay.classList.add('hidden');
    }
  });

  winOverlay.addEventListener('click', (e) => {
    if (e.target === winOverlay) {
      handleBackToMenu();
    }
  });
}

// Start the game
init();
