import { useCallback, useMemo, useState } from 'react';
import FailModal from './components/FailModal';
import { BackIcon, HelpIcon, HomeIcon, SoundIcon } from './components/Icon';
import RulesModal from './components/RulesModal';
import WinModal from './components/WinModal';
import { generateWardenLevel } from './engine/generator';
import { loadProgress, recordLevelWin, saveProgress, starsForResult, type Progress } from './engine/progress';
import { TOTAL_LEVELS, getLevelRef, seedForLevel } from './engine/saga';
import type { WardenLevel } from './engine/types';
import MenuScreen from './screens/MenuScreen';
import PlayScreen from './screens/PlayScreen';
import SagaScreen from './screens/SagaScreen';
import { getAudioPrefs, playClick, playWin, setSfxEnabled } from './sounds';

type Screen = 'menu' | 'saga' | 'play';

const RULES_SEEN_KEY = 'wardens_seen_rules_v1';

function hasSeenRules(): boolean {
  try {
    return !!localStorage.getItem(RULES_SEEN_KEY);
  } catch {
    return false;
  }
}

function markRulesSeen() {
  try {
    localStorage.setItem(RULES_SEEN_KEY, '1');
  } catch {
    /* localStorage unavailable — the modal just shows again next time */
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number | null>(null);
  const [winInfo, setWinInfo] = useState<{ stars: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attemptKey, setAttemptKey] = useState(0);
  const [showRules, setShowRules] = useState(false);
  const [audioPrefs, setAudioPrefs] = useState(getAudioPrefs);

  const currentLevelRef = currentLevelIndex !== null ? getLevelRef(currentLevelIndex) : null;

  const currentLevel: WardenLevel | null = useMemo(() => {
    if (!currentLevelRef) return null;
    return generateWardenLevel({
      id: currentLevelRef.id,
      size: currentLevelRef.size,
      seed: seedForLevel(currentLevelRef.id),
      singletonDomains: currentLevelRef.singletons,
      // Levels that don't hand out singletons must not grow one by accident —
      // that would gift a free Warden in a level meant to be solved.
      minDomainSize: currentLevelRef.singletons > 0 ? 1 : 2,
    });
  }, [currentLevelRef]);

  const updateProgress = useCallback((updater: (p: Progress) => Progress) => {
    setProgress((prev) => {
      const next = updater(prev);
      saveProgress(next);
      return next;
    });
  }, []);

  const startLevel = (globalIndex: number) => {
    setCurrentLevelIndex(globalIndex);
    setWinInfo(null);
    setFailed(false);
    setAttemptKey((k) => k + 1);
    setScreen('play');

    // First time anyone opens the very first level, teach the rules up front
    // rather than letting them lose lives discovering them.
    if (globalIndex === 0 && !hasSeenRules()) {
      markRulesSeen();
      setShowRules(true);
    }
  };

  const handlePlayFromMenu = () => {
    // Resume at the first not-yet-completed level, or the first level.
    const nextIdx = progress.unlockedIndex;
    startLevel(Math.min(nextIdx, TOTAL_LEVELS - 1));
  };

  const handleWin = (livesLost: number, usedHint: boolean) => {
    if (currentLevelIndex === null || !currentLevelRef) return;
    playWin();

    updateProgress((p) => recordLevelWin(p, currentLevelIndex, livesLost, usedHint));
    setWinInfo({ stars: starsForResult({ completed: true, mistakes: livesLost, usedHint }) });
  };

  const handleFail = () => {
    setFailed(true);
  };

  const handleRetry = () => {
    setFailed(false);
    setAttemptKey((k) => k + 1);
  };

  const handleNextLevel = () => {
    if (currentLevelIndex === null) return;
    const next = currentLevelIndex + 1;
    setWinInfo(null);
    if (next >= TOTAL_LEVELS) {
      setScreen('saga');
      return;
    }
    startLevel(next);
  };

  const toggleSfx = () => {
    const next = !audioPrefs.sfx;
    setSfxEnabled(next);
    setAudioPrefs(getAudioPrefs());
    playClick();
  };

  const isLastInRealm = currentLevelRef
    ? currentLevelRef.levelInRealm === currentLevelRef.realm.levelCount - 1
    : false;
  const isSagaComplete = currentLevelIndex !== null && currentLevelIndex >= TOTAL_LEVELS - 1 && !!winInfo;

  return (
    <div className="app-shell">
      {screen !== 'menu' && (
        <div className="top-bar">
          <button
            className="icon-btn"
            onClick={() => {
              playClick();
              setScreen(screen === 'play' ? 'saga' : 'menu');
            }}
            aria-label="Back"
          >
            {screen === 'play' ? <BackIcon /> : <HomeIcon />}
          </button>
          <span className="top-bar-title">
            {screen === 'saga' && 'SAGA MAP'}
            {screen === 'play' && currentLevelRef && (
              <>
                {currentLevelRef.realm.name.toUpperCase()} · <strong>{currentLevelRef.levelInRealm + 1}</strong>
              </>
            )}
          </span>
          <button
            className="icon-btn"
            onClick={() => {
              playClick();
              setShowRules(true);
            }}
            aria-label="How to play"
          >
            <HelpIcon />
          </button>
          <button className="icon-btn" onClick={toggleSfx} aria-label="Toggle sound">
            <SoundIcon on={audioPrefs.sfx} />
          </button>
        </div>
      )}

      {screen === 'menu' && (
        <MenuScreen
          progress={progress}
          onPlay={handlePlayFromMenu}
          onOpenSaga={() => setScreen('saga')}
          onOpenRules={() => setShowRules(true)}
        />
      )}

      {screen === 'saga' && <SagaScreen progress={progress} onSelectLevel={startLevel} />}

      {screen === 'play' && currentLevelRef && currentLevel && (
        <PlayScreen
          levelRef={currentLevelRef}
          level={currentLevel}
          onWin={handleWin}
          onFail={handleFail}
          attemptKey={attemptKey}
        />
      )}

      {winInfo && (
        <WinModal
          stars={winInfo.stars}
          isLastInRealm={isLastInRealm}
          isSagaComplete={isSagaComplete}
          onNext={handleNextLevel}
          onMap={() => {
            setWinInfo(null);
            setScreen('saga');
          }}
        />
      )}

      {failed && (
        <FailModal
          onRetry={handleRetry}
          onMap={() => {
            setFailed(false);
            setScreen('saga');
          }}
        />
      )}

      {showRules && (
        <RulesModal onClose={() => setShowRules(false)} closeLabel={screen === 'play' ? 'Begin' : 'Got it'} />
      )}
    </div>
  );
}
