'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Flame, Check } from 'lucide-react';

export interface ToastItem {
  id: string;
  message: string;
  type: 'violet' | 'crimson' | 'cyan';
}

export const toast = (message: string, type: 'violet' | 'crimson' | 'cyan' = 'violet') => {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('fasca-toast', {
      detail: { message, type, id: Math.random().toString(36).substring(2, 9) }
    });
    window.dispatchEvent(event);
  }
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastItem>;
      const { id, message, type } = customEvent.detail;
      
      setToasts((prev) => [...prev, { id, message, type }]);

      // Auto dismiss after 4 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };

    window.addEventListener('fasca-toast', handleToastEvent);
    return () => {
      window.removeEventListener('fasca-toast', handleToastEvent);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 w-80 max-w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          let borderTheme = 'border-l-4 border-[#7c5cfc]';
          let glowTheme = 'shadow-[0_0_12px_rgba(124,92,252,0.15)]';
          let Icon = MessageSquare;
          let iconColor = 'text-[#7c5cfc]';

          if (t.type === 'crimson') {
            borderTheme = 'border-l-4 border-[#ff2d55]';
            glowTheme = 'shadow-[0_0_12px_rgba(255,45,85,0.15)]';
            Icon = Flame;
            iconColor = 'text-[#ff2d55]';
          } else if (t.type === 'cyan') {
            borderTheme = 'border-l-4 border-[#00d4ff]';
            glowTheme = 'shadow-[0_0_12px_rgba(0,212,255,0.15)]';
            Icon = Check;
            iconColor = 'text-[#00d4ff]';
          }

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className={`pointer-events-auto w-full bg-fouzar-surface border border-fouzar-border-strong ${borderTheme} ${glowTheme} rounded-[6px] p-4 flex items-start justify-between gap-3`}
            >
              <div className="flex gap-3">
                <div className={`mt-0.5 ${iconColor} shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-fouzar-text-primary uppercase tracking-wider leading-snug">
                    {t.type === 'violet' ? 'Message' : t.type === 'crimson' ? 'Flow Signal' : 'System Alert'}
                  </span>
                  <p className="text-[9px] font-mono text-fouzar-text-secondary uppercase leading-relaxed">
                    {t.message}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
