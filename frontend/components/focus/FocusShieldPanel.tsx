'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, ShieldAlert, Globe, Smartphone, Plus, Timer, Coffee, Play, Square, Loader2 } from 'lucide-react';
import { FascaButton } from '../ui/FascaButton';
import { FascaCard } from '../ui/FascaCard';
import { FascaInput } from '../ui/FascaInput';
import { getBackendUrl, getAuthToken } from '../../lib/api';

interface BlocklistItem {
  id: string;
  type: 'DOMAIN' | 'APP';
  value: string;
  label?: string;
}

interface FocusSession {
  id: string;
  status: 'FOCUSING' | 'ON_BREAK' | 'COMPLETED' | 'ABORTED';
  startTime: string;
  totalDurationMs: number;
  numberOfBreaks: number;
  breakDurationMs: number;
  currentBreak: number;
  breakEndsAt?: string;
}

interface FocusShieldPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Pre-session setup modal ──────────────────────────────────────────────────

interface SetupModalProps {
  onStart: (cfg: { totalHours: number; totalMinutes: number; numberOfBreaks: number; breakDurationMs: number }) => void;
  onCancel: () => void;
  loading: boolean;
}

const BREAK_DURATIONS = [
  { label: '5 min', ms: 300_000 },
  { label: '10 min', ms: 600_000 },
  { label: '15 min', ms: 900_000 },
  { label: '20 min', ms: 1_200_000 },
];

const SetupModal: React.FC<SetupModalProps> = ({ onStart, onCancel, loading }) => {
  const [hours, setHours]       = useState(1);
  const [minutes, setMinutes]   = useState(30);
  const [breaks, setBreaks]     = useState(2);
  const [breakMs, setBreakMs]   = useState(600_000);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 bg-fouzar-surface z-10 p-6 flex flex-col gap-5 overflow-y-auto"
    >
      <div>
        <h3 className="font-serif text-sm font-bold tracking-[0.2em] text-fouzar-text-primary uppercase flex items-center gap-1.5">
          <Timer className="w-4 h-4 text-[#7c5cfc]" /> Session Setup
        </h3>
        <p className="text-[8.5px] font-mono text-fouzar-text-secondary mt-0.5 uppercase tracking-wider">
          Configure your focus block
        </p>
      </div>

      {/* Session Duration */}
      <div className="space-y-2">
        <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-fouzar-text-secondary">
          Total Duration
        </span>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[8px] font-mono text-fouzar-text-secondary mb-1 block">Hours</label>
            <select
              value={hours}
              onChange={e => setHours(Number(e.target.value))}
              className="w-full bg-fouzar-bg border border-fouzar-border-strong text-fouzar-text-primary text-xs font-mono rounded-[6px] px-2 py-1.5 focus:outline-none focus:border-[#7c5cfc]"
            >
              {[0,1,2,3,4,5,6].map(h => <option key={h} value={h}>{h}h</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[8px] font-mono text-fouzar-text-secondary mb-1 block">Minutes</label>
            <select
              value={minutes}
              onChange={e => setMinutes(Number(e.target.value))}
              className="w-full bg-fouzar-bg border border-fouzar-border-strong text-fouzar-text-primary text-xs font-mono rounded-[6px] px-2 py-1.5 focus:outline-none focus:border-[#7c5cfc]"
            >
              {[0,15,30,45].map(m => <option key={m} value={m}>{m}m</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Number of Breaks */}
      <div className="space-y-2">
        <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-fouzar-text-secondary">
          How many breaks?
        </span>
        <div className="flex gap-2">
          {[0,1,2,3,4,5].map(n => (
            <button
              key={n}
              onClick={() => setBreaks(n)}
              className={`flex-1 py-1.5 text-[9px] font-mono font-bold border rounded-[6px] transition-all cursor-pointer ${
                breaks === n
                  ? 'bg-[#7c5cfc] border-[#7c5cfc] text-white'
                  : 'border-fouzar-border-strong text-fouzar-text-secondary hover:border-[#7c5cfc]/50'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-[8px] font-mono text-fouzar-text-secondary">
          {breaks === 0
            ? 'No breaks – maximum focus mode!'
            : `${breaks} break${breaks > 1 ? 's' : ''} evenly distributed throughout session`}
        </p>
      </div>

      {/* Break Duration (only if breaks > 0) */}
      {breaks > 0 && (
        <div className="space-y-2">
          <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-fouzar-text-secondary">
            Break Duration
          </span>
          <div className="flex gap-2">
            {BREAK_DURATIONS.map(bd => (
              <button
                key={bd.ms}
                onClick={() => setBreakMs(bd.ms)}
                className={`flex-1 py-1.5 text-[9px] font-mono font-bold border rounded-[6px] transition-all cursor-pointer ${
                  breakMs === bd.ms
                    ? 'bg-[#059669] border-[#059669] text-white'
                    : 'border-fouzar-border-strong text-fouzar-text-secondary hover:border-[#059669]/50'
                }`}
              >
                {bd.label}
              </button>
            ))}
          </div>
          <p className="text-[8px] font-mono text-fouzar-text-secondary">
            During breaks, ALL blocks lift automatically. They re-engage when time is up.
          </p>
        </div>
      )}

      {/* Summary */}
      {(hours > 0 || minutes > 0) && (
        <FascaCard className="p-3 bg-[#7c5cfc]/5 border border-[#7c5cfc]/20 text-[8px] font-mono text-fouzar-text-secondary space-y-1">
          <div className="flex justify-between"><span>Total time</span><span className="text-fouzar-text-primary">{hours}h {minutes}m</span></div>
          {breaks > 0 && (
            <>
              <div className="flex justify-between"><span>Study blocks</span><span className="text-fouzar-text-primary">{breaks + 1} × ~{Math.floor(((hours * 60 + minutes) - breaks * (breakMs / 60_000)) / (breaks + 1))} min</span></div>
              <div className="flex justify-between"><span>Breaks</span><span className="text-[#34d399]">{breaks} × {BREAK_DURATIONS.find(b => b.ms === breakMs)?.label}</span></div>
            </>
          )}
        </FascaCard>
      )}

      <div className="flex gap-3 mt-auto">
        <button
          onClick={onCancel}
          className="flex-1 py-2 text-[9px] font-mono border border-fouzar-border-strong rounded-[6px] text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors cursor-pointer"
        >
          CANCEL
        </button>
        <button
          disabled={hours === 0 && minutes === 0 || loading}
          onClick={() => onStart({ totalHours: hours, totalMinutes: minutes, numberOfBreaks: breaks, breakDurationMs: breakMs })}
          className="flex-1 py-2 text-[9px] font-mono font-bold bg-[#7c5cfc] border border-[#7c5cfc] text-white rounded-[6px] hover:bg-[#6d4fe0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          INITIATE SESSION
        </button>
      </div>
    </motion.div>
  );
};

// ─── Active session countdown ─────────────────────────────────────────────────

function useCountdown(endMs: number | null) {
  const [remaining, setRemaining] = useState<number>(0);
  useEffect(() => {
    if (!endMs) return;
    const tick = () => setRemaining(Math.max(0, endMs - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endMs]);
  return remaining;
}

function formatMs(ms: number) {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const FocusShieldPanel: React.FC<FocusShieldPanelProps> = ({ isOpen, onClose }) => {
  const [view, setView] = useState<'main' | 'setup'>('main');
  const [loadingSession, setLoadingSession] = useState(false);
  const [loadingAbort, setLoadingAbort] = useState(false);

  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [blockedSites, setBlockedSites]   = useState<BlocklistItem[]>([]);
  const [blockedApps, setBlockedApps]     = useState<BlocklistItem[]>([]);
  const [siteInput, setSiteInput]         = useState('');
  const [appInput, setAppInput]           = useState('');
  const [isMobile, setIsMobile]           = useState(false);

  const BACKEND = getBackendUrl();

  const authHeader = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getAuthToken()}`,
  }), []);

  // Window resize
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    fn();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // Load blocklist + active session on open
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const [blRes, sesRes] = await Promise.all([
          fetch(`${BACKEND}/focus/blocklist`, { headers: authHeader() }),
          fetch(`${BACKEND}/focus/session/active`, { headers: authHeader() }),
        ]);
        const bl  = await blRes.json();
        const ses = await sesRes.json();
        if (Array.isArray(bl)) {
          setBlockedSites(bl.filter((x: BlocklistItem) => x.type === 'DOMAIN'));
          setBlockedApps(bl.filter((x: BlocklistItem) => x.type === 'APP'));
        }
        if (ses?.id) setActiveSession(ses);
        else setActiveSession(null);
      } catch { /* silently fail */ }
    })();
  }, [isOpen, BACKEND, authHeader]);

  // Countdown to session end
  const sessionEndMs = activeSession
    ? new Date(activeSession.startTime).getTime() + activeSession.totalDurationMs
    : null;
  const breakEndsMs = activeSession?.breakEndsAt
    ? new Date(activeSession.breakEndsAt).getTime()
    : null;
  const remaining    = useCountdown(sessionEndMs);
  const breakRemain  = useCountdown(breakEndsMs);

  // ── API helpers ─────────────────────────────────────────────────────────────

  const addSite = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = siteInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    if (!value) return;
    try {
      const res  = await fetch(`${BACKEND}/focus/blocklist`, { method: 'POST', headers: authHeader(), body: JSON.stringify({ type: 'DOMAIN', value, label: value }) });
      const item = await res.json();
      setBlockedSites(prev => [...prev.filter(x => x.value !== value), item]);
      setSiteInput('');
    } catch { /* ignore dupe */ }
  };

  const addApp = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = appInput.trim();
    if (!value) return;
    try {
      const res  = await fetch(`${BACKEND}/focus/blocklist`, { method: 'POST', headers: authHeader(), body: JSON.stringify({ type: 'APP', value, label: value }) });
      const item = await res.json();
      setBlockedApps(prev => [...prev.filter(x => x.value !== value), item]);
      setAppInput('');
    } catch { /* ignore */ }
  };

  const removeSite = async (id: string) => {
    setBlockedSites(prev => prev.filter(x => x.id !== id));
    await fetch(`${BACKEND}/focus/blocklist/${id}`, { method: 'DELETE', headers: authHeader() });
  };

  const removeApp = async (id: string) => {
    setBlockedApps(prev => prev.filter(x => x.id !== id));
    await fetch(`${BACKEND}/focus/blocklist/${id}`, { method: 'DELETE', headers: authHeader() });
  };

  const startSession = async (cfg: { totalHours: number; totalMinutes: number; numberOfBreaks: number; breakDurationMs: number }) => {
    setLoadingSession(true);
    try {
      const totalDurationMs = (cfg.totalHours * 60 + cfg.totalMinutes) * 60_000;
      const res = await fetch(`${BACKEND}/focus/session/start`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({
          totalDurationMs,
          numberOfBreaks: cfg.numberOfBreaks,
          breakDurationMs: cfg.breakDurationMs,
          strictMode: false,
        }),
      });
      const ses = await res.json();
      setActiveSession(ses);
      setView('main');
    } catch {
      /* show nothing – fail silently */
    } finally {
      setLoadingSession(false);
    }
  };

  const abortSession = async () => {
    setLoadingAbort(true);
    try {
      await fetch(`${BACKEND}/focus/session/abort`, { method: 'POST', headers: authHeader() });
      setActiveSession(null);
    } catch { /* ignore */ }
    finally { setLoadingAbort(false); }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const statusColor = activeSession?.status === 'FOCUSING' ? '#7c5cfc' : activeSession?.status === 'ON_BREAK' ? '#059669' : '#475569';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="fixed top-0 right-0 bottom-0 w-[380px] max-w-full bg-fouzar-surface border-l border-fouzar-border-strong z-40 shadow-2xl flex flex-col"
          style={{ position: 'relative', overflow: 'hidden' }}
        >
          {/* Setup Modal Overlay */}
          <AnimatePresence>
            {view === 'setup' && (
              <SetupModal
                loading={loadingSession}
                onStart={startSession}
                onCancel={() => setView('main')}
              />
            )}
          </AnimatePresence>

          <div className="flex-1 flex flex-col justify-start overflow-y-auto scrollbar-none p-6 space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-fouzar-border-strong/40 pb-4 shrink-0">
              <div>
                <h3 className="font-serif text-sm font-bold tracking-[0.2em] text-fouzar-text-primary uppercase flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-[#7c5cfc]" /> FOCUS SHIELD
                </h3>
                <p className="text-[8.5px] font-mono text-fouzar-text-secondary uppercase tracking-wider mt-0.5">
                  Cross-device Distraction Blocker
                </p>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Session Status Card */}
            <FascaCard className="p-4 flex flex-col gap-3 border transition-all duration-300" style={{ borderColor: `${statusColor}60`, backgroundColor: `${statusColor}10` }}>
              <div className="flex justify-between items-center">
                <span className="text-[8.5px] font-mono uppercase tracking-[0.15em] font-bold" style={{ color: statusColor }}>
                  {activeSession?.status === 'FOCUSING' && '🔒 FOCUSING'}
                  {activeSession?.status === 'ON_BREAK'  && '☕ ON BREAK'}
                  {!activeSession && 'SHIELD IDLE'}
                </span>
                <span className="text-[8px] font-mono text-fouzar-text-secondary">
                  {activeSession ? `${activeSession.currentBreak}/${activeSession.numberOfBreaks} breaks used` : 'No active session'}
                </span>
              </div>

              {activeSession && (
                <>
                  {activeSession.status === 'ON_BREAK' && (
                    <div className="text-center">
                      <div className="text-[8px] font-mono text-[#34d399] uppercase tracking-wider mb-1">Break ends in</div>
                      <div className="text-2xl font-bold font-mono text-[#34d399]">{formatMs(breakRemain)}</div>
                      <div className="text-[8px] font-mono text-fouzar-text-secondary mt-1">Locks re-engage automatically when timer hits 0</div>
                    </div>
                  )}
                  {activeSession.status === 'FOCUSING' && (
                    <div className="text-center">
                      <div className="text-[8px] font-mono text-[#a78bfa] uppercase tracking-wider mb-1">Session ends in</div>
                      <div className="text-2xl font-bold font-mono text-[#a78bfa]">{formatMs(remaining)}</div>
                    </div>
                  )}
                  <button
                    onClick={abortSession}
                    disabled={loadingAbort}
                    className="w-full py-1.5 text-[8.5px] font-mono font-bold border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-[6px] transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    {loadingAbort ? <Loader2 className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3" />}
                    ABORT SESSION
                  </button>
                </>
              )}

              {!activeSession && (
                <button
                  onClick={() => setView('setup')}
                  className="w-full py-2 text-[8.5px] font-mono font-bold bg-[#7c5cfc] border border-[#7c5cfc] text-white rounded-[6px] hover:bg-[#6d4fe0] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3 h-3" /> INITIATE FOCUS SESSION
                </button>
              )}
            </FascaCard>

            {/* Blocked Sites */}
            <div className="space-y-3 text-left">
              <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-fouzar-text-secondary flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> BLOCKED SITES
              </span>
              <div className="flex flex-wrap gap-1.5 p-3 bg-fouzar-bg/40 border border-fouzar-border-strong/40 rounded-[6px] min-h-[44px]">
                {blockedSites.map((item) => (
                  <span key={item.id} className="pl-2 pr-1.5 py-1 bg-fouzar-card border border-fouzar-border-strong text-[8.5px] font-mono text-fouzar-text-primary rounded-[4px] flex items-center gap-1.5 hover:border-[#ff2d55]/40 transition-colors">
                    {item.label || item.value}
                    <button onClick={() => removeSite(item.id)} className="p-0.5 rounded-sm hover:bg-[#ff2d55]/10 text-fouzar-text-secondary hover:text-[#ff2d55] transition-colors cursor-pointer">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                {blockedSites.length === 0 && <span className="text-[8px] font-mono text-fouzar-text-secondary py-1">No blocked domains. Add one below.</span>}
              </div>
              <form onSubmit={addSite} className="flex gap-2">
                <FascaInput type="text" placeholder="e.g. instagram.com" value={siteInput} onChange={e => setSiteInput(e.target.value)} className="flex-1 rounded-[6px] py-1 text-[9px]" />
                <button type="submit" className="px-3 bg-white/5 border border-fouzar-border-strong hover:border-[#7c5cfc]/60 text-fouzar-text-primary hover:text-[#7c5cfc] rounded-[6px] transition-colors cursor-pointer flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Blocked Apps */}
            <div className="space-y-3 text-left">
              <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-fouzar-text-secondary flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" /> BLOCKED ANDROID APPS
              </span>
              <div className="flex flex-wrap gap-1.5 p-3 bg-fouzar-bg/40 border border-fouzar-border-strong/40 rounded-[6px] min-h-[44px]">
                {blockedApps.map((item) => (
                  <span key={item.id} className="pl-2 pr-1.5 py-1 bg-fouzar-card border border-fouzar-border-strong text-[8.5px] font-mono text-fouzar-text-primary rounded-[4px] flex items-center gap-1.5 hover:border-[#ff2d55]/40 transition-colors">
                    {item.label || item.value}
                    <button onClick={() => removeApp(item.id)} className="p-0.5 rounded-sm hover:bg-[#ff2d55]/10 text-fouzar-text-secondary hover:text-[#ff2d55] transition-colors cursor-pointer">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                {blockedApps.length === 0 && <span className="text-[8px] font-mono text-fouzar-text-secondary py-1">No blocked apps. Enter Android package name (e.g. com.instagram.android).</span>}
              </div>
              <form onSubmit={addApp} className="flex gap-2">
                <FascaInput type="text" placeholder="e.g. com.instagram.android" value={appInput} onChange={e => setAppInput(e.target.value)} className="flex-1 rounded-[6px] py-1 text-[9px]" />
                <button type="submit" className="px-3 bg-white/5 border border-fouzar-border-strong hover:border-[#7c5cfc]/60 text-fouzar-text-primary hover:text-[#7c5cfc] rounded-[6px] transition-colors cursor-pointer flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-fouzar-border-strong/40 p-4 space-y-3 shrink-0">
            <div className="p-3 bg-fouzar-card border border-[#7c5cfc]/20 rounded-[6px] flex flex-col gap-1">
              <span className="text-[8.5px] font-mono text-[#7c5cfc] font-bold uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> EXTENSION + ANDROID APP REQUIRED
              </span>
              <p className="text-[8px] text-fouzar-text-secondary leading-relaxed">
                Install the Fasca Chrome Extension and Android App for cross-device enforcement.
              </p>
            </div>
            <div className="flex gap-2">
              <FascaButton variant="ghost-violet" className="flex-1 rounded-[6px] font-bold py-2 text-[8px]">
                INSTALL EXTENSION
              </FascaButton>
              <FascaButton variant="ghost-violet" className="flex-1 rounded-[6px] font-bold py-2 text-[8px]">
                DOWNLOAD APP
              </FascaButton>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
