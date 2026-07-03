'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type AppTheme = 'fouzar' | 'cyberpunk' | 'matrix';

const STORAGE_KEY = 'fouzar_app_theme';

const CYCLE: AppTheme[] = ['fouzar', 'cyberpunk', 'matrix'];

interface ThemeContextValue {
  theme: AppTheme;
  cycleTheme: () => void;
  setTheme: (t: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'fouzar',
  cycleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('fouzar');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(STORAGE_KEY) as AppTheme | null;
    const initial: AppTheme = stored && CYCLE.includes(stored) ? stored : 'fouzar';
    setThemeState(initial);
    document.documentElement.dataset.appTheme = initial;
  }, []);

  const setTheme = (t: AppTheme) => {
    setThemeState(t);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, t);
      document.documentElement.dataset.appTheme = t;
    }
  };

  const cycleTheme = () => {
    setThemeState((prev) => {
      const idx = CYCLE.indexOf(prev);
      const next = CYCLE[(idx + 1) % CYCLE.length];
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, next);
        document.documentElement.dataset.appTheme = next;
      }
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, cycleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
