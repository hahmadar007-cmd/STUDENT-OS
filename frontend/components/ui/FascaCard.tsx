'use client';

import React from 'react';

interface FascaCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * FascaCard Component
 * Implements a base content card with background #16161f, 1px border #2a2a3a,
 * and a premium subtle violet tint drop shadow. Maximum 6px border-radius.
 */
export const FascaCard: React.FC<FascaCardProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-[#16161f] border border-[#2a2a3a] rounded-[6px] shadow-[0_4px_20px_rgba(124,92,252,0.08)] transition-all duration-150 ease-out ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
