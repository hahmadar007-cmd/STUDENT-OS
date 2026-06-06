import React from 'react';
import Link from 'next/link';

interface FouzarLogoProps {
  showWordmark?: boolean;
  className?: string;
  size?: number;
  linkTo?: string;
}

export const FouzarLogo: React.FC<FouzarLogoProps> = ({
  showWordmark = true,
  className = '',
  size = 24,
  linkTo,
}) => {
  const content = (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:scale-105 filter drop-shadow-[0_0_8px_var(--fouzar-accent-glow)]"
      >
        {/* Outer clean framing */}
        <rect
          x="15"
          y="15"
          width="70"
          height="70"
          rx="6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeOpacity="0.15"
        />
        {/* Interlocking minimalist F/Z geometric mark */}
        <path
          d="M 38 68 V 32 H 62 M 38 48 H 54"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-fouzar-text-primary"
        />
        <path
          d="M 50 32 L 62 48 L 50 64"
          stroke="var(--fouzar-accent)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {showWordmark && (
        <span className="font-sans font-light text-xs uppercase tracking-[0.38em] text-fouzar-text-primary transition-colors duration-300">
          Fouzar
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
