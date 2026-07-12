'use client';

import React from 'react';
import Link from 'next/link';

interface FascaLogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  linkTo?: string;
}

/**
 * FascaLogo Component
 * Renders the custom SVG bat-wing F letterform and Space Grotesk wordmark.
 */
export const FascaLogo: React.FC<FascaLogoProps & { layout?: 'horizontal' | 'vertical' }> = ({
  size = 32,
  showWordmark = true,
  className = '',
  linkTo,
  layout = 'horizontal'
}) => {
  const content = (
    <div className={`inline-flex ${layout === 'vertical' ? 'flex-col justify-center' : 'items-center gap-3'} select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="fasca-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7c5cfc" />
            <stop offset="100%" stopColor="#b582ff" />
          </linearGradient>
          <filter id="fasca-inner-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.5" result="blur" />
            <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowDiff" />
            <feFlood floodColor="#ffffff" floodOpacity="0.4" />
            <feComposite in2="shadowDiff" operator="in" />
            <feComposite in2="SourceGraphic" operator="over" />
          </filter>
          <filter id="fasca-drop-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#7c5cfc" floodOpacity="0.4" />
          </filter>
        </defs>

        <path
          d="M10,8 H15.5 L31.5,4.5 C29.5,10.5 23.5,12.5 15.5,12.5 V19 L26.5,24.5 C22.5,22.5 18.5,20.5 15.5,20.5 V34.5 H10 V8 Z"
          fill="url(#fasca-gradient)"
          filter="url(#fasca-inner-glow) url(#fasca-drop-glow)"
        />
      </svg>

      {showWordmark && (
        <span 
          className={`font-serif font-bold tracking-[0.25em] text-white leading-none ${layout === 'vertical' ? 'mt-2 text-xl' : 'text-lg'}`}
          style={{ fontFamily: 'var(--font-serif), sans-serif' }}
        >
          FASCA
        </span>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link href={linkTo} className="group cursor-pointer">
        {content}
      </Link>
    );
  }

  return content;
};
