'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sparkles, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import debounce from 'lodash/debounce';

export const UsernameOnboardingModal = ({
  user,
  onComplete,
}: {
  user: any;
  onComplete: (username: string) => void;
}) => {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const validateLocal = (u: string) => {
    if (u.length < 3 || u.length > 20) return 'Must be 3-20 characters';
    if (!/^[a-z0-9_]+$/.test(u)) return 'Letters, numbers, and underscores only';
    if (u.startsWith('_') || u.endsWith('_')) return 'Cannot start or end with underscore';
    if (u.includes('__')) return 'Cannot have consecutive underscores';
    if (/^\d+$/.test(u)) return 'Cannot be only numbers';
    return null;
  };

  const checkAvailability = async (u: string) => {
    if (!u) return;
    try {
      const res = await apiRequest(`/users/check-username/${u}`, 'GET');
      if (res.available) {
        setStatus('available');
      } else {
        setStatus('taken');
        setErrorMsg('Username is already taken or reserved');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Failed to check availability');
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedCheck = useCallback(
    debounce((u: string) => {
      checkAvailability(u);
    }, 500),
    []
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(val);
    setStatus('idle');
    setErrorMsg('');

    if (val.length === 0) return;

    const localErr = validateLocal(val);
    if (localErr) {
      setStatus('error');
      setErrorMsg(localErr);
      return;
    }

    setStatus('checking');
    debouncedCheck(val);
  };

  const handleSubmit = async () => {
    if (status !== 'available' || saving) return;
    setSaving(true);
    try {
      await apiRequest('/users/me', 'PATCH', { username });
      // Notify parent to refresh user or dismiss modal
      onComplete(username);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Failed to set username');
      setSaving(false);
    }
  };

  // Only render if we actually lack a username/fouzarId
  if (user?.username || user?.fouzarId) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-[#0a0a0f] border border-fouzar-border-strong rounded-2xl p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-fouzar-accent via-[#ff2d55] to-fouzar-accent" />
        
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-fouzar-surface/50 border border-fouzar-border-subtle flex items-center justify-center rotate-3">
            <Sparkles className="w-8 h-8 text-fouzar-accent" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-white mb-2 tracking-wide">Claim Your Username</h2>
          <p className="text-[11px] font-mono text-fouzar-text-secondary leading-relaxed">
            Welcome to the ecosystem. Your username is your unique identity across study circles, direct messages, and global leaderboards.
          </p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <span className="text-fouzar-text-tertiary font-mono text-sm">@</span>
            </div>
            <input
              type="text"
              value={username}
              onChange={handleChange}
              placeholder="username"
              className="w-full bg-[#0d0d14] border border-fouzar-border-subtle rounded-xl pl-8 pr-12 py-3 text-sm text-white font-mono placeholder:text-fouzar-text-tertiary/50 focus:outline-none focus:border-fouzar-accent transition-colors"
              autoFocus
            />
            <div className="absolute inset-y-0 right-4 flex items-center">
              {status === 'checking' && (
                <div className="w-3.5 h-3.5 border-2 border-fouzar-accent/30 border-t-fouzar-accent rounded-full animate-spin" />
              )}
              {status === 'available' && <Check className="w-4 h-4 text-[#00ff88]" />}
              {(status === 'taken' || status === 'error') && <AlertCircle className="w-4 h-4 text-[#ff2d55]" />}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-[10px] font-mono text-[#ff2d55] text-center"
              >
                {errorMsg}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleSubmit}
            disabled={status !== 'available' || saving}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-mono text-[10px] uppercase tracking-widest transition-all ${
              status === 'available' && !saving
                ? 'bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
            }`}
          >
            {saving ? 'Registering...' : 'Continue'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          <Shield className="w-3 h-3 text-fouzar-text-tertiary" />
          <span className="text-[9px] font-mono text-fouzar-text-tertiary uppercase">You can change this later in your profile</span>
        </div>
      </motion.div>
    </div>
  );
};
