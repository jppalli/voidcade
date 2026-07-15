import React from 'react';
import { motion } from 'motion/react';
import { useTheme } from '../ThemeContext';

interface DieFaceProps {
  value: number;
  isCurrent: boolean;
  isVisited: boolean;
  isTargetable: boolean;
  isHint?: boolean;
}

const DOT_PATTERNS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export default function DieFace({ value, isCurrent, isVisited, isTargetable, isHint }: DieFaceProps) {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const getDotColor = (index: number) => {
    const pattern = DOT_PATTERNS[value] || [];
    if (!pattern.includes(index)) return 'bg-transparent';
    if (isCurrent) return 'bg-white';
    if (isVisited) return dark ? 'bg-stone-600' : 'bg-stone-400';
    if (isHint) return 'bg-amber-400';
    return dark ? 'bg-stone-200' : 'bg-stone-900';
  };

  const getContainerClass = () => {
    if (isCurrent) {
      return dark
        ? 'bg-indigo-600 border-indigo-500 shadow-xl shadow-indigo-500/30 scale-110 z-10'
        : 'bg-stone-900 border-stone-900 shadow-xl scale-110 z-10';
    }
    if (isVisited) {
      return dark
        ? 'bg-stone-800/50 border-stone-700 opacity-50'
        : 'bg-stone-100 border-stone-200 opacity-60';
    }
    if (isHint) {
      return dark
        ? 'bg-amber-900 border-amber-400 shadow-lg shadow-amber-500/40 z-20 ring-4 ring-amber-500/30'
        : 'bg-amber-50 border-amber-500 shadow-xl shadow-amber-200 z-20 ring-4 ring-amber-500/40 cursor-pointer';
    }
    if (isTargetable) {
      return dark
        ? 'bg-stone-800 border-stone-600 shadow-md cursor-pointer ring-4 ring-indigo-500/30'
        : 'bg-amber-50 border-amber-400 shadow-md shadow-amber-200/50 cursor-pointer ring-4 ring-amber-400/40';
    }
    return dark
      ? 'bg-stone-800 border-stone-700 shadow-sm'
      : 'bg-white border-stone-200 shadow-sm';
  };

  return (
    <motion.div
      whileHover={isTargetable ? { scale: 1.08 } : {}}
      whileTap={isTargetable ? { scale: 0.93 } : {}}
      animate={
        isHint
          ? {
              scale: [1, 1.1, 1],
              boxShadow: [
                '0 0 0 0px rgba(245, 158, 11, 0)',
                '0 0 0 8px rgba(245, 158, 11, 0.25)',
                '0 0 0 0px rgba(245, 158, 11, 0)',
              ],
            }
          : isTargetable
            ? {
                scale: [1, 1.05, 1],
                transition: { repeat: Infinity, duration: 1.5 },
              }
            : { scale: isCurrent ? 1.1 : 1 }
      }
      className={`relative grid grid-cols-3 grid-rows-3 gap-1 p-2 sm:p-2.5 w-full h-full rounded-xl transition-all duration-300 border-2 ${getContainerClass()}`}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className={`w-full h-full rounded-full aspect-square transition-colors duration-300 ${getDotColor(i)}`}
        />
      ))}
    </motion.div>
  );
}
