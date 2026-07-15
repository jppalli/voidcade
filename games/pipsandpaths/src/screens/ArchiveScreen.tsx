import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Star, Check } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import type { Stats } from '../types';
import { getArchiveDates } from '../gameLogic';
import { playClickSound } from '../sounds';

interface ArchiveScreenProps {
  stats: Stats;
  onSelectDate: (dateStr: string) => void;
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const DAY_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

export default function ArchiveScreen({ stats, onSelectDate }: ArchiveScreenProps) {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const todayStr = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();
  const allDates = useMemo(() => getArchiveDates(), []);
  const completed = new Set(stats.completedArchiveDates || []);
  const perfect = new Set(stats.perfectArchiveDates || []);

  // Group by month, only include months that have at least one past/today date
  const byMonth = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const d of allDates) {
      const month = new Date(d).getUTCMonth();
      if (!map.has(month)) map.set(month, []);
      map.get(month)!.push(d);
    }
    // Filter out months that are entirely in the future
    for (const [month, dates] of map.entries()) {
      if (dates.every(d => d > todayStr)) map.delete(month);
    }
    return map;
  }, [allDates, todayStr]);

  // Total stats
  const totalPlayable = allDates.filter(d => d <= todayStr).length;
  const totalDone = completed.size;

  return (
    <div className={`min-h-screen flex flex-col items-center px-4 pb-16 font-sans transition-colors duration-500 overflow-y-auto ${
      dark ? 'bg-stone-950 text-stone-100' : 'bg-stone-50 text-stone-900'
    }`}>

      {/* Header */}
      <header className="w-full max-w-md flex items-center justify-center mb-2 mt-4 pl-12">
        <h2 className="text-3xl font-black tracking-tighter">ARCHIVE</h2>
      </header>

      {/* Progress summary */}
      <div className={`w-full max-w-md mb-8 px-1`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-[11px] font-black uppercase tracking-widest ${dark ? 'text-stone-500' : 'text-stone-400'}`}>
            {totalDone} of {totalPlayable} completed
          </span>
          <span className={`text-[11px] font-black uppercase tracking-widest ${dark ? 'text-stone-500' : 'text-stone-400'}`}>
            {totalPlayable > 0 ? Math.round((totalDone / totalPlayable) * 100) : 0}%
          </span>
        </div>
        <div className={`w-full h-1.5 rounded-full overflow-hidden ${dark ? 'bg-stone-800' : 'bg-stone-200'}`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${totalPlayable > 0 ? (totalDone / totalPlayable) * 100 : 0}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full bg-amber-400"
          />
        </div>
      </div>

      {/* Month cards */}
      <div className="w-full max-w-md space-y-4">
        {Array.from(byMonth.entries()).map(([month, dates]) => {
          const playableDates = dates.filter(d => d <= todayStr);
          const monthDone = playableDates.filter(d => completed.has(d)).length;
          const firstDay = new Date(dates[0]).getUTCDay();

          return (
            <div
              key={month}
              className={`rounded-3xl p-5 ${
                dark ? 'bg-stone-900 border border-stone-800' : 'bg-white border border-stone-100 shadow-sm'
              }`}
            >
              {/* Month header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black tracking-tight">
                  {MONTH_NAMES[month]}
                </h3>
                <span className={`text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                  monthDone === playableDates.length && playableDates.length > 0
                    ? 'bg-amber-400/20 text-amber-500'
                    : dark ? 'bg-stone-800 text-stone-500' : 'bg-stone-100 text-stone-400'
                }`}>
                  {monthDone}/{playableDates.length}
                </span>
              </div>

              {/* Day labels */}
              <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                {DAY_LABELS.map((d) => (
                  <div key={d} className={`text-center text-[10px] font-bold ${dark ? 'text-stone-600' : 'text-stone-400'}`}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {/* Offset for first day of month */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {dates.map((dateStr) => {
                  const day = new Date(dateStr).getUTCDate();
                  const isFuture = dateStr > todayStr;
                  const isToday = dateStr === todayStr;
                  const isDone = completed.has(dateStr);
                  const isPerfect = perfect.has(dateStr);

                  if (isFuture) {
                    return (
                      <div
                        key={dateStr}
                        className={`aspect-square rounded-xl flex items-center justify-center text-xs font-bold ${
                          dark ? 'text-stone-800' : 'text-stone-300'
                        }`}
                      >
                        {day}
                      </div>
                    );
                  }

                  return (
                    <motion.button
                      key={dateStr}
                      whileTap={{ scale: 0.88 }}
                      onClick={() => { playClickSound(); onSelectDate(dateStr); }}
                      className={`relative aspect-square rounded-xl flex items-center justify-center text-xs font-black transition-all
                        ${isToday
                          ? dark
                            ? 'bg-amber-500 text-stone-900 shadow-md shadow-amber-500/30 ring-2 ring-amber-400'
                            : 'bg-amber-400 text-stone-900 shadow-md shadow-amber-300/40 ring-2 ring-amber-500'
                          : isDone
                            ? dark
                              ? 'bg-stone-800 text-stone-400'
                              : 'bg-stone-100 text-stone-500'
                            : dark
                              ? 'bg-stone-800 text-stone-200 hover:bg-stone-700 active:bg-stone-600'
                              : 'bg-stone-50 text-stone-700 hover:bg-stone-100 active:bg-stone-200 border border-stone-200'
                        }`}
                    >
                      {isDone ? (
                        <span className={`text-[10px] font-black ${
                          dark ? 'text-stone-600' : 'text-stone-400'
                        }`}>{day}</span>
                      ) : day}

                      {/* Completion badge */}
                      {isDone && (
                        <div className={`absolute -top-1.5 -right-1.5 rounded-full p-0.5 shadow-sm border-2 ${
                          dark ? 'border-stone-900' : 'border-white'
                        } ${isPerfect ? 'bg-amber-400' : dark ? 'bg-stone-500' : 'bg-stone-400'}`}>
                          {isPerfect
                            ? <Star size={9} fill="white" strokeWidth={0} className="text-white" />
                            : <Check size={9} strokeWidth={3.5} className="text-white" />
                          }
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
