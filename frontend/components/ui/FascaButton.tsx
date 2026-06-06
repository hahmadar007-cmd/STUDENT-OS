'use client';

import React from 'react';

type FascaButtonVariant = 
  | 'solid-violet' 
  | 'ghost-violet' 
  | 'ghost-crimson'
  // Backward compatibility mappings
  | 'solid' 
  | 'ghost';

interface FascaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: FascaButtonVariant;
  className?: string;
}

/**
 * FascaButton Component
 * Supports solid violet, ghost violet border, and ghost crimson variants.
 * Follows the 6px maximum border radius and 150ms-200ms ease-out transition.
 */
export const FascaButton: React.FC<FascaButtonProps> = ({
  children,
  variant = 'solid-violet',
  className = '',
  ...props
}) => {
  const baseStyle = 'inline-flex items-center justify-center font-sans font-medium text-xs tracking-wider uppercase px-4 py-2.5 rounded-[6px] transition-all duration-150 ease-out active:scale-97 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';
  
  let variantStyle = '';

  // Resolve compatibility mappings
  const resolvedVariant = variant === 'solid' ? 'solid-violet' : variant === 'ghost' ? 'ghost-violet' : variant;

  switch (resolvedVariant) {
    case 'solid-violet':
      variantStyle = 'bg-[#7c5cfc] text-[#f0f0ff] hover:opacity-90 hover:shadow-[0_0_12px_rgba(124,92,252,0.45)]';
      break;
    case 'ghost-violet':
      variantStyle = 'bg-transparent border border-[#7c5cfc] text-[#7c5cfc] hover:bg-[#7c5cfc]/10 hover:text-[#f0f0ff]';
      break;
    case 'ghost-crimson':
      variantStyle = 'bg-transparent text-[#ff2d55] hover:bg-[#ff2d55]/10';
      break;
  }

  return (
    <button
      className={`${baseStyle} ${variantStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
