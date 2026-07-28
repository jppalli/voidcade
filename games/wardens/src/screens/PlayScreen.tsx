import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Icon, { LightbulbIcon, RestartIcon, UndoIcon, XMarkGlyph } from '../components/Icon';
import { boonGlyphInner, type BoonId } from '../engine/boons';
import { elementGlyphInner, getElement } from '../engine/elements';
import type { Progress } from '../engine/progress';
import {
  applyBanish,
  cloneMarks,
  createInitialState,
  findConflicts,
  getWardenPositions,
  isSolved,
  nextMark,
  type PuzzleState,
} from '../engine/puzzleState';
import { findSolution } from '../engine/solver';
import type { LevelRef } from '../engine/saga';
import type { WardenLevel } from '../engine/types';
import { playMark, playMistake, playPlaceWarden, playRemove } from '../sounds';

interface PlayScreenProps {
  levelRef: LevelRef;
  level: WardenLevel;
  progress: Progress;
  onWin: (mistakes: number, usedHint: boolean) => void;
  onSpendBoon: (id: BoonId) => void;
}

export default function PlayScreen({ levelRef, level, progress, onWin, onSpendBoon }: PlayScreenProps) {
  const [state, setState] = useState<PuzzleState>(() => createInitialState(level.size));
  const [errorCells, setErrorCells] = useState<Set<string>>(new Set());
  const [hintCell, setHintCell] = useState<string | null>(null);
  const [banishMode, setBanishMode] = useState(false);
  const wonRef = useRef(false);

  // Reset local puzzle state whenever the level changes.
  useEffect(() => {
    setState(createInitialState(level.size));
    setErrorCells(new Set());
    setHintCell(null);
    setBanishMode(false);
    wonRef.current = false;
  }, [level]);

  const conflicts = useMemo(() => findConflicts(state.marks, level.regions), [state.marks, level.regions]);

  const size = level.size;

  const applyMarksUpdate = useCallback(
    (updater: (marks: import('../engine/types').CellMark[][]) => import('../engine/types').CellMark[][]) => {
      setState((prev) => {
        const nextMarks = updater(prev.marks);
        return { ...prev, marks: nextMarks, history: [...prev.history, cloneMarks(prev.marks)] };
      });
    },
    []
  );

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (wonRef.current) return;

      if (banishMode) {
        const region = level.regions[row][col];
        applyMarksUpdate((marks) => applyBanish(marks, level.regions, region));
        setBanishMode(false);
        onSpendBoon('banish');
        return;
      }

      setHintCell(null);
      const current = state.marks[row][col];
      const next = nextMark(current);

      // Decide up front (using the current, pre-update marks) whether this
      // placement conflicts, so exactly one state update — and one history
      // entry — happens per click, keeping Undo predictable.
      let willConflict = false;
      if (next === 'warden') {
        const wardensAfter = getWardenPositions(state.marks).concat({ row, col });
        willConflict = wardensAfter.some((w) => {
          if (w.row === row && w.col === col) return false;
          const sameRow = w.row === row;
          const sameCol = w.col === col;
          const sameRegion = level.regions[w.row][w.col] === level.regions[row][col];
          const adjacent = Math.abs(w.row - row) <= 1 && Math.abs(w.col - col) <= 1;
          return sameRow || sameCol || sameRegion || adjacent;
        });
      }

      const shieldWillAbsorb = willConflict && state.aegisShieldActive;

      setState((prev) => {
        const copy = cloneMarks(prev.marks);
        copy[row][col] = shieldWillAbsorb ? 'empty' : next;
        return {
          ...prev,
          marks: copy,
          history: [...prev.history, cloneMarks(prev.marks)],
          mistakes: willConflict && !shieldWillAbsorb ? prev.mistakes + 1 : prev.mistakes,
          aegisShieldActive: shieldWillAbsorb ? false : prev.aegisShieldActive,
        };
      });

      if (next === 'warden') {
        if (willConflict) {
          if (!shieldWillAbsorb) {
            setErrorCells(new Set([`${row},${col}`]));
            playMistake();
            setTimeout(() => setErrorCells(new Set()), 420);
          }
        } else {
          playPlaceWarden();
        }
      } else if (next === 'x') {
        playMark();
      } else {
        playRemove();
      }
    },
    [banishMode, level.regions, onSpendBoon, state.aegisShieldActive, state.marks, applyMarksUpdate]
  );

  // Win check
  useEffect(() => {
    if (wonRef.current) return;
    if (isSolved(state.marks, level)) {
      wonRef.current = true;
      setTimeout(() => onWin(state.mistakes, state.usedHint), 300);
    }
  }, [state.marks, state.mistakes, state.usedHint, level, onWin]);

  const undo = () => {
    setState((prev) => {
      if (prev.history.length === 0) return prev;
      const last = prev.history[prev.history.length - 1];
      playRemove();
      return { ...prev, marks: last, history: prev.history.slice(0, -1) };
    });
  };

  const restart = () => {
    setState(createInitialState(level.size));
    setErrorCells(new Set());
    setHintCell(null);
    wonRef.current = false;
  };

  const useHint = () => {
    const solution = findSolution(level.regions, level.size);
    if (!solution) return;
    // Find a solution cell that isn't already correctly marked as a warden.
    const target = solution.find((p) => state.marks[p.row][p.col] !== 'warden');
    if (!target) return;
    setHintCell(`${target.row},${target.col}`);
    setState((prev) => ({ ...prev, usedHint: true }));
    setTimeout(() => setHintCell(null), 2200);
  };

  const banishCount = progress.inventory.banish ?? 0;
  const seersEyeCount = progress.inventory['seers-eye'] ?? 0;
  const aegisCount = progress.inventory.aegis ?? 0;

  const useSeersEye = () => {
    if (seersEyeCount <= 0) return;
    const solution = findSolution(level.regions, level.size);
    if (!solution) return;
    const target = solution.find((p) => state.marks[p.row][p.col] !== 'warden');
    if (!target) return;
    setHintCell(`${target.row},${target.col}`);
    onSpendBoon('seers-eye');
    setTimeout(() => setHintCell(null), 2600);
  };

  const useAegis = () => {
    if (aegisCount <= 0 || state.aegisShieldActive) return;
    setState((prev) => ({ ...prev, aegisShieldActive: true }));
    onSpendBoon('aegis');
  };

  return (
    <div className="play-screen">
      <div className="play-hud">
        <span className="play-hud-label">
          {levelRef.realm.name} · {levelRef.levelInRealm + 1}
        </span>
        <div className="mistake-dots" aria-label={`${state.mistakes} mistakes`}>
          {Array.from({ length: Math.max(state.mistakes, 3) }).map((_, i) => (
            <span key={i} className={`mistake-dot ${i < state.mistakes ? 'filled' : ''}`} />
          ))}
        </div>
      </div>

      {banishMode && <div className="banish-hint">Tap any cell in the domain you want to Banish.</div>}

      <div className="board-wrap">
        <div className="board-grid" style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, gridTemplateRows: `repeat(${size}, 1fr)` }}>
          {level.regions.map((rowRegions, r) =>
            rowRegions.map((regionIdx, c) => {
              const elementIdx = level.elementOrder[regionIdx];
              const element = getElement(elementIdx);
              const mark = state.marks[r][c];
              const key = `${r},${c}`;
              const isError = errorCells.has(key);
              const isHint = hintCell === key;
              const isConflicted = conflicts.has(key);

              const edgeClasses = [
                r === 0 || level.regions[r - 1][c] !== regionIdx ? 'region-edge-top' : '',
                r === size - 1 || level.regions[r + 1][c] !== regionIdx ? 'region-edge-bottom' : '',
                c === 0 || rowRegions[c - 1] !== regionIdx ? 'region-edge-left' : '',
                c === size - 1 || rowRegions[c + 1] !== regionIdx ? 'region-edge-right' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={key}
                  className={`board-cell ${edgeClasses} ${isError ? 'error-flash' : ''} ${isHint ? 'hint-glow' : ''}`}
                  style={{ '--cell-color': `${element.color}22` } as CSSProperties}
                  onClick={() => handleCellClick(r, c)}
                  aria-label={`Row ${r + 1}, column ${c + 1}, ${element.name} domain`}
                >
                  {mark === 'x' && <XMarkGlyph size={Math.max(14, 60 / size)} />}
                  {mark === 'warden' && (
                    <Icon
                      inner={elementGlyphInner(element.id)}
                      color={isConflicted ? '#ff5252' : element.color}
                      size={Math.max(20, 200 / size)}
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
        <button className="control-btn" onClick={undo} disabled={state.history.length === 0}>
          <UndoIcon />
          Undo
        </button>
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
        <button className="control-btn" onClick={useAegis} disabled={aegisCount <= 0 || state.aegisShieldActive}>
          <Icon inner={boonGlyphInner('aegis')} color="#7dffd4" size={20} />
          Aegis
          {aegisCount > 0 && <span className="control-btn-badge">{aegisCount}</span>}
        </button>
      </div>

      <p className="rules-hint">
        Tap to mark, tap again for a Warden. One per row, column, and domain. No two Wardens may stand
        side by side, not even diagonally.
      </p>
    </div>
  );
}
