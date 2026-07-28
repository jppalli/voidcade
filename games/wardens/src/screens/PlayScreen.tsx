import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import Icon, { HeartIcon, LightbulbIcon, RestartIcon, XMarkGlyph } from '../components/Icon';
import { boonGlyphInner, type BoonId } from '../engine/boons';
import { elementGlyphInner, getElement } from '../engine/elements';
import type { Progress } from '../engine/progress';
import {
  MAX_LIVES,
  applyBanish,
  cloneMarks,
  createInitialState,
  isOutOfLives,
  isSolutionCell,
  isSolved,
  livesRemaining,
  type PuzzleState,
} from '../engine/puzzleState';
import type { LevelRef } from '../engine/saga';
import type { WardenLevel } from '../engine/types';
import { playMark, playMistake, playPlaceWarden } from '../sounds';

interface PlayScreenProps {
  levelRef: LevelRef;
  level: WardenLevel;
  progress: Progress;
  onWin: (livesLost: number, usedHint: boolean) => void;
  onFail: () => void;
  onSpendBoon: (id: BoonId) => void;
  /** bumped by the parent to force a fresh attempt (retry after failing) */
  attemptKey: number;
}

export default function PlayScreen({
  levelRef,
  level,
  progress,
  onWin,
  onFail,
  onSpendBoon,
  attemptKey,
}: PlayScreenProps) {
  const [state, setState] = useState<PuzzleState>(() => createInitialState(level.size));
  const [errorCells, setErrorCells] = useState<Set<string>>(new Set());
  const [hintCell, setHintCell] = useState<string | null>(null);
  const [banishMode, setBanishMode] = useState(false);
  const resolvedRef = useRef(false);

  // Fresh state whenever the level or the attempt changes.
  useEffect(() => {
    setState(createInitialState(level.size));
    setErrorCells(new Set());
    setHintCell(null);
    setBanishMode(false);
    resolvedRef.current = false;
  }, [level, attemptKey]);

  const size = level.size;

  const revealCell = useCallback(
    (row: number, col: number) => {
      if (resolvedRef.current) return;
      if (state.marks[row][col] !== 'empty') return; // already resolved, ignore

      setHintCell(null);
      const correct = isSolutionCell(level, row, col);

      if (correct) {
        setState((prev) => {
          const marks = cloneMarks(prev.marks);
          marks[row][col] = 'warden';
          return { ...prev, marks };
        });
        playPlaceWarden();
        return;
      }

      // Wrong guess: cross the cell out permanently. Aegis absorbs the life
      // cost (but the cell still gets crossed, since it genuinely is wrong).
      const shielded = state.aegisShieldActive;
      setState((prev) => {
        const marks = cloneMarks(prev.marks);
        marks[row][col] = 'x';
        return {
          ...prev,
          marks,
          livesLost: shielded ? prev.livesLost : prev.livesLost + 1,
          aegisShieldActive: shielded ? false : prev.aegisShieldActive,
        };
      });

      if (!shielded) {
        setErrorCells(new Set([`${row},${col}`]));
        playMistake();
        setTimeout(() => setErrorCells(new Set()), 420);
      } else {
        playMark();
      }
    },
    [level, state.marks, state.aegisShieldActive]
  );

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (resolvedRef.current) return;

      if (banishMode) {
        const region = level.regions[row][col];
        setState((prev) => ({ ...prev, marks: applyBanish(prev.marks, level.regions, region) }));
        setBanishMode(false);
        onSpendBoon('banish');
        return;
      }

      revealCell(row, col);
    },
    [banishMode, level.regions, onSpendBoon, revealCell]
  );

  // Win / loss resolution
  useEffect(() => {
    if (resolvedRef.current) return;

    if (isSolved(state.marks, level)) {
      resolvedRef.current = true;
      setTimeout(() => onWin(state.livesLost, state.usedHint), 320);
      return;
    }

    if (isOutOfLives(state)) {
      resolvedRef.current = true;
      setTimeout(() => onFail(), 520);
    }
  }, [state, level, onWin, onFail]);

  const restart = () => {
    setState(createInitialState(level.size));
    setErrorCells(new Set());
    setHintCell(null);
    setBanishMode(false);
    resolvedRef.current = false;
  };

  const revealHintCell = (markUsedHint: boolean) => {
    const target = level.solution.find((p) => state.marks[p.row][p.col] !== 'warden');
    if (!target) return null;
    setHintCell(`${target.row},${target.col}`);
    if (markUsedHint) setState((prev) => ({ ...prev, usedHint: true }));
    setTimeout(() => setHintCell(null), 2400);
    return target;
  };

  const useHint = () => {
    revealHintCell(true);
  };

  const banishCount = progress.inventory.banish ?? 0;
  const seersEyeCount = progress.inventory['seers-eye'] ?? 0;
  const aegisCount = progress.inventory.aegis ?? 0;

  const useSeersEye = () => {
    if (seersEyeCount <= 0) return;
    // Seer's Eye doesn't just point — it places the Warden for you.
    const target = level.solution.find((p) => state.marks[p.row][p.col] !== 'warden');
    if (!target) return;
    setState((prev) => {
      const marks = cloneMarks(prev.marks);
      marks[target.row][target.col] = 'warden';
      return { ...prev, marks };
    });
    playPlaceWarden();
    onSpendBoon('seers-eye');
  };

  const useAegis = () => {
    if (aegisCount <= 0 || state.aegisShieldActive) return;
    setState((prev) => ({ ...prev, aegisShieldActive: true }));
    onSpendBoon('aegis');
  };

  const lives = livesRemaining(state);

  return (
    <div className="play-screen">
      <div className="play-hud">
        <span className="play-hud-label">
          {levelRef.realm.name} · {levelRef.levelInRealm + 1}
        </span>
        <div className="lives-row" aria-label={`${lives} lives remaining`}>
          {Array.from({ length: MAX_LIVES }).map((_, i) => (
            <HeartIcon key={i} filled={i < lives} size={22} />
          ))}
        </div>
      </div>

      {state.aegisShieldActive && <div className="aegis-banner">Aegis active — your next wrong tap is free.</div>}
      {banishMode && <div className="banish-hint">Tap any cell in the domain you want to Banish.</div>}

      <div className="board-wrap">
        <div
          className="board-grid"
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, gridTemplateRows: `repeat(${size}, 1fr)` }}
        >
          {level.regions.map((rowRegions, r) =>
            rowRegions.map((regionIdx, c) => {
              const element = getElement(level.elementOrder[regionIdx]);
              const mark = state.marks[r][c];
              const key = `${r},${c}`;
              const isError = errorCells.has(key);
              const isHint = hintCell === key;

              // Thick dark border only where this cell meets a *different*
              // domain (or the board edge), so region shapes read clearly.
              // All four edges go into one combined box-shadow — separate CSS
              // classes would each overwrite the others.
              const edges: string[] = [];
              if (r === 0 || level.regions[r - 1][c] !== regionIdx) edges.push('inset 0 3px 0 0 #06060c');
              if (r === size - 1 || level.regions[r + 1][c] !== regionIdx) edges.push('inset 0 -3px 0 0 #06060c');
              if (c === 0 || rowRegions[c - 1] !== regionIdx) edges.push('inset 3px 0 0 0 #06060c');
              if (c === size - 1 || rowRegions[c + 1] !== regionIdx) edges.push('inset -3px 0 0 0 #06060c');
              // Thin cell separators inside a domain, listed last so the
              // thick domain borders above paint over them.
              edges.push('inset 0 -1px 0 0 rgba(6,6,12,0.32)');
              edges.push('inset -1px 0 0 0 rgba(6,6,12,0.32)');

              return (
                <button
                  key={key}
                  className={`board-cell ${isError ? 'error-flash' : ''} ${isHint ? 'hint-glow' : ''} ${
                    mark === 'x' ? 'is-crossed' : ''
                  }`}
                  style={
                    {
                      '--cell-color': element.cell,
                      boxShadow: edges.join(', '),
                    } as CSSProperties
                  }
                  onClick={() => handleCellClick(r, c)}
                  aria-label={`Row ${r + 1}, column ${c + 1}, ${element.name} domain`}
                >
                  {mark === 'x' && <XMarkGlyph size={Math.max(16, 220 / size)} color="rgba(8,8,15,0.62)" />}
                  {mark === 'warden' && (
                    <Icon
                      inner={elementGlyphInner(element.id)}
                      color={element.ink}
                      size={Math.max(20, 210 / size)}
                      className="cell-warden"
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="play-controls">
        <button className="control-btn" onClick={restart}>
          <RestartIcon />
          Restart
        </button>
        <button className="control-btn" onClick={useHint}>
          <LightbulbIcon />
          Hint
        </button>
        <button className="control-btn" onClick={useSeersEye} disabled={seersEyeCount <= 0}>
          <Icon inner={boonGlyphInner('seers-eye')} color="#7dffd4" size={20} />
          Seer's Eye
          {seersEyeCount > 0 && <span className="control-btn-badge">{seersEyeCount}</span>}
        </button>
        <button className="control-btn" onClick={() => setBanishMode((b) => !b)} disabled={banishCount <= 0}>
          <Icon inner={boonGlyphInner('banish')} color="#7dffd4" size={20} />
          Banish
          {banishCount > 0 && <span className="control-btn-badge">{banishCount}</span>}
        </button>
        <button
          className="control-btn"
          onClick={useAegis}
          disabled={aegisCount <= 0 || state.aegisShieldActive}
        >
          <Icon inner={boonGlyphInner('aegis')} color="#7dffd4" size={20} />
          Aegis
          {aegisCount > 0 && <span className="control-btn-badge">{aegisCount}</span>}
        </button>
      </div>

      <p className="rules-hint">
        One Warden per row, column, and colored domain — and no two may touch, not even diagonally. Tap where you
        think one belongs. Guess wrong and you lose a life.
      </p>
    </div>
  );
}
