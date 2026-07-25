'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Layers,
  BookOpen,
  Shield,
  Palette,
  LogOut,
  Flame,
  Bot,
} from 'lucide-react';
import { FouzarLogo } from '../../logo/FouzarLogo';
import { useFouzar } from '../../../lib/FouzarContext';

interface NavRailProps {
  roomId: string;
  onArmFlow: () => void;
  onAiAssist: () => void;
  onLeave: () => void;
  mobileActivePanel: 'nav' | 'social' | 'canvas';
  onMobilePanelChange: (panel: 'nav' | 'social' | 'canvas') => void;
}

/**
 * Column 1 — Minimalist navigation rail.
 * Icon-only on desktop; expands on hover. Collapses to bottom tab bar on mobile.
 */
export const NavRail: React.FC<NavRailProps> = ({
  roomId,
  onArmFlow,
  onAiAssist,
  onLeave,
  mobileActivePanel,
  onMobilePanelChange,
}) => {
  const { mode, toggleMode, user, isFlowActive } = useFouzar();
  const isGreenhouse = mode === 'greenhouse';

  const navItems = [
    { id: 'canvas' as const, icon: Layers, label: 'Sanctuary', hint: 'C' },
    { id: 'social' as const, icon: BookOpen, label: 'Network', hint: 'N' },
    { id: 'nav' as const, icon: LayoutDashboard, label: 'Hub', hint: 'H' },
  ];

  const desktopItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/sanctuary', icon: BookOpen, label: 'My Sanctuary' },
    { href: `/room/${roomId}`, icon: Layers, label: 'Group Room', active: true },
    { icon: Bot, label: 'AI Assist', action: onAiAssist },
    { icon: Shield, label: 'Shield', action: onArmFlow },
    { icon: Palette, label: mode === 'onyx' ? 'Greenhouse' : 'Onyx', action: toggleMode },
  ];

  return (
    <>
      {/* Desktop rail */}
      <motion.aside
        className={`fouzar-chrome hidden md:flex h-full flex-col justify-between py-5 z-30 shrink-0 border-r border-fouzar-border ${
          isGreenhouse ? 'fouzar-glass' : 'bg-fouzar-surface'
        }`}
        initial={false}
        animate={{ width: isFlowActive ? 52 : 56 }}
      >
        <div className="flex flex-col items-center gap-6 px-2">
          <FouzarLogo showWordmark={false} size={22} linkTo="/dashboard" />

          <div className="w-8 h-px bg-fouzar-border" />

          <nav className="flex flex-col items-center gap-1 w-full">
            {desktopItems.map((item) => {
              const Icon = item.icon;
              const className = `w-10 h-10 flex items-center justify-center rounded-[var(--fouzar-radius-md)] transition-colors ${
                item.active
                  ? 'bg-fouzar-accent/10 text-fouzar-accent shadow-[var(--fouzar-glow-primary)]'
                  : 'text-fouzar-text-secondary hover:text-fouzar-text-primary hover:bg-fouzar-elevated/60'
              }`;

              if (item.href) {
                return (
                  <Link key={item.label} href={item.href} title={item.label} className={className}>
                    <Icon className="w-4 h-4" />
                  </Link>
                );
              }

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className={className}
                  title={item.label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col items-center gap-3 px-2">
          <button
            type="button"
            onClick={onArmFlow}
            className="w-10 h-10 flex items-center justify-center rounded-[var(--fouzar-radius-md)] bg-fouzar-accent text-fouzar-text-inverse shadow-[var(--fouzar-glow-primary)] hover:opacity-90"
            title="Arm Deep Flow"
          >
            <Flame className="w-4 h-4" />
          </button>

          <Link
            href="/profile"
            title="My Profile"
            className="w-8 h-8 rounded-[var(--fouzar-radius-sm)] bg-fouzar-elevated border border-fouzar-border flex items-center justify-center font-mono text-[9px] font-bold hover:border-fouzar-accent hover:text-fouzar-accent transition-colors cursor-pointer"
          >
            {user?.avatarInitials ?? 'FZ'}
          </Link>

          <button
            type="button"
            onClick={onLeave}
            className="w-10 h-10 flex items-center justify-center text-fouzar-signal hover:bg-fouzar-signal/10 rounded-[var(--fouzar-radius-md)]"
            title="Leave room"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </motion.aside>

      {/* Mobile bottom tab bar */}
      <nav className="fouzar-chrome md:hidden fixed bottom-0 inset-x-0 h-14 bg-fouzar-bg/95 backdrop-blur-xl border-t border-fouzar-border flex items-center justify-around z-40 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = mobileActivePanel === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onMobilePanelChange(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 ${
                isActive ? 'text-fouzar-accent' : 'text-fouzar-text-secondary'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-mono text-[7px] uppercase tracking-wider">{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onArmFlow}
          className="flex flex-col items-center gap-0.5 py-1 px-3 text-fouzar-signal"
        >
          <Flame className="w-5 h-5" />
          <span className="font-mono text-[7px] uppercase tracking-wider">Flow</span>
        </button>
        <Link
          href="/profile"
          title="My Profile"
          className="flex flex-col items-center gap-0.5 py-1 px-3 text-fouzar-text-secondary hover:text-fouzar-accent"
        >
          <div className="w-5 h-5 rounded-[var(--fouzar-radius-sm)] border border-fouzar-border flex items-center justify-center font-mono text-[7px] font-bold bg-fouzar-elevated">
            {user?.avatarInitials ?? 'FZ'}
          </div>
          <span className="font-mono text-[7px] uppercase tracking-wider">Profile</span>
        </Link>
      </nav>
    </>
  );
};
