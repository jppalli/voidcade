import { useCallback, useMemo, useState } from 'react';
import BoonChoiceModal from './components/BoonChoiceModal';
import FailModal from './components/FailModal';
import { BackIcon, HomeIcon, SoundIcon } from './components/Icon';
import WinModal from './components/WinModal';
import type { BoonId } from './engine/boons';
import { generateWardenLevel } from './engine/generator';
import { grantBoon, loadProgress, recordLevelWin, saveProgress, spendBoon, starsForResult, type Progress } from './engine/progress';
import { TOTAL_LEVELS, getLevelRef, seedForLevel } from './engine/saga';
import type { WardenLevel } from './engine/types';
import MenuScreen from './screens/MenuScreen';
import PlayScreen from './screens/PlayScreen';
import SagaScreen from './screens/SagaScreen';
import { getAudioPrefs, playBoonAwarded, playClick, playWin, setSfxEnabled } from './sounds';

type Screen = 'menu' | 'saga' | 'play';

// Rotate through pairs of boon options offered on boon-granting levels, so
// the choice varies rather than always offering the same two.
const BOON_OPTION_SETS: BoonId[][] = [
  ['seers-eye', 'banish'],
  ['banish', 'aegis'],
  ['aegis', 'seers-eye'],
];

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number | null>(null);
  const [winInfo, setWinInfo] = useState<{ stars: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attemptKey, setAttemptKey] = useState(0);
  const [boonChoice, setBoonChoice] = useState<BoonId[] | null>(null);
  const [audioPrefs, setAudioPrefs] = useState(getAudioPrefs);

  const currentLevelRef = currentLevelIndex !== null ? getLevelRef(currentLevelIndex) : null;

  const currentLevel: WardenLevel | null = useMemo(() => {
    if (!currentLevelRef) return null;
    return generateWardenLevel({
      id: currentLevelRef.id,
      size: currentLevelRef.size,
      seed: seedForLevel(currentLevelRef.id),
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
    const stars = starsForResult({ completed: true, mistakes: livesLost, usedHint });
    setWinInfo({ stars });

    if (currentLevelRef.grantsBoon) {
      const setIdx = Math.floor(currentLevelRef.globalIndex / 3) % BOON_OPTION_SETS.length;
      setBoonChoice(BOON_OPTION_SETS[setIdx]);
    }
  };

  const handleFail = () => {
    setFailed(true);
  };

  const handleRetry = () => {
    setFailed(false);
    setAttemptKey((k) => k + 1);
  };

  const handleChooseBoon = (id: BoonId) => {
    playBoonAwarded();
    updateProgress((p) => grantBoon(p, id));
    setBoonChoice(null);
  };

  const handleSpendBoon = (id: BoonId) => {
    updateProgress((p) => spendBoon(p, id) ?? p);
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

  const isLastInRealm = currentLevelRef ? currentLevelRef.levelInRealm === currentLevelRef.realm.levelCount - 1 : false;
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
          <button className="icon-btn" onClick={toggleSfx} aria-label="Toggle sound">
            <SoundIcon on={audioPrefs.sfx} />
          </button>
        </div>
      )}

      {screen === 'menu' && (
        <MenuScreen progress={progress} onPlay={handlePlayFromMenu} onOpenSaga={() => setScreen('saga')} />
      )}

      {screen === 'saga' && <SagaScreen progress={progress} onSelectLevel={startLevel} />}

      {screen === 'play' && currentLevelRef && currentLevel && (
        <PlayScreen
          levelRef={currentLevelRef}
          level={currentLevel}
          progress={progress}
          onWin={handleWin}
          onFail={handleFail}
          onSpendBoon={handleSpendBoon}
          attemptKey={attemptKey}
        />
      )}

      {winInfo && !boonChoice && (
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

      {boonChoice && <BoonChoiceModal options={boonChoice} onChoose={handleChooseBoon} />}
    </div>
  );
}
