'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, ShieldAlert, Globe, Monitor, Plus, Check } from 'lucide-react';
import { FascaButton } from '../ui/FascaButton';
import { FascaCard } from '../ui/FascaCard';
import { FascaInput } from '../ui/FascaInput';

interface FocusShieldPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FocusShieldPanel: React.FC<FocusShieldPanelProps> = ({
  isOpen,
  onClose,
}) => {
  // Shield state: 'off' | 'active' | 'expiring'
  const [shieldState, setShieldState] = useState<'active' | 'expiring' | 'off'>('active');
  const [blockedSites, setBlockedSites] = useState<string[]>([
    'instagram.com',
    'twitter.com',
    'youtube.com',
    'reddit.com',
  ]);
  const [blockedApps, setBlockedApps] = useState<string[]>([
    'Discord.exe',
    'Steam.exe',
    'Spotify.exe',
  ]);
  const [siteInput, setSiteInput] = useState('');
  const [appInput, setAppInput] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // Check window size for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAddSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (siteInput.trim() && !blockedSites.includes(siteInput.trim())) {
      setBlockedSites([...blockedSites, siteInput.trim().toLowerCase()]);
      setSiteInput('');
    }
  };

  const handleRemoveSite = (domain: string) => {
    setBlockedSites(blockedSites.filter((site) => site !== domain));
  };

  const handleAddApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (appInput.trim() && !blockedApps.includes(appInput.trim())) {
      setBlockedApps([...blockedApps, appInput.trim()]);
      setAppInput('');
    }
  };

  const handleRemoveApp = (appName: string) => {
    setBlockedApps(blockedApps.filter((app) => app !== appName));
  };

  const getToggleStyles = () => {
    if (shieldState === 'active') {
      return 'bg-[#7c5cfc]/10 border-[#7c5cfc] text-[#7c5cfc] shadow-[0_0_12px_rgba(124,92,252,0.1)]';
    }
    if (shieldState === 'expiring') {
      return 'bg-[#ff2d55]/10 border-[#ff2d55] text-[#ff2d55] shadow-[0_0_12px_rgba(255,45,85,0.1)]';
    }
    return 'bg-transparent border-[#2a2a3a] text-[#6b6b8a]';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="fixed top-0 right-0 bottom-0 w-[380px] max-w-full bg-[#111118] border-l border-[#2a2a3a] z-40 p-6 shadow-2xl flex flex-col justify-between"
        >
          {/* Main Overlay Content wrapper */}
          <div className="flex-1 flex flex-col justify-start overflow-y-auto scrollbar-none space-y-6">
            
            {/* Overlay Header */}
            <div className="flex items-center justify-between border-b border-[#2a2a3a]/40 pb-4 shrink-0">
              <div>
                <h3 className="font-serif text-sm font-bold tracking-[0.2em] text-[#f0f0ff] uppercase flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-[#7c5cfc]" /> FOCUS SHIELD
                </h3>
                <p className="text-[8.5px] font-mono text-[#6b6b8a] uppercase tracking-wider mt-0.5">
                  Cognitive Distraction Blocker
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/5 rounded text-[#6b6b8a] hover:text-[#f0f0ff] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Toggle Shield Active Status Card */}
            <FascaCard className={`p-4 flex flex-col gap-3 border transition-all duration-300 ${getToggleStyles()}`}>
              <div className="flex justify-between items-center">
                <span className="text-[8.5px] font-mono uppercase tracking-[0.15em] font-bold">
                  Shield Control Mode
                </span>
                <span className="text-[7.5px] font-mono opacity-80">
                  {shieldState === 'active' && 'ACTIVE [100%]'}
                  {shieldState === 'expiring' && 'EXPIRING [2m left]'}
                  {shieldState === 'off' && 'MUTED [0%]'}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShieldState('active')}
                  className={`flex-1 py-1.5 text-[8px] font-mono uppercase tracking-wider border rounded-[4px] transition-all cursor-pointer ${
                    shieldState === 'active'
                      ? 'bg-[#7c5cfc] border-[#7c5cfc] text-[#0a0a0f] font-bold'
                      : 'border-[#2a2a3a] hover:border-[#7c5cfc]/40 text-[#6b6b8a] hover:text-[#f0f0ff]'
                  }`}
                >
                  ACTIVE
                </button>
                <button
                  onClick={() => setShieldState('expiring')}
                  className={`flex-1 py-1.5 text-[8px] font-mono uppercase tracking-wider border rounded-[4px] transition-all cursor-pointer ${
                    shieldState === 'expiring'
                      ? 'bg-[#ff2d55] border-[#ff2d55] text-[#0a0a0f] font-bold'
                      : 'border-[#2a2a3a] hover:border-[#ff2d55]/40 text-[#6b6b8a] hover:text-[#f0f0ff]'
                  }`}
                >
                  EXPIRING
                </button>
                <button
                  onClick={() => setShieldState('off')}
                  className={`flex-1 py-1.5 text-[8px] font-mono uppercase tracking-wider border rounded-[4px] transition-all cursor-pointer ${
                    shieldState === 'off'
                      ? 'bg-white/10 border-white/20 text-[#f0f0ff] font-bold'
                      : 'border-[#2a2a3a] hover:border-white/20 text-[#6b6b8a] hover:text-[#f0f0ff]'
                  }`}
                >
                  DISABLE
                </button>
              </div>
            </FascaCard>

            {/* Blocked Sites section */}
            <div className="space-y-3 text-left">
              <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-[#6b6b8a] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> BLOCKED SITES
              </span>

              {/* Sites list */}
              <div className="flex flex-wrap gap-1.5 p-3 bg-[#0a0a0f]/40 border border-[#2a2a3a]/40 rounded-[6px]">
                {blockedSites.map((domain) => (
                  <span
                    key={domain}
                    className="pl-2 pr-1.5 py-1 bg-[#16161f] border border-[#2a2a3a] text-[8.5px] font-mono text-[#f0f0ff] rounded-[4px] flex items-center gap-1.5 group hover:border-[#ff2d55]/40 transition-colors"
                  >
                    {domain}
                    <button
                      onClick={() => handleRemoveSite(domain)}
                      className="p-0.5 rounded-sm hover:bg-[#ff2d55]/10 text-[#6b6b8a] hover:text-[#ff2d55] transition-colors cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                {blockedSites.length === 0 && (
                  <span className="text-[8px] font-mono text-[#6b6b8a] py-1">No blocked domains.</span>
                )}
              </div>

              {/* Add Site Input */}
              <form onSubmit={handleAddSite} className="flex gap-2">
                <FascaInput
                  type="text"
                  placeholder="e.g. facebook.com"
                  value={siteInput}
                  onChange={(e) => setSiteInput(e.target.value)}
                  className="flex-1 rounded-[6px] py-1 text-[9px]"
                />
                <button
                  type="submit"
                  className="px-3 bg-white/5 border border-[#2a2a3a] hover:border-[#7c5cfc]/60 text-[#f0f0ff] hover:text-[#7c5cfc] rounded-[6px] transition-colors cursor-pointer flex items-center justify-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Blocked Apps section */}
            <div className="space-y-3 text-left">
              <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-[#6b6b8a] flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5" /> BLOCKED APPS
              </span>

              {/* Apps list */}
              <div className="flex flex-wrap gap-1.5 p-3 bg-[#0a0a0f]/40 border border-[#2a2a3a]/40 rounded-[6px]">
                {blockedApps.map((appName) => (
                  <span
                    key={appName}
                    className="pl-2 pr-1.5 py-1 bg-[#16161f] border border-[#2a2a3a] text-[8.5px] font-mono text-[#f0f0ff] rounded-[4px] flex items-center gap-1.5 group hover:border-[#ff2d55]/40 transition-colors"
                  >
                    {appName}
                    <button
                      onClick={() => handleRemoveApp(appName)}
                      className="p-0.5 rounded-sm hover:bg-[#ff2d55]/10 text-[#6b6b8a] hover:text-[#ff2d55] transition-colors cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                {blockedApps.length === 0 && (
                  <span className="text-[8px] font-mono text-[#6b6b8a] py-1">No blocked applications.</span>
                )}
              </div>

              {/* Add App Input */}
              <form onSubmit={handleAddApp} className="flex gap-2">
                <FascaInput
                  type="text"
                  placeholder="e.g. League.exe"
                  value={appInput}
                  onChange={(e) => setAppInput(e.target.value)}
                  className="flex-1 rounded-[6px] py-1 text-[9px]"
                />
                <button
                  type="submit"
                  className="px-3 bg-white/5 border border-[#2a2a3a] hover:border-[#7c5cfc]/60 text-[#f0f0ff] hover:text-[#7c5cfc] rounded-[6px] transition-colors cursor-pointer flex items-center justify-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

          </div>

          {/* Browser Extension / Mobile App footer section */}
          <div className="border-t border-[#2a2a3a]/40 pt-4 shrink-0 text-left space-y-3 mt-4">
            <div className="p-3 bg-[#16161f] border border-[#ff2d55]/20 rounded-[6px] flex flex-col gap-1.5">
              <span className="text-[8.5px] font-mono text-[#ff2d55] font-bold uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> BROWSER EXTENSION REQUIRED
              </span>
              <p className="text-[8px] text-[#6b6b8a] leading-relaxed font-sans">
                {isMobile 
                  ? 'To enforce shield parameters on mobile viewports, please synchronize via our local mobile application.'
                  : 'Fasca Shield requires the browser companion extension to actively intercept website sockets and domains.'
                }
              </p>
            </div>
            
            {isMobile ? (
              <FascaButton
                variant="ghost-violet"
                className="w-full rounded-[6px] font-bold py-2.5 text-[8.5px]"
              >
                DOWNLOAD MOBILE APP
              </FascaButton>
            ) : (
              <FascaButton
                variant="ghost-violet"
                className="w-full rounded-[6px] font-bold py-2.5 text-[8.5px]"
              >
                INSTALL EXTENSION
              </FascaButton>
            )}
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
};
