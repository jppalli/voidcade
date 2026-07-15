import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  RotateCcw,
  Undo2,
  Lightbulb,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Music,
  Sparkles,
  X,
  Menu as MenuIcon,
  BarChart2,
  HelpCircle,
  Home,
  ArrowLeft,
} from 'lucide-react';
import confetti from 'canvas-confetti';

import type { Position, Level, Stats, GameState, GameMode } from './types';
import { STORAGE_KEY } from './types';
import {
  generateSolvableLevel,
  getSeedFromDate,
  solvePuzzle,
  CHAPTER_LEVELS,
  getTargetableMovesFromPos,
  getArchiveDates,
} from './gameLogic';
import { playMoveSound, playUndoSound, playWinSound, playClickSound, getAudioPrefs, setSfxEnabled, setMusicEnabled, startMusic, playThudSound } from './sounds';
import { useTheme, ThemeProvider } from './ThemeContext';
import DieFace from './components/DieFace';
import RulesModal from './components/RulesModal';
import WinModal from './components/WinModal';
import MenuScreen from './screens/MenuScreen';
import ChaptersScreen from './screens/ChaptersScreen';
import StatsScreen from './screens/StatsScreen';
import ArchiveScreen from './screens/ArchiveScreen';
import TutorialScreen from './screens/TutorialScreen';

// --- Daily share text generator ---
function generateShareText(path: Position[], timeSeconds?: number): string {
  const today = new Date().toISOString().split('T')[0];
  const arrows = path.slice(1).map((p, i) => {
    const prev = path[i];
    if (p.x > prev.x) return '→';
    if (p.x < prev.x) return '←';
    if (p.y > prev.y) return '↓';
    return '↑';
  });
  const timeStr = timeSeconds ? `\n${timeSeconds}s` : '';
  return `Pips & Paths — ${today}${timeStr}\n${arrows.join('')}\n${path.length} moves • pipsandpaths.com`;
}

// --- Main Game Component ---
function GameApp() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';

  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [path, setPath] = useState<Position[]>([]);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [showRules, setShowRules] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [hintPos, setHintPos] = useState<Position | null>(null);
  const [usedHint, setUsedHint] = useState(false);
  const [hintShake, setHintShake] = useState(false);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [lastHintTime, setLastHintTime] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [dailyStartTime, setDailyStartTime] = useState(Date.now());
  const [dailyTime, setDailyTime] = useState(0);

  const [gameMode, setGameMode] = useState<GameMode>('chapter');
  const [archiveDateStr, setArchiveDateStr] = useState<string | null>(null);
  const [customLevel, setCustomLevel] = useState<Level | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [audioPrefs, setAudioPrefs] = useState(getAudioPrefs);
  const [celebrateChapter, setCelebrateChapter] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [hasSeenDailyFTUE] = useState(() => !!localStorage.getItem('pips_seen_daily_ftue'));
  const [showDailyFTUE, setShowDailyFTUE] = useState(false);
  const [hasSeenStuckTip, setHasSeenStuckTip] = useState(() => !!localStorage.getItem('pips_seen_stuck_tip'));
  const [showStuckTip, setShowStuckTip] = useState(false);
  // Unified FTUE step: 0=off, 1=rule, 2=hint, 3=undo, 4=done
  const [ftueStep, setFtueStep] = useState(0);
  const [ftueHintUsed, setFtueHintUsed] = useState(false);

  const toggleSfx = () => {
    const next = !audioPrefs.sfx;
    setSfxEnabled(next);
    setAudioPrefs(getAudioPrefs());
  };

  const toggleMusicFn = () => {
    const next = !audioPrefs.music;
    setMusicEnabled(next);
    if (next) startMusic();
    setAudioPrefs(getAudioPrefs());
  };

  // Unified Ticker for cooldowns and daily timer
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
      if (gameState === 'playing' && gameMode === 'daily') {
        setDailyTime(Math.floor((Date.now() - dailyStartTime) / 1000));
      }
    }, 100);
    return () => clearInterval(interval);
  }, [gameState, gameMode, dailyStartTime]);

  // Start music when entering gameplay
  useEffect(() => {
    if (gameState === 'playing') {
      startMusic();
    }
  }, [gameState]);

  // Stats
  const [stats, setStats] = useState<Stats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      totalSolved: 0,
      dailyStreak: 0,
      lastDailyDate: null,
      bestInfiniteLevel: 0,
      chaptersUnlocked: 1,
      completedChapterLevels: [],
      perfectChapterLevels: [],
      completedArchiveDates: [],
      perfectArchiveDates: [],
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  }, [stats]);

  // Current level
  const level = useMemo(() => {
    if (gameMode === 'chapter') return CHAPTER_LEVELS[currentLevelIdx];
    return customLevel || CHAPTER_LEVELS[0];
  }, [gameMode, currentLevelIdx, customLevel]);

  const currentPos = path[path.length - 1];

  const targetableMoves = useMemo(
    () => (currentPos ? getTargetableMovesFromPos(currentPos, level.grid, path) : []),
    [currentPos, level, path]
  );

  const isStuck =
    currentPos &&
    targetableMoves.length === 0 &&
    path.length < level.grid.length * level.grid[0].length;

  // Separate function to actually load the daily level (called after tutorial or directly)
  const startDailyLevel = useCallback(() => {
    const today = new Date();
    const seed = getSeedFromDate(today);
    const l = generateSolvableLevel(seed, 5, 5, seed);
    l.mode = 'daily';
    setCustomLevel(l);
    setGameMode('daily');
    setPath([l.startPos]);
    setGameState('playing');
    setHintPos(null);
    setUsedHint(false);
    setFtueStep(0);
    setDailyStartTime(Date.now());
    setShowStuckTip(false);
    setTutorialStep(0);
  }, []);

  const initLevel = useCallback(
    (idx: number, mode: GameMode = 'chapter', dateStr?: string) => {
      setGameMode(mode);
      let l: Level;

      if (mode === 'daily') {
        if (!hasSeenDailyFTUE) {
          localStorage.setItem('pips_seen_daily_ftue', '1');
          // Pre-generate the level so it's ready after tutorial
          const today = new Date();
          const seed = getSeedFromDate(today);
          const dl = generateSolvableLevel(seed, 5, 5, seed);
          dl.mode = 'daily';
          setCustomLevel(dl);
          setGameState('tutorial');
          return;
        }
        const today = new Date();
        const seed = getSeedFromDate(today);
        l = generateSolvableLevel(seed, 5, 5, seed);
        l.mode = 'daily';
        setCustomLevel(l);
        setPath([l.startPos]);
        setGameState('playing');
        setHintPos(null);
        setUsedHint(false);
        setFtueStep(0);
        setDailyStartTime(Date.now());
        setShowStuckTip(false);
        setTutorialStep(0);
        return;
      } else if (mode === 'archive' && dateStr) {
        const date = new Date(dateStr + 'T00:00:00Z');
        const seed = getSeedFromDate(date);
        l = generateSolvableLevel(seed, 5, 5, seed);
        l.mode = 'archive' as any;
        setArchiveDateStr(dateStr);
        setCustomLevel(l);
      } else {
        l = CHAPTER_LEVELS[idx];
        setCurrentLevelIdx(idx);
      }

      setPath([l!.startPos]);
      setGameState('playing');
      setHintPos(null);
      setUsedHint(false);
      setDailyStartTime(Date.now());
      setShowStuckTip(false);
      if (idx === 0 && mode === 'chapter') {
        setTutorialStep(1);
        setFtueStep(1);
        setFtueHintUsed(false);
      } else {
        setTutorialStep(0);
        setFtueStep(0);
      }
    },
    []
  );



  const updateStats = useCallback(
    (mode: GameMode, isPerfect: boolean) => {
      if (mode === 'chapter') {
        if (currentLevelIdx === stats.chaptersUnlocked * 5 - 1) {
          const nextUnlock = Math.min(stats.chaptersUnlocked + 1, 4);
          if (nextUnlock > stats.chaptersUnlocked) {
            setCelebrateChapter(Math.floor(currentLevelIdx / 5));
          }
        }
      }

      setStats((prev) => {
        const s = { ...prev, totalSolved: prev.totalSolved + 1 };
        if (mode === 'daily') {
          const todayStr = new Date().toISOString().split('T')[0];
          if (prev.lastDailyDate !== todayStr) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            s.dailyStreak =
              prev.lastDailyDate === yesterdayStr ? prev.dailyStreak + 1 : 1;
            s.lastDailyDate = todayStr;
          }
        }
        if (mode === 'archive' && archiveDateStr) {
          if (!s.completedArchiveDates) s.completedArchiveDates = [];
          if (!s.perfectArchiveDates) s.perfectArchiveDates = [];
          if (!s.completedArchiveDates.includes(archiveDateStr)) {
            s.completedArchiveDates = [...s.completedArchiveDates, archiveDateStr];
          }
          if (isPerfect && !s.perfectArchiveDates.includes(archiveDateStr)) {
            s.perfectArchiveDates = [...s.perfectArchiveDates, archiveDateStr];
          }
        }
        if (mode === 'chapter') {
          if (!s.completedChapterLevels) s.completedChapterLevels = [];
          if (!s.perfectChapterLevels) s.perfectChapterLevels = [];

          if (!s.completedChapterLevels.includes(currentLevelIdx)) {
            s.completedChapterLevels.push(currentLevelIdx);
          }
          if (isPerfect && !s.perfectChapterLevels.includes(currentLevelIdx)) {
            s.perfectChapterLevels.push(currentLevelIdx);
          }

          if (currentLevelIdx === prev.chaptersUnlocked * 5 - 1) {
            s.chaptersUnlocked = Math.min(prev.chaptersUnlocked + 1, 4);
          }
        }
        return s;
      });
    },
    [currentLevelIdx, stats.chaptersUnlocked, archiveDateStr]
  );

  // Handle a move
  const handleMove = (target: Position) => {
    if (gameState !== 'playing' || isAnimating) return;
    if (!targetableMoves.some((m) => m.x === target.x && m.y === target.y)) return;

    setIsAnimating(true);
    playMoveSound();

    // Small delay for animation
    setTimeout(() => {
      const newPath = [...path, target];
      setPath(newPath);
      setHintPos(null);
      setIsAnimating(false);

      if (currentLevelIdx === 0 && gameMode === 'chapter') {
        setTutorialStep((prev) => prev + 1);
      }

      // Win check
      const totalCells = level.grid.length * level.grid[0].length;
      if (newPath.length === totalCells) {
        if (gameMode === 'daily') {
          setDailyTime(Math.floor((Date.now() - dailyStartTime) / 1000));
        }
        playWinSound();
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: dark
            ? ['#818cf8', '#6366f1', '#f59e0b']
            : ['#1c1917', '#f5f5f4', '#f59e0b'],
        });
        updateStats(gameMode, !usedHint);
        setTimeout(() => setGameState('won'), 800);
      } else {
        // Natural Dead End check
        const newTargetable = getTargetableMovesFromPos(target, level.grid, newPath);
        if (newTargetable.length === 0) {
          playThudSound();
          setHintShake(true);
          setTimeout(() => setHintShake(false), 400);
          if (!hasSeenStuckTip) {
            setHasSeenStuckTip(true);
            setShowStuckTip(true);
            localStorage.setItem('pips_seen_stuck_tip', '1');
          }
        }
      }
    }, 120);
  };

  // Hint
  const showHint = () => {
    const COOLDOWN = 15000;
    const timeSinceLast = Date.now() - lastHintTime;
    if (timeSinceLast < COOLDOWN) return;

    setUsedHint(true);
    const totalCells = level.grid.length * level.grid[0].length;
    const solution = solvePuzzle(level.grid, path, totalCells);
    if (solution && solution.length > path.length) {
      setHintPos(solution[path.length]);
      playClickSound();
      setLastHintTime(Date.now());
    } else {
      // Wrong path or literally stuck
      playThudSound();
      setHintShake(true);
      setHintMessage("Seems you are in the wrong path");
      setTimeout(() => {
        setHintShake(false);
        setHintMessage(null);
      }, 3000);
    }
  };

  // Undo
  const undo = () => {
    if (gameState !== 'playing' || isAnimating) return;
    if (path.length > 1) {
      setPath((prev) => prev.slice(0, -1));
      setHintPos(null);
      setShowStuckTip(false);
      playUndoSound();
    }
  };



  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere if an input/modal is focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (gameState !== 'playing' || isAnimating) return;
      
      if (e.key === 'Backspace' || (e.ctrlKey && e.key === 'z') || (e.metaKey && e.key === 'z')) {
        e.preventDefault();
        undo();
        return;
      }
      
      let dx = 0, dy = 0;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') dy = -1;
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') dy = 1;
      else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') dx = -1;
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dx = 1;
      else return;

      const current = path[path.length - 1];
      const validTarget = targetableMoves.find(m => {
        if (dx === -1 && m.x < current.x && m.y === current.y) return true;
        if (dx === 1 && m.x > current.x && m.y === current.y) return true;
        if (dy === -1 && m.y < current.y && m.x === current.x) return true;
        if (dy === 1 && m.y > current.y && m.x === current.x) return true;
        return false;
      });

      if (validTarget) {
        e.preventDefault();
        handleMove(validTarget);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isAnimating, path, targetableMoves]);

  // Next level
  const nextLevel = () => {
    playClickSound();
    if (gameMode === 'archive') {
      setGameState('archive');
      return;
    }

    // If we just unlocked a new chapter, go to the Chapters screen to see the animation
    if (gameMode === 'chapter' && celebrateChapter !== null) {
      setGameState('chapters');
      return;
    }

    if (currentLevelIdx < CHAPTER_LEVELS.length - 1) {
      initLevel(currentLevelIdx + 1, 'chapter');
    } else {
      setGameState('menu');
      setCurrentLevelIdx(0);
    }
  };

  // Share text for daily
  const shareText = useMemo(() => {
    if (gameMode === 'daily' && gameState === 'won') {
      return generateShareText(path, dailyTime);
    }
    return undefined;
  }, [gameMode, gameState, path, dailyTime]);

  // --- Render screens ---

  // --- Render logic ---
  const modeLabel =
    gameMode === 'daily'
      ? 'Daily Path'
      : gameMode === 'archive'
        ? 'Archive'
        : 'Chapter';

  const levelLabel =
    gameMode === 'archive' && archiveDateStr
      ? archiveDateStr
      : `${level.id}`;

  // --- Floating settings menu JSX (for non-playing screens) ---
  const floatingSettingsMenu = (
    <div className="fixed top-5 left-5 z-50">
      <button
        onClick={() => { setShowSettings(s => !s); playClickSound(); }}
        className={`p-3 rounded-2xl border transition-all shadow-lg ${
          dark
            ? 'bg-stone-800 border-stone-700 hover:bg-stone-700 text-stone-300'
            : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-600'
        }`}
        aria-label="Menu"
      >
        {showSettings ? <X size={20} /> : <MenuIcon size={20} />}
      </button>

      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: -20, y: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 10 }}
              exit={{ opacity: 0, scale: 0.9, x: -20, y: -10 }}
              className={`absolute top-full left-0 mt-2 p-2 rounded-3xl shadow-2xl border flex flex-col gap-1 min-w-[180px] z-50 ${
                dark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100'
              }`}
            >
              {gameState !== 'menu' && (
                <button
                  onClick={() => { setGameState('menu'); setShowSettings(false); playClickSound(); }}
                  className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                    dark ? 'hover:bg-stone-800' : 'hover:bg-stone-50'
                  }`}
                >
                  <Home size={18} />
                  <span className="text-sm font-bold">Main Menu</span>
                </button>
              )}
              <a
                href="../../"
                className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                  dark ? 'hover:bg-stone-800' : 'hover:bg-stone-50'
                }`}
              >
                <ArrowLeft size={18} />
                <span className="text-sm font-bold">Back to Voidcade</span>
              </a>
              <button
                onClick={() => { toggleMusicFn(); playClickSound(); }}
                className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                  dark ? 'hover:bg-stone-800' : 'hover:bg-stone-50'
                } ${!audioPrefs.music ? 'opacity-40' : ''}`}
              >
                <Music size={18} />
                <span className="text-sm font-bold">Music</span>
              </button>
              <button
                onClick={() => { toggleSfx(); playClickSound(); }}
                className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                  dark ? 'hover:bg-stone-800' : 'hover:bg-stone-50'
                } ${!audioPrefs.sfx ? 'opacity-40' : ''}`}
              >
                {audioPrefs.sfx ? <Volume2 size={18} /> : <VolumeX size={18} />}
                <span className="text-sm font-bold">Sound</span>
              </button>
              <button
                onClick={() => { toggleTheme(); playClickSound(); }}
                className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                  dark ? 'hover:bg-stone-800' : 'hover:bg-stone-50'
                }`}
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
                <span className="text-sm font-bold">{dark ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
              <div className={`h-px mx-2 my-1 ${dark ? 'bg-stone-800' : 'bg-stone-100'}`} />
              <button
                onClick={() => { setShowRules(true); setShowSettings(false); playClickSound(); }}
                className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                  dark ? 'hover:bg-stone-800' : 'hover:bg-stone-50'
                }`}
              >
                <HelpCircle size={18} />
                <span className="text-sm font-bold">How to Play</span>
              </button>
              {gameState !== 'stats' && (
                <button
                  onClick={() => { setGameState('stats'); setShowSettings(false); playClickSound(); }}
                  className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                    dark ? 'hover:bg-stone-800' : 'hover:bg-stone-50'
                  }`}
                >
                  <BarChart2 size={18} />
                  <span className="text-sm font-bold">Statistics</span>
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );

  if (gameState === 'menu') {
    return (
      <>
        {floatingSettingsMenu}
        <MenuScreen
          hideSettings
          stats={stats}
          onStartDaily={() => initLevel(0, 'daily')}
          onOpenChapters={() => setGameState('chapters')}
          onOpenArchive={() => setGameState('archive')}
          onOpenStats={() => setGameState('stats')}
          onOpenRules={() => setShowRules(true)}
        />
        <RulesModal show={showRules} onClose={() => setShowRules(false)} />
      </>
    );
  }

  if (gameState === 'chapters') {
    return (
      <>
        {floatingSettingsMenu}
        <ChaptersScreen
          hideHeader
          stats={stats}
          onBack={() => setGameState('menu')}
          onSelectLevel={(idx) => {
            setCelebrateChapter(null);
            initLevel(idx, 'chapter');
          }}
          celebrateChapterIdx={celebrateChapter}
          onCelebrationEnd={() => setCelebrateChapter(null)}
        />
      </>
    );
  }

  if (gameState === 'tutorial') {
    return (
      <TutorialScreen
        onDone={startDailyLevel}
        onSkip={startDailyLevel}
      />
    );
  }

  if (gameState === 'archive') {
    return (
      <>
        {floatingSettingsMenu}
        <ArchiveScreen
          stats={stats}
          onSelectDate={(dateStr) => initLevel(0, 'archive', dateStr)}
        />
      </>
    );
  }

  if (gameState === 'stats') {
    return (
      <>
        {floatingSettingsMenu}
        <StatsScreen
          hideHeader
          stats={stats}
          onBack={() => setGameState('menu')}
        />
      </>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col items-center px-4 pb-6 pt-0 font-sans transition-colors duration-500 ${
        dark ? 'bg-stone-950 text-stone-100' : 'bg-stone-50 text-stone-900'
      }`}
    >
      {/* ── Unified top bar ── */}
      <div className={`w-full max-w-md flex items-center gap-2 py-3 mb-4 sticky top-0 z-30 ${
        dark ? 'bg-stone-950' : 'bg-stone-50'
      }`}>

        {/* Left: hamburger */}
        <div className="relative">
          <button
            onClick={() => { setShowSettings(!showSettings); playClickSound(); }}
            className={`p-2.5 rounded-2xl border transition-all active:scale-95 ${
              dark
                ? 'bg-stone-800 border-stone-700 hover:bg-stone-700 text-stone-300'
                : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-600'
            }`}
            aria-label="Menu"
          >
            {showSettings ? <X size={20} /> : <MenuIcon size={20} />}
          </button>

          <AnimatePresence>
            {showSettings && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowSettings(false)}
                  className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, x: -10, y: -6 }}
                  animate={{ opacity: 1, scale: 1, x: 0, y: 6 }}
                  exit={{ opacity: 0, scale: 0.9, x: -10, y: -6 }}
                  className={`absolute top-full left-0 mt-1 p-2 rounded-3xl shadow-2xl border flex flex-col gap-1 min-w-[190px] z-50 ${
                    dark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100'
                  }`}
                >
                  <button
                    onClick={() => { setGameState('menu'); setShowSettings(false); playClickSound(); }}
                    className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                      dark ? 'hover:bg-stone-800' : 'hover:bg-stone-50'
                    }`}
                  >
                    <Home size={18} />
                    <span className="text-sm font-bold">Main Menu</span>
                  </button>
                  <a
                    href="../../"
                    className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                      dark ? 'hover:bg-stone-800' : 'hover:bg-stone-50'
                    }`}
                  >
                    <ArrowLeft size={18} />
                    <span className="text-sm font-bold">Back to Voidcade</span>
                  </a>
                  <button
                    onClick={() => { toggleMusicFn(); playClickSound(); }}
                    className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                      dark ? 'hover:bg-stone-800' : 'hover:bg-stone-50'
                    } ${!audioPrefs.music ? 'opacity-40' : ''}`}
                  >
                    <Music size={18} />
                    <span className="text-sm font-bold">Music</span>
                  </button>
                  <button
                    onClick={() => { toggleSfx(); playClickSound(); }}
                    className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                      dark ? 'hover:bg-stone-800' : 'hover:bg-stone-50'
                    } ${!audioPrefs.sfx ? 'opacity-40' : ''}`}
                  >
                    {audioPrefs.sfx ? <Volume2 size={18} /> : <VolumeX size={18} />}
                    <span className="text-sm font-bold">Sound</span>
                  </button>
                  <button
                    onClick={() => { toggleTheme(); playClickSound(); }}
                    className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                      dark ? 'hover:bg-stone-800' : 'hover:bg-stone-50'
                    }`}
                  >
                    {dark ? <Sun size={18} /> : <Moon size={18} />}
                    <span className="text-sm font-bold">{dark ? 'Light Mode' : 'Dark Mode'}</span>
                  </button>
                  <div className={`h-px mx-2 my-1 ${dark ? 'bg-stone-800' : 'bg-stone-100'}`} />
                  <button
                    onClick={() => { setShowRules(true); setShowSettings(false); playClickSound(); }}
                    className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                      dark ? 'hover:bg-stone-800' : 'hover:bg-stone-50'
                    }`}
                  >
                    <HelpCircle size={18} />
                    <span className="text-sm font-bold">How to Play</span>
                  </button>
                  <button
                    onClick={() => { setGameState('stats'); setShowSettings(false); playClickSound(); }}
                    className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                      dark ? 'hover:bg-stone-800' : 'hover:bg-stone-50'
                    }`}
                  >
                    <BarChart2 size={18} />
                    <span className="text-sm font-bold">Statistics</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Center: title + mode label */}
        <div className="flex-1 flex flex-col items-center leading-none">
          <span className="text-lg font-black tracking-tighter uppercase leading-none">
            Pips & Paths
          </span>
          <span className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${dark ? 'text-stone-500' : 'text-stone-400'}`}>
            {levelLabel} • {modeLabel}
          </span>
        </div>

        {/* Right: hint + undo + restart */}
        <div className="flex items-center gap-1.5">
          {/* Hint with cooldown ring */}
          <div className="relative">
            <motion.button
              animate={
                hintShake
                  ? {
                      x: [-4, 4, -4, 4, 0],
                      backgroundColor: ['rgba(239,68,68,0)', 'rgba(239,68,68,0.2)', 'rgba(239,68,68,0)'],
                      transition: { duration: 0.4 },
                    }
                  : {}
              }
              onClick={showHint}
              disabled={now - lastHintTime < 15000}
              aria-label="Hint"
              className={`p-2.5 rounded-2xl border transition-all active:scale-95 group disabled:opacity-50 ${
                isStuck
                  ? 'bg-red-500/20 text-red-500 border-red-500/50'
                  : dark
                    ? 'bg-stone-800 border-stone-700 hover:bg-amber-900/30 hover:border-amber-700'
                    : 'bg-white border-stone-200 hover:bg-amber-50 hover:border-amber-200'
              }`}
            >
              <Lightbulb
                size={18}
                className={`transition-colors ${
                  isStuck
                    ? 'text-red-500'
                    : dark
                      ? 'text-stone-400 group-hover:text-amber-400'
                      : 'text-stone-600 group-hover:text-amber-500'
                }`}
              />
            </motion.button>
            {now - lastHintTime < 15000 && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <svg className="w-[80%] h-[80%] -rotate-90">
                  <circle
                    cx="50%" cy="50%" r="45%"
                    fill="none" stroke="#f59e0b" strokeWidth="4"
                    pathLength="100" strokeDasharray="100"
                    strokeDashoffset={100 - ((now - lastHintTime) / 15000) * 100}
                    strokeLinecap="round" className="opacity-40"
                  />
                </svg>
              </div>
            )}
          </div>

          <button
            onClick={undo}
            disabled={path.length <= 1}
            aria-label="Undo"
            className={`p-2.5 rounded-2xl border transition-all active:scale-95 disabled:opacity-30 ${
              dark ? 'bg-stone-800 border-stone-700 hover:bg-stone-700' : 'bg-white border-stone-200 hover:bg-stone-50'
            }`}
          >
            <Undo2 size={18} className={dark ? 'text-stone-400' : 'text-stone-600'} />
          </button>

          <button
            onClick={() => { playClickSound(); initLevel(currentLevelIdx, gameMode); }}
            aria-label="Restart"
            className={`p-2.5 rounded-2xl border transition-all active:scale-95 ${
              dark ? 'bg-stone-800 border-stone-700 hover:bg-stone-700' : 'bg-white border-stone-100 hover:bg-stone-50'
            }`}
          >
            <RotateCcw size={18} className={dark ? 'text-stone-400' : 'text-stone-600'} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div
        className={`relative p-4 rounded-[2.5rem] shadow-inner border-4 ${
          dark
            ? 'bg-stone-900/50 border-stone-800'
            : 'bg-stone-200/30 border-stone-200'
        }`}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${level.grid[0].length}, 1fr)`,
          gap: '12px',
          width: 'min(95vw, 450px)',
          aspectRatio: `${level.grid[0].length} / ${level.grid.length}`,
        }}
      >
        {/* Path Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 p-4 overflow-visible">
          {path.map((p, i) => {
            if (i === 0) return null;
            const prev = path[i - 1];
            const cellW = 100 / level.grid[0].length;
            const cellH = 100 / level.grid.length;
            return (
              <motion.line
                key={i}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                x1={`${prev.x * cellW + cellW / 2}%`}
                y1={`${prev.y * cellH + cellH / 2}%`}
                x2={`${p.x * cellW + cellW / 2}%`}
                y2={`${p.y * cellH + cellH / 2}%`}
                stroke={dark ? 'rgba(129, 140, 248, 0.3)' : 'rgba(28, 25, 23, 0.15)'}
                strokeWidth="4"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {level.grid.map((row, y) =>
          row.map((value, x) => {
            const isCurr = currentPos && currentPos.x === x && currentPos.y === y;
            const isVis = path.some((p) => p.x === x && p.y === y);
            const isTarget = targetableMoves.some((m) => m.x === x && m.y === y);
            const isHint = hintPos?.x === x && hintPos?.y === y;

            return (
              <motion.div
                key={`${x}-${y}`}
                className="relative aspect-square"
                layout
                animate={
                  isCurr
                    ? { scale: 1, opacity: 1 }
                    : { scale: 1, opacity: 1 }
                }
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <DieFace
                  value={value}
                  isCurrent={!!isCurr}
                  isVisited={isVis}
                  isTargetable={isTarget}
                  isHint={isHint}
                />
                {(isTarget || isHint) && (
                  <button
                    onClick={() => handleMove({ x, y })}
                    className="absolute inset-0 z-20"
                  />
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Tutorial / Instruction Text */}
      <div className="mt-6 text-center max-w-xs relative w-full px-4">
        <AnimatePresence mode="wait">

          {/* Daily FTUE */}
          {showDailyFTUE ? (
            <motion.div
              key="daily-ftue"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-2xl shadow-xl mb-2 ${dark ? 'bg-indigo-600 text-white' : 'bg-stone-900 text-white'}`}
            >
              <p className="text-sm font-bold leading-relaxed">
                Welcome to the Daily Path! Each die shows how many spaces you must jump — horizontally or vertically. Visit every die exactly once to win.
              </p>
              <button
                onClick={() => setShowDailyFTUE(false)}
                className="mt-3 text-xs font-black uppercase tracking-widest opacity-70 hover:opacity-100"
              >
                Got it →
              </button>
            </motion.div>

          /* Chapter tutorial steps */
          ) : currentLevelIdx === 0 && gameMode === 'chapter' && tutorialStep > 0 && tutorialStep <= 4 ? (
            <motion.div
              key={tutorialStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-2xl shadow-xl mb-2 ${dark ? 'bg-indigo-600 text-white' : 'bg-stone-900 text-white'}`}
            >
              <p className="text-sm font-bold">
                {tutorialStep === 1 && 'Look at the pips on your die. Tap a die that exact number of spaces away.'}
                {tutorialStep === 2 && 'Great! Now jump again — always matching the pip count.'}
                {tutorialStep === 3 && 'Almost there! Visit the last die to complete the path.'}
                {tutorialStep === 4 && <span className="flex items-center justify-center gap-2">Perfect! You've got it. <Sparkles size={16} /></span>}
              </p>
            </motion.div>

          /* First-time stuck tip */
          ) : showStuckTip ? (
            <motion.div
              key="stuck-tip"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-2xl shadow-xl border-2 ${
                dark ? 'bg-stone-900 border-red-500/40 text-white' : 'bg-white border-red-400/40 text-stone-900'
              }`}
            >
              <p className="text-sm font-black mb-3">🚧 Dead end — no moves left from here.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { undo(); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm transition-all active:scale-95 ${
                    dark ? 'bg-stone-800 hover:bg-stone-700 text-stone-200' : 'bg-stone-100 hover:bg-stone-200 text-stone-800'
                  }`}
                >
                  <Undo2 size={15} /> Undo
                </button>
                <button
                  onClick={() => { playClickSound(); initLevel(currentLevelIdx, gameMode); setShowStuckTip(false); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm transition-all active:scale-95 ${
                    dark ? 'bg-stone-800 hover:bg-stone-700 text-stone-200' : 'bg-stone-100 hover:bg-stone-200 text-stone-800'
                  }`}
                >
                  <RotateCcw size={15} /> Restart
                </button>
              </div>
            </motion.div>

          /* Stuck (repeat) */
          ) : isStuck ? (
            <motion.div
              key="stuck"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`flex items-center justify-center gap-3 py-3 px-4 rounded-2xl ${
                dark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-500'
              }`}
            >
              <span className="text-sm font-black">Dead end — undo or restart</span>
            </motion.div>

          /* Normal hint message */
          ) : hintMessage ? (
            <motion.p key="hint-msg" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-sm font-bold text-amber-500"
            >
              {hintMessage}
            </motion.p>

          /* Default instruction */
          ) : (
            <motion.p
              key="default"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-sm font-medium leading-relaxed ${dark ? 'text-stone-500' : 'text-stone-400'}`}
            >
              {currentPos ? (
                <>Jump{' '}
                  <span className={`font-bold ${dark ? 'text-white' : 'text-stone-900'}`}>
                    {level.grid[currentPos.y][currentPos.x]}
                  </span>{' '}spaces to reach the next die.</>
              ) : 'Select a die to start.'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <WinModal
        show={gameState === 'won'}
        level={level}
        currentLevelIdx={currentLevelIdx}
        gameMode={gameMode}
        infiniteLevel={0}
        onNext={nextLevel}
        onReplay={() => { playClickSound(); initLevel(currentLevelIdx, gameMode); }}
        shareText={shareText}
        isPerfect={!usedHint}
      />
      
      {/* Rules Modal (opened from hamburger) */}
      <RulesModal show={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}

// --- Root Wrapper ---
export default function App() {
  return (
    <ThemeProvider>
      <GameApp />
    </ThemeProvider>
  );
}
