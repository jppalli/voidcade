import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, ChevronLeft, Sparkles, Star, Clipboard } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import type { Level, GameMode } from '../types';
import { CHAPTER_LEVELS } from '../gameLogic';

interface WinModalProps {
  show: boolean;
  level: Level;
  currentLevelIdx: number;
  gameMode: GameMode;
  infiniteLevel: number;
  onNext: () => void;
  onReplay: () => void;
  shareText?: string;
  isPerfect?: boolean;
}

export default function WinModal({
  show,
  level,
  currentLevelIdx,
  gameMode,
  infiniteLevel,
  onNext,
  onReplay,
  shareText,
  isPerfect,
}: WinModalProps) {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const handleShare = async () => {
    if (!shareText) return;
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      // fallback — not a critical feature
    }
  };

  // Allow pressing Enter to go to the next level
  useEffect(() => {
    if (!show) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [show, onNext]);

  const levelLabel =
    gameMode === 'archive'
      ? 'Archive Path'
      : gameMode === 'daily'
        ? "Today's Path"
        : `Level ${level.id}`;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className={`p-10 rounded-[40px] shadow-2xl max-w-sm w-full text-center relative overflow-hidden ${
              dark
                ? 'bg-stone-900 border-4 border-indigo-500'
                : 'bg-white border-8 border-stone-900'
            }`}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`inline-block mb-6 p-6 rounded-full relative ${
                dark ? 'bg-indigo-900/50' : 'bg-stone-100'
              }`}
            >
              <Trophy size={64} className={dark ? 'text-indigo-400' : 'text-stone-900'} />
              {isPerfect && (
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                  className="absolute -top-2 -right-2 bg-amber-400 text-white p-2 rounded-full shadow-lg border-4 border-stone-900"
                >
                  <Star size={24} fill="currentColor" />
                </motion.div>
              )}
            </motion.div>

            <h2 className={`text-4xl font-black mb-2 uppercase tracking-tight ${
              dark ? 'text-white' : 'text-stone-900'
            }`}>
              {levelLabel}
            </h2>
            <p className={`font-bold mb-8 uppercase tracking-widest text-sm flex items-center justify-center gap-2 ${
              isPerfect 
                ? 'text-amber-500' 
                : dark ? 'text-indigo-400' : 'text-stone-500'
            }`}>
              {isPerfect ? (
                <>
                  <Sparkles size={16} />
                  <span>Midas Touch: Perfect!</span>
                  <Sparkles size={16} />
                </>
              ) : 'Level Solved!'}
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={onNext}
                className={`w-full py-5 rounded-3xl font-black text-xl transition-all flex items-center justify-center gap-3 group shadow-xl ${
                  dark
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                    : 'bg-stone-900 text-white hover:bg-stone-800'
                }`}
              >
                {gameMode === 'archive' ? (
                  'Back to Archive'
                ) : gameMode === 'chapter' && currentLevelIdx >= CHAPTER_LEVELS.length - 1 ? (
                  'Back to Menu'
                ) : gameMode === 'chapter' && (currentLevelIdx + 1) % 5 === 0 ? (
                  'Chapter Complete!'
                ) : (
                  <>
                    Next Path
                    <ChevronLeft
                      size={24}
                      className="rotate-180 group-hover:translate-x-1 transition-transform"
                    />
                  </>
                )}
              </button>

              {gameMode === 'daily' && shareText && (
                <button
                  onClick={handleShare}
                  className={`w-full py-4 rounded-3xl font-bold transition-all ${
                    dark
                      ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  <Clipboard size={18} />
                  Copy Result to Share
                </button>
              )}

              <button
                onClick={onReplay}
                className={`w-full py-4 rounded-3xl font-bold transition-all ${
                  dark
                    ? 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Replay Level
              </button>
            </div>

            {/* Decorative sparkles */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 90, 180, 270, 360],
              }}
              transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
              className="absolute -top-10 -right-10 opacity-5"
            >
              <Sparkles size={120} />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
