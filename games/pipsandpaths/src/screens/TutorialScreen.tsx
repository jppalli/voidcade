import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, Undo2, ChevronRight, X } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import DieFace from '../components/DieFace';
import { playClickSound, playMoveSound } from '../sounds';
import type { Position } from '../types';

interface TutorialScreenProps {
  onDone: () => void;
  onSkip: () => void;
}

// All-1s 3x3 grid.
// Scripted solution: (0,0)→(1,0)→(2,0)→(2,1)→(1,1)→(0,1)→(0,2)→(1,2)→(2,2)
//
// At step index 4 (at (1,1)), two moves exist:
//   (0,1) → correct, leads to full solution
//   (1,2) → wrong, leads to dead end
//
// Steps 0-3: only the correct next cell is highlighted (guided)
// Step 4: hint moment — both cells shown, hint reveals which is correct

const GRID = [[1,1,1],[1,1,1],[1,1,1]];
const SOLUTION: Position[] = [
  { x: 0, y: 0 }, // start
  { x: 1, y: 0 }, // step 1
  { x: 2, y: 0 }, // step 2
  { x: 2, y: 1 }, // step 3
  { x: 1, y: 1 }, // step 4 — hint moment
  { x: 0, y: 1 }, // step 5 (correct choice)
  { x: 0, y: 2 }, // step 6
  { x: 1, y: 2 }, // step 7
  { x: 2, y: 2 }, // step 8
];
const WRONG_MOVE: Position = { x: 1, y: 2 }; // the dead-end option at step 4
const HINT_STEP = 4; // path index where hint triggers

type TutStep = 'rule' | 'keep-going' | 'hint-prompt' | 'hint-revealed' | 'undo' | 'finish';

function getStepInfo(s: TutStep) {
  switch (s) {
    case 'rule': return {
      num: 1, title: 'The Rule',
      body: 'Each die shows a number — that\'s how many spaces you must jump up, down, left, or right. This die shows 1.',
      action: 'Tap the highlighted die to move.',
    };
    case 'keep-going': return {
      num: 2, title: 'Visit Every Die',
      body: 'Your goal is to visit every die exactly once. Grey dice are already visited — keep going!',
      action: 'Follow the highlighted path.',
    };
    case 'hint-prompt': return {
      num: 3, title: 'Two Paths, One Solution',
      body: 'You have two options here — but only one leads to a complete solution. Not sure which? Use a hint!',
      action: 'Tap the Hint button below.',
    };
    case 'hint-revealed': return {
      num: 3, title: 'Hint Revealed!',
      body: 'The hint highlights the correct move in amber. The wrong path is marked with ✕. Now pick the right one!',
      action: 'Tap the correct die to continue.',
    };
    case 'undo': return {
      num: 4, title: 'Undo Mistakes',
      body: 'Wrong move? Tap Undo to step back. You can undo as many times as you need.',
      action: 'Keep going to finish the puzzle!',
    };
    case 'finish': return {
      num: 4, title: 'You Got It!',
      body: 'Complete the board to win. Good luck with today\'s challenge!',
      action: 'Finish the demo or skip ahead.',
    };
  }
}

export default function TutorialScreen({ onDone, onSkip }: TutorialScreenProps) {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [path, setPath] = useState<Position[]>([SOLUTION[0]]);
  const [tutStep, setTutStep] = useState<TutStep>('rule');
  const [hintRevealed, setHintRevealed] = useState(false);

  const pathLen = path.length;
  const currentPos = path[pathLen - 1];
  const atHintMoment = pathLen - 1 === HINT_STEP; // we're at position index 4

  // Determine which cells are clickable
  const getClickableCells = (): Position[] => {
    if (atHintMoment) {
      // At hint moment: show both options (correct + wrong)
      if (hintRevealed) {
        // After hint: only correct is clickable
        return [SOLUTION[HINT_STEP + 1]];
      }
      // Before hint: nothing clickable — must tap hint first
      return [];
    }
    // For all other steps: only the next solution cell
    if (pathLen - 1 < SOLUTION.length - 1) {
      return [SOLUTION[pathLen]];
    }
    return [];
  };

  // Cells to highlight on the board
  const getHighlightedCells = (): { pos: Position; type: 'target' | 'hint' | 'wrong' }[] => {
    if (atHintMoment) {
      const correct = SOLUTION[HINT_STEP + 1];
      if (hintRevealed) {
        return [
          { pos: correct, type: 'hint' },
          { pos: WRONG_MOVE, type: 'wrong' },
        ];
      }
      // Before hint tapped: show both as targetable (ambiguous)
      if (tutStep === 'hint-prompt') {
        return [
          { pos: correct, type: 'target' },
          { pos: WRONG_MOVE, type: 'target' },
        ];
      }
      return [];
    }
    if (pathLen - 1 < SOLUTION.length - 1) {
      return [{ pos: SOLUTION[pathLen], type: 'target' }];
    }
    return [];
  };

  const clickable = getClickableCells();
  const highlights = getHighlightedCells();

  const handleMove = (target: Position) => {
    if (!clickable.some(c => c.x === target.x && c.y === target.y)) return;
    playMoveSound();
    const newPath = [...path, target];
    setPath(newPath);
    setHintRevealed(false);

    const newIdx = newPath.length - 1;

    // Win
    if (newPath.length === SOLUTION.length) {
      setTimeout(() => onDone(), 700);
      return;
    }

    // Advance tutorial step
    if (newIdx === 1) {
      // After first move
      setTimeout(() => setTutStep('keep-going'), 300);
    } else if (newIdx === HINT_STEP) {
      // Arrived at hint moment
      setTimeout(() => setTutStep('hint-prompt'), 300);
    } else if (newIdx === HINT_STEP + 1) {
      // Just passed the hint moment (picked correct)
      setTimeout(() => setTutStep('undo'), 300);
    } else if (newIdx >= HINT_STEP + 2 && tutStep === 'undo') {
      setTimeout(() => setTutStep('finish'), 300);
    }
  };

  const handleHint = () => {
    if (!atHintMoment || hintRevealed) return;
    playClickSound();
    setHintRevealed(true);
    setTutStep('hint-revealed');
  };

  const handleUndo = () => {
    if (path.length <= 1) return;
    setPath(p => p.slice(0, -1));
    setHintRevealed(false);
    // If we undo back from hint moment
    if (path.length - 1 === HINT_STEP) {
      setTutStep('keep-going');
    }
  };

  const info = getStepInfo(tutStep);
  const progress = (info.num / 4) * 100;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-6 pb-8 font-sans transition-colors duration-500 ${
      dark ? 'bg-stone-950 text-stone-100' : 'bg-stone-50 text-stone-900'
    }`}>

      {/* Skip */}
      <div className="w-full max-w-sm flex justify-end mb-3">
        <button onClick={onSkip}
          className={`flex items-center gap-1.5 text-xs font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-all ${
            dark ? 'text-stone-500 hover:text-stone-300 hover:bg-stone-800' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
          }`}
        >
          Skip <X size={13} />
        </button>
      </div>

      {/* Progress */}
      <div className={`w-full max-w-sm h-1 rounded-full mb-6 overflow-hidden ${dark ? 'bg-stone-800' : 'bg-stone-200'}`}>
        <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} className="h-full rounded-full bg-amber-400" />
      </div>

      {/* Step card */}
      <AnimatePresence mode="wait">
        <motion.div key={tutStep}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className={`w-full max-w-sm rounded-3xl p-5 mb-6 ${
            dark ? 'bg-stone-900 border border-stone-800' : 'bg-white border border-stone-100 shadow-sm'
          }`}
        >
          <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${dark ? 'text-amber-400' : 'text-amber-500'}`}>
            Step {info.num} of 4
          </p>
          <h3 className="text-xl font-black tracking-tight mb-2">{info.title}</h3>
          <p className={`text-sm leading-relaxed mb-3 ${dark ? 'text-stone-400' : 'text-stone-500'}`}>{info.body}</p>
          <p className={`text-xs font-black uppercase tracking-widest ${dark ? 'text-indigo-400' : 'text-indigo-600'}`}>→ {info.action}</p>
        </motion.div>
      </AnimatePresence>

      {/* Board */}
      <div
        className={`relative p-3 rounded-[2rem] border-4 mb-6 ${
          dark ? 'bg-stone-900/50 border-stone-800' : 'bg-stone-200/30 border-stone-200'
        }`}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', width: 'min(72vw, 260px)', aspectRatio: '1' }}
      >
        {/* Path lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 p-3 overflow-visible">
          {path.map((p, i) => {
            if (i === 0) return null;
            const prev = path[i - 1]; const cw = 100 / 3;
            return (
              <motion.line key={i}
                initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                x1={`${prev.x * cw + cw / 2}%`} y1={`${prev.y * cw + cw / 2}%`}
                x2={`${p.x * cw + cw / 2}%`} y2={`${p.y * cw + cw / 2}%`}
                stroke={dark ? 'rgba(129,140,248,0.3)' : 'rgba(28,25,23,0.15)'}
                strokeWidth="4" strokeLinecap="round"
              />
            );
          })}
        </svg>

        {GRID.map((row, y) =>
          row.map((value, x) => {
            const isCurr = currentPos.x === x && currentPos.y === y;
            const isVis = path.some(p => p.x === x && p.y === y);
            const hl = highlights.find(h => h.pos.x === x && h.pos.y === y);
            const isClickable = clickable.some(c => c.x === x && c.y === y);
            const isWrong = hl?.type === 'wrong';

            return (
              <div key={`${x}-${y}`} className="relative aspect-square">
                <DieFace
                  value={value}
                  isCurrent={isCurr}
                  isVisited={isVis}
                  isTargetable={hl?.type === 'target'}
                  isHint={hl?.type === 'hint'}
                />
                {isWrong && (
                  <div className="absolute inset-1 rounded-xl bg-red-500/15 border-2 border-red-400/50 z-10 flex items-center justify-center pointer-events-none">
                    <span className="text-red-400 font-black text-base">✕</span>
                  </div>
                )}
                {isClickable && (
                  <button onClick={() => handleMove({ x, y })} className="absolute inset-0 z-20" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-3 mb-8">
        <motion.button
          onClick={handleHint}
          disabled={!atHintMoment || hintRevealed}
          animate={atHintMoment && !hintRevealed ? {
            scale: [1, 1.06, 1], transition: { repeat: Infinity, duration: 1.4, ease: 'easeInOut' }
          } : {}}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl border font-black text-sm transition-all active:scale-95 disabled:opacity-30 ${
            atHintMoment && !hintRevealed
              ? dark ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-lg shadow-amber-500/20'
                     : 'bg-amber-50 border-amber-400 text-amber-600 shadow-lg shadow-amber-200/50'
              : dark ? 'bg-stone-800 border-stone-700 text-stone-400'
                     : 'bg-white border-stone-200 text-stone-600'
          }`}
        >
          <Lightbulb size={16} /> Hint
        </motion.button>

        <button onClick={handleUndo} disabled={path.length <= 1}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl border font-black text-sm transition-all active:scale-95 disabled:opacity-30 ${
            dark ? 'bg-stone-800 border-stone-700 text-stone-400' : 'bg-white border-stone-200 text-stone-600'
          }`}
        >
          <Undo2 size={16} /> Undo
        </button>
      </div>

      <button onClick={onSkip}
        className={`flex items-center gap-2 text-sm font-black uppercase tracking-widest transition-all ${
          dark ? 'text-stone-600 hover:text-stone-400' : 'text-stone-300 hover:text-stone-500'
        }`}
      >
        Play today's challenge <ChevronRight size={16} />
      </button>
    </div>
  );
}
