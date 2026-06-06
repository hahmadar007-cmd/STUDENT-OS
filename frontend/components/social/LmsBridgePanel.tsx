'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, RefreshCw, Layers, Link2, AlertCircle } from 'lucide-react';
import { FascaButton } from '../ui/FascaButton';
import { FascaCard } from '../ui/FascaCard';
import { FascaInput } from '../ui/FascaInput';
import { getDeadlines, patchLmsToken } from '../../lib/api';
import { toast } from '../ui/Toast';

interface LmsBridgePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DeadlineItem {
  id: string;
  course: string;
  title: string;
  timeLeftHours: number;
  timeLeftLabel: string;
}

export const LmsBridgePanel: React.FC<LmsBridgePanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [activeLmsTab, setActiveLmsTab] = useState<'canvas' | 'blackboard' | 'moodle' | 'token'>('moodle');
  const [baseUrl, setBaseUrl] = useState('https://lms.umt.edu.pk');
  const [tokenValue, setTokenValue] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [syncTimestamp, setSyncTimestamp] = useState('Last Synced: Not connected');
  const [lmsSource, setLmsSource] = useState<'live' | 'demo' | 'error'>('demo');
  const [connectedProvider, setConnectedProvider] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showSuccessCheck, setShowSuccessCheck] = useState(false);

  const fetchDeadlines = async () => {
    setIsLoading(true);
    try {
      const data = await getDeadlines();
      setDeadlines(data.deadlines || []);
      setLmsSource(data.source);
      setConnectedProvider(data.provider);
      if (data.source === 'live') {
        setSyncTimestamp(`Live · ${data.provider} · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      } else if (data.source === 'error') {
        setSyncTimestamp('Connected but sync failed');
        setErrorMsg(data.error || 'LMS token rejected');
      } else {
        setSyncTimestamp('Demo data — not connected to your university');
      }
    } catch (err) {
      console.error('Failed to fetch deadlines:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDeadlines();
    }
  }, [isOpen]);

  const handleSync = async () => {
    setIsSyncing(true);
    await fetchDeadlines();
    setIsSyncing(false);
  };

  const handleLinkGateway = async () => {
    if (!tokenValue) {
      setErrorMsg('Access token is required');
      return;
    }
    if (!baseUrl && activeLmsTab === 'moodle') {
      setErrorMsg('University portal base URL is required');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const provider = activeLmsTab === 'canvas' ? 'canvas' : 'moodle';
      const result = await patchLmsToken(tokenValue, baseUrl, provider);
      if (!result.success) {
        setErrorMsg(result.message || 'Integration failed. Check base URL or token.');
        return;
      }
      setShowSuccessCheck(true);
      toast(result.message || 'LMS connected', 'cyan');
      setTimeout(() => {
        setShowSuccessCheck(false);
        setShowConnectModal(false);
        setTokenValue('');
        fetchDeadlines();
      }, 1800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Integration failed. Check base URL or token.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* 1. Main Lms Slide-over Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 bottom-0 w-[380px] max-w-full bg-[#111118] border-l border-[#2a2a3a] z-40 p-6 shadow-2xl flex flex-col justify-between"
          >
            {/* Overlay Header */}
            <div className="flex items-center justify-between border-b border-[#2a2a3a]/40 pb-4 shrink-0">
              <div>
                <h3 className="font-serif text-sm font-bold tracking-[0.2em] text-[#f0f0ff] uppercase">
                  ACADEMIC FEED
                </h3>
                <p className="text-[8.5px] font-mono text-[#6b6b8a] uppercase tracking-wider mt-0.5">
                  LMS Bridge Controller
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleSync}
                  className={`p-1.5 hover:bg-white/5 rounded-[6px] text-[#6b6b8a] hover:text-[#f0f0ff] transition-colors cursor-pointer ${
                    isSyncing ? 'animate-spin' : ''
                  }`}
                  title="Force Sync Feed"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-white/5 rounded-[6px] text-[#6b6b8a] hover:text-[#f0f0ff] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* LMS Connection CTA Button */}
            <div className="my-5 shrink-0">
              <FascaButton
                onClick={() => setShowConnectModal(true)}
                variant="ghost-violet"
                className="w-full rounded-none font-bold py-3 text-[9px] flex items-center justify-center gap-1.5 border border-[#7c5cfc]/30 hover:border-[#7c5cfc]"
              >
                <Link2 className="w-3.5 h-3.5" /> CONNECT LMS GATEWAY
              </FascaButton>
            </div>

            {/* Deadline list section */}
            <div className="flex-1 overflow-y-auto scrollbar-none space-y-4 py-2">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-[#6b6b8a] block">
                  Synchronized Deadlines
                </span>
                <span className={`text-[7px] font-mono uppercase ${
                  lmsSource === 'live' ? 'text-[#00d4ff]' : lmsSource === 'error' ? 'text-[#ff2d55]' : 'text-[#f5a623]'
                }`}>
                  {lmsSource === 'live' ? `${connectedProvider} live` : lmsSource === 'error' ? 'sync error' : 'demo'}
                </span>
              </div>
              <p className="text-[7px] font-mono text-[#6b6b8a] uppercase">{syncTimestamp}</p>

              {isLoading && deadlines.length === 0 ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-28 bg-[#16161f] border border-[#2a2a3a] animate-pulse flex flex-col justify-between p-4">
                      <div className="h-3 bg-[#1e1e2a] w-1/4 rounded-[2px]" />
                      <div className="h-4 bg-[#1e1e2a] w-3/4 rounded-[2px]" />
                      <div className="h-6 bg-[#1e1e2a] w-20 rounded-[4px]" />
                    </div>
                  ))}
                </div>
              ) : deadlines.length === 0 ? (
                <div className="h-64 border border-dashed border-[#2a2a3a] flex flex-col items-center justify-center p-6 text-center">
                  <Calendar className="w-8 h-8 text-[#6b6b8a]/50 mb-3" />
                  <span className="text-xs text-[#f0f0ff] font-bold">No Active Deadlines</span>
                  <span className="text-[9px] font-mono text-[#6b6b8a] mt-1.5">LMS not linked or no events pending.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {deadlines.map((dl) => {
                    const isUrgent = dl.timeLeftHours <= 48;
                    return (
                      <FascaCard key={dl.id} className="p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[8.5px] font-mono text-[#7c5cfc] uppercase tracking-wider">
                            {dl.course}
                          </span>
                          <span 
                            className={`text-[8.5px] font-mono uppercase tracking-wider ${
                              isUrgent ? 'text-[#ff2d55] font-bold text-glow-accent' : 'text-[#6b6b8a]'
                            }`}
                          >
                            {dl.timeLeftLabel}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-[#f0f0ff] leading-snug">
                          {dl.title}
                        </h4>
                        <FascaButton 
                          variant="ghost-violet"
                          className="self-start px-3 py-1.5 text-[8px] font-mono rounded-[6px] tracking-wider"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              window.open(baseUrl, '_blank');
                            }
                          }}
                        >
                          OPEN IN LMS
                        </FascaButton>
                      </FascaCard>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sync Timestamp footer */}
            <div className="border-t border-[#2a2a3a]/40 pt-4 shrink-0 flex items-center justify-between text-[7.5px] font-mono text-[#6b6b8a] uppercase tracking-wider">
              <span>Bridge Mode Active</span>
              <span>{syncTimestamp}</span>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Connect LMS Modal Dialog Overlay */}
      <AnimatePresence>
        {showConnectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-[#16161f] border border-[#7c5cfc] rounded-[6px] shadow-2xl p-6 relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-serif text-sm font-bold tracking-[0.15em] text-[#f0f0ff]">
                    CONNECT ACADEMIC GATEWAY
                  </h4>
                  <p className="text-[8px] font-mono text-[#6b6b8a] uppercase mt-0.5">
                    Sync course slides, deadlines and grades
                  </p>
                </div>
                <button
                  onClick={() => setShowConnectModal(false)}
                  className="p-1 hover:bg-white/5 rounded-[6px] text-[#6b6b8a] hover:text-[#f0f0ff] transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* LMS tabs selector */}
              <div className="flex bg-[#0a0a0f]/40 border-b border-[#2a2a3a] mb-5">
                {['canvas', 'blackboard', 'moodle', 'token'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveLmsTab(tab as any);
                      setErrorMsg('');
                    }}
                    className="flex-1 py-2 font-mono text-[8.5px] uppercase tracking-widest text-center cursor-pointer transition-colors relative"
                    style={{
                      color: activeLmsTab === tab ? '#f0f0ff' : '#6b6b8a',
                      backgroundColor: activeLmsTab === tab ? '#16161f' : 'transparent',
                    }}
                  >
                    {tab}
                    {activeLmsTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#7c5cfc]" />
                    )}
                  </button>
                ))}
              </div>

              {showSuccessCheck ? (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <motion.svg
                    width="60"
                    height="60"
                    viewBox="0 0 50 50"
                    className="text-[#7c5cfc]"
                  >
                    <motion.circle
                      cx="25"
                      cy="25"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="transparent"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5 }}
                    />
                    <motion.path
                      d="M17 25L23 31L33 19"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="transparent"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.4, duration: 0.4 }}
                    />
                  </motion.svg>
                  <h5 className="text-xs font-bold text-[#f0f0ff] uppercase tracking-widest mt-4">
                    INTEGRATION SUCCESSFUL
                  </h5>
                  <p className="text-[8.5px] font-mono text-[#6b6b8a] uppercase mt-1">
                    Synchronizing academic deadlines...
                  </p>
                </div>
              ) : (
                <>
                  {/* Form parameters */}
                  <div className="space-y-4 my-4 text-left">
                    {activeLmsTab === 'moodle' || activeLmsTab === 'canvas' ? (
                      <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[8px] font-mono uppercase text-[#6b6b8a]">
                            {activeLmsTab === 'canvas' ? 'Canvas Base URL' : 'Moodle Base URL'}
                          </span>
                          <FascaInput 
                            type="url"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            placeholder={activeLmsTab === 'canvas' ? 'https://canvas.university.edu' : 'https://lms.university.edu'}
                            className="rounded-none border border-[#2a2a3a] focus:border-[#7c5cfc]"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[8px] font-mono uppercase text-[#6b6b8a]">
                            {activeLmsTab === 'canvas' ? 'Canvas Access Token' : 'Moodle Web Service Token'}
                          </span>
                          <FascaInput 
                            type="password"
                            value={tokenValue}
                            onChange={(e) => setTokenValue(e.target.value)}
                            placeholder={activeLmsTab === 'canvas' ? 'Canvas → Settings → New Access Token' : 'Moodle → Site admin → Web services token'}
                            className="rounded-none border border-[#2a2a3a] focus:border-[#7c5cfc]"
                          />
                        </div>
                        <p className="text-[7px] font-mono text-[#6b6b8a] uppercase leading-relaxed">
                          {activeLmsTab === 'canvas'
                            ? 'Generate a token in Canvas under Account → Settings → Approved Integrations.'
                            : 'Ask your university IT for a Moodle web service token with calendar access.'}
                        </p>
                      </div>
                    ) : activeLmsTab === 'token' ? (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[8px] font-mono uppercase text-[#6b6b8a]">Manual Access Token</span>
                        <FascaInput 
                          type="password"
                          value={tokenValue}
                          onChange={(e) => setTokenValue(e.target.value)}
                          placeholder="token_sha256_fasca..."
                          className="rounded-none border border-[#2a2a3a] focus:border-[#7c5cfc]"
                        />
                      </div>
                    ) : (
                      <div className="py-8 border border-dashed border-[#2a2a3a] text-center flex flex-col items-center justify-center p-4">
                        <AlertCircle className="w-6 h-6 text-[#6b6b8a] mb-2" />
                        <span className="text-[10px] font-mono text-[#6b6b8a] uppercase tracking-wider">
                          {activeLmsTab.toUpperCase()} auth via OAuth is coming soon.
                        </span>
                        <span className="text-[8px] font-mono text-[#6b6b8a]/60 uppercase tracking-widest mt-1">
                          Use Moodle or Manual Token integration.
                        </span>
                      </div>
                    )}
                  </div>

                  {errorMsg && (
                    <div className="flex items-center gap-2 bg-[#ff2d55]/10 border border-[#ff2d55]/30 p-3 text-left my-3">
                      <AlertCircle className="w-4 h-4 text-[#ff2d55] shrink-0" />
                      <span className="text-[9px] font-mono text-[#ff2d55] uppercase tracking-wider">
                        {errorMsg}
                      </span>
                    </div>
                  )}

                  {/* Submit / Cancel Actions */}
                  <div className="flex gap-3 mt-6">
                    <FascaButton
                      onClick={() => setShowConnectModal(false)}
                      variant="ghost-violet"
                      className="flex-1 rounded-[6px] font-bold py-2 text-[9px] border border-[#2a2a3a] hover:border-[#7c5cfc]"
                      disabled={isLoading}
                    >
                      CANCEL
                    </FascaButton>
                    <FascaButton
                      onClick={handleLinkGateway}
                      variant="solid-violet"
                      className="flex-1 rounded-[6px] font-bold py-2 text-[9px]"
                      disabled={isLoading || (activeLmsTab !== 'moodle' && activeLmsTab !== 'canvas' && activeLmsTab !== 'token')}
                    >
                      {isLoading ? 'SYNCING...' : 'LINK GATEWAY'}
                    </FascaButton>
                  </div>
                </>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
