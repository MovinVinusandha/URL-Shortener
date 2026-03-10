import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      id="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="
        relative flex items-center justify-center
        w-9 h-9 rounded-xl
        border border-slate-700 dark:border-slate-700
        bg-slate-100 dark:bg-slate-800
        hover:bg-slate-200 dark:hover:bg-slate-700
        text-slate-600 dark:text-slate-300
        hover:text-slate-900 dark:hover:text-white
        transition-all duration-200
      "
    >
      {/* Sun — visible in dark mode (click to go light) */}
      <Sun
        className={`w-4 h-4 absolute transition-all duration-300 ${
          theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'
        }`}
      />
      {/* Moon — visible in light mode (click to go dark) */}
      <Moon
        className={`w-4 h-4 absolute transition-all duration-300 ${
          theme === 'light' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
        }`}
      />
    </button>
  );
};

export default ThemeToggle;
