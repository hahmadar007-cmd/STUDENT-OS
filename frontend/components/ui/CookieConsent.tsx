'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie } from 'lucide-react';

export const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const consent = localStorage.getItem('fouzar-cookie-consent');
      if (!consent) {
        // Wait a second before showing for premium feel
        const t = setTimeout(() => setVisible(true), 1500);
        return () => clearTimeout(t);
      }
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('fouzar-cookie-consent', 'true');
    document.cookie = 'fouzar-cookie-consent=true; path=/; max-age=31536000; SameSite=Lax; Secure';
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-[360px] z-[9999] p-4 bg-[#16161f]/90 backdrop-blur-xl border border-fouzar-border/60 rounded-[var(--fouzar-radius-lg)] shadow-2xl flex flex-col gap-3"
        >
          <div className="flex gap-2.5 items-start">
            <Cookie className="w-5 h-5 text-fouzar-accent shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-serif text-[11px] font-bold uppercase tracking-wider text-fouzar-text-primary">
                Cookie Optimization
              </h4>
              <p className="font-mono text-[8.5px] text-fouzar-text-secondary leading-normal uppercase">
                We use secure cookies to persist your study room sessions, JWT auth tokens, and Deep Flow shield configurations.
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setVisible(false)}
              className="px-3 py-1.5 font-mono text-[7px] text-fouzar-text-secondary hover:text-fouzar-text-primary uppercase border border-fouzar-border/40 hover:border-fouzar-border rounded-[var(--fouzar-radius-sm)] transition-colors cursor-pointer"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="px-3 py-1.5 font-mono text-[7px] text-fouzar-text-inverse bg-fouzar-accent hover:opacity-90 uppercase font-bold rounded-[var(--fouzar-radius-sm)] transition-all cursor-pointer"
            >
              Accept Cookies
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
