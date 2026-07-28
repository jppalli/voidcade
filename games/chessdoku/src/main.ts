import { sound } from './audio/sound';
import { LEVELS } from './game/levels';
import { Game, progress } from './game/state';
import { BoardRenderer } from './render/board';
import {
  renderHud, renderMap, renderTitle, renderWin, scrollToFrontier,
  showOverlay, showScreen, spawnTitleFloat, syncSoundButtons, updateStatus,
} from './ui/screens';

const $ = (id: string): HTMLElement => document.getElementById(id)!;

let lastConflictCount = 0;

const game = new Game({
  onBoardChange: g => {
    renderHud(g, p => {
      game.select(p);
      sound.select();
    });
    renderer.sync();
    // play sounds based on what changed
    const conflictsNow = g.conflicts.pairs.length;
    if (conflictsNow > lastConflictCount) {
      sound.conflict();
      renderer.shake();
    }
    lastConflictCount = conflictsNow;
  },
  onIllegal: message => {
    updateStatus(game, message);
    sound.illegal();
  },
  onWin: g => {
    sound.win();
    renderer.celebrate();
    const clearedChapter = progress.chapterCleared(g.level.ch);
    if (clearedChapter) setTimeout(() => sound.chapterFanfare(), 900);
    renderWin(g, clearedChapter);
    setTimeout(() => showOverlay('winOverlay', true), 800);
  },
});

const renderer = new BoardRenderer(
  $('boardCanvas') as HTMLCanvasElement,
  (r, c) => {
    const hadPiece = !!game.board[r][c];
    const before = game.piecesLeft();
    game.tap(r, c);
    const after = game.piecesLeft();
    if (after < before) sound.place();
    else if (after > before && hadPiece) sound.pickup();
  },
);

function openLevel(index: number): void {
  lastConflictCount = 0;
  showScreen('game'); // must be visible before attach() measures the board holder
  game.load(index);
  renderer.attach(game);
}

function goTitle(): void {
  renderTitle();
  showScreen('title');
}

function goMap(): void {
  showScreen('map'); // must be visible before renderMap measures the wrap
  renderMap(index => {
    sound.uiClick();
    openLevel(index);
  });
  scrollToFrontier();
}

// ---- static button wiring ----

$('btnContinue').addEventListener('click', () => openLevel(progress.nextLevel()));
$('btnChapters').addEventListener('click', goMap);
$('btnHowTo').addEventListener('click', () => showOverlay('howToOverlay', true));
$('btnHowToClose').addEventListener('click', () => showOverlay('howToOverlay', false));
$('btnReset').addEventListener('click', () => {
  lastConflictCount = 0;
  game.reset();
  renderer.attach(game);
});

document.querySelectorAll<HTMLElement>('[data-nav]').forEach(btn => {
  btn.addEventListener('click', () => {
    const nav = btn.dataset.nav;
    if (nav === 'title') goTitle();
    else if (nav === 'map') goMap();
  });
});

for (const id of ['btnSoundTitle', 'btnSoundMap', 'btnSoundGame']) {
  $(id).addEventListener('click', () => syncSoundButtons(sound.toggleMute()));
}

$('btnWinLevels').addEventListener('click', () => {
  showOverlay('winOverlay', false);
  goMap();
});
$('btnWinNext').addEventListener('click', () => {
  showOverlay('winOverlay', false);
  if (progress.totalDone() === LEVELS.length && game.levelIndex === LEVELS.length - 1) {
    goTitle();
    return;
  }
  openLevel(progress.nextLevel());
});

// generic click sound for buttons that don't manage their own audio
document.body.addEventListener('click', e => {
  const t = e.target as HTMLElement;
  if (t.closest('.btn, .iconBtn')) sound.uiClick();
});

// keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!$('winOverlay').classList.contains('hidden')) return;
    if (!$('howToOverlay').classList.contains('hidden')) {
      showOverlay('howToOverlay', false);
    } else if (!$('screen-game').classList.contains('hidden')) {
      goMap();
    } else if (!$('screen-map').classList.contains('hidden')) {
      goTitle();
    }
  }
  if (e.key === 'r' && !$('screen-game').classList.contains('hidden')) {
    lastConflictCount = 0;
    game.reset();
    renderer.attach(game);
  }
});

window.addEventListener('resize', () => {
  if (!$('screen-game').classList.contains('hidden') && game.level) renderer.attach(game);
  if (!$('screen-map').classList.contains('hidden')) {
    renderMap(index => {
      sound.uiClick();
      openLevel(index);
    });
  }
});

// dev-only handle for debugging and automated testing
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__chessdoku = { game, renderer, progress };
}

// ---- boot ----
spawnTitleFloat();
syncSoundButtons(sound.muted);
goTitle();
