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
export const FascaLogo: React.FC<FascaLogoProps> = ({
  size = 32,
  showWordmark = true,
  className = '',
  linkTo,
}) => {
  const content = (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          {/* Subtle inner glow filter */}
          <filter id="fasca-inner-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowDiff" />
            <feFlood floodColor="#7c5cfc" floodOpacity="0.9" />
            <feComposite in2="shadowDiff" operator="in" />
            <feComposite in2="SourceGraphic" operator="over" />
          </filter>
          {/* Glow backdrop shadow filter */}
          <filter id="fasca-drop-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#7c5cfc" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Bat-wing sharp F letterform */}
        <path
          d="M10,8 H15.5 L31.5,4.5 C29.5,10.5 23.5,12.5 15.5,12.5 V19 L26.5,24.5 C22.5,22.5 18.5,20.5 15.5,20.5 V34.5 H10 V8 Z"
          fill="#7c5cfc"
          filter="url(#fasca-inner-glow) url(#fasca-drop-glow)"
          stroke="#7c5cfc"
          strokeWidth="0.5"
          strokeLinejoin="miter"
          strokeMiterlimit="3"
        />
      </svg>

      {showWordmark && (
        <span 
          className="font-serif text-lg font-bold tracking-[0.2em] text-[#f0f0ff] leading-none"
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
