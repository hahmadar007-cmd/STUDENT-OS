'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Eye, X, Wifi, WifiOff } from 'lucide-react';
import { useFouzar } from '../../lib/FouzarContext';
import type { ActiveBroadcast } from '../../hooks/useLivePresentation';

interface PresenterToastProps {
  /** Non-null when another peer has started a live session */
  activeBroadcast: ActiveBroadcast | null;
  /** True when this peer has opted in to follow the presenter */
  isFollowingPresenter: boolean;
  /** Accept the invite — snap viewport to presenter's current page */
  onFollow: () => void;
  /** Dismiss the toast — user stays on their own isolated track */
  onIgnore: () => void;
  /** Detach from a live session while it is still running */
  onLeave: () => void;
}

/**
 * PresenterToast
 *
 * Feature B — Non-intrusive animated banner that notifies a peer when
 * someone starts a live slide session. Renders at the top edge of the
 * main document display module.
 *
 * Peer interaction model (consent-first):
 *  - [ View Live ] → sets isFollowingPresenter = true, snaps viewport
 *  - [ Ignore ]    → dismisses toast, workflow remains uninterrupted
 *
 * Connected state:
 *  - Renders a persistent "🔴 Connected to [Name]'s Feed" glow indicator
 *  - [ Leave Session ] cleanly detaches viewport tracking
 */
export const PresenterToast: React.FC<PresenterToastProps> = ({
  activeBroadcast,
  isFollowingPresenter,
  onFollow,
  onIgnore,
  onLeave,
}) => {
  const { mode } = useFouzar();
  const isGreenhouse = mode === 'greenhouse';

  return (
    <AnimatePresence>
      {/* ── Invite Toast (shown when a broadcast exists and user hasn't decided) */}
      {activeBroadcast && !isFollowingPresenter && (
        <motion.div
          key="invite-toast"
          initial={{ opacity: 0, y: -20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className={`absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-[var(--fouzar-radius-md)] shadow-2xl border w-auto max-w-[92%] pointer-events-auto ${
            isGreenhouse
              ? 'fouzar-glass border-fouzar-border/60'
              : 'bg-fouzar-card/95 border-[#7c5cfc]/40 backdrop-blur-xl'
          }`}
          style={{
            boxShadow: '0 0 32px rgba(124,92,252,0.18), 0 8px 32px rgba(0,0,0,0.45)',
          }}
        >
          {/* Pulsing live indicator */}
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fouzar-signal opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-fouzar-signal" />
          </span>

          {/* Message */}
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[9px] font-bold text-fouzar-text-primary leading-snug truncate">
              📡{' '}
              <span className="text-fouzar-accent">{activeBroadcast.presenterName}</span>{' '}
              started a live presentation
            </p>
            <p className="font-mono text-[7px] text-fouzar-text-secondary truncate mt-0.5">
              {activeBroadcast.fileName}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={onFollow}
              className="flex items-center gap-1 px-3 py-1.5 bg-fouzar-accent text-fouzar-text-inverse font-mono text-[7.5px] uppercase tracking-wider rounded-[var(--fouzar-radius-sm)] shadow-[var(--fouzar-glow-primary)] hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Eye className="w-2.5 h-2.5" />
              View Live
            </motion.button>
            <button
              type="button"
              onClick={onIgnore}
              title="Dismiss — stay on your own track"
              className="p-1.5 text-fouzar-text-tertiary hover:text-fouzar-text-primary rounded-[var(--fouzar-radius-sm)] hover:bg-fouzar-elevated/30 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Connected Feed Indicator (shown once peer has opted-in) */}
      {activeBroadcast && isFollowingPresenter && (
        <motion.div
          key="connected-indicator"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={`absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-3 py-2 rounded-[var(--fouzar-radius-md)] border pointer-events-auto ${
            isGreenhouse
              ? 'fouzar-glass border-fouzar-signal/30'
              : 'bg-fouzar-card/95 border-fouzar-signal/40 backdrop-blur-xl'
          }`}
          style={{
            boxShadow: '0 0 20px rgba(255,45,85,0.12), 0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          {/* Glowing live dot */}
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fouzar-signal opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-fouzar-signal" />
          </span>

          <Wifi className="w-3 h-3 text-fouzar-signal shrink-0" />

          <span className="font-mono text-[8px] text-fouzar-text-primary font-bold whitespace-nowrap">
            Connected to{' '}
            <span className="text-fouzar-signal">{activeBroadcast.presenterName}</span>
            's Feed
          </span>

          <span className="font-mono text-[7px] text-fouzar-text-tertiary">
            · p.{activeBroadcast.currentPage}
          </span>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onLeave}
            className="ml-1 flex items-center gap-1 px-2.5 py-1 bg-fouzar-signal/10 border border-fouzar-signal/30 text-fouzar-signal font-mono text-[7px] uppercase tracking-wider rounded-[var(--fouzar-radius-sm)] hover:bg-fouzar-signal/20 transition-colors cursor-pointer"
          >
            <WifiOff className="w-2.5 h-2.5" />
            Leave Session
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
