'use client';

import React from 'react';
import { Settings } from 'lucide-react';
import { useTheme } from '../../lib/ThemeContext';

const LABELS: Record<string, string> = {
  fouzar: 'FZ',
  cyberpunk: 'CP',
  matrix: 'MX',
};

export function ThemeSwitcher() {
  const { theme, cycleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={cycleTheme}
      title={`Theme: ${theme} — click to cycle`}
      className="flex items-center gap-1 p-1.5 border border-fouzar-border/40 hover:border-fouzar-accent/60 rounded-[4px] text-fouzar-text-secondary hover:text-fouzar-accent transition-all duration-150 cursor-pointer bg-fouzar-surface/30 hover:bg-fouzar-surface/60 shrink-0"
    >
      <Settings className="w-3.5 h-3.5" />
      <span className="font-mono text-[7.5px] uppercase tracking-wider hidden sm:inline">
        {LABELS[theme]}
      </span>
    </button>
  );
}
