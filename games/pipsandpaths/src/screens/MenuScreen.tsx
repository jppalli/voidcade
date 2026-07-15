import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  BookOpen,
  Archive,
  BarChart3,
  Info,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Music,
} from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { STORAGE_KEY, type Stats } from '../types';
import { playClickSound, getAudioPrefs, setSfxEnabled, setMusicEnabled, startMusic } from '../sounds';

interface MenuScreenProps {
  stats: Stats;
  onStartDaily: () => void;
  onOpenChapters: () => void;
  onOpenArchive: () => void;
  onOpenStats: () => void;
  onOpenRules: () => void;
  hideSettings?: boolean;
}

export default function MenuScreen({
  stats,
  onStartDaily,
  onOpenChapters,
  onOpenArchive,
  onOpenStats,
  onOpenRules,
  hideSettings,
}: MenuScreenProps) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  const todayPlayed =
    stats.lastDailyDate === new Date().toISOString().split('T')[0];

  const [audioPrefs, setAudioPrefs] = useState(getAudioPrefs);
  const [titleClicks, setTitleClicks] = useState(0);
  const clickTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTitleClick = () => {
    setTitleClicks((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
        return 0;
      }
      return next;
    });

    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = setTimeout(() => {
      setTitleClicks(0);
    }, 1000);
  };

  const toggleSfx = () => {
    const next = !audioPrefs.sfx;
    setSfxEnabled(next);
    setAudioPrefs(getAudioPrefs());
  };

  const toggleMusic = () => {
    const next = !audioPrefs.music;
    setMusicEnabled(next);
    if (next) startMusic();
    setAudioPrefs(getAudioPrefs());
  };

  const btnClass = `p-3 rounded-2xl border transition-all z-40 ${
    dark
      ? 'bg-stone-800 border-stone-700 hover:bg-stone-700 text-stone-300'
      : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-600'
  }`;

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-6 font-sans transition-colors duration-500 ${
        dark ? 'bg-stone-950 text-stone-100' : 'bg-stone-50 text-stone-900'
      }`}
    >
      {/* Settings toggles */}
      {!hideSettings && (
        <div className="fixed top-5 right-5 flex gap-2 z-40">
          <button
            onClick={toggleMusic}
            className={`${btnClass} ${!audioPrefs.music ? 'opacity-40' : ''}`}
            title={audioPrefs.music ? 'Mute music' : 'Enable music'}
          >
            <Music size={20} />
          </button>
          <button
            onClick={toggleSfx}
            className={`${btnClass} ${!audioPrefs.sfx ? 'opacity-40' : ''}`}
            title={audioPrefs.sfx ? 'Mute sound effects' : 'Enable sound effects'}
          >
            {audioPrefs.sfx ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button
            onClick={() => { toggleTheme(); playClickSound(); }}
            className={btnClass}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      )}

      <motion.div
        className="text-center mb-12 select-none"
      >
        <h1 
          className="text-7xl font-black tracking-tighter mb-2"
          onClick={handleTitleClick}
        >
          PIPS & PATHS
        </h1>
        <p
          className={`font-bold uppercase tracking-[0.2em] text-xs ${
            dark ? 'text-stone-500' : 'text-stone-400'
          }`}
        >
          The Strategic Dice Puzzle
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
        {/* Daily Challenge */}
        <button
          onClick={() => { playClickSound(); onStartDaily(); }}
          className={`relative overflow-hidden p-6 rounded-[2rem] flex flex-col items-start gap-1 transition-all active:scale-95 shadow-xl ${
            todayPlayed
              ? dark
                ? 'bg-stone-800 text-stone-500 grayscale'
                : 'bg-stone-100 text-stone-400 grayscale'
              : dark
                ? 'bg-amber-500 text-stone-900 shadow-amber-500/20'
                : 'bg-amber-400 text-stone-900 shadow-amber-200/50'
          }`}
        >
          <div className="flex justify-between w-full items-center mb-2">
            <Calendar size={28} />
            {todayPlayed ? (
              <span
                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                  dark ? 'bg-stone-700' : 'bg-stone-200'
                }`}
              >
                Completed
              </span>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-widest bg-stone-900/10 px-3 py-1 rounded-full">
                New Daily
              </span>
            )}
          </div>
          <h3 className="text-2xl font-black tracking-tight">Daily Path</h3>
          <p className="text-sm font-bold opacity-70">
            One path for everyone. {stats.dailyStreak} day streak.
          </p>
        </button>

        <div className="grid grid-cols-2 gap-4">
          {/* Chapters */}
          <button
            onClick={() => { playClickSound(); onOpenChapters(); }}
            className={`p-6 rounded-[2rem] flex flex-col items-start gap-1 transition-all active:scale-95 shadow-xl ${
              dark
                ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/20'
                : 'bg-stone-900 text-stone-50 hover:bg-stone-800 shadow-stone-200'
            }`}
          >
            <BookOpen size={24} className="mb-2" />
            <h3 className="text-xl font-black tracking-tight">Chapters</h3>
            <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">
              20 Levels
            </p>
          </button>

          {/* Archive */}
          <button
            onClick={() => { playClickSound(); onOpenArchive(); }}
            className={`p-6 rounded-[2rem] flex flex-col items-start gap-1 transition-all active:scale-95 ${
              dark
                ? 'bg-stone-800 border-2 border-stone-700 text-stone-200 hover:bg-stone-700 shadow-sm'
                : 'bg-white border-2 border-stone-200 text-stone-900 hover:bg-stone-50 shadow-sm'
            }`}
          >
            <Archive size={24} className="mb-2" />
            <h3 className="text-xl font-black tracking-tight">Archive</h3>
            <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">
              Past Dailies
            </p>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => { playClickSound(); onOpenStats(); }}
            className={`py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
              dark
                ? 'bg-stone-800 border-2 border-stone-700 text-stone-400 hover:bg-stone-700'
                : 'bg-white border-2 border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            <BarChart3 size={20} /> Stats
          </button>
          <button
            onClick={() => { playClickSound(); onOpenRules(); }}
            className={`py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
              dark
                ? 'bg-stone-800 border-2 border-stone-700 text-stone-400 hover:bg-stone-700'
                : 'bg-white border-2 border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            <Info size={20} /> Rules
          </button>
        </div>
      </div>
    </div>
  );
}
