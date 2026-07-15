import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Star, Clock, Check } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import type { Stats } from '../types';
import { playClickSound, playWinSound } from '../sounds';
import confetti from 'canvas-confetti';

interface ChaptersScreenProps {
  stats: Stats;
  onBack: () => void;
  onSelectLevel: (idx: number) => void;
  celebrateChapterIdx: number | null;
  onCelebrationEnd: () => void;
  hideHeader?: boolean;
}

const CHAPTERS = [
  { name: 'Warm Up', range: [0, 4] as const, lightBg: 'bg-stone-200', darkBg: 'bg-stone-800' },
  { name: 'Getting Tricky', range: [5, 9] as const, lightBg: 'bg-amber-100', darkBg: 'bg-amber-900/40' },
  { name: 'Think Twice', range: [10, 14] as const, lightBg: 'bg-emerald-100', darkBg: 'bg-emerald-900/40' },
  { name: 'Master Path', range: [15, 19] as const, lightBg: 'bg-stone-800 text-white', darkBg: 'bg-indigo-900/60 text-white' },
];

export default function ChaptersScreen({ 
  stats, 
  onBack, 
  onSelectLevel, 
  celebrateChapterIdx,
  onCelebrationEnd,
  hideHeader
}: ChaptersScreenProps) {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  // 0: Initial, 1: Fill Star, 2: Unlock Next Chapter
  const [animStep, setAnimStep] = useState(celebrateChapterIdx !== null ? 0 : 3);
  const nextChapterRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (celebrateChapterIdx !== null && animStep === 0) {
      // Step 1: Fill the completed chapter's star
      setTimeout(() => {
        setAnimStep(1);
        playWinSound();
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.3 },
          colors: ['#f59e0b', '#fbbf24', '#fffbeb']
        });
        
        // Step 2: Unlock the next chapter
        setTimeout(() => {
          setAnimStep(2);
          playClickSound(); // small chime for unlock
          
          if (nextChapterRef.current) {
            nextChapterRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          
          // Step 3: Done
          setTimeout(() => {
            setAnimStep(3);
            onCelebrationEnd();
          }, 1500);
        }, 1500);
      }, 500);
    }
  }, [celebrateChapterIdx, animStep, onCelebrationEnd]);

  return (
    <div className={`min-h-screen flex flex-col items-center p-6 font-sans transition-colors duration-500 overflow-y-auto ${
      dark ? 'bg-stone-950 text-stone-100' : 'bg-stone-50 text-stone-900'
    }`}>
      {!hideHeader && (
        <header className="w-full max-w-md flex items-center gap-4 mb-10 mt-4">
          <button
            onClick={() => { playClickSound(); onBack(); }}
            className={`p-2 rounded-full transition-colors ${
              dark ? 'hover:bg-stone-800' : 'hover:bg-stone-200'
            }`}
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-3xl font-black tracking-tighter">CHAPTERS</h2>
        </header>
      )}
      {hideHeader && (
        <header className="w-full max-w-md flex items-center justify-center mb-8 mt-4 pl-12">
          <h2 className="text-3xl font-black tracking-tighter">CHAPTERS</h2>
        </header>
      )}

      <div className="w-full max-w-md space-y-8 pb-12">
        {CHAPTERS.map((chapter, i) => {
          // Pre-celebration logic: if celebrating, we pretend the stats haven't updated yet for the animation sequence
          const isNextChapterUnlocking = celebrateChapterIdx !== null && i === celebrateChapterIdx + 1;
          const isThisChapterCelebrating = celebrateChapterIdx !== null && i === celebrateChapterIdx;
          
          // Determine locked state
          let isLocked = i >= stats.chaptersUnlocked;
          if (isNextChapterUnlocking && animStep < 2) {
            isLocked = true; // Still locked until step 2
          } else if (isNextChapterUnlocking && animStep >= 2) {
            isLocked = false; // Unlocked!
          }

          // Determine fully completed state
          let isFullyCompleted = Array.from({ length: 5 }).every((_, j) =>
            stats.completedChapterLevels?.includes(chapter.range[0] + j)
          );
          let isFullyPerfect = Array.from({ length: 5 }).every((_, j) =>
            stats.perfectChapterLevels?.includes(chapter.range[0] + j)
          );
          
          if (isThisChapterCelebrating && animStep < 1) {
            isFullyCompleted = false; // Star not filled yet
          } else if (isThisChapterCelebrating && animStep >= 1) {
            isFullyCompleted = true; // Filled!
            // Note: isFullyPerfect relies strictly on actual saved stats, which is correct
          }

          return (
            <motion.div
              ref={isNextChapterUnlocking ? nextChapterRef : null}
              key={chapter.name}
              animate={
                isNextChapterUnlocking && animStep === 2
                  ? { scale: [1, 1.03, 1] }
                  : { scale: 1 }
              }
              transition={{ duration: 0.8, type: 'spring' }}
              className={`p-6 rounded-[2.5rem] transition-all duration-1000 ${
                dark ? chapter.darkBg : chapter.lightBg
              } ${isLocked ? 'grayscale opacity-40 pointer-events-none' : 'grayscale-0 opacity-100'}`}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-black tracking-tight">{chapter.name}</h3>
                
                <AnimatePresence mode="wait">
                  {isLocked ? (
                    <motion.div
                      key="clock"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                    >
                      <Clock size={20} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="star"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={
                        isThisChapterCelebrating && animStep === 1
                          ? { scale: [1, 1.5, 1], rotate: [0, 180, 360], opacity: 1 }
                          : { scale: 1, opacity: 1 }
                      }
                      transition={{ duration: 0.6, type: 'spring' }}
                    >
                      <Star
                        size={24}
                        className={`transition-colors duration-500 ${
                          isFullyCompleted
                            ? isFullyPerfect
                              ? 'text-amber-500 fill-amber-500 drop-shadow-sm'
                              : 'text-stone-400 fill-stone-400'
                            : 'text-amber-500/50'
                        }`}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="grid grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, j) => {
                  const levelIdx = chapter.range[0] + j;
                  const isCompleted = stats.completedChapterLevels?.includes(levelIdx);
                  const isPerfect = stats.perfectChapterLevels?.includes(levelIdx);
                  return (
                    <button
                      key={levelIdx}
                      disabled={isLocked}
                      onClick={() => { playClickSound(); onSelectLevel(levelIdx); }}
                      className={`relative aspect-square rounded-xl flex items-center justify-center font-black text-lg transition-all active:scale-90 ${
                        isLocked
                          ? 'bg-black/5'
                          : dark
                            ? 'bg-stone-900/60 shadow-sm hover:shadow-md hover:bg-stone-900/80 text-stone-200'
                            : 'bg-white shadow-sm hover:shadow-md'
                      }`}
                    >
                      {levelIdx + 1}
                      {isCompleted && (
                        <div className={`absolute -top-1.5 -right-1.5 text-white rounded-full p-0.5 shadow-sm border-2 border-inherit ${
                          isPerfect ? 'bg-amber-400' : dark ? 'bg-stone-500' : 'bg-stone-400'
                        }`}>
                          {isPerfect ? <Star size={12} fill="currentColor" strokeWidth={0} /> : <Check size={12} strokeWidth={4} />}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
