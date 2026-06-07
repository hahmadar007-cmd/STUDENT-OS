'use client';

import { useState, useEffect } from 'react';

interface BypassState {
  isActive: boolean;
  expiresAt: string | null;
}

interface UseBypassTimerOptions {
  bypass: BypassState;
  activateBypass: (minutes: 5 | 10) => void;
  clearBypass: () => void;
  disarmDeepFlow: () => void;
  updateFocusState?: (isFocusing: boolean) => Promise<unknown>;
  socketUpdateFocusState?: (isFocusing: boolean) => void;
}

/**
 * Encapsulates the bypass countdown timer and related handlers
 * (emergency bypass, re-lock, disarm flow) shared across pages.
 */
export function useBypassTimer({
  bypass,
  activateBypass,
  clearBypass,
  disarmDeepFlow,
  updateFocusState,
  socketUpdateFocusState,
}: UseBypassTimerOptions) {
  const [bypassSecondsLeft, setBypassSecondsLeft] = useState(0);

  useEffect(() => {
    if (!bypass.isActive || !bypass.expiresAt) return;

    const update = () => {
      const left = Math.max(0, Math.floor((new Date(bypass.expiresAt!).getTime() - Date.now()) / 1000));
      setBypassSecondsLeft(left);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [bypass.isActive, bypass.expiresAt]);

  const handleEmergencyBypass = (minutes: 5 | 10 = 5) => {
    activateBypass(minutes);
  };

  const handleReLock = () => {
    clearBypass();
  };

  const handleDisarmFlow = async () => {
    disarmDeepFlow();
    try {
      if (updateFocusState) await updateFocusState(false);
      if (socketUpdateFocusState) socketUpdateFocusState(false);
    } catch {
      /* optional */
    }
  };

  return {
    bypassSecondsLeft,
    handleEmergencyBypass,
    handleReLock,
    handleDisarmFlow,
  };
}
