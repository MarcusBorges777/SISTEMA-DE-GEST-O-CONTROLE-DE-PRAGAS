import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function ThemeToggle({ compact = false }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative flex items-center justify-center rounded-xl transition-all duration-300
        ${compact ? 'w-10 h-10' : 'w-11 h-11'}
        ${isDark
          ? 'bg-slate-700 hover:bg-slate-600 text-amber-400'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
        }`}
      title={isDark ? 'Modo claro' : 'Modo escuro'}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
