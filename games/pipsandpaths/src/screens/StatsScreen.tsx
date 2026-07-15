import React from 'react';
import { ChevronLeft, Trophy, Calendar, Infinity as InfinityIcon, Star } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import type { Stats } from '../types';
import { playClickSound } from '../sounds';

interface StatsScreenProps {
  stats: Stats;
  onBack: () => void;
  hideHeader?: boolean;
}

export default function StatsScreen({ stats, onBack, hideHeader }: StatsScreenProps) {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const cards = [
    { icon: Trophy, color: 'text-amber-500', value: stats.totalSolved, label: 'Total Solved' },
    { icon: Calendar, color: 'text-blue-500', value: stats.dailyStreak, label: 'Daily Streak' },
    { icon: InfinityIcon, color: 'text-emerald-500', value: stats.bestInfiniteLevel, label: 'Zen Record' },
    { icon: Star, color: 'text-purple-500', value: `${stats.chaptersUnlocked} / 4`, label: 'Chapters' },
    { icon: Star, color: 'text-amber-500', value: stats.perfectChapterLevels?.length || 0, label: 'Perfect Solves' },
  ];

  return (
    <div className={`min-h-screen flex flex-col items-center p-6 font-sans transition-colors duration-500 ${
      dark ? 'bg-stone-950 text-stone-100' : 'bg-stone-50 text-stone-900'
    }`}>
      {!hideHeader && (
        <header className="w-full max-w-md flex items-center gap-4 mb-10 mt-4">
          <button
            onClick={() => { playClickSound(); onBack(); }}
            className={`p-2 rounded-full transition-colors ${dark ? 'hover:bg-stone-800' : 'hover:bg-stone-200'}`}
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-3xl font-black tracking-tighter">STATISTICS</h2>
        </header>
      )}
      {hideHeader && (
        <header className="w-full max-w-md flex items-center justify-center mb-8 mt-4 pl-12">
          <h2 className="text-3xl font-black tracking-tighter">STATISTICS</h2>
        </header>
      )}

      <div className="w-full max-w-md grid grid-cols-2 gap-4">
        {cards.map(({ icon: Icon, color, value, label }) => (
          <div
            key={label}
            className={`p-6 rounded-[2rem] shadow-sm border flex flex-col items-center ${
              dark
                ? 'bg-stone-900 border-stone-800'
                : 'bg-white border-stone-100'
            }`}
          >
            <Icon size={32} className={`${color} mb-2`} />
            <span className="text-3xl font-black">{value}</span>
            <span className={`text-[10px] uppercase tracking-widest font-bold ${
              dark ? 'text-stone-500' : 'text-stone-400'
            }`}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
