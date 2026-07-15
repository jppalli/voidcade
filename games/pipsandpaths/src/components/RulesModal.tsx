import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info } from 'lucide-react';
import { useTheme } from '../ThemeContext';

interface RulesModalProps {
  show: boolean;
  onClose: () => void;
}

export default function RulesModal({ show, onClose }: RulesModalProps) {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={`p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl ${
              dark ? 'bg-stone-900 text-stone-100' : 'bg-white text-stone-900'
            }`}
          >
            <h2 className="text-4xl font-black mb-6 tracking-tight">Rules</h2>
            <div className={`space-y-6 ${dark ? 'text-stone-400' : 'text-stone-600'}`}>
              {[
                <>Start at the highlighted die. Your goal is to visit <span className={`font-bold ${dark ? 'text-white' : 'text-stone-900'}`}>every die</span> exactly once.</>,
                <>The number of pips on your current die tells you <span className={`font-bold ${dark ? 'text-white' : 'text-stone-900'}`}>exactly how many steps</span> you must jump.</>,
                <>You can jump Up, Down, Left, or Right, as long as you land on an <span className={`font-bold ${dark ? 'text-white' : 'text-stone-900'}`}>unvisited die</span>.</>,
              ].map((text, i) => (
                <div key={i} className="flex gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                    dark ? 'bg-indigo-600 text-white' : 'bg-stone-900 text-white'
                  }`}>
                    {i + 1}
                  </div>
                  <p className="leading-tight pt-1">{text}</p>
                </div>
              ))}
            </div>
            <button
              onClick={onClose}
              className={`w-full py-4 rounded-2xl font-bold mt-8 transition-colors ${
                dark
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                  : 'bg-stone-900 text-stone-50 hover:bg-stone-800'
              }`}
            >
              Got it!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
