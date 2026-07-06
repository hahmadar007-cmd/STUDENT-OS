'use client';

import React from 'react';

interface FascaInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

/**
 * FascaInput Component
 * Implements a text input with a bottom-border-only focus style that lights up violet.
 * Adheres to 6px maximum border-radius (rounded on top-left/top-right) and transition durations.
 */
export const FascaInput: React.FC<FascaInputProps> = ({
  className = '',
  ...props
}) => {
  return (
    <input
      className={`w-full bg-fouzar-surface/60 border-b-2 border-fouzar-border-strong rounded-t-[6px] px-3 py-2.5 text-xs text-fouzar-text-primary placeholder-[#6b6b8a] transition-all duration-150 ease-out focus:outline-none focus:border-[#7c5cfc] focus:bg-fouzar-surface/90 focus:shadow-[0_1px_0_rgba(124,92,252,0.5)] ${className}`}
      {...props}
    />
  );
};
