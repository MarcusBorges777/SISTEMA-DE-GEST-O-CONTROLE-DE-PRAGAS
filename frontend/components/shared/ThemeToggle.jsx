import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function ThemeToggle({ compact = false }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      aria-pressed={isDark}
      className={`relative flex items-center justify-center rounded-xl
        transition-all duration-200 active:scale-95
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50
        ${compact ? 'w-10 h-10' : 'w-11 h-11'}
        ${isDark
          ? 'bg-slate-700 hover:bg-slate-600 text-amber-400 hover:text-amber-300'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800'
        }`}
    >
      {isDark
        ? <Sun size={18} aria-hidden="true" />
        : <Moon size={18} aria-hidden="true" />
      }
    </button>
  );
}
